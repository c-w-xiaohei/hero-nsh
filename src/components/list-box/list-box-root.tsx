import type {
  Accessor,
  AccessibilityState,
  Bounds,
  JSX,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import {
  announce,
  cleanup,
  computed,
  effect,
  platform,
  screenReaderEnabled,
  setAccessibilityFocus,
  signal,
  split,
  untracked,
  View,
} from "nsh";

import {
  createInput,
  createInteractionModality,
  createKeymapScope,
  createListState,
  createRowRegistry,
  createSelectableList,
  isCtrlKeyPressed,
  isKeyboardPress,
  isNonContiguousSelectionModifier,
  ListOwnerContext,
  toListItemData,
  type ListState,
  type SelectionBehavior,
  type SelectionMode,
  type SelectionModifiers,
  type SelectionValue,
} from "../../primitives";
import { renderChildren } from "./children";
import {
  CollectionItemContext,
  ListBoxContainerContext,
  ListBoxContext,
  type ListBoxContextValue,
  type ListBoxDescriptor,
  type ListBoxItemDescriptor,
  type ListBoxRowHandle,
  sortByRenderedOrder,
} from "./list-box-context";
import { listboxVariants, type ListBoxVariants } from "./list-box.styles";

/** The live state HeroUI hands to `renderEmptyState`, `className` and `style`. */
export interface ListBoxRenderProps {
  isEmpty: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDropTarget: Accessor<boolean>;
  layout: Accessor<"stack" | "grid">;
  orientation: Accessor<"vertical" | "horizontal">;
  /** The list state (this port's `ListState`, not React Stately's object). */
  state: ListState;
}

export interface ListBoxRootProps<T = unknown> extends ListBoxVariants {
  /**
   * Static options and sections, or with `items`, the render function called
   * once per entry. Read once, inside the context provider (research 4.1).
   */
  children?: JSX.Element | ((item: T, index: number) => JSX.Element);

  /** Appended after the variant classes; later classes win. */
  className?: string | ((values: ListBoxRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: ListBoxRenderProps) => StyleProp<ViewStyle>);

  /** Forwarded to the root view. */
  ref?: (node: ViewRef) => void;

  /** Upstream a DOM id; here the view's `nativeID`. */
  id?: string;

  nativeID?: string;

  testID?: string;

  tooltip?: JSX.Element;

  /** The dynamic collection; each entry renders through the function child. */
  items?: readonly T[];

  /** React Aria's dependency list for `items`: accepted, no effect. */
  dependencies?: readonly unknown[];

  /** `"none"` by default, as React Aria's ListBox (port sheet section 1). */
  selectionMode?: SelectionMode;

  /** `"toggle"` by default. */
  selectionBehavior?: SelectionBehavior;

  /** The selected keys in controlled mode, or `"all"`. */
  selectedKeys?: "all" | Iterable<string | number>;

  /** The initial selected keys in uncontrolled mode, or `"all"`. */
  defaultSelectedKeys?: "all" | Iterable<string | number>;

  /** Called whenever the selection changes; a `Set` (keys are strings here). */
  onSelectionChange?: (keys: "all" | Set<string>) => void;

  /** Called with an option's key when it cannot be selected (or has no selection). */
  onAction?: (key: string) => void;

  disallowEmptySelection?: boolean;

  /** Keys that cannot be selected; `disabledBehavior` governs focus and action. */
  disabledKeys?: Iterable<string | number>;

  /** `"all"` (inert rows) by default; `"selection"` keeps them reachable. */
  disabledBehavior?: "all" | "selection";

  /** Moves the focused key to a hovered option (virtual focus). */
  shouldFocusOnHover?: boolean;

  /** `false` by default: a pointer press selects on press down. */
  shouldSelectOnPressUp?: boolean;

  /** `"stack"` by default; a grid still moves in `orientation` order. */
  layout?: "stack" | "grid";

  /** `"vertical"` by default. */
  orientation?: "vertical" | "horizontal";

  /** What an empty collection shows. */
  renderEmptyState?: (values: ListBoxRenderProps) => JSX.Element;

  /** Focuses the list after mount (`"first"` / `"last"` choose the item). */
  autoFocus?: boolean | "first" | "last";

  /** Wraps the focused key at either end. */
  shouldFocusWrap?: boolean;

  /** `"clearSelection"` by default; `"none"` leaves Escape alone. */
  escapeKeyBehavior?: "clearSelection" | "none";

  /** React Aria's keyboard delegate: accepted, no effect (NSH has no key event). */
  keyboardDelegate?: unknown;

  /** React Aria's drag-and-drop hooks: accepted, no effect. */
  dragAndDropHooks?: unknown;

  /** A DOM scroll event upstream; scrolling lives on `Scroll` / `List` here. */
  onScroll?: unknown;

  /** Replaces the host element upstream: accepted, no effect. */
  render?: unknown;

  /** A slot collection name upstream: accepted, no effect. */
  slot?: string;

  "aria-label"?: string;

  "aria-labelledby"?: string;

  "aria-describedby"?: string;

  "aria-hidden"?: boolean;

  accessibilityLabel?: string;

  accessibilityState?: AccessibilityState;

  accessibilityElementsHidden?: boolean;

  onFocus?: () => void;

  onBlur?: () => void;

  /** A DOM key event upstream; keys arrive through `keymap` here. */
  onKeyDown?: unknown;

  onKeyUp?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/** One descriptor, as the collection builder consumes it. */
function descriptorToData(descriptor: ListBoxDescriptor): any {
  if (descriptor.type === "section") {
    return {
      key: descriptor.key,
      textValue: descriptor.textValue(),
      children: descriptor.children().map(descriptorToData),
    };
  }

  return {
    key: descriptor.key,
    textValue: descriptor.textValue(),
    disabled: descriptor.disabled(),
  };
}

/**
 * Port sheet §5, first change: a virtual-focus field (ComboBox) filters the
 * collection, upstream through React Aria's `displayedCollection`. The rows keep
 * mounting (`ListBox.Item` still registers), so a changed filter string brings
 * them back; only the collection the keyboard walks is cut down.
 */
function filterData(
  nodes: readonly any[],
  matches: (textValue: string, inputValue: string) => boolean,
  inputValue: string,
): any[] {
  return nodes.flatMap((node) => {
    if (Array.isArray(node.children)) {
      const children = filterData(node.children, matches, inputValue);

      // `useComboBoxState.ts:679-683`: a section survives only while one of its
      // filtered children is an item, so a filtered list keeps no empty header.
      return children.some((child) => !Array.isArray(child.children))
        ? [{ ...node, children }]
        : [];
    }

    return matches(node.textValue ?? "", inputValue) ? [node] : [];
  });
}

/** The keys of every option in a built collection, sections included. */
function collectItemKeys(nodes: readonly any[], into: Set<string>): Set<string> {
  for (const node of nodes) {
    if (Array.isArray(node.children)) {
      collectItemKeys(node.children, into);
    } else {
      into.add(String(node.key));
    }
  }

  return into;
}

/**
 * f-collection, mounted side: the registry of the rows that exist. A mounted
 * option/section registers a `ListBoxRowHandle` on mount and drops it on
 * unmount; the `items` data source subscribes to `keys()` so a row's own
 * `textValue`/`isDisabled` overrides merge into its datum while it is mounted
 * and fall back when it is not — without the row ever feeding the collection.
 */
interface MergedEntry {
  key: string;
  textValue: string;
  disabled: boolean;
  children?: any[];

  /**
   * The raw datum behind this entry. `buildNodes` copies it to
   * `CollectionNode.rawValue`, which lets a mounted section find the node its
   * keyless datum produced (`__nsh:section:` key) by identity — the merged
   * entry itself is a fresh object, so it could never be matched.
   */
  datum?: unknown;
}

/**
 * Finds the item handle whose row renders `datum`. A named datum
 * (`namedKey !== ""`) is claimed by key only: a row whose `id` renames a
 * real data key does not claim it — it stays an orphan and is appended,
 * which is the sheet's "孤儿行追加" contract. A keyless datum (`namedKey`
 * `""`) claims by identity first — `value` equality is the association that
 * survives a reorder moving the positional key, since the row's own key is
 * a mount-time constant — and by the positional key as the fallback.
 */
function handleForDatum(
  registry: readonly ListBoxRowHandle[],
  namedKey: string,
  positionalKey: string,
  datum: unknown,
): ListBoxRowHandle | undefined {
  if (namedKey !== "") {
    return registry.find(
      (handle) => handle.type === "item" && handle.key === namedKey,
    );
  }

  return (
    registry.find(
      (handle) => handle.type === "item" && handle.value?.() === datum,
    ) ??
    registry.find(
      (handle) => handle.type === "item" && handle.key === positionalKey,
    )
  );
}

/**
 * `items` data → collection entries, mounted-row overrides merged in. A row
 * that claims a datum renames it to the row's key (the association key), wins
 * `textValue` only when it reports one, and overrides `disabled` when it
 * reports one (an explicit `isDisabled={false}` clears the datum's flag);
 * the datum's key
 * itself is never overridden — a row whose key matches nothing is an orphan
 * and is appended at the data-source tail, which keeps the RAC contract where
 * a row's `id` adds its option to a data-driven list.
 *
 * A keyless section datum keeps `""` (not the positional index): only then
 * does `buildNodes` mint the `__nsh:section:{level}:{index}` key the sheet's
 * key-convergence rule names, and the mounted section reads it back by
 * matching `datum` through `rawValue`.
 */
function mergeRows(
  data: readonly unknown[],
  registry: readonly ListBoxRowHandle[],
  seen: Set<ListBoxRowHandle>,
): MergedEntry[] {
  const merged = data.map((datum, index) => {
    const normalized = toListItemData(datum, index);
    const isSection = normalized.children !== undefined;
    // A section datum never takes the positional key (buildNodes mints
    // `__nsh:section:` for ""); an item datum keeps it.
    const namedKey = toListItemData(datum).key;
    const ownKey = isSection ? namedKey : normalized.key;
    const handle = isSection
      ? undefined
      : handleForDatum(registry, namedKey, ownKey, datum);

    if (handle) {
      seen.add(handle);
    }

    return {
      key: handle?.key ?? ownKey,
      textValue:
        normalized.children === undefined
          ? handle?.textValue?.() || normalized.textValue
          : normalized.textValue,
      // The mounted row's disabled is an override, not a union: its
      // `isDisabled === false` clears a datum's `disabled: true` exactly the
      // way the static descriptor path decided it (the row's own disabled
      // already unions `disabledKeys` through `isDisabledKey`). An absent row
      // falls back to the datum's own flag.
      disabled: handle?.disabled?.() ?? normalized.disabled,
      children:
        normalized.children === undefined
          ? undefined
          : mergeRows(normalized.children, registry, seen),
      datum,
    };
  });

  return merged;
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
 * ListBox.Root / ListBoxRoot: the `role="listbox"` container, the collection
 * registry and the one keyboard focus stop. HeroUI wraps React Aria's ListBox;
 * NSH has no DOM key events, so the root owns `keymap.bind` while focused and
 * routes activation to the option holding `focusedKey` (port sheet section 5).
 */
export function ListBoxRoot<T>(
  props: ListBoxRootProps<T>,
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "variant",
    "items",
    "dependencies",
    "selectionMode",
    "selectionBehavior",
    "selectedKeys",
    "defaultSelectedKeys",
    "onSelectionChange",
    "onAction",
    "disallowEmptySelection",
    "disabledKeys",
    "disabledBehavior",
    "shouldFocusOnHover",
    "shouldSelectOnPressUp",
    "layout",
    "orientation",
    "renderEmptyState",
    "autoFocus",
    "shouldFocusWrap",
    "escapeKeyBehavior",
    "keyboardDelegate",
    "dragAndDropHooks",
    "onScroll",
    "render",
    "slot",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-hidden",
    "accessibilityLabel",
    "accessibilityState",
    "accessibilityElementsHidden",
    "onFocus",
    "onBlur",
    "onKeyDown",
    "onKeyUp",
    "onLayout",
  ] as const);

  const variant = computed(() => local.variant ?? "default");

  // Port sheet §5, first change: a Select (or later a ComboBox) can drive this
  // list. Without an owner every accessor below keeps today's value, so a
  // standalone ListBox behaves exactly as before.
  const owner = ListOwnerContext();
  const container = ListBoxContainerContext();

  const selectionMode = (): SelectionMode =>
    owner?.selectionMode() ?? local.selectionMode ?? "none";
  const selectionBehavior = (): SelectionBehavior =>
    local.selectionBehavior ?? "toggle";
  const disabledBehavior = (): "all" | "selection" =>
    local.disabledBehavior ?? "all";

  /** Whether the list may take focus, bind keys and be read out (port sheet §5, third change). */
  const isActive = () => owner?.isActive() ?? true;

  const shouldFocusOnHover = () =>
    owner?.shouldFocusOnHover() ?? local.shouldFocusOnHover ?? false;

  const shouldSelectOnPressUp = () =>
    owner?.shouldSelectOnPressUp() ?? local.shouldSelectOnPressUp ?? false;

  const disallowEmptySelection = () =>
    owner?.disallowEmptySelection() ?? local.disallowEmptySelection ?? false;

  // Research 4.2: parts register themselves with the nearest owner, and the
  // registry becomes the primitive's data source. A section descriptor carries
  // its options so `buildNodes` expands the hierarchy. Registration order is
  // creation order, so a dynamic collection is sorted back into data order
  // through each row's `order` accessor (its `<Each>` index signal).
  // f-collection: only the static-children path feeds this registry; with
  // `items` the data itself is the collection and rows only mount handles.
  const descriptors = signal<readonly ListBoxDescriptor[]>([]);

  const register = (descriptor: ListBoxDescriptor) => {
    descriptors.set([...descriptors(), descriptor]);

    return () => {
      descriptors.set(descriptors().filter((current) => current !== descriptor));
    };
  };

  // f-collection, mounted side: the one store that knows which rows exist.
  const rowRegistry = createRowRegistry<ListBoxRowHandle>();

  // Port sheet §5, first change: the field root may own the dynamic collection
  // (the HeroUI ComboBox stories write `items` on the root and render the rows
  // through a function child there), so the list falls back to it.
  const items = computed<T[] | undefined>(() => {
    if (local.items !== undefined) {
      return local.items as T[];
    }

    const external = owner?.items?.();

    return external === undefined ? undefined : (Array.from(external) as T[]);
  });

  const hasItems = computed(() => items() != null);

  const dataSource = computed(() => {
    const data = items();

    if (data == null) {
      return sortByRenderedOrder(descriptors()).map(descriptorToData);
    }

    // The data side holds the complete collection. Mounted rows only merge
    // their overrides; a row whose key claims no datum is appended as an
    // orphan (registration order), as RAC's row-id override contract keeps.
    const rows = rowRegistry
      .keys()
      .map((key) => rowRegistry.get(key))
      .filter((handle): handle is ListBoxRowHandle => handle != null);
    const seen = new Set<ListBoxRowHandle>();
    const merged = mergeRows(data, rows, seen);

    const used = new Set<string>();
    const collectKeys = (entries: readonly MergedEntry[]) => {
      for (const entry of entries) {
        used.add(entry.key);
        if (entry.children) {
          collectKeys(entry.children);
        }
      }
    };
    collectKeys(merged);

    const orphans: MergedEntry[] = [];

    for (const handle of rows) {
      if (seen.has(handle) || handle.type !== "item") {
        continue;
      }

      // Two orphans under one key cannot both own it: the later entry loses
      // the collision in `ListCollection` anyway, so give it a printable
      // suffix instead of silently dropping the row's option.
      let orphanKey = handle.key;
      let suffix = 2;

      while (used.has(orphanKey)) {
        orphanKey = `${handle.key}#${suffix++}`;
      }
      used.add(orphanKey);

      orphans.push({
        key: orphanKey,
        textValue: handle.textValue?.() ?? "",
        disabled: handle.disabled?.() === true,
      });
    }

    return [...merged, ...orphans];
  });

  // Port sheet §5, first change: the owner's `filterText` (ComboBox's current
  // filter) cuts the collection down; `defaultFilter` replaces the language-
  // aware `contains` when the caller gave one. A list with no owner never
  // filters, so a standalone ListBox is untouched.
  const matchesFilter = (textValue: string, inputValue: string): boolean => {
    const custom = owner?.defaultFilter?.();

    if (custom) {
      return custom(textValue, inputValue);
    }

    // Kobalte's `createFilter({ sensitivity: "base" })`: a case-insensitive
    // substring match, locale-aware through `toLocaleLowerCase`.
    return textValue
      .toLocaleLowerCase()
      .includes(inputValue.toLocaleLowerCase());
  };

  const filteredData = computed(() => {
    const data = dataSource();
    const inputValue = owner?.filterText?.();

    return inputValue === undefined
      ? data
      : filterData(data, matchesFilter, inputValue);
  });

  // Port sheet §5, third change: the rows learn which keys survive the filter
  // so a cut-down row can be `hidden` while it stays mounted and registered.
  // `undefined` means "nothing is filtered"; a standalone list keeps every row
  // visible without building a set.
  const visibleKeys = computed<ReadonlySet<string> | undefined>(() => {
    if (owner?.filterText?.() === undefined) {
      return undefined;
    }

    return collectItemKeys(filteredData(), new Set<string>());
  });

  // A static Section without `id` still needs a key: React Aria derives one
  // from the section's position (`list-box.stories.tsx:87,117`). The root
  // hands out one per Section, prefixed with a NUL byte so it can never take
  // an item's key; the layout store and the item's `sectionKey` use it too.
  let generatedSectionCount = 0;

  const createSectionKey = () =>
    `__nsh:listbox-section:${generatedSectionCount++}`;

  const isDisabledKey = (key: string) => {
    // The owner's `disabledKeys` replace this list's own prop, never add to it:
    // a Select's stories write them on the root and the caller's ListBox has no
    // props (port sheet §2).
    const keys = owner ? owner.disabledKeys() : local.disabledKeys;

    if (keys == null) {
      return false;
    }

    for (const candidate of keys) {
      if (String(candidate) === key) {
        return true;
      }
    }

    return false;
  };

  const list = createListState({
    dataSource: filteredData,
    getKey: () => "key",
    getTextValue: () => "textValue",
    getDisabled: () => "disabled",
    getSectionChildren: () => "children",
    selectionMode,
    selectionBehavior,
    selectedKeys: computed(() =>
      owner
        ? owner.selectedKeys()
        : normalizeSelection(local.selectedKeys),
    ),
    defaultSelectedKeys: computed(() =>
      owner
        ? owner.defaultSelectedKeys()
        : normalizeSelection(local.defaultSelectedKeys),
    ),
    onSelectionChange: (keys) => {
      if (owner) {
        owner.onSelectionChange(keys);

        // Kobalte closes a single-select field at the end of its selection
        // callback; the owner decides whether this list closes on selection.
        if (owner.closeOnSelection()) {
          owner.close();
        }

        return;
      }

      local.onSelectionChange?.(keys);
    },
    allowDuplicateSelectionEvents: () => owner?.allowDuplicateSelectionEvents(),
    disallowEmptySelection,
    disabledBehavior,
  });

  let rootNode: ViewRef | undefined;

  /** Focuses the root, the only Tab stop; a no-op where code focus is not offered. */
  const focusRoot = () => {
    rootNode?.focus();
  };

  // A pointer press gives the root no native focus, so the port focuses it for
  // the arrows to keep working (macOS / web). That focus event is not keyboard
  // focus: the flag tells `handleFocus` to keep the pointer modality, which is
  // what `:focus-visible` would do upstream (`list-box-item.css:37-39`).
  // `ViewRef.focus()` only moves a view's keyboard focus on macOS and the web
  // (`nsh/types.d.ts`), so elsewhere the flag would never be consumed; do not
  // set it where no focus event can arrive.
  const canFocusViews = platform.os === "macos" || platform.os === "web";
  let pointerFocusPending = false;

  const focusRootFromPointer = () => {
    if (!canFocusViews) {
      return;
    }

    pointerFocusPending = true;
    rootNode?.focus();
  };

  const selectableList = createSelectableList({
    collection: list.collection,
    selectionManager: list.selectionManager,
    autoFocus: () => local.autoFocus,
    // A field that owns this list through the owner contract carries the wrap
    // setting itself (ComboBox's `shouldFocusWrap`, `useComboBox.ts:174-182`);
    // the caller-written list has no prop for it.
    shouldFocusWrap: () => local.shouldFocusWrap ?? owner?.shouldFocusWrap?.(),
    orientation: () => local.orientation ?? "vertical",
    disallowEmptySelection,
    focusCollection: focusRoot,
  });

  const manager = () => list.selectionManager();

  // Port sheet §5: the list reports its state and its focus entry points back
  // to the owning field, and drops the registration when it unmounts.
  if (owner) {
    cleanup(
      owner.registerList(list, {
        focusList: focusRoot,
        focusKey: (key) => {
          manager().setFocused(true);
          manager().setFocusedKey(key);
        },
        focusedKey: () => manager().focusedKey(),
        // f-collection: mounted presence decides whether the rich contract
        // (`children` for Select.Value) exists; the collection node is the
        // fallback an unmounted option still answers (`{key, textValue}`).
        findItem: (key) => {
          const handle = rowRegistry.get(key);

          if (handle?.type === "item") {
            return {
              key,
              textValue: handle.textValue ?? (() => ""),
              children: handle.children,
            };
          }

          const node = list.collection().getItem(key);

          return node
            ? { key: node.key, textValue: () => node.textValue }
            : undefined;
        },
        activateFocused: (modifiers) => activateFocused("keyboard", undefined, modifiers),
        // The unfiltered option count: a field's open guard asks for it
        // (`useComboBoxState.ts:335`), because a live filter cuts the
        // collection the keyboard walks.
        itemCount: () => collectItemKeys(dataSource(), new Set<string>()).size,
        // The field's list stays mounted while it closes; its typeahead prefix
        // must not survive the close (the closed list would search "thf").
        resetTypeAhead: selectableList.resetTypeAhead,
        // Port sheet §5, first change: a field whose input keeps the focus
        // (ComboBox) routes its arrows and page keys here, because the list
        // never becomes a focus stop of its own.
        handleKeyDown: (event) => {
          selectableList.onKeyDown(event.key);
          return true;
        },
      }),
    );
  }

  const rootFocused = signal(false);
  const keyboardPressedKey = signal<string | undefined>(undefined);
  const modality = createInteractionModality();

  cleanup(() => modality.reset());

  const isFocusVisible = computed(
    () => rootFocused() && modality.isKeyboard(),
  );

  const isEmpty = computed(() => list.collection().getSize() === 0);

  // Parts register in their component bodies, so the first render still sees an
  // empty registry. Wait for the mount effect before deciding the collection is
  // empty, or `renderEmptyState` would flash for one pass on every list.
  const mounted = signal(false);

  effect(() => {
    mounted.set(true);
  });

  const renderProps: ListBoxRenderProps = {
    isEmpty,
    isFocused: rootFocused,
    isFocusVisible,
    isDropTarget: () => false,
    layout: () => local.layout ?? "stack",
    orientation: () => local.orientation ?? "vertical",
    state: list,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? className(renderProps)
      : className;
  };

  // R-042: the container's list classes sit after this list's own base classes
  // and before the caller's, so `p-1.5` beats `p-1` and the caller still wins
  // (the same three-segment order Description and FieldError use).
  const classes = computed(() =>
    [
      listboxVariants({ variant: variant() }),
      container?.listClass?.(),
      resolvedClassName(),
    ]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // The popover names the listbox with the field's label, standing in for
  // `aria-labelledby` (port sheet §5, second change).
  const accessibilityLabel = () =>
    local["aria-label"] ??
    local.accessibilityLabel ??
    container?.accessibilityLabel?.();

  // A closed field keeps its list mounted but out of the accessibility tree and
  // the Tab order (port sheet §5, third change).
  const elementsHidden = () =>
    local["aria-hidden"] ?? local.accessibilityElementsHidden ?? !isActive();

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  // Environment.input, read once under this root's context: the unmounted
  // activation fallback below needs the same touch rule `createSelectableItem`
  // applies to a mounted row (touch toggles instead of replacing).
  const input = createInput();

  /**
   * f-collection 激活兜底: activation of a focused key whose row is not
   * mounted. It replays `createSelectableItem`'s keyboard selection against
   * the manager — a truly disabled node is inert, `mode "none"` only acts,
   * and the modifier rules match `selectWithEvent` — then fires the root's
   * `onAction`, so Enter on an unmounted option is never silently dropped.
   */
  const activateUnmounted = (
    key: string,
    node: { disabled: boolean },
    modifiers?: SelectionModifiers,
  ) => {
    const m = manager();
    const inert = node.disabled && m.disabledBehavior() === "all";

    if (!inert) {
      if (!node.disabled && m.canSelectItem(key)) {
        if (modifiers && isNonContiguousSelectionModifier(modifiers)) {
          m.toggleSelection(key);
        } else if (m.selectionMode() === "single") {
          if (m.isSelected(key) && !m.disallowEmptySelection()) {
            m.toggleSelection(key);
          } else {
            m.replaceSelection(key);
          }
        } else if (modifiers?.shift) {
          m.extendSelection(key);
        } else if (
          m.selectionBehavior() === "toggle" ||
          isCtrlKeyPressed(modifiers) ||
          input() === "touch"
        ) {
          m.toggleSelection(key);
        } else {
          m.replaceSelection(key);
        }
      }

      local.onAction?.(key);
    }
  };

  const activateFocused = (
    source: "pointer" | "keyboard",
    event?: PressEvent,
    modifiers?: SelectionModifiers,
  ) => {
    const key = manager().focusedKey();

    if (key == null) {
      return;
    }

    const handle = rowRegistry.get(key);

    if (handle?.type === "item" && handle.activate) {
      handle.activate(source, event, modifiers);
      return;
    }

    const node = list.collection().getItem(key);

    if (node?.type === "item") {
      activateUnmounted(key, node, modifiers);
    }
  };

  const runKey = (key: string, modifiers?: SelectionModifiers) => {
    modality.setKeyboardModality();
    selectableList.onKeyDown(key, modifiers);
  };

  const handleFocus = () => {
    rootFocused.set(true);

    if (pointerFocusPending) {
      // A press focused the root; the modality stays pointer, so no ring.
      pointerFocusPending = false;
    } else {
      modality.onFocus();
    }

    selectableList.onFocusIn();
    local.onFocus?.();
  };

  const handleBlur = () => {
    rootFocused.set(false);
    selectableList.onFocusOut();
    local.onBlur?.();
  };

  // R-013: a keyboard activation arrives as a press on the focused view; the
  // pressed key drives the focused row's pressed state (a real pointer press
  // reaches the row itself).
  const handlePressDown = (event: PressEvent) => {
    if (!isKeyboardPress(event)) {
      return;
    }

    modality.setKeyboardModality();
    keyboardPressedKey.set(manager().focusedKey());
  };

  const handlePressUp = (event: PressEvent) => {
    if (!isKeyboardPress(event)) {
      return;
    }

    keyboardPressedKey.set(undefined);
  };

  const handlePress = (event: PressEvent) => {
    // A pointer press on the container's own padding does nothing, as upstream.
    if (!isKeyboardPress(event)) {
      return;
    }

    modality.setKeyboardModality();
    activateFocused("keyboard", event);
  };

  const handleLayout = (event: { bounds: Bounds }) => {
    selectableList.registerContainerLayout(event.bounds);
    local.onLayout?.(event);
  };

  // Port sheet section 5: the collection's keys are bound only while the root
  // has the focus, and dropped on blur or unmount (createKeymapScope). Enter /
  // Space stay unbound on macOS and the web: the host delivers them as the
  // focused view's press, and a binding would consume them first.
  //
  // Keymap matches the modifiers exactly, so the Shift and Control forms of a
  // shortcut are separate bindings (`nsh/index.d.ts` `Keymap`). React Aria
  // reads `shiftKey` / ctrl-or-meta from the event; here the binding is the
  // only place that knows them, so each one forwards its own modifiers
  // (Kobalte `create-selectable-collection.ts:157-158, 265-268, 286-289, 317`).
  const navigationBindings: Record<string, () => void> = {
    down: () => runKey("down"),
    "shift+down": () => runKey("down", { shift: true }),
    up: () => runKey("up"),
    "shift+up": () => runKey("up", { shift: true }),
    left: () => runKey("left"),
    "shift+left": () => runKey("left", { shift: true }),
    right: () => runKey("right"),
    "shift+right": () => runKey("right", { shift: true }),
    home: () => runKey("home"),
    "shift+home": () => runKey("home", { shift: true }),
    end: () => runKey("end"),
    "shift+end": () => runKey("end", { shift: true }),
    pageup: () => runKey("pageup"),
    "shift+pageup": () => runKey("pageup", { shift: true }),
    pagedown: () => runKey("pagedown"),
    "shift+pagedown": () => runKey("pagedown", { shift: true }),
  };

  // The Windows exception: the host reports Return / Space as a press only on
  // macOS and the web, so Windows resolves them through the same activation.
  // Shift+Return / Shift+Space extend the selection, as the press modifiers
  // do upstream.
  if (platform.os === "windows") {
    navigationBindings.enter = () => activateFocused("keyboard");
    navigationBindings["shift+enter"] = () =>
      activateFocused("keyboard", undefined, { shift: true });
    navigationBindings.space = () => activateFocused("keyboard");
    navigationBindings["shift+space"] = () =>
      activateFocused("keyboard", undefined, { shift: true });
  }

  // `isCtrlKeyPressed` wants `platform` on Apple and `control` elsewhere; the
  // web target cannot tell the browser's OS, so there both must work.
  const selectAllModifiers = (): SelectionModifiers =>
    platform.os === "web"
      ? { control: true }
      : platform.os === "macos" || platform.os === "ios"
        ? { platform: true }
        : { control: true };

  const commandBindings: Record<string, () => void> = {
    "ctrl+a": () => runKey("a", { control: true }),
    "mod+a": () => runKey("a", selectAllModifiers()),
  };

  // Kobalte's type-select takes any single character
  // (`create-type-select.ts:42-47`); keymap has a name per printable key, so
  // the punctuation of the US layout is bound too. Space stays out: on the web
  // and macOS it is the focused view's activation press, and a binding would
  // consume it (`_common` "NSH component rules", last paragraph). A shifted
  // character (`?`, `!`) is a different keystroke and is not bound: the
  // typeahead is narrower than upstream's on Shift.
  const PUNCTUATION: ReadonlyArray<[keystroke: string, character: string]> = [
    ["minus", "-"],
    ["plus", "="],
    ["[", "["],
    ["]", "]"],
    ["\\", "\\"],
    [";", ";"],
    ["'", "'"],
    [",", ","],
    [".", "."],
    ["/", "/"],
    ["`", "`"],
  ];

  const printableBindings: Record<string, () => void> = {};

  for (const key of "abcdefghijklmnopqrstuvwxyz0123456789") {
    printableBindings[key] = () => runKey(key);
  }

  for (const [keystroke, character] of PUNCTUATION) {
    printableBindings[keystroke] = () => runKey(character);
  }

  createKeymapScope({
    isActive: () => isActive() && rootFocused(),
    bindings: navigationBindings,
    options: { repeat: true },
  });

  createKeymapScope({
    isActive: () => isActive() && rootFocused(),
    bindings: commandBindings,
  });

  createKeymapScope({
    isActive: () => isActive() && rootFocused(),
    bindings: printableBindings,
  });

  // `escapeKeyBehavior` is a prop, so the binding is its own scope: flipping it
  // while the list is focused re-binds or drops Escape instead of keeping the
  // value read at mount. An owned list closes its field instead of clearing the
  // selection (port sheet §5): Escape must never deselect in a Select.
  createKeymapScope({
    isActive: () =>
      isActive() &&
      rootFocused() &&
      (owner ? true : local.escapeKeyBehavior !== "none"),
    bindings: {
      escape: () => {
        if (owner) {
          owner.escape();
        } else {
          runKey("escape");
        }
      },
    },
  });

  // The screen reader follows the focused key, the stand-in for
  // `aria-activedescendant` (port sheet section 5). On the web a "screen reader
  // focus" is the page's own focus: moving it takes the keyboard focus off the
  // listbox, which fires the root's `onBlur`, drops every keymap scope and
  // leaves the arrows, typeahead and Escape dead (measured: Tab gives the root
  // focus, then this effect blurs it at once). Upstream keeps DOM focus on the
  // listbox and only moves `aria-activedescendant`, which NSH does not expose;
  // there the active option is announced instead, so a screen reader still
  // hears it. `screenReaderEnabled` is reactive, so a reader switched on later
  // starts hearing it.
  effect(() => {
    const key = manager().focusedKey();

    if (key == null || !rootFocused()) {
      return;
    }

    const handle = rowRegistry.get(key);
    const node =
      handle == null || handle.type !== "item"
        ? list.collection().getItem(key)
        : undefined;

    if (platform.os === "web") {
      // The announce fallback covers unmounted keys too: the collection still
      // knows the option's text (f-collection §5, host gap register).
      const text = handle?.textValue?.() ?? node?.textValue;

      if (screenReaderEnabled() && text != null) {
        announce(text);
      }

      return;
    }

    const view = handle?.ref?.();

    if (view) {
      // An unmounted option has no view to take accessibility focus; the
      // announce/textValue fallback above is its degradation (sheet §5).
      setAccessibilityFocus(view);
    }
  });

  let didAutoFocus = false;

  effect(() => {
    if (didAutoFocus || !local.autoFocus) {
      return;
    }

    didAutoFocus = true;
    focusRoot();
  });

  const contextValue: ListBoxContextValue = {
    list,
    selectionManager: () => manager(),
    register,
    rowRegistry,
    registerRow: rowRegistry.register,
    selectionMode,
    selectionBehavior,
    isFocused: rootFocused,
    focusedKey: () => manager().focusedKey(),
    isKeyboard: modality.isKeyboard,
    shouldFocusOnHover,
    shouldSelectOnPressUp,
    orientation: () => local.orientation ?? "vertical",
    layout: () => local.layout ?? "stack",
    isDisabledKey,
    onAction: (key) => local.onAction?.(key),
    focusRoot,
    focusRootFromPointer,
    createSectionKey,
    notePointer: () => modality.setPointerModality(),
    keyboardPressedKey,
    visibleKeys,
    registerItemLayout: selectableList.registerItemLayout,
    unregisterItemLayout: selectableList.unregisterItemLayout,
    registerSectionLayout: selectableList.registerSectionLayout,
    unregisterSectionLayout: selectableList.unregisterSectionLayout,
  };

  // The plan's §5 children rule: Root provides a context, so `props.children`
  // is read at the placement inside the provider, once per evaluation. The
  // read must be a JSX child expression, not a body local or an `If` `else`
  // element: only a binding re-reads it, so an `<If>` child added later, or a
  // changed render function, reaches the tree (each read builds new views).

  // One row of the dynamic collection. The row is keyed by the item itself
  // (`<Each>`'s default: objects by identity, primitives by value), not by its
  // `id`: a replacement under an existing key is a new object, so it builds a
  // fresh row from the current collection, while a reorder that reuses the
  // objects only moves rows. Reading `item()` here is then the row's own
  // current value — the same fresh element React re-renders upstream
  // (`react-aria-components/src/ListBox.tsx:154-160`, `:582-595`).
  const renderRow = (item: T, index: number): JSX.Element => {
    const children = local.children;

    if (typeof children !== "function") {
      return null;
    }

    return renderChildren(
      (children as (value: T, position: number) => JSX.Element)(item, index),
    );
  };

  const showEmpty = () =>
    mounted() && isEmpty() && local.renderEmptyState != null;

  return (
    <ListBoxContext.Provider value={contextValue}>
      <View
        {...rest}
        ref={(node) => {
          rootNode = node;
          local.ref?.(node);
        }}
        testID={local.testID}
        nativeID={local.id ?? local.nativeID}
        tooltip={local.tooltip}
        role="listbox"
        // The root is the one Tab stop; items are virtual-focus rows and never
        // focusable themselves (port sheet section 5). An owned list is a Tab
        // stop only while its field is open, and a virtual-focus field
        // (ComboBox) says it never is one (port sheet §5, first change).
        focusable={owner?.isTabStop?.() ?? isActive()}
        accessibilityLabel={accessibilityLabel()}
        accessibilityState={local.accessibilityState}
        accessibilityElementsHidden={elementsHidden()}
        class={classes()}
        style={resolvedStyle()}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPress={handlePress}
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        onLayout={handleLayout}
      >
        {/* RAC draws the empty state only while the collection is empty
            (ListBox.tsx:385-391); a function child is called when the branch
            shows, so `renderEmptyState` never runs for a filled list. */}
        <If when={showEmpty()}>
          {() => local.renderEmptyState?.(renderProps)}
        </If>
        <If when={hasItems()}>
          <Each of={items()}>
            {(item, index) => (
              <CollectionItemContext.Provider value={{ value: item, index }}>
                {renderRow(item(), untracked(() => index()))}
              </CollectionItemContext.Provider>
            )}
          </Each>
        </If>
        <If when={!hasItems()}>{renderChildren(local.children as JSX.Element)}</If>
      </View>
    </ListBoxContext.Provider>
  );
}
