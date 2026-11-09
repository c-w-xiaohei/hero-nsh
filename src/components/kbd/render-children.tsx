import { Text } from "nsh";
import type { JSX } from "nsh";

/**
 * Renders a child value the way HeroUI's DOM output would show it: a bare
 * string or number becomes a `<Text>`, arrays are mapped item by item, and an
 * element (or a zero-argument reactive child) passes through.
 *
 * `Kbd.Content` replaces HeroUI's `<span>` with a `View`, and NSH's `View`
 * draws no bare string (port sheet §1, §3). It takes the value the component
 * read from `props.children` once, never the prop itself (research 4.1 / 4.6).
 *
 * Local copy of `src/components/switch/render-children.tsx`; the port sheet §5
 * proposes lifting this into `src/primitives/render-children.tsx`, and the unit
 * keeps its own copy until that lands.
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
  // `<Kbd.Content>{key()}</Kbd.Content>` still updates, and a string result
  // takes the `<Text>` path instead of reaching the View bare.
  if (typeof node === "function") {
    return renderChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}
