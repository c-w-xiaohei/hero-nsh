import { Text } from "nsh";
import type { JSX } from "nsh";

import type { ToastEntry } from "./toast-queue";

/**
 * Renders a child value the way HeroUI's DOM output would show it: a bare
 * string or number becomes a `Text`, arrays are mapped item by item, and an
 * element (or a zero-argument reactive child) passes through.
 *
 * NSH's `View` draws no bare string (port sheet §1, §3), and every toast part
 * replaces upstream's `div` / `span` / `p` with a `View`.
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
  // expression, so a signal in `<Toast.Title>{title()}</Toast.Title>` still
  // updates and a string result takes the `<Text>` path.
  if (typeof node === "function") {
    return renderChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}

/**
 * The text a part contributes to the toast's accessible name.
 *
 * Upstream reads `textContent` from the rendered title and description
 * (`react-aria-components/Toast`'s `ToastContent`), which NSH has no way to
 * query. A string or number child is known at the placement, so it is used;
 * an element child (a nested `<Text>`, an icon) contributes nothing, and the
 * root falls back to `"Notification"` (port sheet §5, §8).
 */
export function extractText(node: JSX.Element): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string") {
    return node;
  }

  if (typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => extractText(child)).join("");
  }

  // A zero-argument reactive child: read it so a changing title updates the
  // label, as `renderChildren` does for the visible text.
  if (typeof node === "function") {
    return extractText(node());
  }

  return "";
}

/** What a `className` / `style` function receives on the region and on a toast. */
export interface ToastRenderValues {
  /**
   * The toast being rendered, its current entry. Upstream's render props carry
   * the queued toast the same way; absent on the region, which renders no
   * single toast. Read fresh for each evaluation of the class/style binding,
   * so the value stays current without being an accessor.
   */
  toast?: ToastEntry;

  /** The slot classes the component computed, so a function can extend them. */
  defaultClassName: string;
}
