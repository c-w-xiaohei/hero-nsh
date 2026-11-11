import type { JSX } from "nsh";

import type { OverlayTriggerContextValue } from "../../primitives/create-overlay-trigger";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { SheetContext } from "./sheet-context";

/**
 * The props of `Sheet.Close`: HeroUI's `SheetCloseProps`, a single child
 * element whose `onPress` React Aria merges with the close channel.
 */
export interface SheetCloseProps {
  children: JSX.Element;
}

/**
 * Sheet.Close / SheetClose: the close channel around one button (port sheet
 * §3, §5).
 *
 * Upstream clones the child and merges `onPress: closeSheet` into it, so a
 * `Button` inside `Sheet.Close` closes instead of toggling. NSH cannot inject a
 * handler into a child element, so the part provides an `OverlayTriggerContext`
 * of its own: every press channel a `Button` reads (`toggle`, `triggerPress`,
 * `close`) closes the sheet, while the Button keeps its own `onPress`, hover,
 * focus and disabled handling.
 *
 * The close runs before the child's `onPress` because the Button consumes the
 * overlay channel first (button-root's `handlePress`); upstream's `mergeProps`
 * order is child first. That is registered as port sheet §8 difference 7.
 *
 * `setIsOpen` stays the root's own setter: it is a direct write, not a toggle,
 * so `setIsOpen(true)` inside `Sheet.Close` must still open the sheet.
 *
 * `registerTrigger` is deliberately a no-op. A `Button` registers itself as the
 * overlay's anchor and focus-return target on mount; the button inside
 * `Sheet.Close` lives in the panel, and letting it replace the registered
 * trigger would send focus back to a view that unmounts with the sheet. The
 * same override is what `Popover.Content` does for its own subtree.
 */
export function SheetClose(props: SheetCloseProps): JSX.Element {
  const sheet = SheetContext();
  const parent = OverlayTriggerContext();

  const close = () => sheet?.close();

  const value: OverlayTriggerContextValue = {
    isOpen: sheet ? sheet.isOpen : () => false,
    setIsOpen:
      parent?.setIsOpen ??
      ((next) => {
        sheet?.setIsOpen(next);
      }),
    toggle: close,
    close,
    triggerPress: () => close(),
    registerTrigger: () => () => {},
    triggerRef: parent?.triggerRef ?? (() => undefined),
  };

  // `_common` exception: the part provides a context, so the children are read
  // once inside the Provider, at the placement, and nowhere else.
  return (
    <OverlayTriggerContext.Provider value={value}>{props.children}</OverlayTriggerContext.Provider>
  );
}
