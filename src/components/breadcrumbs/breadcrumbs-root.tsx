import type {
  Bounds,
  JSX,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, signal, split, untracked, View } from "nsh";

import { renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import {
  BreadcrumbsContext,
  type BreadcrumbsContextValue,
  type BreadcrumbsKey,
} from "./breadcrumbs-context";
import {
  breadcrumbsVariants,
  type BreadcrumbsVariants,
} from "./breadcrumbs.styles";
import type { AriaProps, DataProps, GlobalDomProps } from "./dom-props";

/**
 * The props of `Breadcrumbs.Root` (= `Breadcrumbs`): HeroUI 3.2.7's
 * `BreadcrumbsRootProps`, which is React Aria Components' `BreadcrumbsProps`
 * (`CollectionProps`, `isDisabled`, `onAction`, the `ol` attributes) plus
 * `separator`.
 *
 * `items` turns `children` into the collection builder React Aria's
 * `CollectionProps` gives it; with static children, each `<Breadcrumbs.Item>`
 * registers itself instead (port sheet section 2).
 */
export interface BreadcrumbsRootProps<T = unknown>
  extends BreadcrumbsVariants,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The items, or with `items`, the render function called once per entry in
   * data order. A function child without `items` is an NSH reactive child and
   * lands in the list as the caller wrote it.
   */
  children?: JSX.Element | ((item: T, index: number) => JSX.Element);

  /** Appended after the base slot classes; a string, as React Aria's narrows it. */
  className?: string;

  /** NSH style keys instead of React's `CSSProperties` (sheet §8). */
  style?: StyleProp<ViewStyle>;

  /**
   * The node between two items. Falsy renders the default chevron (upstream's
   * `if (!separator)`, so `""`, `0` and `false` fall back too); an element is
   * wrapped in a View that carries the separator slot classes; a string or
   * number renders as text without classes.
   */
  separator?: JSX.Element;

  /** Disables every item: `isDisabled || isCurrent`, with the item's own value winning. */
  isDisabled?: boolean;

  /** Called with the pressed item's key (its `id`, else its registration index). */
  onAction?: (key: BreadcrumbsKey) => void;

  /** A dynamic collection: the entries `children` is called with, in data order. */
  items?: readonly T[];

  /** React Aria's dependency list for `items`: accepted, no effect. */
  dependencies?: unknown;

  /** The accessible name; `"Breadcrumbs"` by default, as `useBreadcrumbs`. */
  "aria-label"?: string;

  /** NSH's name for `aria-label`. */
  accessibilityLabel?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** NSH's name for what `id` maps to. */
  nativeID?: string;

  /** The identity of the list; the items carry their own. */
  testID?: string;

  /** A desktop hover tooltip for the list. */
  tooltip?: JSX.Element;

  /** React Aria's element replacement: accepted, no effect (sheet §8). */
  render?: unknown;

  /** React Aria's collection slot: accepted, no effect (sheet §8). */
  slot?: string;

  /** Reaches the root view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;

  /** The list's laid-out bounds. */
  onLayout?: (event: { bounds: Bounds }) => void;
}

/**
 * `Breadcrumbs.Root` / `BreadcrumbsRoot`: the labelled `role="list"` row.
 *
 * HeroUI gets "which item is current" from React Aria's collection
 * (`node.nextKey == null`). NSH cannot see its children, so every Item
 * registers its key here when it mounts and unregisters on cleanup; the last
 * key in mount order is the current page (research 4.2, port sheet section 2).
 */
export function BreadcrumbsRoot<T = unknown>(
  props: BreadcrumbsRootProps<T>,
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "separator",
    "isDisabled",
    "onAction",
    "items",
    "dependencies",
    "aria-label",
    "accessibilityLabel",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "render",
    "slot",
    "ref",
    "onLayout",
  ] as const);

  const slots = breadcrumbsVariants();

  // The ordered registry: mount order is the order the items are written in.
  // A dynamic `items` list registers in data order, because its rows mount in
  // data order (research 4.2's ordering rule).
  const keys = signal<BreadcrumbsKey[]>([]);
  // The key React Aria would take from the collection: the item's position.
  let nextKey = 0;

  const createKey = (): BreadcrumbsKey => nextKey++;

  const register = (key: BreadcrumbsKey): (() => void) => {
    keys.set([...keys(), key]);

    // One occurrence: two items written with the same `id` (which React Aria
    // also asks to be unique) each take their own slot, and the last one is
    // still the last in mount order.
    return () => {
      const entries = keys();
      const index = entries.indexOf(key);

      if (index >= 0) {
        keys.set([...entries.slice(0, index), ...entries.slice(index + 1)]);
      }
    };
  };

  const lastKey = computed(() => {
    const entries = keys();

    return entries[entries.length - 1];
  });

  const contextValue: BreadcrumbsContextValue = {
    slots,
    separator: () => local.separator,
    isDisabled: () => local.isDisabled === true,
    onAction: (key) => local.onAction?.(key),
    lastKey,
    register,
    createKey,
  };

  const hasItems = computed(() => local.items != null);

  /**
   * One row of a dynamic collection: the caller's function child, called in
   * data order, so the registry order is the data order (port sheet §1, §5).
   */
  const renderRow = (item: T, index: number): JSX.Element => {
    const children = local.children;

    if (typeof children !== "function") {
      return null;
    }

    return renderChildren(
      (children as (value: T, position: number) => JSX.Element)(item, index),
    );
  };

  return (
    <BreadcrumbsContext.Provider value={contextValue}>
      <View
        {...rest}
        ref={(next) => local.ref?.(next)}
        testID={local.testID}
        nativeID={local.id ?? local.nativeID}
        tooltip={local.tooltip}
        // An `<ol>` reads as a list; `useBreadcrumbs` labels it "Breadcrumbs".
        role="list"
        accessibilityLabel={
          local["aria-label"] ?? local.accessibilityLabel ?? "Breadcrumbs"
        }
        class={joinClassNames(slots.base(), local.className)}
        style={local.style}
        onLayout={local.onLayout}
      >
        {/* The Root provides a context, so `props.children` is read at the
            placement inside the Provider, once per evaluation (research 4.1's
            provider exception). Both branches keep the read here: a body
            local or an `If` `else` element would freeze it. */}
        <If when={hasItems()}>
          <Each of={local.items}>
            {(item, index) => renderRow(item(), untracked(() => index()))}
          </Each>
        </If>
        <If when={!hasItems()}>{renderChildren(local.children as JSX.Element)}</If>
      </View>
    </BreadcrumbsContext.Provider>
  );
}
