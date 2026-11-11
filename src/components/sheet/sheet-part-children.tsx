import type { JSX } from "nsh";
import { Text } from "nsh";

/**
 * Renders a child value the way HeroUI's `<div>` parts show it: a bare string
 * or number becomes a `<Text>` (a `View` draws none, research 4.1 / 4.6), arrays
 * are mapped item by item, and an element (or a zero-argument reactive child)
 * passes through.
 *
 * Local copy of `modal/modal-part-children.tsx` (itself a copy of
 * `card/card-children.tsx` and `popover/children.tsx`, which port sheet §5
 * proposes lifting into a primitive). It takes the value read from
 * `props.children`, never the prop itself.
 */
export function renderSheetPartChildren(node: JSX.Element): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return <Text>{node}</Text>;
  }

  // A zero-argument function is NSH's reactive child: calling it here keeps the
  // read inside the tracked children expression at the placement, so a signal
  // in `<Sheet.Body>{text()}</Sheet.Body>` still updates.
  if (typeof node === "function") {
    return renderSheetPartChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderSheetPartChildren(child)) as unknown as JSX.Element;
  }

  return node;
}
