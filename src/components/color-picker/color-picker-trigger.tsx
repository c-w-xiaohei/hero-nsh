import type {
  AccessibilityState,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { reduceMotion, split, View } from "nsh";

import { PopoverTrigger } from "../popover";
import { joinClassNames } from "./class-names";
import { ColorPickerContext } from "./color-picker-context";
import { colorPickerVariants } from "./color-picker.styles";
import type { AriaProps, DataProps, DomEventProps, GlobalDomProps } from "./dom-props";

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ColorPicker.Trigger`: HeroUI 3.2.7's `ColorPickerTriggerProps`,
 * which is React Aria Components' `Button` — every press, hover and focus
 * handler, `isDisabled`, `autoFocus`, `excludeFromTabOrder`,
 * `preventFocusOnPress`, `isPending` and the ARIA surface.
 *
 * The part is `Popover.Trigger` plus the trigger slot classes (port sheet
 * §1.2): it opens and closes the popover, registers the anchor, writes
 * `aria-expanded`, returns the focus on close and draws the focus ring and the
 * disabled look. The members with no channel here are accepted and have no
 * effect (§8).
 */
export interface ColorPickerTriggerProps
  extends AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps {
  /** The trigger's content, normally a `ColorSwatch` and a `Label`. */
  children?: JSX.Element;

  /** Appended after the `trigger` slot class; later classes win. */
  className?: string;

  /** The inline style; the property list is added in front of it. */
  style?: StyleProp<ViewStyle>;

  /** Blocks the trigger: no press, no open, the 0.5 disabled look. */
  isDisabled?: boolean;

  /** `aria-disabled` upstream; the same switch as `isDisabled`. */
  "aria-disabled"?: boolean;

  /** The accessible name comes from the children when they carry one. */
  "aria-label"?: string;

  accessibilityLabel?: string;

  accessibilityState?: AccessibilityState;

  /** Overrides the open state the trigger reports. */
  "aria-expanded"?: boolean;

  /** Accepted, no effect: NSH has no `role="dialog"` relationship fields. */
  "aria-haspopup"?: "dialog" | "menu" | "listbox" | "tree" | "grid" | boolean;

  /** Accepted, no effect: the popover has no queryable id relation. */
  "aria-controls"?: string;

  /** Accepted, no effect: a pending press has no spinner state in NSH. */
  isPending?: boolean;

  /** Accepted, no effect: a pointer press never focuses a view here. */
  preventFocusOnPress?: boolean;

  /** Accepted, no effect: NSH has no per-view autofocus on mount here. */
  autoFocus?: boolean;

  /** Accepted, no effect: Tab order is `focusable`, a boolean in NSH. */
  excludeFromTabOrder?: boolean;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  nativeID?: string;

  testID?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no RAC slot context. */
  slot?: string;

  /** The anchor and the focus-return target. */
  ref?: (node: ViewRef) => void;

  onPress?: (event: PressEvent) => void;
  onPressStart?: (event: PressEvent) => void;
  onPressEnd?: (event: PressEvent) => void;
  onPressDown?: (event: PressEvent) => void;
  onPressUp?: (event: PressEvent) => void;
  onPressChange?: (isPressed: boolean) => void;
  onLongPress?: (event: PressEvent) => void;
  onLongPressStart?: (event: PressEvent) => void;
  onLongPressEnd?: (event: PressEvent) => void;
  onHoverStart?: (event: NshMouseEvent) => void;
  onHoverEnd?: (event: NshMouseEvent) => void;
  onHoverChange?: (isHovered: boolean) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * ColorPicker.Trigger / ColorPickerTrigger: the `color-picker__trigger` slot
 * around a `Popover.Trigger`.
 *
 * R-102 / R-104 / R-106 live in the trigger slot (styles file). R-105 is the
 * inline property list: upstream animates `background-color` 150ms
 * `--ease-smooth` and `box-shadow` 150ms `--ease-out`, NSH has one curve per
 * element, so both take `ease-smooth` (port sheet §8). R-108 (the focus ring)
 * and R-109 (the disabled look) stay on `Popover.Trigger`, their one owner;
 * R-107 (the label's cursor) is deleted because `cursor` inherits here.
 */
export function ColorPickerTrigger(props: ColorPickerTriggerProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "isDisabled",
    "aria-disabled",
    "aria-label",
    "accessibilityLabel",
    "accessibilityState",
    "aria-expanded",
    "aria-haspopup",
    "aria-controls",
    "isPending",
    "preventFocusOnPress",
    "autoFocus",
    "excludeFromTabOrder",
    "id",
    "nativeID",
    "testID",
    "ref",
    "slot",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
    "onPress",
    "onPressStart",
    "onPressEnd",
    "onPressDown",
    "onPressUp",
    "onPressChange",
    "onLongPress",
    "onLongPressStart",
    "onLongPressEnd",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onFocus",
    "onBlur",
    "onClick",
    "onDoubleClick",
    "onMouseDown",
    "onMouseUp",
    "onMouseMove",
    "onPointerDown",
    "onPointerUp",
    "onKeyDown",
    "onKeyUp",
    "onFocusCapture",
    "onBlurCapture",
  ] as const);

  const slots = ColorPickerContext()?.slots ?? colorPickerVariants();

  // R-102 / R-104 / R-106: the trigger slot, then the caller's class.
  const classes = () => joinClassNames(slots.trigger(), local.className);

  // R-105: the property list, inline because NSH has no `transition-<property>`
  // class for a pair. Reduce-motion clears it here as well as in the class, or
  // the inline list would win over `transition-none`.
  const transitionProperty = () =>
    reduceMotion() ? "none" : "background-color, box-shadow";

  const handlePressDown = (event: PressEvent) => {
    local.onPressChange?.(true);
    local.onPressStart?.(event);
    local.onPressDown?.(event);
  };

  const handlePressUp = (event: PressEvent) => {
    local.onPressChange?.(false);
    local.onPressUp?.(event);
    local.onPressEnd?.(event);
  };

  const handleLongPress = (event: PressEvent) => {
    local.onLongPressStart?.(event);
    local.onLongPress?.(event);
    local.onLongPressEnd?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onHoverChange?.(true);
    local.onHoverStart?.(event);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onHoverChange?.(false);
    local.onHoverEnd?.(event);
  };

  return (
    <PopoverTrigger
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      disabled={local.isDisabled ?? local["aria-disabled"] === true}
      accessibilityLabel={
        (local["aria-label"] as string | undefined) ?? local.accessibilityLabel
      }
      accessibilityState={local.accessibilityState}
      aria-expanded={local["aria-expanded"]}
      className={classes()}
      style={[{ transitionProperty: transitionProperty() }, local.style]}
      onPress={local.onPress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onLongPress={handleLongPress}
      onFocus={local.onFocus}
      onBlur={local.onBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/*
        A real `<button>` receives the presses its children do not consume, and
        the DOM bubbles them up. NSH presses do not bubble and the Label inside
        does hear its own press (it forwards it to a field that this trigger is
        not), so the content is made non-interactive: the whole trigger is one
        button, its content is decoration (port sheet §1.2).
      */}
      <View class="flex-row items-center gap-3 pointer-events-none">
        {local.children}
      </View>
    </PopoverTrigger>
  );
}
