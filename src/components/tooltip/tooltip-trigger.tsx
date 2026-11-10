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
import { HoverTriggerContext } from "../../primitives/create-overlay-trigger";
import { renderChildren } from "./children";
import { TooltipContext } from "./tooltip-context";
import { tooltipVariants } from "./tooltip.styles";

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Tooltip.Trigger`: HeroUI's `TooltipTriggerProps`, the
 * `DOMRenderProps<'div', undefined>` surface plus `children` and `className`.
 * NSH has one pressable host view, so `render` and the DOM event names are
 * accepted for parity but do nothing; `onPress` and friends are the event
 * surface (port sheet §1.3).
 */
export interface TooltipTriggerProps {
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** HeroUI writes `"button"` and lets the caller override it. */
  role?: AccessibilityRole;

  /**
   * React Aria's `useFocusable` gives the trigger `tabIndex` 0; `-1` keeps it
   * out of the Tab order. NSH has no DOM `tabIndex`, so this maps `focusable`.
   */
  tabIndex?: number;

  /** The anchor, and the hover / focus source. */
  ref?: (node: ViewRef) => void;

  "aria-label"?: string;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;
  nativeID?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /**
   * `disabled` / `aria-disabled` upstream: HeroUI's trigger is a `div` fed
   * through `mergeProps` (`tooltip.tsx:202-229`) with no disable logic, so
   * HeroUI only writes the ARIA state. NSH's `View disabled` would also block
   * presses and paint disabled styles, so these map to `accessibilityState`
   * alone.
   */
  disabled?: boolean;
  "aria-disabled"?: boolean;

  /** Accepted, no effect: NSH resolves no descriptions from ids (port sheet §5.8). */
  "aria-describedby"?: string;
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
 * Tooltip.Trigger / TooltipTrigger: HeroUI's `div[role="button"]` around
 * `useFocusable`. It consumes the root's hover / focus channel itself, because
 * NSH has no handler injection channel: hovering, focusing and pressing it feed
 * the root's state machine, and it registers itself as the anchor.
 */
export function TooltipTrigger(props: TooltipTriggerProps) {
  const hoverTrigger = HoverTriggerContext();
  const tooltip = TooltipContext();

  const slots = tooltip?.slots ?? tooltipVariants();

  const modality = createInteractionModality();
  // The modality says which input interacted last; this says whether the view
  // has focus at all, and R-019 needs both.
  const focused = signal(false);

  const isDisabled = () => props.disabled ?? props["aria-disabled"] === true;

  const isFocusVisible = computed(() => focused() && modality.isKeyboard());

  const classes = () =>
    [slots.trigger(), props.className ?? ""].filter((part) => part !== "").join(" ");

  // R-017 / R-018: one property list and one curve for the three transitions.
  // `motion-reduce` is a class, but the inline property list would beat
  // `transition-none`, so reduce-motion also clears it here (Button's pattern).
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
    notePress(event);
    // The root's press response runs before the caller's `onPress`, as React
    // Aria's injected handler runs before the element's own.
    hoverTrigger?.press();
    props.onPress?.(event);
  };

  const handlePressDown = (event: PressEvent) => {
    notePress(event);
    hoverTrigger?.pressStart();
    props.onPressDown?.(event);
  };

  const handlePressUp = (event: PressEvent) => {
    props.onPressUp?.(event);
  };

  const handleLongPress = (event: PressEvent) => {
    props.onLongPress?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    hoverTrigger?.hoverStart();
    props.onMouseEnter?.(event);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    hoverTrigger?.hoverEnd();
    props.onMouseLeave?.(event);
  };

  const handleFocus = () => {
    focused.set(true);
    // A view is focused by Tab / `focus()`, never by a pointer press.
    modality.onFocus();
    hoverTrigger?.focusStart();
    props.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    hoverTrigger?.focusEnd();
    props.onBlur?.();
  };

  let unregister: (() => void) | undefined;

  const handleRef = (node: ViewRef) => {
    unregister?.();
    unregister = hoverTrigger?.registerTrigger(node);
    cleanup(() => unregister?.());
    props.ref?.(node);
  };

  // R-019: the focus ring only shows for keyboard navigation, as HeroUI's
  // `:focus-visible` does (`data-focus-visible` has no NSH counterpart).
  const classList = computed(() => ({
    "ring-2 ring-focus ring-offset-0 ring-offset-background outline-none": isFocusVisible(),
  }));

  const accessibilityState = computed<AccessibilityState>(() => ({
    ...props.accessibilityState,
    disabled: isDisabled() || props.accessibilityState?.disabled,
  }));

  return (
    <View
      ref={handleRef}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      role={props.role ?? "button"}
      focusable={props.tabIndex === -1 ? false : undefined}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      accessibilityState={accessibilityState()}
      class={classes()}
      classList={classList()}
      style={[{ transitionProperty: transitionProperty() }, props.style]}
      onPress={handlePress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onLongPress={handleLongPress}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {renderChildren(props.children)}
    </View>
  );
}
