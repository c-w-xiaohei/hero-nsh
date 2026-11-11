import type { JSX, StyleProp, ViewStyle } from "nsh";
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
 * `rootMargin` of `scrollOffset` viewports. NSH has no observer, but the scroll
 * container reports its viewport and offset, and the body reports its own
 * offset, so the sentinel's position in the scroll content is
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

  // The single read of `children`, shared by the presence check and the
  // content row's placement below (`_common`, the children read rule).
  const children = computed(() => local.children);
  const hasChildren = computed(() => {
    const value = children();

    return value !== null && value !== undefined;
  });

  /** The sentinel's own y inside the body, from its layout. */
  const sentinelInBody = signal<number | undefined>(undefined);

  /** Its position in the scrolled content: the body's offset plus its own y. */
  const sentinelY = computed(() => {
    const y = sentinelInBody();

    return y == null ? undefined : (table?.bodyOffsetY() ?? 0) + y;
  });

  const wasVisible = signal(false);

  const scrollOffset = computed(() => local.scrollOffset ?? 1);

  const visible = computed(() => {
    const y = sentinelY();

    // No scroll container: the sentinel is laid out, so it is "visible" once
    // (§8).
    if (!viewport) {
      return y != null;
    }

    const height = viewport.height();

    // A container that has not measured itself yet has no viewport to compare
    // against; the sentinel is not visible until it does.
    if (y == null || height == null) {
      return false;
    }

    const offset = viewport.offsetY();
    const margin = height * scrollOffset();

    return y > offset - margin && y < offset + height + margin;
  });

  // `onLoadMore` is reported on each entry into the expanded viewport, not on
  // `isLoading` (§2). The caller guards against re-entry; a sentinel pushed
  // out by the rows that arrived re-arms by leaving the viewport.
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
  const showContent = computed(() => isLoading() && hasChildren());

  const classes = computed(() =>
    [slots().loadMore(), local.className as string | undefined].filter(Boolean).join(" "),
  );

  return (
    <>
      {/* R-058: the sentinel row is always mounted, zero high and out of the
          accessibility tree; its 1px probe is what the position is measured
          from (upstream: `height: 0` row with a `1px × 1px` div). */}
      <View
        {...(rest as any)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id}
        role="none"
        accessibilityElementsHidden
        onLayout={(event) => {
          sentinelInBody.set(event.bounds.origin.y);
          local.onLayout?.(event);
        }}
        class="h-0 min-h-0"
      >
        <View accessibilityElementsHidden class="h-px w-px" />
      </View>
      {/* R-058: the content row exists only while loading with content; its
          inner cell spans every track. */}
      <If when={showContent()}>
        <View
          role="row"
          class={classes()}
          style={[
            { gridTemplateColumns: table?.layout.tracks() || "1fr" },
            local.style as StyleProp<ViewStyle>,
          ]}
        >
          <View
            role="cell"
            class="py-3 text-center"
            style={{ gridColumn: "1 / -1" }}
          >
            {renderChildren(children())}
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

  // The single read of `children`, used at the placement below.
  const children = computed(() => local.children);

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
      {renderChildren(children())}
    </View>
  );
}
