import type {
  Accessor,
  AccessibilityState,
  Bounds,
  JSX,
  KeyEvent,
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
  createDensity,
  createInput,
  createInteractionModality,
  createKeymapScope,
  createListState,
  createRowRegistry,
  createSelectableList,
  isCtrlKeyPressed,
  isKeyboardPress,
  isNonContiguousSelectionModifier,
  toListItemData,
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
  type MenuRowHandle,
  sortByRenderedOrder,
} from "./menu-context";
import { menuVariants, type MenuVariants } from "./menu.styles";
import { densityKey } from "../../tokens/density";

/** The live state HeroUI hands to `className`, `style` and the empty state. */
export interface MenuRenderProps {
  isEmpty: Accessor<boolean>;
}

export interface MenuRootProps<T = unknown>
  extends Omit<MenuVariants, "input" | "density"> {
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

/**
 * f-collection, mounted side (A-005): the registry of the rows that exist. A
 * mounted entry/section registers a `MenuRowHandle` on mount and drops it on
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
  registry: readonly MenuRowHandle[],
  namedKey: string,
  positionalKey: string,
  datum: unknown,
): MenuRowHandle | undefined {
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
 * `items` data → collection entries, mounted-row overrides merged in (A-005).
 * A row that claims a datum renames it to the row's key (the association
 * key), wins `textValue` only when it reports one, and overrides `disabled`
 * when it reports one (an explicit `isDisabled={false}` clears the datum's
 * flag); the datum's key itself is never overridden — a row whose key
 * matches nothing is an orphan and is appended at the data-source tail,
 * which keeps the RAC contract where a row's `id` adds its entry to a
 * data-driven menu.
 *
 * A keyless section datum keeps `""` (not the positional index): only then
 * does `buildNodes` mint the `__nsh:section:{level}:{index}` key the sheet's
 * key-convergence rule names, and the mounted section reads it back by
 * matching `datum` through `rawValue`.
 */
function mergeRows(
  data: readonly unknown[],
  registry: readonly MenuRowHandle[],
  seen: Set<MenuRowHandle>,
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
  // f-collection: only the static-children path feeds this registry; with
  // `items` the data itself is the collection and rows only mount handles.
  const descriptors = signal<readonly MenuDescriptor[]>([]);

  const register = (descriptor: MenuDescriptor) => {
    descriptors.set([...descriptors(), descriptor]);

    return () => {
      descriptors.set(descriptors().filter((current) => current !== descriptor));
    };
  };

  // f-collection, mounted side: the one store that knows which rows exist.
  const rowRegistry = createRowRegistry<MenuRowHandle>();

  const dataSource = computed(() => {
    const data = local.items;

    if (data == null) {
      return sortByRenderedOrder(descriptors()).map(descriptorToData);
    }

    // The data side holds the complete collection. Mounted rows only merge
    // their overrides; a row whose key claims no datum is appended as an
    // orphan (registration order), as RAC's row-id override contract keeps.
    const rows = rowRegistry
      .keys()
      .map((key) => rowRegistry.get(key))
      .filter((handle): handle is MenuRowHandle => handle != null);
    const seen = new Set<MenuRowHandle>();
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
      // suffix instead of silently dropping the row's entry.
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

  // A static Section without `id` still needs a key: React Aria derives one
  // from the section's position. The root hands out one per Section, prefixed
  // with a NUL byte so it can never take an entry's key.
  let generatedSectionCount = 0;

  const createSectionKey = () =>
    `__nsh:menu-section:${generatedSectionCount++}`;

  // The entry counterpart: React Aria gives an entry with no `id`, no value and
  // no index a generated key (`react-aria/dist/private/collections/
  // Document.js:212`), so two id-less static rows never share one node.
  let generatedItemCount = 0;

  const createItemKey = () => `__nsh:menu-item:${generatedItemCount++}`;

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

  // A-001: the environment's `density` axis, read once under this root's
  // context; `input` has no cell on the container table.
  const density = createDensity();

  const classes = computed(() =>
    [menuVariants({ density: densityKey(density()) }), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const accessibilityLabel = () =>
    local["aria-label"] ?? local.accessibilityLabel;

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  // Environment.input, read once under this root's context: the unmounted
  // activation fallback below needs the same touch rule `createSelectableItem`
  // applies to a mounted row (touch toggles instead of replacing).
  const input = createInput();

  /**
   * f-collection 激活兜底 (A-005): activation of a focused key whose row is
   * not mounted. It replays `createSelectableItem`'s keyboard selection
   * against the manager — a truly disabled node is inert, `mode "none"` only
   * acts, and the modifier rules match `selectWithEvent` — then fires the
   * root's `onAction` and applies the root-level close rule, so Return on an
   * unmounted entry is never silently dropped. A row-only override
   * (`shouldCloseOnSelect`, submenu, href) is unreachable for a row that is
   * not mounted — the sheet registers that degradation in §8.
   */
  const activateUnmounted = (
    key: string,
    node: { disabled: boolean },
    modifiers?: SelectionModifiers,
    keyName?: MenuActivationKey,
  ) => {
    const m = manager();
    const inert = node.disabled || isDisabledKey(key);

    if (!inert) {
      if (m.canSelectItem(key)) {
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

      // React Aria's keyboard close rule at the root level: Enter always
      // closes, Space only when the mode has no selection state
      // (`useMenuItem.js:114`). `shouldCloseOnSelect` is the root-level
      // override — item/section overrides belong to rows that are mounted.
      const explicit = local.shouldCloseOnSelect;

      if (
        explicit === true ||
        (explicit == null && (keyName === "Enter" || m.selectionMode() === "none"))
      ) {
        local.onClose?.();
      }
    }
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

    const handle = rowRegistry.get(key);

    if (handle?.type === "item" && handle.activate) {
      handle.activate(source, event, modifiers, keyName);
      return;
    }

    const node = list.collection().getItem(key);

    if (node?.type === "item") {
      activateUnmounted(key, node, modifiers, keyName);
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

  // NSH 0.6 reports `onKeyDown`/`onKeyUp` on a view. The web host presses a
  // focused control with Return or Space before the app keymap sees the key
  // (the control mode fires only the focus' own bindings), so the activation
  // arrives at `handlePress` without a key name and the close rule cannot tell
  // Enter from Space. The key name is remembered from the raw event instead.
  let pressedKeyName: MenuActivationKey | undefined;

  const handleKeyDown = (event: KeyEvent) => {
    if (event.repeat) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      pressedKeyName = event.key === "Enter" ? "Enter" : "Space";
    }
  };

  const handleKeyUp = (event: KeyEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      pressedKeyName = undefined;
    }
  };

  const handlePress = (event: PressEvent) => {
    // A pointer press on the container's own padding does nothing, as upstream.
    if (!isKeyboardPress(event)) {
      return;
    }

    modality.setKeyboardModality();
    activateFocused("keyboard", event, undefined, pressedKeyName);
    pressedKeyName = undefined;
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
    const handle = key == null ? undefined : rowRegistry.get(key);

    if (handle?.openSubmenu) {
      modality.setKeyboardModality();
      // The keyboard entry takes the submenu's focus (`openSubmenu('first')`).
      handle.openSubmenu(true);

      return true;
    }

    return false;
  };

  const closeWithArrowLeft = (): boolean => {
    // An open submenu belongs to the row that opened it: ArrowLeft closes it
    // and keeps the focus on that row (`useSubmenuTrigger.ts:188-210`). Only
    // then does the menu's own `onArrowLeft` (a submenu closing itself) run.
    const key = manager().focusedKey();
    const handle = key == null ? undefined : rowRegistry.get(key);

    if (handle?.closeSubmenu?.() === true) {
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

    const handle = rowRegistry.get(key);
    const node =
      handle == null || handle.type !== "item"
        ? list.collection().getItem(key)
        : undefined;

    // The announce fallback covers unmounted keys too: the collection still
    // knows the entry's text (f-collection §5, host gap register).
    const text = () => handle?.textValue?.() ?? node?.textValue;

    if (platform.os === "web") {
      if (screenReaderEnabled()) {
        const value = text();

        if (value != null) {
          announce(value);
        }
      }

      return;
    }

    const view = handle?.ref?.();

    if (view) {
      setAccessibilityFocus(view);
      return;
    }

    // An unmounted entry (or one whose view is not yet bound) has no view to
    // take accessibility focus; the announce fallback is its degradation on
    // every host (A-005; the same announce the web branch above performs).
    const value = text();

    if (value != null) {
      announce(value);
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
    rowRegistry,
    registerRow: rowRegistry.register,
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
    sendKey: (key, modifiers) => runKey(key, modifiers),
    activateFocused: (modifiers, keyName) =>
      activateWithKey(keyName ?? "Enter", modifiers),
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
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
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
