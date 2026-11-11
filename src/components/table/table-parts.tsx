import type { AccessibilityRole, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { Scroll, View } from "nsh";

/** Shared public surface for the core-split placeholder parts. */
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

function contentView(props: TablePartProps, className: string, role?: AccessibilityRole) {
  const { children, className: extra, style, ref, id, render: _render, items: _items, dependencies: _dependencies, ...rest } = props;
  return <View {...rest} ref={(node) => ref?.(node)} nativeID={id} role={role} class={[className, extra].filter(Boolean).join(" ")} style={style}>{children}</View>;
}

export function TableScrollContainer(props: TablePartProps) {
  const { children, className, ...rest } = props;
  return <Scroll horizontal {...rest as any} class={className}>{children}</Scroll>;
}
export function TableContent(props: TablePartProps) { return contentView(props, "w-full text-sm overflow-hidden", "grid"); }
export function TableHeader(props: TablePartProps) { return contentView(props, "border-b border-separator/50 bg-surface-secondary", "rowgroup"); }
export function TableColumn(props: TablePartProps) { return contentView(props, "relative px-4 py-2.5 text-start text-xs font-medium text-muted", "columnheader"); }
export function TableColumnResizer(props: TablePartProps) { return contentView(props, "absolute end-0 top-1/2 flex h-4 w-[17px] -translate-y-1/2 translate-x-1/2 flex-col items-center justify-center cursor-col-resize outline-none"); }
export function TableBody(props: TablePartProps) { return contentView(props, "flex flex-col", "rowgroup"); }
export function TableRow(props: TablePartProps) { return contentView(props, "relative border-b border-separator/50 group", "row"); }
export function TableCell(props: TablePartProps) { return contentView(props, "flex flex-col justify-center bg-surface py-3 text-sm text-foreground border-b border-separator-tertiary/50", "cell"); }
export function TableFooter(props: TablePartProps) { return contentView(props, "flex items-center px-4 py-2.5"); }
export function TableLoadMore(props: TablePartProps) { return contentView(props, ""); }
export function TableLoadMoreContent(props: TablePartProps) { return contentView(props, "mx-auto flex items-center justify-center gap-2 py-2"); }
export function TableResizableContainer(props: TablePartProps) {
  const { children, className, ...rest } = props;
  return <Scroll {...rest as any} class={className}>{children}</Scroll>;
}
export function TableSortableColumnHeader(props: TablePartProps) { return contentView(props, "flex items-center justify-between"); }
export function TableCollection<T>(props: TablePartProps & { items?: readonly T[]; children?: (item: T, index: number) => JSX.Element }) {
  const { items, children } = props;
  if (items && typeof children === "function") return <>{items.map((item, index) => children(item as T, index))}</>;
  return <>{children as JSX.Element}</>;
}

// Context is read by part implementations in the follow-up split; keeping the
// reference here ensures the root/parts contract is established for this unit.
