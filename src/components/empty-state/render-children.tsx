import type { JSX } from "nsh";
import { Text } from "nsh";

/**
 * Renders a child value the way HeroUI's DOM output would show it: a bare
 * string or number becomes a `<Text>`, arrays are mapped item by item, and an
 * element (or a zero-argument reactive child) passes through. It takes the
 * value the component read from `props.children` once, never the prop itself.
 *
 * This is the local copy the port sheet asks for; `button/children.tsx`,
 * `switch/render-children.tsx` and `surface/children.tsx` have the same shape,
 * and lifting the four into `src/primitives/` is a separate refactor (port
 * sheet §5), not a dependency of this unit.
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
  // `<EmptyState>{message()}</EmptyState>` still updates, and a string or
  // number result can take the `<Text>` path instead of reaching the View bare
  // (a string directly inside a View is not shown).
  if (typeof node === "function") {
    return renderChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}
