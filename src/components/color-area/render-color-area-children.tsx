import type { JSX } from "nsh";
import { Text } from "nsh";

import type { ColorAreaChildren } from "./color-area-render-props";

/**
 * Renders a ColorArea part's `children`, which is HeroUI's
 * `ReactNode | ((values) => ReactNode)`. NSH needs two adjustments:
 *
 * - a render prop is told apart from NSH's reactive zero-argument children by
 *   its arity: `fn.length >= 1` takes the values, a zero-argument function is a
 *   child to call and classify (research 4.5, V7);
 * - a bare string or number becomes a `Text`, because a `View` draws none.
 *
 * It takes the value the part read from `props.children` once, at the
 * placement, never the prop itself (research 4.1 / 4.6).
 */
export function renderColorAreaChildren<RenderProps>(
  node: ColorAreaChildren<RenderProps>,
  values: RenderProps,
): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "function") {
    // A render prop arrives with its parameter; calling it here is the single
    // evaluation D17 asks for, and the accessors it receives keep following the
    // state because the caller reads them.
    if (node.length >= 1) {
      return renderColorAreaChildren(
        (node as (values: RenderProps) => JSX.Element)(values),
        values,
      );
    }

    // A zero-argument function is NSH's reactive child: calling it keeps the
    // read inside the tracked children expression at the placement, so a
    // signal in `<ColorArea.Thumb>{value()}</ColorArea.Thumb>` still updates.
    return renderColorAreaChildren(
      (node as () => JSX.Element)(),
      values,
    );
  }

  if (typeof node === "string" || typeof node === "number") {
    return <Text>{node}</Text>;
  }

  if (Array.isArray(node)) {
    return node.map((child) =>
      renderColorAreaChildren(child, values),
    ) as unknown as JSX.Element;
  }

  return node;
}
