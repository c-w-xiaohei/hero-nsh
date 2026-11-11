import type { JSX, StyleProp, ViewStyle } from "nsh";
import { computed, effect, split, signal, View } from "nsh";

import { renderPartChildren } from "./table-children";
import {
  TableStateContext,
  type TableBodyRenderProps,
} from "./table-context";
import { type TablePartProps } from "./table-props";
import { useTableSlots } from "./table-slots";

export interface TableBodyProps extends TablePartProps {
  /** `({isEmpty, isDropTarget}) => ReactNode`, called only while empty. */
  renderEmptyState?: (values: TableBodyRenderProps) => JSX.Element;

  children?: JSX.Element | ((item: unknown, index: number) => JSX.Element);
}

/**
 * `Table.Body` / `TableBody`: the `role="rowgroup"` view the rows stack in
 * (port sheet §3). It reports its offset to the content, which is what the
 * load-more sentinel measures itself against, and renders `renderEmptyState`
 * while the collection has no rows.
 *
 * R-010 (`box-shadow: none` on the secondary body) is dropped: the slot never
 * draws a shadow, so there is nothing to clear. R-012 and R-032 are the
 * virtualized body's declarations; HeroUI's Table exposes no virtualization,
 * so they have no trigger here (§8).
 */
export function TableBody(props: TableBodyProps) {
  const [local, rest] = split(props, [
    "children",
    "renderEmptyState",
    "className",
    "style",
    "ref",
    "id",
    "render",
    "items",
    "dependencies",
    "onLayout",
  ] as const);

  const table = TableStateContext();
  const slots = useTableSlots();

  // Rows register while their bodies run, so the first render pass still sees
  // an empty registry. The empty state is decided after mount, as ListBox does
  // (`list-box-root.tsx`: `mounted`), or it would flash once per table.
  const mounted = signal(false);

  effect(() => {
    mounted.set(true);
  });

  const isEmpty = computed(() => table?.state.collection().isEmpty ?? false);

  const showEmpty = () => mounted() && isEmpty() && local.renderEmptyState != null;

  const renderProps: TableBodyRenderProps = {
    isEmpty,
    isDropTarget: () => false,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? (className as (values: TableBodyRenderProps) => string | undefined)(renderProps)
      : className;
  };

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function"
      ? (style as (values: TableBodyRenderProps) => StyleProp<ViewStyle>)(renderProps)
      : style;
  };

  const hasItems = computed(() => local.items != null);

  // `items` is a reactive input: read it outside `<If>`, whose function child
  // runs untracked and would freeze the list at its first evaluation.
  const items = computed(
    () => (local.items as readonly unknown[] | undefined) ?? [],
  );

  const renderRow = (item: unknown, index: number): JSX.Element => {
    const children = local.children;

    return typeof children === "function" && children.length >= 1
      ? (children as (value: unknown, position: number) => JSX.Element)(item, index)
      : null;
  };

  return (
    <View
      {...(rest as any)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? (rest as any).nativeID}
      role="rowgroup"
      onLayout={(event) => {
        // The sentinel's absolute position in the content is this offset plus
        // its own (port sheet §2, "scrollOffset / 哨兵可见性").
        table?.registerBodyLayout(event.bounds.origin.y);
        local.onLayout?.(event);
      }}
      class={[slots().body(), "flex flex-col", resolvedClassName()]
        .filter(Boolean)
        .join(" ")}
      style={resolvedStyle()}
    >
      <If when={showEmpty()}>{() => local.renderEmptyState?.(renderProps)}</If>
      <Each of={items()}>{(item, index) => renderRow(item(), index())}</Each>
      <If when={!hasItems()}>
        {renderPartChildren(local.children as JSX.Element, renderProps)}
      </If>
    </View>
  );
}
