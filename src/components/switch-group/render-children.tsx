import type { JSX } from "nsh";
import { Text } from "nsh";

/**
 * Renders a child value the way HeroUI's DOM output would show it: a bare
 * string or number becomes a `<Text>`, arrays are mapped item by item, and an
 * element (or a zero-argument reactive child) passes through.
 *
 * `SwitchGroupRootProps.children` is a `ReactNode` upstream, so a string
 * placed directly inside `<SwitchGroup>` is valid HeroUI and must not vanish
 * here: NSH's `View` draws no bare string (research 4.1, 4.6).
 *
 * This is a local copy of `surface/children.tsx` and `switch/render-children.tsx`,
 * as the port sheet §5 asks: the unit does not add a shared primitive and does
 * not import across component directories, and consolidating the three copies
 * is the controller's cross-batch work.
 *
 * It takes the value the component read from `props.children` once, never the
 * prop itself.
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
  // `<SwitchGroup>{message()}</SwitchGroup>` still updates, and a string
  // result takes the `<Text>` path instead of reaching the View bare.
  if (typeof node === "function") {
    return renderChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}
