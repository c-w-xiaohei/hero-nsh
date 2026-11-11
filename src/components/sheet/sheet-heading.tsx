import type { JSX } from "nsh";
import { split, View } from "nsh";

import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";

/**
 * The props of `Sheet.Heading`: HeroUI's `ComponentPropsWithRef<typeof
 * HeadingPrimitive>`, which adds `level` (default 3) and defaults `slot` to
 * `"title"`.
 */
export interface SheetHeadingProps extends SheetPartDomProps {
  /** The heading level upstream writes as `h{level}`. @default 3 */
  level?: number;
}

/**
 * Sheet.Heading / SheetHeading: the sheet's title (R-030, R-046).
 *
 * Stub: `role="header"` and `accessibilityLevel={level ?? 3}` replace the
 * `h{level}` element, `slot` has no channel (port sheet §8).
 */
export function SheetHeading(props: SheetHeadingProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "level",
  ]);

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={local.className}
      style={local.style}
    >
      {renderSheetPartChildren(local.children)}
    </View>
  );
}
