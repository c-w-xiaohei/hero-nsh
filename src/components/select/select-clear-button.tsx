import type {
  Bounds,
  JSX,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, createAnimatedValue, split, View } from "nsh";

import {
  createInput,
  createPressFeedback,
  PressableFeedbackContext,
  type PressableFeedbackContextValue,
} from "../../primitives";
import { renderChildren } from "../list-box/children";
import { SelectContext, SelectTriggerContext } from "./select-context";

export interface SelectClearButtonProps {
  /** Custom icon content; empty draws the built-in cross. */
  children?: JSX.Element;

  /** Appended after the clear-button slot classes. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;

  /** A DOM click upstream; the press that clears (only a completed press counts). */
  onClick?: (e: PressEvent) => void;

  /** A DOM pointerdown upstream; the press start here. */
  onPointerDown?: (e: PressEvent) => void;

  "aria-hidden"?: boolean;

  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * Select.ClearButton / SelectClearButton: the small cross inside the trigger.
 * Upstream it is an `aria-hidden` `<span>` (a button cannot nest in the
 * trigger's `<button>`), and clearing happens on click, so only the primary
 * button clears. NSH has no nested-button rule: a non-focusable `View` that
 * takes presses plays the same part (port sheet §3).
 */
export function SelectClearButton(props: SelectClearButtonProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "onClick",
    "onPointerDown",
    "aria-hidden",
    "accessibilityElementsHidden",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const select = SelectContext();
  const trigger = SelectTriggerContext();

  if (!select) {
    return null;
  }

  // The trigger's own `isDisabled` wins over the root's, as upstream
  // (`SelectTriggerContext` carries the resolved value).
  const isDisabled = () => trigger?.isDisabled() ?? select.isDisabled();
  const isEmpty = select.isSelectionEmpty;

  // A-008: the press-feedback seam's invisible half only — `hitSlop` plus the
  // `layout` read that feeds it (popover-trigger A-005's two-channel wiring).
  // `isEmpty` folds into the gate: an empty field's `pointer-events-none` has
  // no press to report, so the accessor stays `undefined` there. Under a
  // pointer environment every accessor is inert.
  const input = createInput();
  const enabled = () => input() === "touch" && !isDisabled() && !isEmpty();
  const feedback = createPressFeedback({ enabled });

  // The context mirrors the trigger's convention so a part or probe can read
  // the accessor values; nothing else consumes the channels (`pressDown` /
  // `pressUp` stay unwired — R-027's `active:` class owns the press look).
  const feedbackValue: PressableFeedbackContextValue = {
    isPressed: feedback.isPressed,
    pressed: feedback.pressed,
    bounds: feedback.bounds,
    pressOrigin: feedback.pressOrigin,
    scale: feedback.scale,
    highlightOpacity: createAnimatedValue(0),
    rippleProgress: createAnimatedValue(0),
    enabled,
    hitSlop: feedback.hitSlop,
    isAllAnimationsDisabled: () => false,
  };

  // R-024: this registration is what enables the trigger's Backspace / Delete
  // shortcut, counted so two buttons cannot switch it off between them.
  cleanup(select.registerClearButton());

  // The hover mirror the trigger's `:hover:not(:has(.clear-button:hover))`
  // excludes (R-007). A pointer leaves the button when it goes anywhere else.
  const handleMouseEnter = () => trigger?.setClearHovered(true);
  const handleMouseLeave = () => trigger?.setClearHovered(false);

  cleanup(() => trigger?.setClearHovered(false));

  // HeroUI's handlers call the caller's callbacks on every press and gate only
  // the clearing (select.tsx:264-283: `onPointerDown` always, `onClick` always,
  // the selection change behind `!isDisabled && !isEmpty`). The press itself is
  // blocked upstream by the empty state's `pointer-events: none` (R-024) and by
  // the disabled field's `pointer-events: none` (R-011).
  const clear = (event?: PressEvent) => {
    if (!isDisabled() && !isEmpty()) {
      select.clear();

      // Upstream the clear button is a span inside the trigger button and its
      // pointerdown is not prevented, so the browser leaves the focus on the
      // trigger; here the trigger is a view and the focus has to be asked for.
      // It is where the Backspace / Delete shortcut lives (T-027).
      select.focusTrigger();
    }

    if (event) {
      local.onClick?.(event);
    }
  };

  const handlePressDown = (event: PressEvent) => {
    local.onPointerDown?.(event);
  };

  // R-022: the visible box stays 20pt and a child view widens the pointer
  // target to 24pt (WCAG 2.5.8). The child is what the pointer hits, so it
  // routes to the same entry instead of relying on the parent's press.
  // A-008: 24pt is below the touch minimum, so the seam expands this view's
  // hit area invisibly — the painted box stays 20pt, `hitSlop` is `undefined`
  // while gated (pointer, disabled or empty).
  const hitArea = () => (
    <View
      class="absolute -inset-0.5"
      focusable={false}
      disabled={isDisabled()}
      hitSlop={feedback.hitSlop()}
      onLayout={feedback.layout}
      onPress={clear}
      onPressDown={handlePressDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );

  // R-025: the built-in cross lives in a `size-3.5` box; a custom child is not
  // given that class (upstream clones it into the icon element instead).
  const cross = () => (
    <View class="relative size-3.5">
      <View class="absolute inset-x-0 top-1/2 border-b-[1.5px] rotate-45" />
      <View class="absolute inset-x-0 top-1/2 border-b-[1.5px] -rotate-45" />
    </View>
  );

  const content = () => {
    const children = local.children;

    if (children === undefined || children === null || children === false) {
      return cross();
    }

    return renderChildren(children as JSX.Element);
  };

  const classes = computed(() =>
    [select.slots().clearButton(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      // `aria-hidden` upstream: the tooltip is the trigger's, and a screen
      // reader clears with Backspace / Delete.
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden ?? true
      }
      // Not a Tab stop, but it still takes the pointer (`focusable={false}`).
      focusable={false}
      disabled={isDisabled()}
      class={classes()}
      classList={{
        // R-024: `[data-empty="true"]` → no pointer, no paint. The opacity
        // switch is instant (R-023 applies only while it is not empty).
        "pointer-events-none opacity-0": isEmpty(),
        "transition-none": isEmpty(),
        "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
      }}
      style={local.style}
      onPress={(event) => clear(event)}
      onPressDown={handlePressDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onLayout={local.onLayout}
    >
      <PressableFeedbackContext.Provider value={feedbackValue}>
        {content()}
        {hitArea()}
      </PressableFeedbackContext.Provider>
    </View>
  );
}
