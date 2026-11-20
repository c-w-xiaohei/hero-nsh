import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, signal, split, untracked, View } from "nsh";

import { toListItemData } from "../../primitives";
import { renderChildren } from "./children";
import {
  CollectionItemContext,
  ListBoxContext,
  ListBoxSectionContext,
  sortByRenderedOrder,
  type ListBoxItemDescriptor,
  type ListBoxSectionContextValue,
  type ListBoxSectionDescriptor,
} from "./list-box-context";
import { listboxSectionVariants } from "./list-box.styles";

export interface ListBoxSectionRootProps<T = unknown> {
  children?: JSX.Element | ((item: T, index: number) => JSX.Element);

  /** The dynamic collection of options in this group. */
  items?: readonly T[];

  /** The group key (an identity: read once). */
  id?: string | number;

  /** The object value in a dynamic collection. */
  value?: T;

  /** Appended after the section classes; the only source of the group name. */
  className?: string;

  style?: StyleProp<ViewStyle> | (() => StyleProp<ViewStyle>);

  ref?: (node: ViewRef) => void;

  /** The group name; a Header's rendered text cannot be read (section 8). */
  "aria-label"?: string;

  "aria-hidden"?: boolean;

  accessibilityLabel?: string;

  accessibilityElementsHidden?: boolean;

  testID?: string;

  nativeID?: string;

  tooltip?: JSX.Element;

  /** React Aria's dependency list for `items`: accepted, no effect. */
  dependencies?: readonly unknown[];

  /** Replaces the host element upstream: accepted, no effect. */
  render?: unknown;

  slot?: string;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * The `__nsh:section:{level}:{index}` key `buildNodes` generated for a
 * keyless section datum, read back by matching the section node to this
 * row's `rawValue`. The collection is already built when a row resolves its
 * key (the `dataSource` computed that feeds it ran during mount), so the scan
 * is exact at any depth — the row cannot re-derive the flattened index of a
 * nested section from its sibling position alone.
 */
function generatedSectionKey(
  collection: Iterable<{
    type: string;
    key: string;
    rawValue: { datum?: unknown } | unknown;
  }>,
  datum: unknown,
): string {
  for (const node of collection) {
    if (node.type !== "section") {
      continue;
    }

    // `buildNodes` stores the merged entry as `rawValue`; it carries the raw
    // datum under `datum` exactly so this identity match works (a raw match
    // is kept for any source that feeds unmerged entries).
    const raw = node.rawValue;

    if (raw === datum || (raw as { datum?: unknown })?.datum === datum) {
      return node.key;
    }
  }

  return "";
}

/**
 * ListBox.Section / ListBoxSectionRoot: a `role="group"` view holding options.
 * It registers a section descriptor whose `children` the collection builder
 * expands, so nested rows keep their group order and a page key can compose
 * the section's frame (port sheet section 2).
 */
export function ListBoxSectionRoot<T>(
  props: ListBoxSectionRootProps<T>,
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "items",
    "id",
    "value",
    "className",
    "style",
    "ref",
    "aria-label",
    "aria-hidden",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "testID",
    "nativeID",
    "tooltip",
    "dependencies",
    "render",
    "slot",
    "onLayout",
  ] as const);

  const list = ListBoxContext();

  if (!list) {
    return null;
  }

  const collectionItem = CollectionItemContext();

  // Identity, read once (port sheet section 2). A static Section without `id`
  // has no key of its own: React Aria derives one from its position
  // (`list-box.stories.tsx:87,117`), so the root hands out a unique one. The
  // empty string is not a key: `collection-layout` reads it as "no section".
  // f-collection: under `items` a keyless section datum gets the generated
  // `__nsh:section:{level}:{index}` key from the collection (§1, key 收敛),
  // so the layout handle, the items' `sectionKey` and the data node agree.
  const id = local.id;
  const value = local.value !== undefined ? local.value : collectionItem?.value();

  let key: string;

  if (id != null) {
    key = String(id);
  } else if (collectionItem == null) {
    const resolved = toListItemData(value).key;
    key = resolved !== "" ? resolved : list.createSectionKey();
  } else {
    const named = toListItemData(value).key;
    key =
      named !== ""
        ? named
        : generatedSectionKey(list.list.collection(), value) ||
          String(collectionItem.index());
  }

  const sectionItems = signal<readonly ListBoxItemDescriptor[]>([]);

  const registerItem = (descriptor: ListBoxItemDescriptor) => {
    sectionItems.set([...sectionItems(), descriptor]);

    return () => {
      sectionItems.set(
        sectionItems().filter((current) => current !== descriptor),
      );
    };
  };

  const descriptor: ListBoxSectionDescriptor = {
    type: "section",
    key,
    textValue: () => local["aria-label"] ?? local.accessibilityLabel ?? "",
    // The group's `<Each>` row index, so a reordered dynamic section keeps its
    // place in the data order.
    order: collectionItem?.index,
    children: () => sortByRenderedOrder(sectionItems()),
  };

  // f-collection: the section's own datum feeds the collection under `items`,
  // so a dynamic section registers only its layout handle (the group's frame
  // composes each item's page-key frame through `registerSectionLayout`). The
  // static path keeps its descriptor, which carries the group's options.
  if (collectionItem == null) {
    cleanup(list.register(descriptor));
  }

  cleanup(list.registerRow({ type: "section", key }));
  cleanup(() => list.unregisterSectionLayout(key));

  const sectionContextValue: ListBoxSectionContextValue = {
    key,
    register: registerItem,
  };

  const classes = computed(() =>
    listboxSectionVariants({ class: local.className }),
  );

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style() : style;
  };

  const handleLayout = (event: { bounds: Bounds }) => {
    list.registerSectionLayout(key, event.bounds);
    local.onLayout?.(event);
  };

  // One read of `props.children` at the placement. A dynamic Section mirrors
  // the root: `items` is read by the `<Each>` itself (a JSX expression, so it
  // follows the prop) and rows are kept by the item itself, so replacing an
  // entry under an existing key builds a fresh row from the current item.
  const hasItems = computed(() => local.items != null);

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
    <ListBoxSectionContext.Provider value={sectionContextValue}>
      <View
        {...rest}
        ref={(node) => local.ref?.(node)}
        testID={local.testID}
        nativeID={local.nativeID}
        tooltip={local.tooltip}
        role="group"
        accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
        accessibilityElementsHidden={
          local["aria-hidden"] ?? local.accessibilityElementsHidden
        }
        class={classes()}
        style={resolvedStyle()}
        onLayout={handleLayout}
      >
        <If when={hasItems()}>
          <Each of={local.items}>
            {(item, index) => (
              <CollectionItemContext.Provider value={{ value: item, index }}>
                {renderRow(item(), untracked(() => index()))}
              </CollectionItemContext.Provider>
            )}
          </Each>
        </If>
        <If when={!hasItems()}>{renderChildren(local.children as JSX.Element)}</If>
      </View>
    </ListBoxSectionContext.Provider>
  );
}
