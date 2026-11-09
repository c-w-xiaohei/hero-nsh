import type { JSX } from "nsh";
import { Text } from "nsh";

/**
 * Renders a child value the way HeroUI's DOM output would show it: a bare
 * string or number becomes a `<Text>`, arrays are mapped item by item, and an
 * element (or a zero-argument reactive child) passes through.
 *
 * Checkbox needs this in two places. The story Default and the regression cases
 * put "Accept terms and conditions" straight inside `Checkbox.Content`, and
 * NSH's `View` draws no bare string, so the text would vanish (port sheet §1).
 * `Checkbox.Control` and `Checkbox.Root`'s render prop can hold text too.
 *
 * It takes the value the component read from `props.children` once, never the
 * prop itself (research 4.1 / 4.6).
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
  // children expression at the placement, so a signal in
  // `<Checkbox.Content>{state()}</Checkbox.Content>` still updates, and a
  // string result takes the `<Text>` path instead of reaching the View bare.
  if (typeof node === "function") {
    return renderChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}
