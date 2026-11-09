import type {
  AccessibilityRole,
  AccessibilityState,
  JSX,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, untracked, View } from "nsh";

import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { renderChildren } from "./children";
import type { PopoverContextValue } from "./popover-context";
import { PopoverContentContext, PopoverContext } from "./popover-context";
import { popoverVariants } from "./popover.styles";

export interface PopoverDialogRenderValues {
  /** Closes the popover (HeroUI's `DialogRenderProps`). */
  close: () => void;
}

/**
 * The props of `Popover.Dialog`: React Aria's `AriaDialogProps` plus the
 * element props HeroUI forwards to its Dialog. NSH has no `dialog` role
 * (port sheet §5.8), so the role is left to the caller and the content is not
 * announced as a dialog; `render` is accepted but does nothing.
 */
export interface PopoverDialogProps {
  /** A node, or HeroUI's function form, called once with `{ close }`. */
  children?: JSX.Element | ((values: PopoverDialogRenderValues) => JSX.Element);

  /** Appended after the dialog slot classes; later classes win. */
  className?: string;
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;

  /** The Dialog view. Focus moves here when a modal popover opens (§5.7). */
  ref?: (node: ViewRef) => void;

  /** HeroUI's Dialog has no such role in NSH; a caller may choose one. */
  role?: AccessibilityRole;
  "aria-label"?: string;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;

  /** Whether the view is a Tab stop. Defaults to `true` so that opening can
   * focus it; HeroUI's dialog is `tabIndex={-1}` and is not a Tab stop, which
   * is registered as a known difference (§5.7).
   */
  focusable?: boolean;

  /** Focus entering the dialog; the channel NSH has for the open focus move. */
  onFocus?: () => void;
  onBlur?: () => void;

  /** Accepted, no effect: NSH has no id-based accessible name resolution. */
  "aria-labelledby"?: string;
  /** Accepted, no effect: NSH has no id-based description resolution. */
  "aria-describedby"?: string;
  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;
  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

/**
 * Popover.Dialog / PopoverDialog: HeroUI's `DialogPrimitive`, a `View` that
 * carries the dialog's padding and receives focus when a modal popover opens.
 */
export function PopoverDialog(props: PopoverDialogProps) {
  const content = PopoverContentContext();
  const trigger = OverlayTriggerContext();
  const popover = PopoverContext();

  const slots = (popover?.slots ?? popoverVariants());

  const classes = () =>
    [slots.dialog(), props.className ?? ""].filter((part) => part !== "").join(" ");

  const close = () => trigger?.close();

  let unregister: (() => void) | undefined;

  const handleRef = (node: ViewRef) => {
    unregister?.();
    unregister = content?.registerDialog(node);
    cleanup(() => unregister?.());
    props.ref?.(node);
  };

  // One read of `props.children`, at the placement. HeroUI's Dialog children
  // may be a function taking `{ close }`; a zero-argument function is NSH's
  // reactive child instead (D17), so the arity decides, as in Button.
  const renderDialog = () => {
    const child = props.children;

    if (typeof child === "function" && child.length >= 1) {
      return renderChildren(
        untracked(() => (child as (values: PopoverDialogRenderValues) => JSX.Element)({ close })),
      );
    }

    return renderChildren(child as JSX.Element);
  };

  return (
    <View
      ref={handleRef}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      role={props.role}
      focusable={props.focusable ?? true}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      accessibilityState={props.accessibilityState}
      class={classes()}
      style={props.style}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
    >
      {renderDialog()}
    </View>
  );
}
