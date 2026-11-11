import type { JSX } from "nsh";

/**
 * The props of `Sheet.Close`: HeroUI's `SheetCloseProps`, a single child
 * element whose `onPress` React Aria merges with the close channel.
 */
export interface SheetCloseProps {
  children: JSX.Element;
}

/**
 * Sheet.Close / SheetClose: the close channel around one button (port sheet
 * §5).
 *
 * Stub: once the scope below it is known, the implemented part provides an
 * `OverlayTriggerContext` whose press closes the sheet, so a `Button` inside it
 * closes instead of toggling; it renders no host view.
 */
export function SheetClose(props: SheetCloseProps): JSX.Element {
  return props.children;
}
