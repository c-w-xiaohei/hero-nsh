import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { cleanup, split, View } from "nsh";

import { joinClassNames } from "./class-names";
import { ColorInputGroupContext } from "./context";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./color-input-group-dom-props";
import { renderChildren } from "./render-children";

/**
 * The props of `ColorInputGroup.Prefix`: HeroUI 3.2.7's
 * `ColorInputGroupPrefixProps`, which is `DOMRenderProps<"div", undefined>`
 * (a `<div>` with its attributes, `children` and `className`).
 *
 * Upstream's generic `E` can turn the element into any intrinsic one; NSH has
 * one host element per part, so `render` is accepted with no effect and the
 * generic is dropped (§8).
 */
export interface ColorInputGroupPrefixProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The slot content; bare strings and numbers become `Text` at the placement. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Style of the slot view. */
  style?: StyleProp<ViewStyle>;

  /** The slot's view, as `DOMRenderProps` gives upstream. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

/**
 * The group's leading slot. It registers with the enclosing
 * `ColorInputGroup.Root` on creation and unregisters on cleanup, which is how
 * `Input` learns to drop its start padding and corner radius (R-017). Rendered
 * outside a group it keeps only the caller's `className`, exactly as upstream
 * when the context is `{}`.
 */
export function ColorInputGroupPrefix(props: ColorInputGroupPrefixProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "focusable",
  ] as const);

  const group = ColorInputGroupContext();
  const unregister = group?.registerPrefix();

  cleanup(() => unregister?.());

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      // The slot is a `<div>` upstream: not a focus stop. A caller's own
      // `focusable` still wins.
      focusable={local.focusable ?? false}
      class={joinClassNames(group?.slots.prefix(), local.className)}
      style={local.style}
    >
      {/* The single read of `children`, at the placement (research 4.1 / 4.6). */}
      {renderChildren(local.children)}
    </View>
  );
}
