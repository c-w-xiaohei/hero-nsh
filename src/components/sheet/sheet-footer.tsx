import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { SheetContext } from "./sheet-context";
import { renderSheetPartChildren } from "./sheet-part-children";
import { sheetVariants } from "./sheet.styles";

/**
 * The props of `Sheet.Footer`: HeroUI's `ComponentPropsWithRef<"div">`.
 */
export interface SheetFooterProps extends SheetPartDomProps {}

/**
 * Sheet.Footer / SheetFooter: the action row.
 *
 * R-033 `.sheet__footer` → `flex shrink-0 flex-row items-center justify-end
 * gap-2 px-5 pt-2 pb-4`, all of it in the slot table. Two of those are NSH
 * translations rather than copies: `flex-row` is explicit because a view is a
 * column by default, and `shrink-0` is what keeps the row whole at the bottom
 * of the dialog while the body takes the remaining height. At a partial
 * detent the footer simply sits below the Content clip box and is not visible
 * (G-002); it gets no margin of its own.
 */
export function SheetFooter(props: SheetFooterProps): JSX.Element {
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

  const slots = () => context?.slots() ?? sheetVariants();

  const classes = computed(() =>
    [slots().footer(), local.className]
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
