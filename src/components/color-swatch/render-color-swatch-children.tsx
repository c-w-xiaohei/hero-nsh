import { Text } from "nsh";
import type { JSX } from "nsh";

import type {
  ColorSwatchChildren,
  ColorSwatchRenderProps,
} from "./color-swatch-render-props";

/**
 * Renders HeroUI's `children` slot, which may be a node or a render function
 * `({ color }) => node` (port sheet §1). NSH needs two adjustments:
 *
 * - a render prop is told apart from NSH's reactive zero-argument children by
 *   its arity: `fn.length >= 1` takes the render props, a zero-argument
 *   function is a child to call and classify (research 4.5, V7);
 * - a bare string or number becomes a `Text`, because a `View` draws none.
 *
 * It takes the value the part read from `props.children` once, at the
 * placement, never the prop itself (research 4.1 / 4.6).
 */
export function renderColorSwatchChildren(
  node: ColorSwatchChildren,
  renderProps: ColorSwatchRenderProps,
): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "function") {
    // A render prop arrives with its parameter; calling it here is the single
    // evaluation D17 asks for, and the accessor it receives keeps following the
    // color because the caller reads it.
    if (node.length >= 1) {
      return renderColorSwatchChildren(
        (node as (props: ColorSwatchRenderProps) => JSX.Element)(renderProps),
        renderProps,
      );
    }

    // A zero-argument function is NSH's reactive child: calling it keeps the
    // read inside the tracked children expression at the placement, so a
    // signal in `<ColorSwatch>{value()}</ColorSwatch>` still updates.
    return renderColorSwatchChildren((node as () => JSX.Element)(), renderProps);
  }

  if (typeof node === "string" || typeof node === "number") {
    return <Text>{node}</Text>;
  }

  if (Array.isArray(node)) {
    return node.map((child) =>
      renderColorSwatchChildren(child, renderProps),
    ) as unknown as JSX.Element;
  }

  return node;
}
