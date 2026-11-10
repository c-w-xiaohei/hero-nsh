import type {
  Accessor,
  AccessibilityState,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
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
  createKeymapScope,
  createSelectableList,
  isKeyboardPress,
  type ListState,
} from "../../primitives";
import { renderTagChildren } from "./tag-children";
import {
  TagGroupContext,
  TagItemContext,
  type TagGroupContextValue,
} from "./tag-context";
import { tagGroupVariants } from "./tag.styles";

/** The live state HeroUI hands to `renderEmptyState`, `className` and `style`. */
export interface TagGroupListRenderProps {
  isEmpty: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  /** The list state (this port's `ListState`, not React Stately's object). */
  state: ListState;
}

/**
 * The props of `TagGroup.List` (`TagGroupList`): HeroUI 3.2.7's
 * `TagGroupListProps`, which is React Aria Components' `TagList` — a
 * `CollectionProps<T>` whose children are JSX or an `items` array plus a
 * render function.
 */
export interface TagGroupListProps<T = unknown> {
  /**
   * Static tags, or with `items`, the render function called once per entry.
   * Read once, at the placement inside the list view.
   */
  children?: JSX.Element | ((item: T, index: number) => JSX.Element);

  /** Appended after the list slot classes; later classes win. */
  className?: string | ((values: TagGroupListRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: TagGroupListRenderProps) => StyleProp<ViewStyle>);

  /** The dynamic collection; each entry renders through the function child. */
  items?: readonly T[];

  /** React Aria's dependency list for `items`: accepted, no effect. */
  dependencies?: readonly unknown[];

  /** What an empty collection shows. */
  renderEmptyState?: (values: TagGroupListRenderProps) => JSX.Element;

  /** A DOM id upstream; here the view's `nativeID`. */
  id?: string;

  nativeID?: string;

  testID?: string;

  tooltip?: JSX.Element;

  /** React Aria's keyboard delegate: accepted, no effect (the list's own delegate is used). */
  keyboardDelegate?: unknown;

  /** Replaces the host element upstream: accepted, no effect. */
  render?: unknown;

  /** A slot collection name upstream: accepted, no effect. */
  slot?: string;

  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: a `Description` registers its text instead. */
  "aria-describedby"?: string;

  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  dir?: "ltr" | "rtl" | "auto";
  lang?: string;
  hidden?: boolean;
  inert?: boolean;
  translate?: "yes" | "no";
  suppressHydrationWarning?: boolean;

  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;

  onMouseEnter?: (event: NshMouseEvent) => void;
  onMouseLeave?: (event: NshMouseEvent) => void;

  onFocus?: () => void;
  onBlur?: () => void;

  /** A DOM key event upstream; keys arrive through this list's `keymap` here. */
  onKeyDown?: unknown;
  onKeyUp?: unknown;
  onKeyDownCapture?: unknown;
  onKeyUpCapture?: unknown;

  onLayout?: (event: { bounds: Bounds }) => void;

  /** Reaches the list `View`; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/** One row of the dynamic collection. */
function renderRow<T>(
  children: JSX.Element | ((item: T, index: number) => JSX.Element) | undefined,
  item: T,
  index: number,
): JSX.Element {
  if (typeof children !== "function") {
    return null;
  }

  return (children as (value: T, position: number) => JSX.Element)(item, index);
}

/**
 * TagGroup.List / TagGroupList: the `role="grid"` (or `"group"` while empty)
 * container, the one Tab stop and the keymap host. HeroUI wraps React Aria's
 * `TagList`; NSH has no DOM key events and no `aria-activedescendant`, so the
 * list keeps the virtual focus (`focusedKey`) the tags read, and the screen
 * reader follows it (port sheet section 5).
 */
export function TagGroupList<T extends object>(
  props: TagGroupListProps<T>,
): JSX.Element {
  const group = TagGroupContext();

  if (!group) {
    return null;
  }

  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "items",
    "dependencies",
    "renderEmptyState",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "keyboardDelegate",
    "render",
    "slot",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-hidden",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
    "suppressHydrationWarning",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
    "accessibilityElementsHidden",
    "onMouseEnter",
    "onMouseLeave",
    "onFocus",
    "onBlur",
    "onKeyDown",
    "onKeyUp",
    "onKeyDownCapture",
    "onKeyUpCapture",
    "onLayout",
    "ref",
  ] as const);

  const context: TagGroupContextValue = group;

  let listNode: ViewRef | undefined;

  const focusList = () => {
    listNode?.focus();
  };

  // A pointer press gives the list no native focus, so the port focuses it for
  // the arrows to keep working (macOS / web). That focus event is not keyboard
  // focus: the flag tells the focus handler to keep the pointer modality, as
  // `:focus-visible` would upstream.
  const canFocusViews = platform.os === "macos" || platform.os === "web";
  let pointerFocusPending = false;

  const focusListFromPointer = () => {
    if (!canFocusViews || context.isFocused()) {
      // Already focused: `focus()` is a no-op and fires no focus event, so the
      // flag would stay set and the next keyboard focus-in would be mistaken
      // for a pointer one (no focus ring).
      return;
    }

    pointerFocusPending = true;
    listNode?.focus();
  };

  cleanup(
    context.registerFocusTarget({
      focus: focusList,
      focusFromPointer: focusListFromPointer,
    }),
  );

  const selectableList = createSelectableList({
    collection: context.list.collection,
    selectionManager: context.list.selectionManager,
    // A tag group is a horizontal, wrapping grid: left / right step through
    // it, the vertical arrows have no sibling direction in the delegate
    // (react-aria's TagGroup keyboard delegate).
    orientation: () => "horizontal",
    // RAC hard-codes `shouldFocusWrap` for a TagGroup.
    shouldFocusWrap: () => true,
    disallowEmptySelection: context.disallowEmptySelection,
    focusCollection: focusList,
  });

  const isEmpty = computed(() => context.list.collection().getSize() === 0);
  const isFocusVisible = computed(
    () => context.isFocused() && context.isKeyboard(),
  );

  const renderProps: TagGroupListRenderProps = {
    isEmpty,
    isFocused: context.isFocused,
    isFocusVisible,
    state: context.list,
  };

  /* --- Registered text and names ------------------------------------------ */
  const accessibilityLabel = () =>
    local["aria-label"] ??
    local.accessibilityLabel ??
    context.accessibilityLabel() ??
    context.labelText();

  const accessibilityHint = () => {
    if (local.accessibilityHint != null) {
      return local.accessibilityHint;
    }

    const parts = [context.descriptionText(), context.errorText()].filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    );

    return parts.length > 0 ? parts.join(" ") : undefined;
  };

  /* --- Classes ------------------------------------------------------------- */
  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? className(renderProps)
      : className;
  };

  const classes = computed(() =>
    [tagGroupVariants().list(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  /* --- Keys ---------------------------------------------------------------- */
  const runKey = (key: string) => {
    context.noteKeyboard();
    selectableList.onKeyDown(key);
  };

  /** RAC's delete gesture: the focused tag's key set goes to `onRemove`. */
  const removeFocused = () => {
    const key = context.focusedKey();

    if (key == null) {
      return;
    }

    context.noteKeyboard();
    context.removeKeys(key);
  };

  const navigationBindings: Record<string, () => void> = {
    left: () => runKey("left"),
    right: () => runKey("right"),
    home: () => runKey("home"),
    end: () => runKey("end"),
  };

  // Shift + arrows extend the selection in multiple mode; the binding is the
  // only place that knows the modifier.
  const shiftBindings: Record<string, () => void> = {
    "shift+left": () => {
      context.noteKeyboard();
      selectableList.onKeyDown("left", { shift: true });
    },
    "shift+right": () => {
      context.noteKeyboard();
      selectableList.onKeyDown("right", { shift: true });
    },
    "shift+home": () => {
      context.noteKeyboard();
      selectableList.onKeyDown("home", { shift: true });
    },
    "shift+end": () => {
      context.noteKeyboard();
      selectableList.onKeyDown("end", { shift: true });
    },
  };

  /**
   * One typed character. React Aria's type-select drops a keystroke whose
   * accumulated prefix matches nothing and clears the buffer; NSH's primitive
   * (Kobalte's) keeps the prefix and silently does nothing. Starting a fresh
   * search for the newest character instead keeps every keystroke useful, and
   * is what the tag group's own type-to-select case expects (port sheet T-034:
   * `t` then `o` on One / Two / Three reaches One).
   */
  const typeAhead = (key: string) => {
    const before = context.focusedKey();

    context.noteKeyboard();
    selectableList.onKeyDown(key);

    if (context.focusedKey() === before) {
      selectableList.resetTypeAhead?.();
      selectableList.onKeyDown(key);
    }
  };

  // Kobalte's type-select takes any single character (`create-type-select.ts`).
  // Space stays out: on the web and macOS it is the focused view's activation
  // press, and a binding would consume it.
  const printableBindings: Record<string, () => void> = {};

  for (const key of "abcdefghijklmnopqrstuvwxyz0123456789") {
    printableBindings[key] = () => typeAhead(key);
  }

  createKeymapScope({
    isActive: () => context.isFocused(),
    bindings: navigationBindings,
    options: { repeat: true },
  });

  createKeymapScope({
    isActive: () => context.isFocused(),
    bindings: shiftBindings,
  });

  createKeymapScope({
    isActive: () => context.isFocused(),
    bindings: printableBindings,
  });

  // `select all` follows `createSelectableCollection`'s own control-a case.
  const selectAllBindings: Record<string, () => void> = {
    "ctrl+a": () => {
      context.noteKeyboard();
      selectableList.onKeyDown("a", { control: true });
    },
    "mod+a": () => {
      context.noteKeyboard();
      selectableList.onKeyDown("a", {
        platform: platform.os === "macos" || platform.os === "ios",
        control: platform.os !== "macos" && platform.os !== "ios",
      });
    },
  };

  createKeymapScope({
    isActive: () => context.isFocused(),
    bindings: selectAllBindings,
  });

  // The delete gesture exists only while the group can remove (RAC binds it
  // from `allowsRemoving`). Escape is a prop: its own scope rebinds or drops
  // the binding when the caller flips it while the list is focused.
  createKeymapScope({
    isActive: () => context.isFocused() && context.allowsRemoving(),
    bindings: {
      delete: removeFocused,
      backspace: removeFocused,
    },
  });

  createKeymapScope({
    isActive: () =>
      context.isFocused() && context.escapeKeyBehavior() !== "none",
    bindings: {
      escape: () => runKey("escape"),
    },
  });

  /* --- Focus and press ----------------------------------------------------- */
  const handleFocus = () => {
    const fromPointer = pointerFocusPending;

    pointerFocusPending = false;
    context.noteFocus(fromPointer);
    selectableList.onFocusIn();
    local.onFocus?.();
    context.notifyRootFocus();
  };

  const handleBlur = () => {
    context.noteBlur();
    selectableList.onFocusOut();
    local.onBlur?.();
    context.notifyRootBlur();
  };

  // Return / Space on the focused list view arrive as a native press; the
  // pressed tag's `isPressed` mirror is what the row renders. The row cannot
  // receive that press itself, so its press lifecycle is replayed through the
  // descriptor (upstream's `rowProps` carry the same handlers on the row).
  const handlePressDown = (event: PressEvent) => {
    if (!isKeyboardPress(event)) {
      return;
    }

    context.noteKeyboard();

    const key = context.focusedKey();

    if (key == null) {
      return;
    }

    context.keyboardPressedKey.set(key);
    context.findDescriptor(key)?.keyboardPress("start", event);
  };

  const handlePressUp = (event: PressEvent) => {
    if (!isKeyboardPress(event)) {
      return;
    }

    const key = context.keyboardPressedKey();

    context.keyboardPressedKey.set(undefined);

    if (key != null) {
      context.findDescriptor(key)?.keyboardPress("up", event);
    }
  };

  const handlePress = (event: PressEvent) => {
    if (!isKeyboardPress(event)) {
      return;
    }

    context.noteKeyboard();

    const key = context.focusedKey();

    if (key == null) {
      return;
    }

    context.findDescriptor(key)?.keyboardPress("press", event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);
  };

  /* --- Accessibility focus ------------------------------------------------- */
  // The screen reader follows the focused key, the stand-in for
  // `aria-activedescendant` (port sheet section 5). On the web a "screen reader
  // focus" is the page's own focus: moving it would take the keyboard focus off
  // the list and drop every binding, so the active tag is announced instead.
  effect(() => {
    const key = context.focusedKey();

    if (key == null || !context.isFocused()) {
      return;
    }

    const descriptor = context.findDescriptor(key);

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

  /* --- Content ------------------------------------------------------------- */
  // The list provides no context of its own, so its children are shared through
  // one `computed`: the empty-state rule and the placement read the same value
  // (each read builds new views).
  const children = computed(() => local.children);

  const hasItems = computed(() => local.items != null);

  // A static JSX child cannot be counted before it mounts, and the first pass
  // therefore sees an empty registry. As in `ListBox.Root`, wait for the mount
  // effect: after it, the registry is the collection (upstream's
  // `state.collection.size === 0`), so static children that render no tags show
  // `renderEmptyState` too.
  const mounted = signal(false);

  effect(() => {
    mounted.set(true);
  });

  const isEmptyState = computed(() => mounted() && isEmpty());

  const showEmpty = () => local.renderEmptyState != null && isEmptyState();

  // A pointer press on the list's own padding does nothing, as upstream.
  return (
    <View
      {...rest}
      ref={(node) => {
        listNode = node;
        local.ref?.(node);
      }}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      // R-031: RAC's `role="grid"` while the collection has tags and
      // `role="group"` while it is empty; the `aria-atomic` / `aria-relevant`
      // pair has no NSH channel, and `data-*` is dropped (D18). Focus lives on
      // this view: it is the only Tab stop, and every tag row is virtual focus.
      role={isEmpty() ? "group" : "grid"}
      focusable={true}
      accessibilityLabel={accessibilityLabel()}
      accessibilityHint={accessibilityHint()}
      accessibilityState={local.accessibilityState}
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden
      }
      android={{
        accessibilityLiveRegion: context.isFocused() ? "polite" : "none",
      }}
      class={classes()}
      style={resolvedStyle()}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={handlePress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onLayout={local.onLayout}
    >
      {/* RAC draws the empty state only while the collection is empty; the
          function child runs when the branch shows. */}
      <If when={showEmpty()}>{() => local.renderEmptyState?.(renderProps)}</If>
      <If when={hasItems()}>
        <Each of={local.items}>
          {(item, index) => (
            <TagItemContext.Provider value={{ index }}>
              {renderRow(local.children, item(), untracked(() => index()))}
            </TagItemContext.Provider>
          )}
        </Each>
      </If>
      <If when={!hasItems()}>
        {renderTagChildren(children() as JSX.Element)}
      </If>
    </View>
  );
}
