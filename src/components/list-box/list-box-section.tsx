import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, signal, split, untracked, View } from "nsh";

import { renderChildren } from "./children";
import {
  CollectionItemContext,
  collectionItemKey,
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

/** The same key derivation as an item's (port sheet section 1). */
function resolveSectionKey(
  id: string | number | undefined,
  value: unknown,
  index: number | undefined,
): string {
  if (id != null) {
    return String(id);
  }

  if (value != null) {
    if (typeof value === "object") {
      const record = value as { id?: unknown; key?: unknown };
      const derived = record.id ?? record.key;

      if (derived != null) {
        return String(derived);
      }
    } else {
      return String(value);
    }
  }

  return index != null ? String(index) : "";
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
  const id = local.id;
  const value = local.value !== undefined ? local.value : collectionItem?.value();
  const resolvedKey = resolveSectionKey(
    id,
    value,
    collectionItem ? collectionItem.index() : undefined,
  );
  const key = resolvedKey !== "" ? resolvedKey : list.createSectionKey();

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

  cleanup(list.register(descriptor));
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
  // follows the prop), rows are keyed by the entry's identity, and a row's
  // content is rebuilt from its item where the row goes.
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
          <Each of={local.items} key={collectionItemKey}>
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
