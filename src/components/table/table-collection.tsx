import type { JSX } from "nsh";
import { computed } from "nsh";

import { type TablePartProps } from "./table-props";

export interface TableCollectionProps<T = unknown> extends Omit<TablePartProps, "children"> {
  /** The dynamic entries; each renders through the function child. */
  items?: readonly T[];

  children?: JSX.Element | ((item: T, index: number) => JSX.Element);
}

/**
 * `Table.Collection` / `TableCollection`: React Aria's `Collection`, a pure
 * expander with no view of its own (port sheet §3, last row). With `items` it
 * renders the function child once per entry (so a row can add its own cells
 * from data); without, its children render as they are.
 *
 * `dependencies` stays accepted for API parity: React Aria uses it to
 * invalidate the item renderer's memo, which has no observable output here.
 */
export function TableCollection<T>(props: TableCollectionProps<T>) {
  // The single read of `children` (`_common`, the children read rule). A
  // computed keeps `<Table.Collection>{signal()}</Table.Collection>` following
  // instead of freezing it at the first frame.
  const children = computed(() => props.children);

  const items = computed(() => props.items);

  const hasItems = computed(() => items() != null);

  /** The item renderer: a function child that takes the item and its index. */
  const itemRenderer = computed(() => {
    const value = children();

    return typeof value === "function" && value.length >= 1
      ? (value as (item: T, index: number) => JSX.Element)
      : undefined;
  });

  /** The static children: everything that is not an item renderer. */
  const staticChildren = computed<JSX.Element>(() => {
    const value = children();

    if (typeof value === "function" && value.length >= 1) {
      return null;
    }

    return value as unknown as JSX.Element;
  });

  const renderItem = (item: T, index: number): JSX.Element =>
    itemRenderer()?.(item, index) ?? null;

  return (
    <>
      {/* `when` carries the items themselves, so the accessor its function
          child receives follows a new list instead of freezing the first one. */}
      <If when={items()}>
        {(current) => (
          <Each of={current()}>{(item, index) => renderItem(item(), index())}</Each>
        )}
      </If>
      <If when={!hasItems()}>{staticChildren()}</If>
    </>
  );
}
