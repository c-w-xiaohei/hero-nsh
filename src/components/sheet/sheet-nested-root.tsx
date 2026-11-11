import type { JSX } from "nsh";

import { SheetContext } from "./sheet-context";
import type { SheetRootProps } from "./sheet-root";
import { SheetRoot } from "./sheet-root";

/**
 * The props of `Sheet.NestedRoot`: HeroUI's `SheetNestedRootProps`, the same as
 * `Sheet.Root`'s.
 */
export type SheetNestedRootProps = SheetRootProps;

/**
 * Sheet.NestedRoot / SheetNestedRoot: a sheet opened from inside another one
 * (R-005 / R-006 keep the backdrop on the bottom-most sheet only, port sheet §2).
 *
 * A nested root must have a parent; upstream throws
 * `Sheet.NestedRoot must be placed in another Sheet` and so does this.
 */
export function SheetNestedRoot(props: SheetNestedRootProps): JSX.Element {
  const parent = SheetContext();

  if (!parent) {
    throw new Error("Sheet.NestedRoot must be placed in another Sheet");
  }

  return <SheetRoot {...props} isNested />;
}
