import type {
  AccessibilityState,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import {
  cleanup,
  computed,
  createAnimatedValue,
  effect,
  signal,
  split,
  untracked,
  View,
} from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { createInput } from "../../primitives/environment";
import {
  createPressFeedback,
  PressableFeedbackContext,
  type PressableFeedbackContextValue,
} from "../../primitives/pressable";
import { createSelectableItem } from "../../primitives/selection";
import { renderChildren } from "./children";
import {
  TabContext,
  TabsContext,
  type TabContextValue,
} from "./tabs-context";
import { type TabsKey, encodeTabKey } from "./tabs-key";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The live state HeroUI hands a `Tabs.Tab`'s render functions (React Aria's
 * `TabRenderProps`). Booleans become accessors, as everywhere in this port
 * (D17): the function runs once and reads them where it needs them.
 */
export interface TabRenderProps {
  isHovered: () => boolean;
  isPressed: () => boolean;
  isSelected: () => boolean;
  isFocused: () => boolean;
  isFocusVisible: () => boolean;
  isDisabled: () => boolean;
}

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Tabs.Tab`: HeroUI 3.2.7's `TabProps`, which is React Aria
 * Components' `Tab` props.
 *
 * The DOM-only members (`href`, `aria-*` references, `render`, `slot`,
 * `onKeyDown` / `onKeyUp`) are accepted so code written against HeroUI keeps
 * compiling; port sheet §1 and §8 say what each can and cannot do. The RAC
 * press events map to NSH's own press handlers, which is the only press
 * channel a view has.
 */
export interface TabProps {
  /** The key pairing this tab with a `Tabs.Panel`; a unique key is generated when omitted. */
  id?: TabsKey;

  /** The tab's content, or a render function called once with accessors. */
  children?: JSX.Element | ((values: TabRenderProps) => JSX.Element);

  /** Appended after the tab slot classes; function form gets the accessors. */
  className?: string | ((values: TabRenderProps) => string | undefined);

  /** Style of the tab; function form gets the accessors. */
  style?: StyleProp<ViewStyle> | ((values: TabRenderProps) => StyleProp<ViewStyle>);

  /** Blocks this tab only (the root's `disabledKeys` and `isDisabled` come on top). */
  isDisabled?: boolean;

  /** Upstream the tab renders an anchor; NSH has no link element, accepted without effect. */
  href?: string;

  /** The tab's accessible name (its text is the default). */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-describedby"?: string;

  /** A completed press: a pointer release over the tab, or Return / Space. */
  onPress?: (e: PressEvent) => void;

  /** The press went down. */
  onPressStart?: (e: PressEvent) => void;

  /** NSH's own press-down event, beside `onPressStart`. */
  onPressDown?: (e: PressEvent) => void;

  /** The press was released. */
  onPressUp?: (e: PressEvent) => void;

  /** The press ended, after `onPressUp`. */
  onPressEnd?: (e: PressEvent) => void;

  /** Every press-start / press-end transition. */
  onPressChange?: (isPressed: boolean) => void;

  /** A press held for about half a second. */
  onLongPress?: (e: PressEvent) => void;

  /** The completed activation; NSH has no DOM `click`, so this follows `onPress`. */
  onClick?: (e: PressEvent) => void;

  /** The pointer came over the tab. */
  onHoverStart?: (e: NshMouseEvent) => void;

  /** The pointer left the tab. */
  onHoverEnd?: (e: NshMouseEvent) => void;

  /** Every hover transition. */
  onHoverChange?: (isHovered: boolean) => void;

  /** NSH's mouse-enter event, beside `onHoverStart`. */
  onMouseEnter?: (e: NshMouseEvent) => void;

  /** NSH's mouse-leave event, beside `onHoverEnd`. */
  onMouseLeave?: (e: NshMouseEvent) => void;

  /** The tab took the keyboard focus. */
  onFocus?: () => void;

  /** The tab lost the keyboard focus. */
  onBlur?: () => void;

  /** Every focus transition. */
  onFocusChange?: (isFocused: boolean) => void;

  /** Accepted, no effect: NSH views report no key events (use presses / `keymap`). */
  onKeyDown?: unknown;
  onKeyUp?: unknown;

  /** A DOM id upstream; `id` is also the tab's key, so this alias is accepted for `nativeID`. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** Accepted, no effect: the tab is hidden through the root, not through the DOM. */
  hidden?: boolean;

  /** The tab was laid out; its frame is what the indicator animates from. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH derives direction from the platform / root. */
  dir?: "ltr" | "rtl";

  /** Accepted, no effect (D18: no data attributes). */
  [key: `data-${string}`]: unknown;

  /** The tab view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Tab
 * -----------------------------------------------------------------------------------------------*/

/**
 * `Tabs.Tab` / `Tab`: one tab.
 *
 * It is a core `View` with `role="tab"`, not nsh/base's `Tab`: the base tab has
 * no hover / focus / press events and no render values, and it only lives
 * inside the base tab bar (port sheet §3, criterion B3). Selection, the roving
 * focus stop and the disabled semantics come from `createSelectableItem`; the
 * tab registers itself with the root so the collection and the keyboard
 * delegate can see it (Kobalte's `createDomCollectionItem`).
 */
export function Tab(props: TabProps): JSX.Element | null {
  const [local] = split(props, [
    "id",
    "children",
    "className",
    "style",
    "isDisabled",
    "href",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "onPress",
    "onPressStart",
    "onPressDown",
    "onPressUp",
    "onPressEnd",
    "onPressChange",
    "onLongPress",
    "onClick",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onMouseEnter",
    "onMouseLeave",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "onKeyDown",
    "onKeyUp",
    "nativeID",
    "testID",
    "hidden",
    "onLayout",
    "render",
    "slot",
    "dir",
    "ref",
  ] as const);

  const tabs = TabsContext();

  if (!tabs) {
    return null;
  }

  // The key is an identity: read `id` once, the way the port reads every id.
  const key =
    local.id === undefined || local.id === null
      ? tabs.createTabKey()
      : encodeTabKey(local.id);


  /* -------------------------------------------------------------------------------------------
   * Registration (research 4.2): the root's registry is the collection's data
   * source, and each tab reports its frame so the indicator can animate from
   * the previous tab's position.
   * ----------------------------------------------------------------------------------------- */
  cleanup(
    tabs.registerTab({
      key,
      isDisabled: () => local.isDisabled === true,
    }),
  );
  cleanup(() => tabs.unregisterBounds(key));
  cleanup(() => tabs.registerTabRef(key, undefined));

  const selectable = createSelectableItem({
    selectionManager: tabs.selectionManager,
    key: () => key,
    disabled: () => local.isDisabled === true,
  });

  const isSelected = computed(() => selectable.isSelected());
  const isFocused = computed(() => selectable.isFocused());
  // The collection already folds the tab's own flag together with the root's
  // `isDisabled` and `disabledKeys` into the item's disabled state.
  const isDisabled = computed(() => selectable.isDisabled());

  /* -------------------------------------------------------------------------------------------
   * Local state: hover, press and focus (port sheet §2). The focus ring uses the
   * interaction modality, never hover.
   * ----------------------------------------------------------------------------------------- */
  const hovered = signal(false);
  const pressed = signal(false);
  const focused = signal(false);
  const modality = createInteractionModality();

  // A-002 / A-003: the `input` axis is read once here — it gates the
  // press-feedback seam, the `hover:opacity-70` classList half and the hover
  // state writes below.
  const input = createInput();

  // A-003: the touch-gated press-feedback seam (encapsulation.md §1,
  // press-feedback 接缝). The gate folds `isDisabled` in so a disabled tab
  // expands nothing; under the default pointer environment `enabled` stays
  // false and every channel rests, so the tab pays nothing. The tab mounts no
  // overlay — the selected state is already the selection feedback — but it
  // provides the seam's context so a caller can compose
  // `PressableFeedback.Scale`/`Highlight`/`Ripple` inside its children (the B
  // 档 "只用 highlight 或扩大 hitSlop" clause; the `hitSlop` half is bound on
  // the view below).
  const feedbackEnabled = () => input() === "touch" && !isDisabled();
  const feedback = createPressFeedback({ enabled: feedbackEnabled });

  const pressFeedbackContextValue: PressableFeedbackContextValue = {
    isPressed: feedback.isPressed,
    pressed: feedback.pressed,
    bounds: feedback.bounds,
    pressOrigin: feedback.pressOrigin,
    scale: feedback.scale,
    highlightOpacity: createAnimatedValue(0),
    rippleProgress: createAnimatedValue(0),
    enabled: feedbackEnabled,
    hitSlop: feedback.hitSlop,
    isAllAnimationsDisabled: () => false,
  };

  const isFocusVisible = computed(() => focused() && modality.isKeyboard());

  const renderProps: TabRenderProps = {
    isHovered: hovered,
    isPressed: pressed,
    isSelected,
    isFocused,
    isFocusVisible,
    isDisabled,
  };

  /* -------------------------------------------------------------------------------------------
   * Focus: `createSelectableItem` owns the focused key, the tab moves its own
   * keyboard focus when it holds it, as Kobalte's item does. On Windows this is
   * a no-op (port sheet §8).
   * ----------------------------------------------------------------------------------------- */
  let node: ViewRef | undefined;

  // A pointer press focuses the tab programmatically, so the focus event that
  // follows must not switch the modality to the keyboard (upstream's
  // `:focus-visible` would not paint for a mouse). The flag is raised by
  // `handlePressDown`, the only path that focuses from a pointer: writing it
  // here unconditionally would also swallow a `node.focus()` issued by keyboard
  // navigation, whose focus event is the only chance the receiving tab has to
  // record the keyboard modality and paint its ring.
  let pointerFocusPending = false;

  effect(() => {
    // The tab already holds the keyboard focus: requesting it again would
    // re-fire the focus event after the host's own blur (a duplicate in the
    // focus trail, T-015 on the web target). Nothing left to do.
    if (focused()) {
      return;
    }

    if (!selectable.isFocused()) {
      return;
    }

    if (node == null) {
      return;
    }

    if (pointerFocusPending) {
      // The focus request is driven by a pointer press: defer it past the
      // press window. On the web host `el.focus()` scrolls the element into
      // view, and that scroll cancels the host's in-flight press gesture —
      // `down/up/end` landed but `press`/`click` never fired (measured: a
      // selection-changing press on an unfocused tab died after `up` — and
      // in the successful runs `focus` always landed AFTER `click`). Two
      // frames puts the call behind `up → end → press → click` on every
      // observed ordering; keyboard-driven focus (`pointerFocusPending`
      // false) stays synchronous — T-015's focus-trail semantics are
      // untouched.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => node?.focus()),
      );
      return;
    }

    node.focus();
  });

  /* -------------------------------------------------------------------------------------------
   * Presses, hover, focus
   * ----------------------------------------------------------------------------------------- */
  const handlePressDown = (event: PressEvent) => {
    // A keyboard activation has no press-down; it arrives at `onPress`.
    if (isKeyboardPress(event)) {
      return;
    }

    modality.setPointerModality();

    // A-003: the seam sees the press after the keyboard early-return, before
    // the selection callbacks; it gates itself on `enabled`, so a pointer
    // press records nothing.
    feedback.pressDown(event);

    if (!isDisabled()) {
      pressed.set(true);
      pointerFocusPending = true;
    }

    selectable.onPressDown(event);

    local.onPressStart?.(event);
    local.onPressDown?.(event);
    local.onPressChange?.(true);
  };

  const handlePressUp = (event: PressEvent) => {
    // A-003: the seam's end edge — release and cancel share `onPressUp`, and
    // `pressUp` clears `pressOrigin` even for a gated press, so it runs before
    // the keyboard early-return. It is deferred one frame: the web host
    // dispatches down and up inside one gesture turn, so a synchronous clear
    // collapses `isPressed` into the same commit that raised it — reactive
    // consumers see only the settle state (the registered web batching gap).
    // One frame lets the held state commit before the release lands; a real
    // contact already lasts frames, so the seam's observable semantics are
    // unchanged on every other host.
    requestAnimationFrame(() => feedback.pressUp(event));

    if (isKeyboardPress(event)) {
      return;
    }

    if (pressed()) {
      pressed.set(false);
      local.onPressChange?.(false);
    }

    selectable.onPressUp(event);

    local.onPressUp?.(event);
    local.onPressEnd?.(event);
  };

  const handlePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      modality.setKeyboardModality();
    } else {
      modality.setPointerModality();
    }

    // Selection and action: the pointer selected on down, the keyboard here.
    selectable.onPress(event);

    local.onPress?.(event);
    local.onClick?.(event);
  };

  const handleLongPress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    local.onLongPress?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    // `onMouseEnter` is a raw host event and still reported; the hover state
    // and the `useHover` callbacks below are not.
    local.onMouseEnter?.(event);

    // A-002: the `input` axis owns hover independence — under touch the hover
    // signal stays off entirely, so a web sticky hover cannot pin the tab
    // (and its `hover:opacity-70`) after a press (the switch A-003 ruling:
    // host hover callbacks do not pass under touch).
    if (input() === "touch" || isDisabled() || hovered()) {
      return;
    }

    hovered.set(true);
    local.onHoverStart?.(event);
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);
    pressed.set(false);

    if (input() === "touch" || !hovered()) {
      return;
    }

    hovered.set(false);
    local.onHoverEnd?.(event);
    local.onHoverChange?.(false);
  };

  const handleFocus = () => {
    const fromPointer = pointerFocusPending;
    pointerFocusPending = false;

    focused.set(true);

    if (!fromPointer) {
      modality.onFocus();
    }

    selectable.onFocus();

    local.onFocus?.();
    local.onFocusChange?.(true);
  };

  const handleBlur = () => {
    pointerFocusPending = false;
    focused.set(false);
    selectable.onBlur();

    local.onBlur?.();
    local.onFocusChange?.(false);
  };

  /* -------------------------------------------------------------------------------------------
   * Classes
   * ----------------------------------------------------------------------------------------- */
  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() => {
    const list = [tabs.slots().tab()];

    // R-037: `.tabs__tab:not([data-selected]):not([data-disabled]):hover`
    // `opacity: .7`; only while this tab is neither selected nor disabled, a
    // condition the `hover:` variant alone cannot express.
    // R-038: the rule's `@media (hover: hover)` wrapper is deleted, as R-013:
    // NSH reports hover only where a pointer exists.
    // A-002: the `input()` gate is that pointer check — under touch the class
    // never resolves, so a sticky web hover cannot survive a press.
    if (input() !== "touch" && !isSelected() && !isDisabled()) {
      list.push("hover:opacity-70");
    }

    const consumer = resolvedClassName();

    if (typeof consumer === "string" && consumer.length > 0) {
      list.push(consumer);
    }

    return list.join(" ");
  });

  const classList = computed<Record<string, boolean>>(() => ({
    // R-039: `:focus-visible` / `[data-focus-visible="true"]` →
    // `status-focused`. NSH treats `focus-visible:` exactly as `focus:`, so
    // only the interaction modality can keep the ring off after a pointer
    // press; that is why it is a classList entry rather than a class.
    "ring-2 ring-focus ring-offset-2 ring-offset-background outline-none": isFocusVisible(),
  }));

  const accessibilityState = computed<AccessibilityState>(() => ({
    selected: isSelected(),
    disabled: isDisabled(),
  }));

  const accessibilityLabel = () => local["aria-label"];

  const tabContextValue: TabContextValue = {
    key,
    isSelected,
    isDisabled,
  };

  const content = () => {
    // The single read of `props.children`, at the placement inside the tab
    // context (research 4.1 / 4.6).
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() => (children as (values: TabRenderProps) => JSX.Element)(renderProps)),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <TabContext.Provider value={tabContextValue}>
      <View
        ref={(next) => {
          node = next;
          tabs.registerTabRef(key, next);
          local.ref?.(next);
        }}
        nativeID={local.nativeID ?? (local.id != null ? String(local.id) : undefined)}
        testID={local.testID}
        role="tab"
        focusable={selectable.focusable()}
        disabled={isDisabled()}
        accessibilityLabel={accessibilityLabel()}
        // R-033: the selected state is what the `selected:` classes read.
        accessibilityState={accessibilityState()}
        class={classes()}
        classList={classList()}
        style={resolvedStyle()}
        onPress={handlePress}
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        onLongPress={handleLongPress}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        // A-003: the invisible half of the hit-area path — computed by the
        // seam from `Environment` + the density table, never a prop;
        // `undefined` while the pointer gate holds.
        hitSlop={feedback.hitSlop()}
        onLayout={(event) => {
          // A-003: the measured size feeds the seam's `hitSlop`/`scale`.
          feedback.layout(event);
          tabs.registerBounds(key, event.bounds);
          local.onLayout?.(event);
        }}
      >
        <PressableFeedbackContext.Provider value={pressFeedbackContextValue}>
          {content()}
        </PressableFeedbackContext.Provider>
      </View>
    </TabContext.Provider>
  );
}
