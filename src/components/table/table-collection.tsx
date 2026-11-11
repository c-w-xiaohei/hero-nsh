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
 */
export function TableCollection<T>(props: TableCollectionProps<T>) {
  const items = computed(() => props.items);

  const renderItem = (item: T, index: number): JSX.Element => {
    const children = props.children;

    return typeof children === "function" && children.length >= 1
      ? (children as (value: T, position: number) => JSX.Element)(item, index)
      : null;
  };

  const hasItems = computed(() => items() != null);

  const staticChildren = computed<JSX.Element>(() => {
    const children = props.children as JSX.Element | undefined;

    return typeof children === "function" && children.length >= 1 ? null : children;
  });

  return (
    <>
      <If when={hasItems()}>
        <Each of={items()}>
          {(item, index) => renderItem(item(), index())}
        </Each>
      </If>
      <If when={!hasItems()}>{staticChildren()}</If>
    </>
  );
}
