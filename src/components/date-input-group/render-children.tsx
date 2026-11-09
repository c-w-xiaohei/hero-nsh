import type { JSX } from "nsh";
import { Text } from "nsh";

/**
 * Renders a child value the way HeroUI's DOM output would show it: a bare
 * string or number becomes a `<Text>` (NSH views draw no bare string), arrays
 * are mapped item by item, a zero-argument function is NSH's reactive child
 * and is called so its signal stays tracked, and an element passes through.
 *
 * It takes the value a component read from `props.children` once, never the
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
  // children expression at the placement, so `<DateInputGroup.Root>{label()}
  // </DateInputGroup.Root>` still updates.
  if (typeof node === "function") {
    return renderChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}
