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
  createInteractionModality,
  createKeymapScope,
  createListState,
  createSelectableList,
  isKeyboardPress,
  ListOwnerContext,
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

/** The option with `key`, at the top level or inside a section. */
function findItemDescriptor(
  descriptors: readonly ListBoxDescriptor[],
  key: string,
): ListBoxItemDescriptor | undefined {
  for (const descriptor of descriptors) {
    if (descriptor.type === "item") {
      if (descriptor.key === key) {
        return descriptor;
      }
    } else {
      const found = findItemDescriptor(descriptor.children(), key);

      if (found) {
        return found;
      }
    }
  }

  return undefined;
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
  const descriptors = signal<readonly ListBoxDescriptor[]>([]);

  const register = (descriptor: ListBoxDescriptor) => {
    descriptors.set([...descriptors(), descriptor]);

    return () => {
      descriptors.set(descriptors().filter((current) => current !== descriptor));
    };
  };

  const dataSource = computed(() =>
    sortByRenderedOrder(descriptors()).map(descriptorToData),
  );

  // A static Section without `id` still needs a key: React Aria derives one
  // from the section's position (`list-box.stories.tsx:87,117`). The root
  // hands out one per Section, prefixed with a NUL byte so it can never take
  // an item's key; the layout store and the item's `sectionKey` use it too.
  let generatedSectionCount = 0;

  const createSectionKey = () =>
    `\u0000nsh-listbox-section:${generatedSectionCount++}`;

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
    dataSource,
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
    shouldFocusWrap: () => local.shouldFocusWrap,
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
        findItem: (key) => findItemDescriptor(descriptors(), key),
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

  const activateFocused = (
    source: "pointer" | "keyboard",
    event?: PressEvent,
    modifiers?: SelectionModifiers,
  ) => {
    const key = manager().focusedKey();

    if (key == null) {
      return;
    }

    findItemDescriptor(descriptors(), key)?.activate(source, event, modifiers);
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

    const descriptor = findItemDescriptor(descriptors(), key);

    if (!descriptor) {
      return;
    }

    if (platform.os === "web") {
      if (screenReaderEnabled()) {
        announce(descriptor.textValue());
      }

      return;
    }

    const node = descriptor.ref();

    if (node) {
      setAccessibilityFocus(node);
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
  const hasItems = computed(() => local.items != null);

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
        // stop only while its field is open.
        focusable={isActive()}
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
    </ListBoxContext.Provider>
  );
}
