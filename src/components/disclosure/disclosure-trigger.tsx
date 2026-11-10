import type {
  Accessor,
  AccessibilityState,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, effect, signal, split, View } from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { toAccessibilityRole } from "../button/roles";
import { DisclosureContext, FALLBACK_DISCLOSURE_CONTEXT } from "./disclosure-context";
import { disclosureVariants } from "./disclosure.styles";
import { renderChildren } from "./render-children";

/**
 * What `Disclosure.Trigger`'s render props receive. HeroUI's `ButtonRenderProps`
 * carries plain values; per D17 they are accessors. All six are real here: the
 * trigger mirrors hover, press and focus from the host events it receives, and
 * derives `isFocusVisible` from the interaction modality (port sheet §1.1, §2).
 */
export interface DisclosureTriggerRenderProps {
  /** The pointer is over the trigger (off while disabled or pending). */
  isHovered: Accessor<boolean>;

  /** A press is in progress. */
  isPressed: Accessor<boolean>;

  /** The trigger has the keyboard focus. */
  isFocused: Accessor<boolean>;

  /** Focus arrived from the keyboard, so the focus ring shows. */
  isFocusVisible: Accessor<boolean>;

  /** Interaction is blocked (the disclosure's own flag or its group's). */
  isDisabled: Accessor<boolean>;

  /** The trigger is pending, as React Aria's `isPending`. */
  isPending: Accessor<boolean>;
}

/**
 * The props of `Disclosure.Trigger`: React Aria's `ButtonProps`, the set
 * HeroUI 3.2.7 spreads onto `Button` with `slot="trigger"`.
 *
 * The DOM-only members (`type`, `form*`, `slot`, `render`, the `aria-*`
 * relations) are accepted so HeroUI code keeps compiling; port sheet §1.1 and
 * §8 say what each can and cannot do here.
 */
export interface DisclosureTriggerProps {
  /** The trigger's content: a node, or a render prop called with the trigger state. */
  children?: JSX.Element | ((values: DisclosureTriggerRenderProps) => JSX.Element);

  /** Appended after the trigger slot; later classes win. Function form gets the render props. */
  className?: string | ((values: DisclosureTriggerRenderProps) => string | undefined);

  /** Style of the trigger; function form gets the render props. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: DisclosureTriggerRenderProps) => StyleProp<ViewStyle>);

  /** Appends to the disclosure's own disabling. */
  isDisabled?: boolean;

  /** Reports a pending button: interaction is blocked, the trigger stays focusable. */
  isPending?: boolean;

  /**
   * A completed activation. HeroUI's RAC button merges this after the
   * disclosure's own toggle, so the panel has already switched when it runs.
   */
  onPress?: (event: PressEvent) => void;

  /** The press began. */
  onPressStart?: (event: PressEvent) => void;

  /** The press was released over the trigger. */
  onPressUp?: (event: PressEvent) => void;

  /** The press ended, whether or not it became a press. */
  onPressEnd?: (event: PressEvent) => void;

  /** Every press-start / press-end transition. */
  onPressChange?: (isPressed: boolean) => void;

  /** A press went down on the trigger. */
  onPressDown?: (event: PressEvent) => void;

  /** A press held for about half a second. */
  onLongPress?: (event: PressEvent) => void;
  onLongPressStart?: (event: PressEvent) => void;
  onLongPressEnd?: (event: PressEvent) => void;

  /** The pointer came over the trigger. */
  onHoverStart?: (event: NshMouseEvent) => void;

  /** The pointer left the trigger. */
  onHoverEnd?: (event: NshMouseEvent) => void;

  /** Every hover transition. */
  onHoverChange?: (isHovered: boolean) => void;

  /** NSH host mouse events, chained beside the internal hover tracking. */
  onMouseEnter?: (event: NshMouseEvent) => void;
  onMouseLeave?: (event: NshMouseEvent) => void;

  /** The trigger took the keyboard focus. */
  onFocus?: () => void;

  /** The trigger lost the keyboard focus. */
  onBlur?: () => void;

  /** Focuses the trigger after it mounts. */
  autoFocus?: boolean;

  /** Leaves the trigger out of the Tab order. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: a press never focuses a view in NSH anyway. */
  preventFocusOnPress?: boolean;

  /** Accepted, no effect: NSH has no native form submission. */
  type?: "button" | "submit" | "reset";

  /** Accepted, no effect: NSH has no native form. */
  form?: string;
  formAction?: string;
  formEncType?: string;
  formMethod?: string;
  formNoValidate?: boolean;
  formTarget?: string;

  /** The trigger's role, HeroUI's `AriaRole`; defaults to `button`. */
  role?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** A hint shown while the pointer rests on the trigger. */
  tooltip?: JSX.Element;

  /** The trigger was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** The trigger's view; a callback, because a ref store throws on the web target. */
  ref?: (node: ViewRef) => void;

  /** The accessible name; HeroUI's `aria-label` wins over it. */
  accessibilityLabel?: string;

  /** The host state object; the expanded state is merged into it. */
  accessibilityState?: AccessibilityState;

  /** NSH host props accepted beside the ARIA aliases. */
  "aria-label"?: string;
  "aria-hidden"?: boolean;
  "aria-disabled"?: boolean;
  "aria-busy"?: boolean;
  "aria-expanded"?: boolean;
  "aria-pressed"?: boolean | "mixed";
  "aria-selected"?: boolean;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Every other `aria-*` attribute, accepted for API parity. */
  [key: `aria-${string}`]: unknown;

  /** Every `data-*` attribute: NSH projects none of them (D18). */
  [key: `data-${string}`]: unknown;
}

/**
 * Disclosure.Trigger / DisclosureTrigger: the button that expands and collapses
 * the panel (port sheet §3).
 *
 * Built on the core `View`, not on nsh/base `Button`: that component exposes
 * only `onPress` / `onPressDown` / `onPressUp`, so the `isHovered`, `isFocused`,
 * `isFocusVisible` and `isPending` render prop values HeroUI's `ButtonProps`
 * promise could not be produced (criterion B3). The interaction wiring follows
 * the repo's own Button, the reference HeroUI's trigger is.
 *
 * The press order is React Aria's: the disclosure's toggle runs first, then the
 * caller's `onPress`, as `mergeProps(buttonProps, props)` chains them.
 */
export function DisclosureTrigger(props: DisclosureTriggerProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "isDisabled",
    "isPending",
    "onPress",
    "onPressStart",
    "onPressUp",
    "onPressEnd",
    "onPressChange",
    "onPressDown",
    "onLongPress",
    "onLongPressStart",
    "onLongPressEnd",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onMouseEnter",
    "onMouseLeave",
    "onFocus",
    "onBlur",
    "autoFocus",
    "excludeFromTabOrder",
    "preventFocusOnPress",
    "type",
    "form",
    "formAction",
    "formEncType",
    "formMethod",
    "formNoValidate",
    "formTarget",
    "role",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "onLayout",
    "ref",
    "accessibilityLabel",
    "accessibilityState",
    "aria-label",
    "aria-hidden",
    "aria-disabled",
    "aria-busy",
    "aria-expanded",
    "aria-pressed",
    "aria-selected",
    "render",
    "slot",
  ] as const);

  const ctx = DisclosureContext() ?? FALLBACK_DISCLOSURE_CONTEXT;
  const slots = disclosureVariants();

  const isHovered = signal(false);
  const isPressed = signal(false);
  const isFocused = signal(false);
  const modality = createInteractionModality();

  // R-005: the ring is `:focus-visible`, which in NSH is the focus the keyboard
  // gave: a pointer press never focuses a view, so the modality decides.
  const isFocusVisible = computed(() => isFocused() && modality.isKeyboard());

  const isExpanded = ctx.isExpanded;
  const isDisabled = computed(() => ctx.isDisabled() || local.isDisabled === true);
  const isPending = computed(() => local.isPending === true);
  const isBlocked = () => isDisabled() || isPending();

  // `isFocusVisibleWithin` travels up to the root from here (port sheet §2).
  cleanup(ctx.registerFocusVisible(isFocusVisible));

  const renderProps: DisclosureTriggerRenderProps = {
    isHovered,
    isPressed,
    isFocused,
    isFocusVisible,
    isDisabled,
    isPending,
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() =>
    [slots.trigger(), resolvedClassName() ?? ""].filter((part) => part.length > 0).join(" "),
  );

  // V4: Return and Space activation fire the same press handlers a pointer
  // press does, and `PressEvent` carries no `pointerType`; `isKeyboardPress`
  // reads the reported position instead. Never infer it from hover: a hovered
  // trigger activated by Enter is still a keyboard interaction.
  const notePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      modality.setKeyboardModality();
    } else {
      modality.setPointerModality();
    }
  };

  const handlePress = (event: PressEvent) => {
    if (isBlocked()) {
      return;
    }

    notePress(event);
    // Before the caller's `onPress`, as React Aria chains the trigger slot's
    // handler ahead of the caller's own.
    ctx.toggle();
    local.onPress?.(event);
  };

  const handlePressDown = (event: PressEvent) => {
    if (isBlocked()) {
      return;
    }

    notePress(event);
    isPressed.set(true);
    local.onPressStart?.(event);
    local.onPressDown?.(event);
    local.onPressChange?.(true);
  };

  const handlePressUp = (event: PressEvent) => {
    if (isPressed()) {
      isPressed.set(false);
      local.onPressChange?.(false);
    }

    if (isBlocked()) {
      return;
    }

    local.onPressUp?.(event);
    local.onPressEnd?.(event);
  };

  const handleLongPress = (event: PressEvent) => {
    if (isBlocked()) {
      return;
    }

    local.onLongPressStart?.(event);
    local.onLongPress?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

    if (isBlocked() || isHovered()) {
      return;
    }

    isHovered.set(true);
    local.onHoverStart?.(event);
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);

    if (!isHovered()) {
      return;
    }

    isHovered.set(false);
    local.onHoverEnd?.(event);
    local.onHoverChange?.(false);
  };

  const handleFocus = () => {
    isFocused.set(true);
    // A view is focused by Tab on macOS and the web; a pointer press does not
    // focus it, so this is the keyboard modality arriving.
    modality.onFocus();
    local.onFocus?.();
  };

  const handleBlur = () => {
    isFocused.set(false);
    local.onBlur?.();
  };

  let node: ViewRef | undefined;

  effect(() => {
    if (local.autoFocus) {
      node?.focus();
    }
  });

  // RAC reports a pending button as unavailable but keeps it focusable, so
  // `accessibilityState.disabled` covers both while `View.disabled` does not.
  const accessibilityState = computed<AccessibilityState>(() => {
    const own = local.accessibilityState ?? {};

    return {
      ...own,
      disabled: isDisabled() || isPending() || own.disabled === true,
      busy: local["aria-busy"] ?? own.busy,
      checked: own.checked,
      expanded: local["aria-expanded"] ?? isExpanded(),
      pressed: local["aria-pressed"] ?? own.pressed,
      selected: local["aria-selected"] ?? own.selected,
    };
  });

  const resolveChildren = (
    children: JSX.Element | ((values: DisclosureTriggerRenderProps) => JSX.Element),
  ) => {
    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        (children as (values: DisclosureTriggerRenderProps) => JSX.Element)(renderProps),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <View
      ref={(next) => {
        node = next;
        local.ref?.(next);
      }}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      role={toAccessibilityRole(local.role, "button")}
      disabled={isDisabled()}
      focusable={local.excludeFromTabOrder === true ? false : undefined}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityState={accessibilityState()}
      accessibilityElementsHidden={local["aria-hidden"]}
      class={classes()}
      // R-005: `.disclosure__trigger:focus-visible` → `status-focused`
      // (`ring-2 ring-focus`, offset from the background). `--tw-ring-offset-width`
      // has no variable here, so `ring-offset-2` is the equivalent.
      classList={{
        "ring-2 ring-focus ring-offset-2 ring-offset-background": isFocusVisible(),
        "pointer-events-none": isPending(),
      }}
      style={resolvedStyle()}
      onPress={handlePress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onLongPress={handleLongPress}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onLayout={local.onLayout}
    >
      {resolveChildren(local.children)}
    </View>
  );
}
