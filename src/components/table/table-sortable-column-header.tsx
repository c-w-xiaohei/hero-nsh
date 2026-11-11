import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import { IconChevronUp } from "../icons";
import { renderChildren } from "./table-children";
import { TableColumnContext } from "./table-context";
import { type TablePartProps } from "./table-props";
import { useTableSlots } from "./table-slots";

export interface TableSortableColumnHeaderProps extends TablePartProps {
  /** The direction the caller's `Column` render props reported. */
  sortDirection?:
    | "ascending"
    | "descending"
    | (() => "ascending" | "descending" | undefined);

  /** Whether the indicator shows while a direction is set (default `true`). */
  showIndicator?: boolean;

  /** A custom indicator element instead of the chevron. */
  indicator?: JSX.Element;
}

/**
 * `Table.SortableColumnHeader` / `TableSortableColumnHeader`: the label plus
 * the sort indicator (R-025–R-027). HeroUI reads `sortDirection` from the
 * caller's render props; here a missing prop falls back to the column's own
 * direction, so the header also works straight inside a `Table.Column`.
 *
 * The indicator is a chevron turned 180° while descending; NSH has no
 * `cloneElement`, so a custom indicator renders as given and only the default
 * chevron takes the indicator's classes (§8).
 */
export function TableSortableColumnHeader(props: TableSortableColumnHeaderProps) {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "sortDirection",
    "showIndicator",
    "indicator",
    "render",
    "items",
    "dependencies",
    "onLayout",
  ] as const);

  const slots = useTableSlots();
  const column = TableColumnContext();

  const direction = () => {
    const value = local.sortDirection;

    return typeof value === "function" ? value() : (value ?? column?.sortDirection());
  };

  const showIndicator = computed(
    () => (local.showIndicator ?? true) && direction() != null,
  );

  const classes = computed(() =>
    [slots().sortableColumnHeader(), local.className as string | undefined]
      .filter(Boolean)
      .join(" "),
  );

  // R-027: the descending direction is the same chevron turned around. The
  // two directions are separate branches (an `If` condition is tracked, while
  // the element a function child builds is not), so the class string is
  // fixed per branch and still follows the direction.
  const indicatorNode = (descending: boolean): JSX.Element => {
    if (local.indicator != null) {
      return local.indicator;
    }

    return (
      <IconChevronUp
        className={[slots().sortableColumnIndicator(), descending ? "rotate-180" : ""]
          .filter(Boolean)
          .join(" ")}
      />
    );
  };

  return (
    <View
      {...(rest as any)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? (rest as any).nativeID}
      onLayout={local.onLayout}
      class={classes()}
      style={local.style as any}
    >
      {renderChildren(local.children)}
      <If when={showIndicator()}>
        <If
          when={direction() === "descending"}
          else={indicatorNode(false)}
        >
          {indicatorNode(true)}
        </If>
      </If>
    </View>
  );
}
