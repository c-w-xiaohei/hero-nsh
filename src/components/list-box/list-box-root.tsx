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
  cleanup,
  computed,
  effect,
  platform,
  setAccessibilityFocus,
  signal,
  split,
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
  type SelectionValue,
} from "../../primitives";
import { renderChildren } from "./children";
import {
  CollectionItemContext,
  ListBoxContext,
  type ListBoxContextValue,
  type ListBoxDescriptor,
  type ListBoxItemDescriptor,
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
  const selectionMode = (): SelectionMode => local.selectionMode ?? "none";
  const selectionBehavior = (): SelectionBehavior =>
    local.selectionBehavior ?? "toggle";
  const disabledBehavior = (): "all" | "selection" =>
    local.disabledBehavior ?? "all";

  // Research 4.2: parts register themselves with the nearest owner, and the
  // registry becomes the primitive's data source. A section descriptor carries
  // its options so `buildNodes` expands the hierarchy.
  const descriptors = signal<readonly ListBoxDescriptor[]>([]);

  const register = (descriptor: ListBoxDescriptor) => {
    descriptors.set([...descriptors(), descriptor]);

    return () => {
      descriptors.set(descriptors().filter((current) => current !== descriptor));
    };
  };

  const dataSource = computed(() => descriptors().map(descriptorToData));

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
    disallowEmptySelection: () => local.disallowEmptySelection ?? false,
    disabledBehavior,
  });

  let rootNode: ViewRef | undefined;

  /** Focuses the root, the only Tab stop; a no-op where code focus is not offered. */
  const focusRoot = () => {
    rootNode?.focus();
  };

  const selectableList = createSelectableList({
    collection: list.collection,
    selectionManager: list.selectionManager,
    autoFocus: () => local.autoFocus,
    shouldFocusWrap: () => local.shouldFocusWrap,
    orientation: () => local.orientation ?? "vertical",
    disallowEmptySelection: () => local.disallowEmptySelection,
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

  const classes = computed(() =>
    [listboxVariants({ variant: variant() }), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  const activateFocused = (
    source: "pointer" | "keyboard",
    event?: PressEvent,
  ) => {
    const key = manager().focusedKey();

    if (key == null) {
      return;
    }

    findItemDescriptor(descriptors(), key)?.activate(source, event);
  };

  const runKey = (key: string) => {
    modality.setKeyboardModality();
    selectableList.onKeyDown(key);
  };

  const handleFocus = () => {
    rootFocused.set(true);
    modality.onFocus();
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
  const navigationBindings: Record<string, () => void> = {
    down: () => runKey("down"),
    up: () => runKey("up"),
    left: () => runKey("left"),
    right: () => runKey("right"),
    home: () => runKey("home"),
    end: () => runKey("end"),
    pageup: () => runKey("pageup"),
    pagedown: () => runKey("pagedown"),
  };

  if (local.escapeKeyBehavior !== "none") {
    navigationBindings.escape = () => runKey("escape");
  }

  // The Windows exception: the host reports Return / Space as a press only on
  // macOS and the web, so Windows resolves them through the same activation.
  if (platform.os === "windows") {
    navigationBindings.enter = () => activateFocused("keyboard");
    navigationBindings.space = () => activateFocused("keyboard");
  }

  const printableBindings: Record<string, () => void> = {};

  for (const key of "abcdefghijklmnopqrstuvwxyz0123456789") {
    printableBindings[key] = () => runKey(key);
  }

  createKeymapScope({
    isActive: rootFocused,
    bindings: navigationBindings,
    options: { repeat: true },
  });

  createKeymapScope({
    isActive: rootFocused,
    bindings: printableBindings,
  });

  // The screen reader follows the focused key, the stand-in for
  // `aria-activedescendant` (port sheet section 5).
  effect(() => {
    const key = manager().focusedKey();

    if (key == null || !rootFocused()) {
      return;
    }

    const node = findItemDescriptor(descriptors(), key)?.ref();

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
    shouldFocusOnHover: () => local.shouldFocusOnHover ?? false,
    shouldSelectOnPressUp: () => local.shouldSelectOnPressUp ?? false,
    orientation: () => local.orientation ?? "vertical",
    layout: () => local.layout ?? "stack",
    isDisabledKey,
    onAction: (key) => local.onAction?.(key),
    focusRoot,
    notePointer: () => modality.setPointerModality(),
    keyboardPressedKey,
    registerItemLayout: selectableList.registerItemLayout,
    unregisterItemLayout: selectableList.unregisterItemLayout,
    registerSectionLayout: selectableList.registerSectionLayout,
    unregisterSectionLayout: selectableList.unregisterSectionLayout,
  };

  // The plan's §5 children rule: Root provides a context, so `props.children`
  // is read here, at the placement inside the provider, exactly once per
  // evaluation. With `items`, the function child runs once per entry.
  const renderContent = (): JSX.Element => {
    const children = local.children;
    const items = local.items;

    if (items != null && typeof children === "function") {
      return (
        <Each<T> of={items} key="index">
          {(item, index) => (
            <CollectionItemContext.Provider
              value={{ value: item(), index: index() }}
            >
              {renderChildren(
                (children as (value: T, position: number) => JSX.Element)(
                  item(),
                  index(),
                ),
              )}
            </CollectionItemContext.Provider>
          )}
        </Each>
      );
    }

    return renderChildren(children as JSX.Element);
  };

  const showEmpty = () => isEmpty() && local.renderEmptyState != null;

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
        // focusable themselves (port sheet section 5).
        focusable={true}
        accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
        accessibilityState={local.accessibilityState}
        accessibilityElementsHidden={
          local["aria-hidden"] ?? local.accessibilityElementsHidden
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
        <If when={showEmpty()} else={renderContent()}>
          {local.renderEmptyState?.(renderProps)}
        </If>
      </View>
    </ListBoxContext.Provider>
  );
}
