import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { SheetContext } from "./sheet-context";
import { renderSheetPartChildren } from "./sheet-part-children";
import { sheetVariants } from "./sheet.styles";

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
 * Sheet.Heading / SheetHeading: the sheet's title.
 *
 * R-030 `.sheet__heading` → `text-lg font-semibold` comes from the slot table;
 * upstream's `elementType` is `h{level}` and NSH has no heading element, so the
 * text semantics move to the view: `role="header"` plus
 * `accessibilityLevel={level ?? 3}`. `slot="title"` is accepted and has no
 * effect (no slot collection, port sheet §8).
 *
 * The font classes sit on the view and inherit into the inner `Text` a string
 * child is wrapped in (skill §9), so `<Sheet.Heading>Title</Sheet.Heading>` and
 * `<Sheet.Heading><Text>Title</Text></Sheet.Heading>` look the same.
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
    "render",
    "slot",
  ]);

  const context = SheetContext();

  const slots = () => context?.slots() ?? sheetVariants();

  const classes = computed(() =>
    [slots().heading(), local.className]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      role="header"
      accessibilityLevel={local.level ?? 3}
      class={classes()}
      style={local.style}
    >
      {renderSheetPartChildren(local.children)}
    </View>
  );
}
