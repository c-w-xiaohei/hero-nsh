import type { JSX } from "nsh";
import { Text, untracked } from "nsh";

/**
 * Renders a part's child value the way HeroUI's DOM output would show it: a
 * bare string or number becomes a `<Text>` (a string directly inside a View is
 * not painted by NSH, and the renderer warns about it), an array is mapped item
 * by item, a zero-argument function is NSH's reactive child and is called at
 * the placement, and an element passes through.
 *
 * It takes the value the part read from `props.children` once, never the prop
 * itself, so a signal inside `<Table.Cell>{value()}</Table.Cell>` still
 * follows.
 */
export function renderChildren(node: JSX.Element): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return <Text>{node}</Text>;
  }

  if (typeof node === "function") {
    return renderChildren((node as () => JSX.Element)());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}

/**
 * The text a part's children contribute to the collection: typeahead, the
 * sortable header's label, and the row's text all come from strings and
 * numbers here. A render function is not called to find text (it expects the
 * part's render values), so a part with a function child also gets `textValue`
 * or no text.
 */
export function textOf(children: JSX.Element | undefined): string {
  // Any function here is a child the compiler kept lazy. Calling it would run
  // its component outside the provider that part needs (the row's cells once
  // built null that way), so it contributes no text: `textValue` is the source
  // for anything but a bare string (`_common`, the children read rule).
  return typeof children === "function" ? "" : textFromChildren(children);
}

/**
 * Renders a part's children, calling a render function with the part's values
 * (a function that takes parameters) and passing a plain element tree — or the
 * compiler's zero-argument reactive child — through `renderChildren`. The
 * `length >= 1` test is the codebase's idiom for telling the two apart
 * (`switch-root.tsx`).
 */
export function renderPartChildren<Values>(
  children: JSX.Element | undefined,
  values: Values,
): JSX.Element {
  if (typeof children === "function" && children.length >= 1) {
    return renderChildren(
      untracked(() => (children as unknown as (values: Values) => JSX.Element)(values)),
    );
  }

  return renderChildren(children);
}

/**
 * The text a part's children contribute to the collection: typeahead, the
 * sortable header's label, and the row's text all come from strings and
 * numbers here. An element's own text cannot be read without rendering it, so
 * it contributes nothing and the caller's `textValue` is the source (port
 * sheet §8, "typeahead / 排序文本只从字符串子节点与 textValue 取").
 */
export function textFromChildren(node: JSX.Element): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => textFromChildren(child)).join("");
  }

  return "";
}
