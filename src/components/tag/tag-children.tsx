import type { JSX } from "nsh";
import { Text } from "nsh";

/**
 * Renders a child value the way HeroUI's DOM output would show it: a bare
 * string or number becomes a `<Text>` (a string directly inside a View is not
 * painted by NSH), arrays are mapped item by item, and an element (or a
 * zero-argument reactive child) passes through. It takes the value the
 * component read from `props.children` once, never the prop itself.
 */
export function renderTagChildren(node: JSX.Element): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return <Text>{node}</Text>;
  }

  // A zero-argument function is NSH's reactive child: the compiler wraps a
  // dynamic sibling in one. Calling it here keeps the read inside the tracked
  // children expression at the placement, so a signal in
  // `<Tag>{value()}</Tag>` still updates.
  if (typeof node === "function") {
    return renderTagChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderTagChildren(child)) as unknown as JSX.Element;
  }

  return node;
}

/**
 * HeroUI derives `textValue` from a plain string child, or from the first
 * string of an array of children (`tag.tsx`, `TagRoot`). It reads the one
 * shared children value (a `computed`), never `props.children` again.
 */
export function deriveTagTextValue(node: JSX.Element): string | undefined {
  if (typeof node === "string") {
    return node;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      if (typeof child === "string") {
        return child;
      }
    }
  }

  return undefined;
}
