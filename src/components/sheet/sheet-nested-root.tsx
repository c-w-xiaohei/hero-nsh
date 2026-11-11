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
 * `Sheet.NestedRoot must be placed in another Sheet` and so does this. The
 * check is a mount-time invariant, so it is a plain read in the body rather
 * than a condition that has to stay reactive.
 *
 * `isNested` comes after the spread so it always wins over `props.isNested`,
 * exactly as upstream's `<SheetRoot {...props} isNested />` does. Everything
 * else — the state, both providers, the single children read — belongs to
 * `SheetRoot`; this part adds no host and no context of its own.
 */
export function SheetNestedRoot(props: SheetNestedRootProps): JSX.Element {
  const parent = SheetContext();

  if (!parent) {
    throw new Error("Sheet.NestedRoot must be placed in another Sheet");
  }

  return <SheetRoot {...props} isNested />;
}
