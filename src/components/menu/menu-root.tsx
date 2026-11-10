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
  type ListState,
  type SelectionBehavior,
  type SelectionMode,
  type SelectionModifiers,
  type SelectionValue,
} from "../../primitives";
import { SeparatorContext } from "../separator/context";
import { renderChildren } from "./children";
import {
  CollectionItemContext,
  MenuContext,
  type MenuActivationKey,
  type MenuContextValue,
  type MenuDescriptor,
  type MenuItemDescriptor,
  sortByRenderedOrder,
} from "./menu-context";
import { menuVariants, type MenuVariants } from "./menu.styles";

/** The live state HeroUI hands to `className`, `style` and the empty state. */
export interface MenuRenderProps {
  isEmpty: Accessor<boolean>;
}

export interface MenuRootProps<T = unknown> extends MenuVariants {
  /**
   * Static entries and sections, or with `items`, the render function called
   * once per entry. Read once, inside the context provider (research 4.1).
   */
  children?: JSX.Element | ((item: T, index: number) => JSX.Element);

  /** Appended after the variant classes; later classes win. */
  className?: string | ((values: MenuRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: MenuRenderProps) => StyleProp<ViewStyle>);

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

  /** `"none"` by default, as React Aria's Menu (port sheet section 1). */
  selectionMode?: SelectionMode;

  /** `"toggle"` by default. */
  selectionBehavior?: SelectionBehavior;

  /** The selected keys in controlled mode, or `"all"`. */
  selectedKeys?: "all" | Iterable<string | number>;

  /** The initial selected keys in uncontrolled mode, or `"all"`. */
  defaultSelectedKeys?: "all" | Iterable<string | number>;

  /** Called whenever the selection changes; a `Set` (keys are strings here). */
  onSelectionChange?: (keys: "all" | Set<string>) => void;

  /** Called with an entry's key on every activation (port sheet section 5). */
  onAction?: (key: string) => void;

  /** The explicit close override, read after the Section's and the Item's. */
  shouldCloseOnSelect?: boolean;

  /** Called when an activation or Escape decides the menu should close. */
  onClose?: () => void;

  disallowEmptySelection?: boolean;

  /** Keys that cannot be selected, focused or activated (port sheet section 5). */
  disabledKeys?: Iterable<string | number>;

  /** What an empty collection shows; upstream gives it no arguments. */
  renderEmptyState?: () => JSX.Element;

  /** Focuses the menu after mount (`"first"` / `"last"` choose the entry). */
  autoFocus?: boolean | "first" | "last";

  /** Wraps the focused key at either end; Menu defaults to `true` (sheet §1). */
  shouldFocusWrap?: boolean;

  /**
   * Whether focusing the menu root selects its first entry (default `true`).
   * React Aria's Menu leaves no entry focused when the root takes focus with
   * `autoFocus` off; Dropdown passes `false` so the first arrow lands on the
   * first row, as upstream (dropdown port sheet §5, fourth change). `"last"`
   * enters from the other end, which is React Aria's `focusStrategy: "last"`
   * (`focusIn` on `ArrowUp`).
   */
  focusFirstItemOnFocus?: boolean | "first" | "last";

  /**
   * Called by ArrowLeft while the menu holds the keyboard focus (dropdown port
   * sheet §5, first change): the owner closes its submenu and moves focus back
   * instead of the key falling through to the collection. Absent means the
   * arrow keeps its collection behavior.
   */
  onArrowLeft?: () => void;

  /**
   * While this returns `true`, the focused row is dropped. A menu whose layer
   * unmounts on close (React Aria's popover) starts every open fresh; one that
   * stays mounted while closed (Dropdown's, port sheet §6.1) would reopen on
   * the row the last open left behind. Absent means the focused row is kept.
   */
  resetFocusKeyWhen?: () => boolean;

  /**
   * `"clearSelection"` upstream. In practice React Aria's `useMenu` skips the
   * Escape selection clearing (Escape closes the menu), so both values behave
   * the same here; accepted, no effect.
   */
  escapeKeyBehavior?: "clearSelection" | "none";

  /** React Aria's drag-and-drop hooks: accepted, no effect. */
  dragAndDropHooks?: unknown;

  /** A DOM scroll event upstream; scrolling lives on `Scroll` / `List` here. */
  onScroll?: unknown;

  /** Replaces the host element upstream: accepted, no effect. */
  render?: unknown;

  /** A slot collection name upstream: accepted, no effect. */
  slot?: string;

  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
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
function descriptorToData(descriptor: MenuDescriptor): any {
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

/** The entry with `key`, at the top level or inside a section. */
function findItemDescriptor(
  descriptors: readonly MenuDescriptor[],
  key: string,
): MenuItemDescriptor | undefined {
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
 * Menu.Root / MenuRoot: the `role="menu"` container, the collection registry
 * and the one keyboard focus stop. HeroUI wraps React Aria's static Menu; NSH
 * has no DOM key events, so the root owns `keymap.bind` while focused and
 * routes activation to the entry holding `focusedKey` (port sheet section 5).
 */
export function MenuRoot<T>(props: MenuRootProps<T>): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "items",
    "dependencies",
    "selectionMode",
    "selectionBehavior",
    "selectedKeys",
    "defaultSelectedKeys",
    "onSelectionChange",
    "onAction",
    "shouldCloseOnSelect",
    "onClose",
    "disallowEmptySelection",
    "disabledKeys",
    "renderEmptyState",
    "autoFocus",
    "shouldFocusWrap",
    "focusFirstItemOnFocus",
    "onArrowLeft",
    "resetFocusKeyWhen",
    "escapeKeyBehavior",
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

  const selectionMode = (): SelectionMode => local.selectionMode ?? "none";
  const selectionBehavior = (): SelectionBehavior =>
    local.selectionBehavior ?? "toggle";
  const disallowEmptySelection = () => local.disallowEmptySelection ?? false;

  // Research 4.2: parts register themselves with the nearest owner, and the
  // registry becomes the primitive's data source. A section descriptor carries
  // its entries so `buildNodes` expands the hierarchy.
  const descriptors = signal<readonly MenuDescriptor[]>([]);

  const register = (descriptor: MenuDescriptor) => {
    descriptors.set([...descriptors(), descriptor]);

    return () => {
      descriptors.set(descriptors().filter((current) => current !== descriptor));
    };
  };

  const dataSource = computed(() =>
    sortByRenderedOrder(descriptors()).map(descriptorToData),
  );

  // A static Section without `id` still needs a key: React Aria derives one
  // from the section's position. The root hands out one per Section, prefixed
  // with a NUL byte so it can never take an entry's key.
  let generatedSectionCount = 0;

  const createSectionKey = () =>
    `\u0000nsh-menu-section:${generatedSectionCount++}`;

  // The entry counterpart: React Aria gives an entry with no `id`, no value and
  // no index a generated key (`react-aria/dist/private/collections/
  // Document.js:212`), so two id-less static rows never share one node.
  let generatedItemCount = 0;

  const createItemKey = () => `\u0000nsh-menu-item:${generatedItemCount++}`;

  const isDisabledKey = (key: string) => {
    const keys = local.disabledKeys;

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
    selectedKeys: computed(() => normalizeSelection(local.selectedKeys)),
    defaultSelectedKeys: computed(() =>
      normalizeSelection(local.defaultSelectedKeys),
    ),
    onSelectionChange: (keys) => local.onSelectionChange?.(keys),
    disallowEmptySelection,
  });

  let rootNode: ViewRef | undefined;

  /** Focuses the root, the only Tab stop; a no-op where code focus is not offered. */
  const focusRoot = () => {
    rootNode?.focus();
  };

  // A pointer press gives the root no native focus, so the port focuses it for
  // the arrows to keep working (macOS / web). That focus event is not keyboard
  // focus: the flag keeps the pointer modality, as `:focus-visible` would.
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
    // RAC's `useMenu` destructing default is `true`; the primitive's is
    // `false`, so the root states it explicitly (port sheet section 1).
    shouldFocusWrap: () => local.shouldFocusWrap ?? true,
    disallowEmptySelection,
    // `focusFirstItemOnFocus: "last"` is React Aria's `focusStrategy: "last"`:
    // entering the collection from the end picks its last row.
    enterFrom: () => (local.focusFirstItemOnFocus === "last" ? "end" : "start"),
    focusCollection: focusRoot,
  });

  const manager = () => list.selectionManager();

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
  // empty, or `renderEmptyState` would flash for one pass on every menu.
  const mounted = signal(false);

  effect(() => {
    mounted.set(true);
  });

  const renderProps: MenuRenderProps = {
    isEmpty,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? className(renderProps)
      : className;
  };

  const classes = computed(() =>
    [menuVariants(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const accessibilityLabel = () =>
    local["aria-label"] ?? local.accessibilityLabel;

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  const activateFocused = (
    source: "pointer" | "keyboard",
    event?: PressEvent,
    modifiers?: SelectionModifiers,
    keyName?: MenuActivationKey,
  ) => {
    const key = manager().focusedKey();

    if (key == null) {
      return;
    }

    findItemDescriptor(descriptors(), key)?.activate(
      source,
      event,
      modifiers,
      keyName,
    );
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

    if (local.focusFirstItemOnFocus !== false) {
      selectableList.onFocusIn();
    }

    local.onFocus?.();
  };

  const handleBlur = () => {
    rootFocused.set(false);
    selectableList.onFocusOut();
    local.onBlur?.();
  };

  // A collection that stays mounted while its layer closes (Dropdown's popover,
  // port sheet §6.1) must drop the row the last open focused; React Aria
  // unmounts the Menu on close, which drops it. Re-arms `focusFirstItemOnFocus`
  // for the next open instead of starting on a stale row.
  effect(() => {
    if (local.resetFocusKeyWhen?.() === true) {
      manager().setFocusedKey(undefined);
    }
  });

  // R-014: a keyboard activation arrives as a press on the focused view; the
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

  // The collection's keys are bound only while the root has the focus, and
  // dropped on blur or unmount (createKeymapScope). These are the movement
  // keys, the only ones that auto-repeat; the activation keys bind in their own
  // scope below. Space stays on the host press wherever the host sends one
  // (macOS, the web), and is bound only on Windows, which sends none.
  //
  // Keymap matches the modifiers exactly, so the Shift and Control forms of a
  // shortcut are separate bindings; each one forwards its own modifiers.
  //
  // Right and left first ask the focused row whether it owns the key (dropdown
  // port sheet §5, first change): a submenu trigger opens on ArrowRight, and a
  // menu inside a submenu closes on ArrowLeft. Both return without moving the
  // focus; every other row falls through to the collection unchanged.
  const openFocusedSubmenu = (): boolean => {
    const key = manager().focusedKey();
    const descriptor = key == null ? undefined : findItemDescriptor(descriptors(), key);

    if (descriptor?.openSubmenu) {
      modality.setKeyboardModality();
      // The keyboard entry takes the submenu's focus (`openSubmenu('first')`).
      descriptor.openSubmenu(true);

      return true;
    }

    return false;
  };

  const closeWithArrowLeft = (): boolean => {
    // An open submenu belongs to the row that opened it: ArrowLeft closes it
    // and keeps the focus on that row (`useSubmenuTrigger.ts:188-210`). Only
    // then does the menu's own `onArrowLeft` (a submenu closing itself) run.
    const key = manager().focusedKey();
    const descriptor = key == null ? undefined : findItemDescriptor(descriptors(), key);

    if (descriptor?.closeSubmenu?.() === true) {
      modality.setKeyboardModality();

      return true;
    }

    if (!local.onArrowLeft) {
      return false;
    }

    modality.setKeyboardModality();
    local.onArrowLeft();

    return true;
  };

  const navigationBindings: Record<string, () => void> = {
    down: () => runKey("down"),
    "shift+down": () => runKey("down", { shift: true }),
    up: () => runKey("up"),
    "shift+up": () => runKey("up", { shift: true }),
    left: () => {
      if (!closeWithArrowLeft()) {
        runKey("left");
      }
    },
    "shift+left": () => {
      if (!closeWithArrowLeft()) {
        runKey("left", { shift: true });
      }
    },
    right: () => {
      if (!openFocusedSubmenu()) {
        runKey("right");
      }
    },
    "shift+right": () => {
      if (!openFocusedSubmenu()) {
        runKey("right", { shift: true });
      }
    },
    home: () => runKey("home"),
    "shift+home": () => runKey("home", { shift: true }),
    end: () => runKey("end"),
    "shift+end": () => runKey("end", { shift: true }),
    pageup: () => runKey("pageup"),
    "shift+pageup": () => runKey("pageup", { shift: true }),
    pagedown: () => runKey("pagedown"),
    "shift+pagedown": () => runKey("pagedown", { shift: true }),
  };

  // The key name is part of the activation, not a detail: React Aria's close
  // rule treats Return and Space differently (`useMenuItem.js:114`), and the
  // host press carries no key identity. Return is bound on every platform, so
  // the activation entry learns its key; the unnamed host press then means
  // Space, which keeps its held-key pressed state (R-014) on macOS and the web.
  // Windows reports no press for either key, so it binds Space as well.
  const activateWithKey = (
    keyName: MenuActivationKey,
    modifiers?: SelectionModifiers,
  ) => {
    modality.setKeyboardModality();
    activateFocused("keyboard", undefined, modifiers, keyName);
  };

  // Activation keys get their own scope without `repeat`: React Aria returns
  // early on `e.repeat` before the Enter/Space switch (`useMenuItem.js:157-164`)
  // and both press hooks drop repeating presses (`usePress.js:253,264`), so a
  // held Return activates once. Auto-repeat belongs to the arrows alone, whose
  // scope above keeps `repeat: true`.
  const activationBindings: Record<string, () => void> = {
    enter: () => activateWithKey("Enter"),
    "shift+enter": () => activateWithKey("Enter", { shift: true }),
  };

  if (platform.os === "windows") {
    activationBindings.space = () => activateWithKey("Space");
    activationBindings["shift+space"] = () => activateWithKey("Space", { shift: true });
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

  // Kobalte's type-select takes any single character; keymap has a name per
  // printable key, so the punctuation of the US layout is bound too. Space
  // stays out: on the web and macOS it is the focused view's activation press.
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
    isActive: rootFocused,
    bindings: navigationBindings,
    options: { repeat: true },
  });

  createKeymapScope({
    isActive: rootFocused,
    bindings: activationBindings,
  });

  createKeymapScope({
    isActive: rootFocused,
    bindings: commandBindings,
  });

  createKeymapScope({
    isActive: rootFocused,
    bindings: printableBindings,
  });

  // Escape closes the menu instead of clearing the selection: React Aria's
  // `useMenu` explicitly skips the selection cleanup for Escape, because the
  // surrounding trigger closes the menu. There is no trigger here, so the
  // root supplies the close channel (port sheet section 8).
  createKeymapScope({
    isActive: rootFocused,
    bindings: {
      escape: () => local.onClose?.(),
    },
  });

  // The screen reader follows the focused key, the stand-in for
  // `aria-activedescendant` (port sheet section 5). On the web a "screen reader
  // focus" is the page's own focus: moving it takes the keyboard focus off the
  // menu, which fires the root's `onBlur`, drops every keymap scope and leaves
  // the arrows, typeahead and Escape dead. Upstream keeps DOM focus on the menu
  // and only moves `aria-activedescendant`, which NSH does not expose; there the
  // active entry is announced instead, so a screen reader still hears it.
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

  const contextValue: MenuContextValue = {
    list,
    selectionManager: () => manager(),
    register,
    selectionMode,
    selectionBehavior,
    isFocused: rootFocused,
    focusedKey: () => manager().focusedKey(),
    isKeyboard: modality.isKeyboard,
    isDisabledKey,
    onAction: (key) => local.onAction?.(key),
    onClose: () => local.onClose?.(),
    shouldCloseOnSelect: () => local.shouldCloseOnSelect,
    focusRoot,
    focusRootFromPointer,
    createSectionKey,
    createItemKey,
    notePointer: () => modality.setPointerModality(),
    keyboardPressedKey,
    registerItemLayout: selectableList.registerItemLayout,
    unregisterItemLayout: selectableList.unregisterItemLayout,
    registerSectionLayout: selectableList.registerSectionLayout,
    unregisterSectionLayout: selectableList.unregisterSectionLayout,
  };

  // Root provides a context, so `props.children` is read at the placement
  // inside the provider, once per evaluation (research 4.1, `_common`'s
  // exception). The read must be a JSX child expression, not a body local.
  const hasItems = computed(() => local.items != null);

  // One row of the dynamic collection. The row is keyed by the item itself,
  // not by its `id`: a replacement under an existing key is a new object, so it
  // builds a fresh row from the current collection.
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
    <MenuContext.Provider value={contextValue}>
      {/* R-002: `.menu [data-slot="separator"]` → `ms-[3%] w-[94%]`. NSH has no
          descendant selectors, so the menu hands the classes to every Separator
          inside it through Separator's own `partClass` channel. */}
      <SeparatorContext.Provider value={{ partClass: () => "ms-[3%] w-[94%]" }}>
        <View
          {...rest}
          ref={(node) => {
            rootNode = node;
            local.ref?.(node);
          }}
          testID={local.testID}
          nativeID={local.id ?? local.nativeID}
          tooltip={local.tooltip}
          role="menu"
          // The root is the one Tab stop; entries are virtual-focus rows and
          // never focusable themselves (port sheet section 5).
          focusable={true}
          accessibilityLabel={accessibilityLabel()}
          accessibilityState={local.accessibilityState}
          accessibilityElementsHidden={
            local["aria-hidden"] ?? local.accessibilityElementsHidden ?? false
          }
          class={classes()}
          style={resolvedStyle()}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPress={handlePress}
          onPressDown={handlePressDown}
          onPressUp={handlePressUp}
          onLayout={handleLayout}
        >
          {/* RAC draws the empty state only while the collection is empty; a
              function child is called when the branch shows, so
              `renderEmptyState` never runs for a filled menu. */}
          <If when={showEmpty()}>{() => local.renderEmptyState?.()}</If>
          <If when={hasItems()}>
            <Each of={local.items}>
              {(item, index) => (
                <CollectionItemContext.Provider value={{ value: item, index }}>
                  {renderRow(item(), untracked(() => index()))}
                </CollectionItemContext.Provider>
              )}
            </Each>
          </If>
          <If when={!hasItems()}>
            {renderChildren(local.children as JSX.Element)}
          </If>
        </View>
      </SeparatorContext.Provider>
    </MenuContext.Provider>
  );
}
