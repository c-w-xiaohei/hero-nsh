import type { JSX } from "nsh";

import { ChipLabel } from "./chip-label";
import { renderChildren } from "./render-children";

/**
 * R-027: the root's children, normalized the way HeroUI's `chipChildren` does.
 * A top-level string or number is wrapped in a `Chip.Label`, so `<Chip>New</Chip>`
 * gets the label's horizontal padding; an array is not wrapped (upstream leaves
 * arrays alone), so its bare strings only become `Text`; an element passes
 * through untouched.
 *
 * Two NSH details shape the order of the checks:
 *
 * - a dynamic child arrives as a zero-argument function, so the function is
 *   resolved *before* the type check — React's `children` is already the value;
 * - the whole function is called at the placement inside the root's provider,
 *   never in the component body, so a signal in `<Chip>{value()}</Chip>` keeps
 *   updating and the auto-created label still finds the root's context.
 */
export function renderChipChildren(node: JSX.Element): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "function") {
    return renderChipChildren(node());
  }

  if (typeof node === "string" || typeof node === "number") {
    return <ChipLabel>{node}</ChipLabel>;
  }

  // Arrays keep upstream's shape: no label wrapper, only `renderChildren`
  // turns a bare string item into a `Text` instead of dropping it.
  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}
