import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, signal, split, untracked, View } from "nsh";

import {
  createMultipleSelectionState,
  type SelectionBehavior,
  type SelectionMode,
  type SelectionValue,
} from "../../primitives";
import { renderChildren } from "./children";
import { GroupSelectionManager } from "./group-selection-manager";
import {
  CollectionItemContext,
  MenuContext,
  MenuSectionContext,
  sortByRenderedOrder,
  type MenuItemDescriptor,
  type MenuSectionContextValue,
  type MenuSectionDescriptor,
} from "./menu-context";
import { menuSectionVariants } from "./menu.styles";

export interface MenuSectionRootProps<T = unknown> {
  /** Static entries, or with `items`, the render function called once per entry. */
  children?: JSX.Element | ((item: T, index: number) => JSX.Element);

  /** The dynamic collection of entries in this group. */
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

  /**
   * A Section-level selection mode (RAC's `MenuSectionProps`). When set, the
   * Section builds its own selection state and `GroupSelectionManager`; when
   * absent, it shares the Menu's manager (port sheet section 5).
   */
  selectionMode?: SelectionMode;

  /** The selected keys of this group in controlled mode, or `"all"`. */
  selectedKeys?: "all" | Iterable<string | number>;

  /** The initial selected keys of this group in uncontrolled mode, or `"all"`. */
  defaultSelectedKeys?: "all" | Iterable<string | number>;

  /** Called whenever this group's selection changes. */
  onSelectionChange?: (keys: "all" | Set<string>) => void;

  /** `"toggle"` by default. */
  selectionBehavior?: SelectionBehavior;

  disallowEmptySelection?: boolean;

  /** Overrides the Menu's value for the entries of this group (section 1). */
  shouldCloseOnSelect?: boolean;

  /** React Aria's dependency list for `items`: accepted, no effect. */
  dependencies?: readonly unknown[];

  /** Replaces the host element upstream: accepted, no effect. */
  render?: unknown;

  slot?: string;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/** The same key derivation as an entry's (port sheet section 1). */
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

/** `"all"` stays the sentinel; an iterable becomes the string-keyed set. */
function normalizeSelection(
  value: "all" | Iterable<string | number> | undefined,
): SelectionValue | undefined {
  if (value == null) {
    return undefined;
  }

  if (value === "all") {
    return "all";
  }

  const keys = new Set<string>();

  for (const key of value) {
    keys.add(String(key));
  }

  return keys;
}

/**
 * Menu.Section / MenuSectionRoot: a `role="group"` view holding entries. It
 * registers a section descriptor whose `children` the collection builder
 * expands, and builds its own selection manager when it declared a
 * `selectionMode` (RAC's `GroupSelectionManager`, port sheet section 5).
 */
export function MenuSectionRoot<T>(
  props: MenuSectionRootProps<T>,
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
    "selectionMode",
    "selectedKeys",
    "defaultSelectedKeys",
    "onSelectionChange",
    "selectionBehavior",
    "disallowEmptySelection",
    "shouldCloseOnSelect",
    "dependencies",
    "render",
    "slot",
    "onLayout",
  ] as const);

  const list = MenuContext();

  if (!list) {
    return null;
  }

  const parentSection = MenuSectionContext();
  const collectionItem = CollectionItemContext();

  // Identity, read once (port sheet section 2). A static Section without `id`
  // has no key of its own: React Aria derives one from its position, so the
  // root hands out a unique one. The empty string is not a key.
  const id = local.id;
  const value =
    local.value !== undefined ? local.value : collectionItem?.value();
  const resolvedKey = resolveSectionKey(
    id,
    value,
    collectionItem ? collectionItem.index() : undefined,
  );
  const key = resolvedKey !== "" ? resolvedKey : list.createSectionKey();

  // RAC creates a selection state for every Section and a manager only when the
  // Section declared a `selectionMode` (`Menu.tsx:478-481`).
  const selectionState = createMultipleSelectionState({
    selectionMode: () => local.selectionMode,
    selectionBehavior: () => local.selectionBehavior,
    selectedKeys: computed(() => normalizeSelection(local.selectedKeys)),
    defaultSelectedKeys: computed(() =>
      normalizeSelection(local.defaultSelectedKeys),
    ),
    onSelectionChange: (keys) => local.onSelectionChange?.(keys),
    disallowEmptySelection: () => local.disallowEmptySelection,
  });

  const parentManager = parentSection?.selectionManager() ?? list.selectionManager();

  const groupManager = new GroupSelectionManager(
    parentManager,
    list.list.collection,
    selectionState,
  );

  // Only a Section that declared a `selectionMode` owns its selection: without
  // one, its entries use the Menu's manager, exactly as upstream does.
  const selectionManager = () =>
    local.selectionMode != null ? groupManager : list.selectionManager();

  const sectionItems = signal<readonly MenuItemDescriptor[]>([]);

  const registerItem = (descriptor: MenuItemDescriptor) => {
    sectionItems.set([...sectionItems(), descriptor]);

    return () => {
      sectionItems.set(
        sectionItems().filter((current) => current !== descriptor),
      );
    };
  };

  const descriptor: MenuSectionDescriptor = {
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

  const sectionContextValue: MenuSectionContextValue = {
    key,
    register: registerItem,
    selectionManager,
    shouldCloseOnSelect: () => local.shouldCloseOnSelect,
  };

  const classes = computed(() =>
    menuSectionVariants({ class: local.className }),
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
  // the root: `items` is read by the `<Each>` itself and rows are kept by the
  // item itself.
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
    <MenuSectionContext.Provider value={sectionContextValue}>
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
    </MenuSectionContext.Provider>
  );
}
