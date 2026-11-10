import type { JSX } from "nsh";
import { untracked } from "nsh";

import { Text } from "nsh";

/**
 * Renders a child value the way HeroUI's DOM output would show it: a bare
 * string or number becomes a `<Text>` (a `View` draws none), arrays are mapped
 * item by item, and an element (or a zero-argument reactive child) passes
 * through.
 *
 * ColorSlider's parts are `View` hosts where the upstream elements are `div`s
 * or an `<output>`, so every part needs it; the Thumb needs a second form
 * below, because HeroUI's parts also accept a function child whose parameter
 * is the part's render props.
 *
 * Local copy of `src/components/meter/render-children.tsx`; port sheet §5
 * proposes lifting it into `src/primitives/render-children.tsx`, and this unit
 * keeps its own copy until that lands.
 */
export function renderChildren(node: JSX.Element): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return <Text>{node}</Text>;
  }

  // A zero-argument function is NSH's reactive child: it is called where the
  // read is tracked, not once in the body, so `<X>{signal()}</X>` keeps
  // following, and a string result takes the `<Text>` path.
  if (typeof node === "function") {
    return renderChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}

/**
 * A part's `children` when it may also be a render prop
 * (`children?: ReactNode | ((values) => ReactNode)`). A one-argument function
 * is the render prop and is called once, untracked, as D17 asks; a
 * zero-argument one is NSH's own reactive child and is left to
 * `renderChildren`.
 */
export function renderRenderPropChildren<T>(
  node: JSX.Element,
  values: T,
): JSX.Element {
  if (typeof node === "function" && node.length >= 1) {
    const rendered = untracked(() => (node as (values: T) => JSX.Element)(values));

    return renderChildren(rendered);
  }

  return renderChildren(node);
}
