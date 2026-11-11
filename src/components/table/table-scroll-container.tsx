import type { JSX, ScrollEvent } from "nsh";
import { computed, Scroll, signal, split } from "nsh";

import { TableViewportContext } from "./table-context";
import { type TablePartProps } from "./table-props";
import { useTableSlots } from "./table-slots";

export interface TableScrollContainerProps extends TablePartProps {
  children?: JSX.Element;
}

/**
 * `Table.ScrollContainer` / `TableScrollContainer`: the horizontal `Scroll`
 * (R-002) whose viewport the load-more sentinel is measured against. R-003's
 * `scrollbar-gutter: auto` is dropped: the host's Scroll owns its own gutter
 * and offers no policy switch (§8). The class
 * slot carries nothing (Scroll owns overflow and the scrollbar); the caller's
 * classes follow it.
 */
export function TableScrollContainer(props: TableScrollContainerProps) {
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
    "onScroll",
  ] as const);

  const slots = useTableSlots();

  const height = signal<number | undefined>(undefined);
  const width = signal<number | undefined>(undefined);
  const offsetY = signal(0);

  const classes = computed(() =>
    [slots().scrollContainer(), local.className as string | undefined]
      .filter(Boolean)
      .join(" "),
  );

  return (
    <TableViewportContext.Provider
      value={{ height, width, offsetY, resizable: () => false }}
    >
      <Scroll
        {...(rest as any)}
        horizontal
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
