import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { split, View } from "nsh";

import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";
import type { SheetRenderValues } from "./sheet-render-values";

/**
 * The props of `Sheet.Content`: HeroUI's `SheetContentProps`, which is React
 * Aria's `Sheet` props minus `children` / `className`, plus the render-prop
 * form of `children` and a `style`.
 */
export interface SheetContentProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "style"> {
  children?: JSX.Element | ((values: SheetRenderValues) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** Forwarded as a callback to the view. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM attribute channel. */
  [key: `data-${string}`]: unknown;
}

/**
 * Sheet.Content / SheetContent: the clip box whose axial length is the current
 * detent (R-008 … R-022, port sheet §4c).
 *
 * Stub: the implemented part creates `createSheetDetent`, provides
 * `SheetDetentContext`, writes the axial `height` / `width` (or the translation
 * when there are no snap points) and calls a function child once with the
 * render values.
 */
export function SheetContent(props: SheetContentProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "render",
    "slot",
  ]);

  const content = () => {
    const node = local.children;

    // A function child needs the render values (D17 accessors); the stub has no
    // detent state yet, so the implemented part is what calls it.
    return typeof node === "function" ? null : renderSheetPartChildren(node);
  };

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={local.className}
      style={local.style}
    >
      {content()}
    </View>
  );
}
