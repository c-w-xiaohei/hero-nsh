import type { Accessor } from "nsh";

import type { SheetPlacement, SheetSwipeDirection } from "./sheet.styles";

/**
 * What `Sheet.Content`'s function child receives, in the order HeroUI's
 * `SheetRenderProps` (React Aria's render props) carries them: port sheet §1.
 *
 * D17 turns the live values into accessors, so a function child reads
 * `position()` rather than `position` (the scenarios use exactly that shape),
 * and the object is passed once, not rebuilt per render. `position` is the
 * placement, `stackIndex` the sheet's place in the open-sheet stack, and
 * `hasDescendants` reports a nested sheet inside this one.
 */
export interface SheetRenderValues {
  position: Accessor<SheetPlacement>;
  swipeDirection: Accessor<SheetSwipeDirection>;
  stackIndex: Accessor<number>;
  hasDescendants: Accessor<boolean>;
  isExpanded: Accessor<boolean>;
  isEntering: Accessor<boolean>;
  isExiting: Accessor<boolean>;
}
