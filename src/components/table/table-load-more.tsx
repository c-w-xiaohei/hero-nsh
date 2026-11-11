import type { JSX } from "nsh";
import { computed, effect, signal, split, View } from "nsh";

import { renderChildren } from "./table-children";
import { TableStateContext, TableViewportContext } from "./table-context";
import { type TablePartProps } from "./table-props";
import { useTableSlots } from "./table-slots";

export interface TableLoadMoreProps extends TablePartProps {
  isLoading?: boolean;

  /** Called when the sentinel enters the expanded viewport (§2). */
  onLoadMore?: () => void;

  /** Multiplies the viewport by this to widen the visible area (default 1). */
  scrollOffset?: number;

  children?: JSX.Element;
}

export interface TableLoadMoreContentProps extends TablePartProps {}

/**
 * `Table.LoadMore` / `TableLoadMoreItem`: a permanent zero-height sentinel row
 * plus, while `isLoading`, the content row that spans the whole grid (R-058).
 *
 * React Aria observes the sentinel with `IntersectionObserver` and a
 * `rootMargin` of `scrollOffset` viewports. NSH has no observer, but the
 * scroll container reports its viewport and offset, and the body reports its
 * own offset, so the sentinel's position in the scroll content is
 * `bodyOffset + sentinelY`; the sentinel is visible when that position (plus
 * `scrollOffset` viewports on each side) overlaps the viewport (§2). Without a
 * scroll container it falls back to one trigger after mount (§8).
 */
export function TableLoadMore(props: TableLoadMoreProps) {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "isLoading",
    "onLoadMore",
    "scrollOffset",
    "render",
    "items",
    "dependencies",
    "onLayout",
  ] as const);

  const table = TableStateContext();
  const viewport = TableViewportContext();
  const slots = useTableSlots();

  const sentinelY = signal<number | undefined>(undefined);
  const wasVisible = signal(false);

  const scrollOffset = () => local.scrollOffset ?? 1;

  const visible = computed(() => {
    const y = sentinelY();

    if (y == null) {
      return false;
    }

    const height = viewport?.height();
    const offset = viewport?.offsetY() ?? 0;

    // No scroll container: the sentinel is laid out, so it is "visible" once.
    if (height == null) {
      return true;
    }

    const margin = height * scrollOffset();

    return y < offset + height + margin && y > offset - margin;
  });

  effect(() => {
    const isVisible = visible();

    if (isVisible && !wasVisible()) {
      wasVisible.set(true);
      local.onLoadMore?.();
      return;
    }

    if (!isVisible && wasVisible()) {
      wasVisible.set(false);
    }
  });

  const isLoading = computed(() => local.isLoading === true);
  const showContent = computed(() => isLoading() && local.children != null);

  const classes = computed(() =>
    [slots().loadMore(), local.className as string | undefined].filter(Boolean).join(" "),
  );

  return (
    <>
      {/* The sentinel: 0 high, out of the accessibility tree, always mounted
          (R-058). Its `onLayout` gives the position the visibility needs. */}
      <View
        {...(rest as any)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id}
        role={"none" as any}
        accessibilityElementsHidden
        onLayout={(event) => {
          sentinelY.set(event.bounds.origin.y + (table?.bodyOffsetY() ?? 0));
          local.onLayout?.(event);
        }}
        class="h-0 min-h-0"
      >
        <View accessibilityElementsHidden class="h-px w-px" />
      </View>
      <If when={showContent()}>
        <View
          role="row"
          class={classes()}
          style={{ gridTemplateColumns: table?.layout.tracks() || "1fr" }}
        >
          <View
            role="cell"
            class="py-3 text-center"
            style={{ gridColumn: "1 / -1" }}
          >
            {renderChildren(local.children)}
          </View>
        </View>
      </If>
    </>
  );
}

/** HeroUI exports this part as `TableLoadMoreItem` (`Table.LoadMore` is the same component). */
export const TableLoadMoreItem = TableLoadMore;

/** `Table.LoadMoreContent`: the centered container the loading content goes in (R-059 / R-060). */
export function TableLoadMoreContent(props: TableLoadMoreContentProps) {
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
    [slots().loadMoreContent(), local.className as string | undefined]
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
