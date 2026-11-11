import type { AccessibilityRole, JSX, Signal, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { View, computed, context, signal } from "nsh";
import { TableContext } from "./table-root";
import { tableVariants } from "./table.styles";
import { IconChevronUp } from "../icons";
export { TableScrollContainer } from "./table-scroll-container";
export { TableResizableContainer } from "./table-resizable-container";
export { TableColumnResizer } from "./table-column-resizer";

/** Shared public surface for table parts. */
export interface TablePartProps extends Omit<ViewProps, "children" | "class" | "style" | "ref"> {
  children?: JSX.Element;
  className?: string;
  style?: StyleProp<ViewStyle>;
  ref?: (node: ViewRef) => void;
  id?: string;
  render?: unknown;
  items?: readonly unknown[];
  dependencies?: readonly unknown[];
  [key: string]: unknown;
}

type ColumnTrack = { id?: string; textValue?: string; width?: number | string; defaultWidth?: number | string; minWidth?: number; maxWidth?: number };
interface TableLayout { columns: Signal<ColumnTrack[]>; tracks: () => string }
const TableLayoutContext = context<TableLayout | undefined>(undefined);
type RowCells = { nextColumn: number };
const RowCellsContext = context<RowCells | undefined>(undefined);

function makeTracks(columns: readonly ColumnTrack[]) {
  if (!columns.length) return "";
  return columns.map((column) => {
    const width = column.width ?? column.defaultWidth;
    const min = column.minWidth == null ? "0px" : `${column.minWidth}px`;
    const max = column.maxWidth == null ? "none" : `${column.maxWidth}px`;
    const basis = width == null ? "1fr" : typeof width === "number" ? `${width}px` : width;
    return `minmax(${min}, min(${max}, ${basis}))`;
  }).join(" ");
}

function contentView(props: TablePartProps, className: string, role?: AccessibilityRole, style?: StyleProp<ViewStyle>, extra?: Record<string, unknown>) {
  const { children, className: extraClass, style: ownStyle, ref, id, render: _render, items: _items, dependencies: _dependencies, ...rest } = props;
  return <View {...rest} {...extra as any} ref={(node) => ref?.(node)} nativeID={id} role={role} class={[className, extraClass].filter(Boolean).join(" ")} style={[style, ownStyle]}>{children}</View>;
}

export function TableContent(props: TablePartProps & { "aria-label"?: string; columns?: Iterable<ColumnTrack> }) {
  const columns = signal<ColumnTrack[]>([]);
  const tracks = computed(() => makeTracks(columns()));
  const layout: TableLayout = { columns, tracks };
  const { children, className, style, ref, id, render: _render, items: _items, dependencies: _dependencies, columns: columnSource, ...rest } = props;
  // R-015/R-016: one shared track string drives header and every body row.
  return <TableLayoutContext.Provider value={layout}><View {...rest as any} ref={(node) => ref?.(node)} nativeID={id} accessibilityLabel={props["aria-label"]} role="grid" focusable class={["w-full text-sm overflow-hidden", className].filter(Boolean).join(" ")} style={style}>{children}</View></TableLayoutContext.Provider>;
}

export function TableHeader(props: TablePartProps & { columns?: Iterable<ColumnTrack> }) {
  const layout = TableLayoutContext();
  const declared = props.columns;
  if (layout && declared) layout.columns.set([...declared]);
  const tracks = computed(() => makeTracks(declared ? [...declared] : layout?.columns() ?? []));
  const { children, className, style, ref, id, render: _render, columns: _columns, ...rest } = props;
  return <View {...rest as any} ref={(node) => ref?.(node)} nativeID={id} role="rowgroup" class={["border-b border-separator/50 bg-surface-secondary", className].filter(Boolean).join(" ")} style={style}>
     <View role="row" class="grid" style={{ gridTemplateColumns: tracks() }}>{children}</View>
  </View>;
}

export function TableColumn(props: TablePartProps & ColumnTrack & { width?: number | string; allowsSorting?: boolean; isRowHeader?: boolean }) {
  const layout = TableLayoutContext();
  const table = TableContext();
  const registered = layout?.columns() ?? [];
  if (layout) {
    const key = props.id ?? props.textValue ?? `column-${registered.length}`;
    const next = registered.filter((column) => (column.id ?? column.textValue) !== key);
    layout.columns.set([...next, { ...props, id: key }]);
  }
  const { children, className, style, ...rest } = props;
  const slot = table?.slots.column() ?? tableVariants({ variant: "primary" }).column();
  const currentColumns = layout?.columns() ?? [];
  const index = currentColumns.findIndex((column) => column.id === (props.id ?? props.textValue));
  const count = currentColumns.length;
  // R-008/R-009: secondary column endcaps follow registered column order.
  const positionClasses = table?.variant === "secondary" ? [index === 0 ? "rounded-ss-2xl rounded-es-2xl" : "", index === count - 1 ? "rounded-se-2xl rounded-ee-2xl" : ""] : [];
  return <View {...rest as any} ref={(node) => props.ref?.(node)} nativeID={props.id} role="columnheader" class={[slot, "min-w-0", ...positionClasses, className].filter(Boolean).join(" ")} style={style}>{children}</View>;
}
export function TableBody(props: TablePartProps & { renderEmptyState?: (values: { isEmpty: () => boolean; isDropTarget: () => boolean }) => JSX.Element }) {
  const { children, renderEmptyState, ...rest } = props;
  return contentView({ ...rest, children: children ?? renderEmptyState?.({ isEmpty: () => true, isDropTarget: () => false }) }, "flex flex-col", "rowgroup");
}
export function TableRow(props: TablePartProps) {
  const layout = TableLayoutContext();
  const table = TableContext();
  const rowCells: RowCells = { nextColumn: 0 };
  const { children, className, style, ...rest } = props;
  return <View {...rest as any} ref={(node) => props.ref?.(node)} nativeID={props.id} role="row" class={[table?.slots.row() ?? "relative border-b border-separator/50", "grid group", className].filter(Boolean).join(" ")} style={[{ gridTemplateColumns: layout?.tracks() || "1fr" }, style]}>
    <RowCellsContext.Provider value={rowCells}>{children}</RowCellsContext.Provider>
  </View>;
}
export function TableCell(props: TablePartProps & { colSpan?: number; isTreeColumn?: boolean; level?: number }) {
  const { colSpan, isTreeColumn = false, level = 1, ...rest } = props;
  const row = RowCellsContext();
  if (row) row.nextColumn += Math.max(1, colSpan ?? 1);
  const table = TableContext();
  const slot = table?.slots.cell({ treeColumn: isTreeColumn }) ?? tableVariants({ variant: "primary", treeColumn: isTreeColumn }).cell();
  const treeStyle = isTreeColumn ? { paddingInlineStart: 16 * Math.max(1, level) } : {};
  const geometry: ViewStyle = colSpan && colSpan > 1 ? { gridColumn: `span ${colSpan}`, ...treeStyle } : treeStyle as ViewStyle;
  return contentView(rest, [slot, "min-w-0", props.className].filter(Boolean).join(" "), "cell", geometry);
}
// R-050: Footer is an ordinary layout view after the scrollable table.
export function TableFooter(props: TablePartProps) { return contentView(props, "flex items-center px-4 py-2.5"); }
// R-058: keep a zero-height sentinel mounted and render the full-width row only while loading.
export function TableLoadMore(props: TablePartProps & { isLoading?: boolean; onLoadMore?: () => void; scrollOffset?: number }) {
  const { isLoading = false, onLoadMore, children, className, style, ref, id, render: _render, items: _items, dependencies: _dependencies, ...rest } = props;
  let loaded = false;
  const notify = () => { if (!loaded) { loaded = true; onLoadMore?.(); } };
  return <>
    <View {...rest} nativeID={id ? `${id}-sentinel` : undefined} role={"presentation" as any} accessibilityElementsHidden onLayout={notify} class="h-0 min-h-0" />
    {isLoading && children ? <View ref={(node) => ref?.(node)} nativeID={id} role="row" class={["border-b border-separator/50", className].filter(Boolean).join(" ")} style={style}><View role={"rowheader" as any} style={{ gridColumn: "1 / -1" } as any} class="py-3 text-center">{children}</View></View> : null}
  </>;
}
// R-060: centered loading content.
export function TableLoadMoreContent(props: TablePartProps) { return contentView(props, "mx-auto flex items-center justify-center gap-2 py-2"); }
// R-025/R-026/R-027: align label and show the correctly directed sort indicator.
export function TableSortableColumnHeader(props: TablePartProps & { sortDirection?: "ascending" | "descending" | (() => "ascending" | "descending" | undefined); showIndicator?: boolean; indicator?: JSX.Element }) {
  const { children, className, style, ref, id, render: _render, items: _items, dependencies: _dependencies, sortDirection, showIndicator = true, indicator, ...rest } = props;
  const direction = () => typeof sortDirection === "function" ? sortDirection() : sortDirection;
  return <View {...rest} ref={(node) => ref?.(node)} nativeID={id} class={[tableVariants({ variant: "primary" }).sortableColumnHeader(), className].filter(Boolean).join(" ")} style={style}>
    {children}{showIndicator && direction() ? indicator ?? <IconChevronUp className={[tableVariants({ variant: "primary" }).sortableColumnIndicator(), direction() === "descending" ? "rotate-180" : ""].filter(Boolean).join(" ")} /> : null}
  </View>;
}
export function TableCollection<T>(props: Omit<TablePartProps, "children"> & { items?: readonly T[]; children?: JSX.Element | ((item: T, index: number) => JSX.Element) }) {
  const { items, children } = props;
  if (items && typeof children === "function") return <>{items.map((item, index) => children(item as T, index))}</>;
  return <>{children as JSX.Element}</>;
}
