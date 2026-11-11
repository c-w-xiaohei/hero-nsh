import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { SheetContext } from "./sheet-context";
import { renderSheetPartChildren } from "./sheet-part-children";
import { sheetVariants } from "./sheet.styles";

/**
 * The props of `Sheet.Header`: HeroUI's `ComponentPropsWithRef<"div">`.
 */
export interface SheetHeaderProps extends SheetPartDomProps {}

/**
 * Sheet.Header / SheetHeader: the column above the body.
 *
 * R-029 `.sheet__header` → `flex shrink-0 flex-col gap-1 px-5 pt-4 pb-2` is the
 * slot table's `header` entry, which already carries the `placement` axis (it
 * has none). `shrink-0` is what keeps the header whole when the dialog is
 * clipped at a partial detent (G-002), and a view is a column by default, so
 * `flex-col` is the natural writing.
 */
export function SheetHeader(props: SheetHeaderProps): JSX.Element {
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

  const context = SheetContext();

  // Outside a Root the part renders with the table's defaults, as the rest of
  // the family does.
  const slots = () => context?.slots() ?? sheetVariants();

  const classes = computed(() =>
    [slots().header(), local.className]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
    >
      {renderSheetPartChildren(local.children)}
    </View>
  );
}
