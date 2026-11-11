import type { JSX, StyleProp, ViewStyle } from "nsh";
import { computed, split, signal, View } from "nsh";

import { renderPartChildren } from "./table-children";
import { TableStateContext, type TableHeaderRenderProps } from "./table-context";
import { type TablePartProps } from "./table-props";
import { useTableSlots } from "./table-slots";

export interface TableHeaderProps extends TablePartProps {
  /** A dynamic column list; each entry is passed to the function child. */
  columns?: Iterable<unknown>;

  children?: JSX.Element | ((column: unknown, index: number) => JSX.Element);
}

/**
 * `Table.Header` / `TableHeader`: the `role="rowgroup"` view with one header
 * row on the shared track string (port sheet §3, "Header 的 border-b 与背景写
 * 在 rowgroup 上"). Its columns register themselves; the header row exists so
 * the column headers and the body cells line up on the same grid.
 */
export function TableHeader(props: TableHeaderProps) {
  const [local, rest] = split(props, [
    "children",
    "columns",
    "className",
    "style",
    "ref",
    "id",
    "render",
    "items",
    "dependencies",
    "onLayout",
    "onMouseEnter",
    "onMouseLeave",
  ] as const);

  const table = TableStateContext();
  const slots = useTableSlots();

  const isHovered = signal(false);

  const renderProps: TableHeaderRenderProps = {
    isHovered,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? (className as (values: TableHeaderRenderProps) => string | undefined)(renderProps)
      : className;
  };

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function"
      ? (style as (values: TableHeaderRenderProps) => StyleProp<ViewStyle>)(renderProps)
      : style;
  };

  const tracks = computed(() => table?.layout.tracks() || "1fr");

  const renderColumn = (column: unknown, index: number): JSX.Element => {
    const node = local.children;

    return typeof node === "function" && node.length >= 1
      ? (node as (value: unknown, position: number) => JSX.Element)(column, index)
      : null;
  };

  const columnList = computed<readonly unknown[] | undefined>(() =>
    local.columns == null ? undefined : [...local.columns],
  );

  const hasColumns = computed(() => columnList() != null);

  return (
    <View
      {...(rest as any)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id}
      role="rowgroup"
      onLayout={local.onLayout}
      onMouseEnter={(event) => {
        isHovered.set(true);
        local.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        isHovered.set(false);
        local.onMouseLeave?.(event);
      }}
      class={[slots().header(), resolvedClassName()].filter(Boolean).join(" ")}
      style={resolvedStyle()}
    >
      <View role="row" class="grid" style={{ gridTemplateColumns: tracks() }}>
        <If when={hasColumns()}>
          <Each of={columnList()}>
            {(column, index) => renderColumn(column(), index())}
          </Each>
        </If>
        <If when={!hasColumns()}>
          {renderPartChildren(local.children as JSX.Element, renderProps)}
        </If>
      </View>
    </View>
  );
}
