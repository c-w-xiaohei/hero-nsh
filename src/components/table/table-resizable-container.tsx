import type { JSX, ScrollEvent } from "nsh";
import { cleanup, computed, Scroll, signal, split } from "nsh";

import { TableStateContext, TableViewportContext } from "./table-context";
import { type TablePartProps } from "./table-props";
import { useTableSlots } from "./table-slots";

export interface TableResizableContainerProps extends TablePartProps {
  children?: JSX.Element;

  onResizeStart?: (widths: Map<string, number>) => void;
  onResize?: (widths: Map<string, number>) => void;
  onResizeEnd?: (widths: Map<string, number>) => void;
}

/**
 * `Table.ResizableContainer` / `TableResizableContainer`: the two-axis
 * `Scroll` (R-051) that also measures itself, so the column layout can resolve
 * pixel widths and a resizer can write one of them. It reports the callbacks
 * `onResizeStart` / `onResize` / `onResizeEnd` with the whole width map, as the
 * sheet's events table spells them.
 */
export function TableResizableContainer(props: TableResizableContainerProps) {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "onResizeStart",
    "onResize",
    "onResizeEnd",
    "render",
    "items",
    "dependencies",
    "onLayout",
    "onScroll",
  ] as const);

  const slots = useTableSlots();
  const table = TableStateContext();

  const height = signal<number | undefined>(undefined);
  const width = signal<number | undefined>(undefined);
  const offsetY = signal(0);

  if (table) {
    cleanup(
      table.layout.registerResizeCallbacks({
        onResizeStart: (widths) => local.onResizeStart?.(widths),
        onResize: (widths) => local.onResize?.(widths),
        onResizeEnd: (widths) => local.onResizeEnd?.(widths),
      }),
    );
  }

  const classes = computed(() =>
    [slots().resizableContainer(), local.className as string | undefined]
      .filter(Boolean)
      .join(" "),
  );

  return (
    <TableViewportContext.Provider
      value={{ height, width, offsetY, resizable: () => true }}
    >
      <Scroll
        {...(rest as any)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id}
        class={classes()}
        style={local.style as any}
        onLayout={(event) => {
          height.set(event.bounds.size.height);
          width.set(event.bounds.size.width);
          local.onLayout?.(event);
        }}
        onScroll={(event: ScrollEvent) => {
          offsetY.set(event.offset.y);
          (local.onScroll as ((event: ScrollEvent) => void) | undefined)?.(event);
        }}
      >
        {local.children as JSX.Element}
      </Scroll>
    </TableViewportContext.Provider>
  );
}
