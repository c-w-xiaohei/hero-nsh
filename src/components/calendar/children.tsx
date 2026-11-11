import type { JSX } from "nsh";
import { Text } from "nsh";

/**
 * Renders a child value the way the DOM would: a bare string or number becomes
 * a `<Text>`, a reactive zero-argument child is called (its signal stays live),
 * arrays map item by item, and an element passes through. The same local copy
 * as `accordion/children.tsx`: merging them into `src/primitives/` is a
 * separate refactor all units would collide on (see _common, "New shared code").
 */
export function renderChildren(node: JSX.Element): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") return null;
  if (typeof node === "string" || typeof node === "number") return <Text>{node}</Text>;
  if (typeof node === "function") return renderChildren(node() as JSX.Element);
  if (Array.isArray(node)) return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  return node;
}
