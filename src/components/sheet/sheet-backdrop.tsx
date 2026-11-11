import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { split, View } from "nsh";

import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";
import type { SheetSwipeDirection, SheetVariants } from "./sheet.styles";

/**
 * The props of `Sheet.Backdrop`: HeroUI's `SheetBackdropProps`, which is React
 * Aria's `SheetOverlay` props minus the ones the context owns, plus
 * `isExiting`, `variant` and `className`.
 *
 * `style` is *not* part of the surface: upstream omits it from
 * `ComponentPropsWithRef<typeof AriaSheetOverlay>`, so adding one here would
 * invent an API HeroUI does not have (port sheet §1).
 */
export interface SheetBackdropProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "style"> {
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /**
   * Keep the backdrop mounted while the sheet is closed. The modal behavior
   * still ends with `isOpen`; use it to retain content through an exit.
   */
  isExiting?: boolean;

  /** The backdrop's paint. @default "opaque" */
  variant?: SheetVariants["backdrop"];

  /** Overrides the placement as the direction a swipe dismisses in (T-014). */
  swipeDirection?: SheetSwipeDirection;

  /** Whether a press outside closes it. @default true */
  isDismissable?: boolean;

  /** Whether Escape and the back button close it. @default false */
  isKeyboardDismissDisabled?: boolean;

  /** Forces the entering phase. */
  isEntering?: boolean;

  /** Accepted, no effect: the host owns the overlay's animation. */
  onEnter?: (element?: unknown) => void | Promise<void>;

  /** Accepted, no effect: the host owns the overlay's animation. */
  onExit?: (element?: unknown) => void | Promise<void>;

  /** Accepted, no effect: there is no DOM element to test. */
  shouldCloseOnInteractOutside?: (element?: unknown) => boolean;

  /** Accepted, no effect: deprecated upstream, and NSH has no portal. */
  UNSTABLE_portalContainer?: unknown;

  /** Forwarded as a callback to the overlay's root view. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM attribute channel. */
  [key: `data-${string}`]: unknown;
}

/**
 * Sheet.Backdrop / SheetBackdrop: the modal layer and the backdrop paint
 * (R-001 … R-007, R-042).
 *
 * Stub: the implemented part hosts nsh/base `Dialog`, paints the backdrop from
 * the stack index, provides `SheetSwipeDirectionContext` and drives
 * `onAnimationEnd` from the dialog's open / close callbacks (port sheet §3).
 */
export function SheetBackdrop(props: SheetBackdropProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "isExiting",
    "variant",
    "swipeDirection",
    "isDismissable",
    "isKeyboardDismissDisabled",
    "isEntering",
    "onEnter",
    "onExit",
    "shouldCloseOnInteractOutside",
    "UNSTABLE_portalContainer",
    "ref",
    "id",
    "nativeID",
    "render",
    "slot",
  ]);

  const className = (): string => local.className ?? "";
  const style = (): StyleProp<ViewStyle> | undefined => undefined;

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={className()}
      style={style()}
    >
      {renderSheetPartChildren(local.children)}
    </View>
  );
}
