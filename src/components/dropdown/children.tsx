import type { JSX } from "nsh";
import { Text } from "nsh";

/**
 * Renders a trigger child value the way HeroUI's DOM output would show it: a
 * bare string or number becomes a `<Text>` (a string directly inside a View is
 * not painted by NSH), arrays are mapped item by item, and an element (or a
 * zero-argument reactive child) passes through. It takes the value the
 * component read from `props.children` once, never the prop itself.
 *
 * Only for a part whose children are content (the trigger). A part whose
 * children are other parts reads `props.children` as the value it is: remapping
 * that array snapshots it and the parts inside stop reacting.
 */
export function renderChildren(node: JSX.Element): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return <Text>{node}</Text>;
  }

  if (typeof node === "function") {
    return renderChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}
