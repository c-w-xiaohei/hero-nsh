import { computed, split, View } from "nsh";

import { renderChildren } from "./table-children";
import { type TablePartProps } from "./table-props";
import { useTableSlots } from "./table-slots";

export interface TableFooterProps extends TablePartProps {}

/**
 * `Table.Footer` / `TableFooter`: an ordinary `div` after the scroll container
 * (R-050: `flex items-center px-4 py-2.5`, in the footer slot). It is not a row
 * and has no role: the caller puts pagination in it, and the root's grid keeps
 * it inside the table's width boundary.
 */
export function TableFooter(props: TableFooterProps) {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "render",
    "items",
    "dependencies",
    "onLayout",
  ] as const);

  const slots = useTableSlots();

  const classes = computed(() =>
    [slots().footer(), local.className as string | undefined]
      .filter(Boolean)
      .join(" "),
  );

  return (
    <View
      {...(rest as any)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id}
      onLayout={local.onLayout}
      class={classes()}
      style={local.style as any}
    >
      {renderChildren(local.children)}
    </View>
  );
}
