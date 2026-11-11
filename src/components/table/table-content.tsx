import type { AccessibilityRole, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, effect, platform, signal, split, untracked, View } from "nsh";

import {
  createControllableSignal,
  createInteractionModality,
  createKeymapScope,
  type SelectionModifiers,
} from "../../primitives";
import { createTableCollection, createTableRegistry } from "./create-table-collection";
import { createTableColumnLayout } from "./create-table-column-layout";
import type { TableSortDescriptor } from "./create-table-state";
import { createTableState } from "./create-table-state";
import {
  TableStateContext,
  TableViewportContext,
  TableContext,
  type TableContentRenderProps,
  type TableStateContextValue,
} from "./table-context";
import { type TablePartProps } from "./table-props";

export interface TableContentProps extends TablePartProps {
  /** `"none"` by default, as React Aria's Table. */
  selectionMode?: "none" | "single" | "multiple";

  /** `"toggle"` by default. */
  selectionBehavior?: "toggle" | "replace";

  disallowEmptySelection?: boolean;

  selectedKeys?: "all" | Iterable<string | number>;
  defaultSelectedKeys?: "all" | Iterable<string | number>;
  onSelectionChange?: (keys: "all" | Set<string>) => void;

  disabledKeys?: Iterable<string | number>;

  /** `"all"` (inert rows) by default. */
  disabledBehavior?: "all" | "selection";

  sortDescriptor?: TableSortDescriptor;
  defaultSortDescriptor?: TableSortDescriptor;
  onSortChange?: (descriptor: TableSortDescriptor) => void;

  expandedKeys?: Iterable<string | number>;
  defaultExpandedKeys?: Iterable<string | number>;
  onExpandedChange?: (keys: Set<string>) => void;

  /** The key of the tree column (`Cell` render value `isTreeColumn`). */
  treeColumn?: string;

  /** A row's action, reported when it cannot be selected (§1 events). */
  onRowAction?: (key: string) => void;

  showSelectionCheckboxes?: boolean;
  showDragButtons?: boolean;

  /** React Aria's drag-and-drop hooks: accepted, no effect (§8). */
  dragAndDropHooks?: unknown;

  /** `"tab"` (default) leaves every cell a Tab stop; `"arrow"` only the grid. */
  keyboardNavigationBehavior?: "tab" | "arrow";

  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  onFocus?: () => void;
  onBlur?: () => void;
}

function toKeys(value: Iterable<string | number> | undefined): Set<string> | undefined {
  if (value == null) {
    return undefined;
  }

  const keys = new Set<string>();

  for (const key of value) {
    keys.add(String(key));
  }

  return keys;
}

/** NSH names the space bar `"space"` in a keystroke. */
const LETTERS = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * `Table.Content` / `TableContent`: the `role="grid"` view, the only part that
 * receives the table's behaviour props, and the owner of the state the other
 * parts read (port sheet §2). HeroUI hands these to React Aria's `Table`; here
 * `createTableState` is the owner and the `createKeymapScope`s are the keyboard,
 * bound only while a cell (or the grid) has the focus.
 */
export function TableContent(props: TableContentProps) {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "selectionMode",
    "selectionBehavior",
    "disallowEmptySelection",
    "selectedKeys",
    "defaultSelectedKeys",
    "onSelectionChange",
    "disabledKeys",
    "disabledBehavior",
    "sortDescriptor",
    "defaultSortDescriptor",
    "onSortChange",
    "expandedKeys",
    "defaultExpandedKeys",
    "onExpandedChange",
    "treeColumn",
    "onRowAction",
    "showSelectionCheckboxes",
    "showDragButtons",
    "dragAndDropHooks",
    "keyboardNavigationBehavior",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "onFocus",
    "onBlur",
    "render",
    "items",
    "dependencies",
    "onLayout",
  ] as const);

  const slotContext = TableContext();
  const viewport = TableViewportContext();

  const registry = createTableRegistry();

  const disabledKeys = computed(() => toKeys(local.disabledKeys) ?? new Set<string>());

  // Expansion is a controlled store of its own: the collection filters the
  // visible rows by it, so it has to exist before the state does.
  const [expandedKeys, setExpandedKeys] = createControllableSignal<Set<string>>({
    value: computed(() => toKeys(local.expandedKeys)),
    defaultValue: computed(() => toKeys(local.defaultExpandedKeys)),
    onChange: (keys) => local.onExpandedChange?.(new Set(keys)),
  });

  const expanded = computed(() => expandedKeys() ?? new Set<string>());

  const collection = createTableCollection({
    registry,
    expandedKeys: expanded,
    disabledKeys,
  });

  const state = createTableState({
    collection,
    selectionMode: () => local.selectionMode ?? "none",
    selectionBehavior: () => local.selectionBehavior ?? "toggle",
    disallowEmptySelection: () => local.disallowEmptySelection ?? false,
    disabledKeys,
    disabledBehavior: () => local.disabledBehavior ?? "all",
    selectedKeys: () => local.selectedKeys,
    defaultSelectedKeys: () => local.defaultSelectedKeys,
    onSelectionChange: (keys) => local.onSelectionChange?.(keys),
    sortDescriptor: () => local.sortDescriptor,
    defaultSortDescriptor: () => local.defaultSortDescriptor,
    onSortChange: (descriptor) => local.onSortChange?.(descriptor),
    expandedKeys: expanded,
    setExpandedKeys: (keys) => setExpandedKeys(keys),
    keyboardNavigationBehavior: () => local.keyboardNavigationBehavior,
  });

  const layout = createTableColumnLayout({ collection });

  const bodyOffsetY = signal(0);

  // A resizable container hands its measured width to the layout; a plain
  // scroll container keeps the declared column bases (§8).
  effect(() => {
    layout.setContainerWidth(viewport?.resizable() ? viewport.width() : undefined);
  });

  // The page keys of the grid delegate step by whole viewports, so the state
  // needs the height the scroll container measured (§2, `getContainerHeight`).
  effect(() => {
    state.setContainerHeight(viewport?.height());
  });

  // `Table.ResizableContainer` renders above this part (it wraps the content),
  // so it cannot see the layout through `TableStateContext`; it hands its
  // `onResize*` callbacks down through the viewport context and they land in
  // the layout here (§1 events).
  effect(() => {
    const callbacks = viewport?.resizeCallbacks?.();

    if (!callbacks) {
      return;
    }

    // `untracked`: registering reads the layout's own callback list, and
    // tracking that read would make this effect its own dependency.
    return untracked(() => layout.registerResizeCallbacks(callbacks));
  });

  const modality = createInteractionModality();

  let gridNode: ViewRef | undefined;

  const focusGrid = () => {
    gridNode?.focus();
  };

  const isFocusVisible = computed(() => state.isFocused() && modality.isKeyboard());

  const renderProps: TableContentRenderProps = {
    isFocused: state.isFocused,
    isFocusVisible,
    isDropTarget: () => false,
    state,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? (className as (values: TableContentRenderProps) => string)(renderProps)
      : className;
  };

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function"
      ? (style as (values: TableContentRenderProps) => StyleProp<ViewStyle>)(renderProps)
      : style;
  };

  const classes = computed(() =>
    [slotContext?.slots().content() ?? "w-full text-sm", resolvedClassName()]
      .filter(Boolean)
      .join(" "),
  );

  const runKey = (key: string, modifiers?: SelectionModifiers) => {
    modality.setKeyboardModality();
    state.onKeyDown(key, modifiers);
  };

  // The commands React Aria's `useSelectableCollection` implements. Return and
  // Space stay unbound: the host delivers them as the focused view's press
  // (`_common`, "List keys"), which the cell / row handlers route.
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
    escape: () => runKey("escape"),
  };

  const commandBindings: Record<string, () => void> = {
    "ctrl+a": () => runKey("a", { control: true }),
    "mod+a": () =>
      runKey(
        "a",
        platform.os === "macos" || platform.os === "ios" ? { platform: true } : { control: true },
      ),
  };

  // Typeahead: keymap has a name per printable key, so the US layout's
  // punctuation is bound too (the ListBox precedent).
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

  for (const key of LETTERS) {
    printableBindings[key] = () => runKey(key);
  }

  for (const [keystroke, character] of PUNCTUATION) {
    printableBindings[keystroke] = () => runKey(character);
  }

  // The collection's scopes give way while a resizer holds the keyboard: the
  // two are mutually exclusive, as React Aria's `setKeyboardNavigationDisabled`
  // makes them (§5).
  const keysFree = () => state.isFocused() && layout.resizingColumn() == null;

  createKeymapScope({
    isActive: keysFree,
    bindings: navigationBindings,
    options: { repeat: true },
  });

  createKeymapScope({
    isActive: keysFree,
    bindings: commandBindings,
  });

  createKeymapScope({
    isActive: keysFree,
    bindings: printableBindings,
  });

  const handleFocus = () => {
    state.noteFocus();
    modality.onFocus();
    local.onFocus?.();
  };

  const handleBlur = () => {
    state.noteBlur();
    local.onBlur?.();
  };

  const contextValue: TableStateContextValue = {
    state,
    layout,
    modality,
    isKeyboard: modality.isKeyboard,
    registry,
    treeColumn: () => local.treeColumn,
    onRowAction: (rowKey) => local.onRowAction?.(rowKey),
    focusGrid,
    bodyOffsetY,
    registerBodyLayout: (offsetY) => bodyOffsetY.set(offsetY),
  };

  return (
    <TableStateContext.Provider value={contextValue}>
      <View
        {...(rest as any)}
        ref={(node) => {
          gridNode = node;
          local.ref?.(node);
        }}
        nativeID={local.id}
        role={"grid" as AccessibilityRole}
        focusable
        accessibilityLabel={local["aria-label"]}
        class={classes()}
        style={resolvedStyle()}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onLayout={(event) => {
          local.onLayout?.(event);
        }}
      >
        {local.children as JSX.Element}
      </View>
    </TableStateContext.Provider>
  );
}
