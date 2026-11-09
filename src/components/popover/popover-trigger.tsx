import type {
  AccessibilityRole,
  AccessibilityState,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, reduceMotion, signal, View } from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { renderChildren } from "./children";
import type { PopoverContextValue } from "./popover-context";
import { PopoverContext } from "./popover-context";
import { popoverVariants } from "./popover.styles";

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Popover.Trigger`: HeroUI's `PopoverTriggerProps`, the
 * `DOMRenderProps<'div', undefined>` surface plus `children` and `className`.
 * NSH has one pressable host view, so `render` and the DOM event names are
 * accepted for parity but do nothing; `onPress` and friends are the event
 * surface (port sheet §1.3).
 */
export interface PopoverTriggerProps {
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** The role to expose; HeroUI writes `"button"` and lets the caller override it. */
  role?: AccessibilityRole;

  /** The anchor and focus-return target (port sheet §2). */
  ref?: (node: ViewRef) => void;

  /** `aria-disabled` upstream, and the `disabled` alias NSH can act on. */
  disabled?: boolean;

  "aria-disabled"?: boolean;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;
  nativeID?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: NSH has no `role="dialog"` relationship fields. */
  "aria-haspopup"?: "dialog" | "menu" | "listbox" | "tree" | "grid" | boolean;
  /** Accepted, no effect: the content has no queryable id relation. */
  "aria-controls"?: string;

  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  onPress?: (event: PressEvent) => void;
  onPressDown?: (event: PressEvent) => void;
  onPressUp?: (event: PressEvent) => void;
  onLongPress?: (event: PressEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onMouseEnter?: (event: NshMouseEvent) => void;
  onMouseLeave?: (event: NshMouseEvent) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Popover.Trigger / PopoverTrigger: HeroUI's `PressablePrimitive` around a
 * `div[role="button"]`. It is the model overlay trigger: it consumes the root's
 * `OverlayTriggerContext`, toggles the open state and registers itself as the
 * anchor, so it works even when the trigger is not a Button.
 */
export function PopoverTrigger(props: PopoverTriggerProps) {
  const trigger = OverlayTriggerContext();
  const popover = PopoverContext();

  const slots = popover?.slots ?? popoverVariants();

  const modality = createInteractionModality();
  // `createInteractionModality` tracks which modality interacted; this signal
  // tracks whether the view has focus at all (R-021 needs both).
  const focused = signal(false);

  const isDisabled = () => props.disabled ?? props["aria-disabled"] === true;
  const isFocusVisible = computed(() => focused() && modality.isKeyboard());

  const classes = () => [slots.trigger(), props.className ?? ""].filter((part) => part !== "").join(" ");

  // R-018 / R-019: one property list, one curve; `motion-reduce` is a class but
  // the inline property list would win over `transition-none`, so reduce-motion
  // also clears it here (Button's solved pattern).
  const transitionProperty = () =>
    reduceMotion() ? "none" : "color, background-color, box-shadow";

  // V4: Return / Space report `pagePosition` exactly `{x: 0, y: 0}`, a real
  // pointer press reports where it happened.
  const notePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      modality.setKeyboardModality();
    } else {
      modality.setPointerModality();
    }
  };

  const handlePress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    notePress(event);
    // The trigger's own toggle runs before the caller's `onPress`, as
    // PressResponder's `onPress` runs before the element's.
    trigger?.toggle();
    props.onPress?.(event);
  };

  const handlePressDown = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    notePress(event);
    props.onPressDown?.(event);
  };

  const handlePressUp = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    props.onPressUp?.(event);
  };

  const handleLongPress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    props.onLongPress?.(event);
  };

  const handleFocus = () => {
    focused.set(true);
    // A view is focused by Tab / `focus()`, never by a pointer press.
    modality.onFocus();
    props.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    props.onBlur?.();
  };

  let unregister: (() => void) | undefined;

  const handleRef = (node: ViewRef) => {
    unregister?.();
    unregister = trigger?.registerTrigger(node);
    cleanup(() => unregister?.());
    props.ref?.(node);
  };

  // R-021 focus ring, R-022 disabled look.
  const classList = computed(() => ({
    "ring-2 ring-focus ring-offset-0 ring-offset-background outline-none": isFocusVisible(),
    "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
  }));

  const accessibilityState = computed<AccessibilityState>(() => ({
    ...props.accessibilityState,
    expanded: props["aria-expanded"] ?? trigger?.isOpen(),
  }));

  return (
    <View
      ref={handleRef}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      role={props.role ?? "button"}
      disabled={isDisabled()}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      accessibilityState={accessibilityState()}
      class={classes()}
      classList={classList()}
      style={[{ transitionProperty: transitionProperty() }, props.style]}
      onPress={handlePress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onLongPress={handleLongPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {renderChildren(props.children)}
    </View>
  );
}
