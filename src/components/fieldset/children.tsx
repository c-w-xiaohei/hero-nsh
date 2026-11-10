import type { JSX } from "nsh";
import { Text } from "nsh";

/**
 * Renders a child value the way HeroUI's `<div>` / `<fieldset>` would show it: a
 * bare string or number becomes a `<Text>` (a string directly inside a `View`
 * is not drawn), arrays are mapped item by item, and an element (or a
 * zero-argument reactive child) passes through.
 *
 * It takes the value the component read from `props.children` once, never the
 * prop itself, so the single read stays at the placement (research 4.1, 4.6).
 */
export function renderChildren(node: JSX.Element): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return <Text>{node}</Text>;
  }

  // A zero-argument function is NSH's reactive child: the compiler wraps a
  // dynamic sibling, including one beside static text, in one. Calling it here
  // keeps the read inside the tracked children expression at the placement, so
  // a signal in `<Fieldset.Group>{count()}</Fieldset.Group>` still updates.
  if (typeof node === "function") {
    return renderChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}
