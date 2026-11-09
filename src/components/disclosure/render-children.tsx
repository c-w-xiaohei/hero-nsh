import type { JSX } from "nsh";
import { Text } from "nsh";

/**
 * Renders a child value the way HeroUI's DOM output would show it: a bare
 * string or number becomes a `<Text>`, arrays are mapped item by item, and an
 * element (or a zero-argument reactive child) passes through.
 *
 * Every Disclosure part needs this at its placement: HeroUI's stories and
 * regression cases put panel text straight inside `Content` and a label string
 * straight inside `Trigger`, and NSH's `View` draws no bare string (port sheet
 * §1, research 4.1 / 4.6).
 *
 * It takes the value the part read from `props.children`, never the prop
 * itself, so the read happens once, at the placement.
 */
export function renderChildren(node: JSX.Element): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return <Text>{node}</Text>;
  }

  // A zero-argument function is NSH's reactive child: the compiler wraps a
  // dynamic sibling in one. Calling it here keeps the read inside the tracked
  // children expression at the placement, so a signal inside
  // `<Disclosure.Body>{text()}</Disclosure.Body>` still updates, and a string
  // result takes the `<Text>` path instead of reaching the View bare.
  if (typeof node === "function") {
    return renderChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}
