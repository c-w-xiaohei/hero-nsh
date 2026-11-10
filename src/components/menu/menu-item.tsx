import type {
  Accessor,
  AccessibilityRole,
  AccessibilityState,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, effect, openUrl, signal, split, View } from "nsh";

import {
  createSelectableItem,
  isKeyboardPress,
  modifiersFromPress,
  type SelectionBehavior,
  type SelectionMode,
  type SelectionModifiers,
} from "../../primitives";
import { DescriptionContext } from "../description/context";
import type { DescriptionContextValue } from "../description/context";
import { IconChevronRight } from "../icons";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { renderChildren } from "./children";
import {
  CollectionItemContext,
  MenuContext,
  MenuItemContext,
  type MenuActivationKey,
  type MenuItemContextValue,
  type MenuItemDescriptor,
  MenuSectionContext,
} from "./menu-context";
import { menuItemVariants, type MenuItemVariants } from "./menu.styles";

/** The live state HeroUI hands to item children, `className` and `style`. */
export interface MenuItemRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isSelected: Accessor<boolean>;
  /** The row holds `focusedKey` while the root has the keyboard focus. */
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  selectionMode: Accessor<SelectionMode>;
  selectionBehavior: Accessor<SelectionBehavior>;
  /** Whether the row was given `aria-haspopup`, i.e. opens a submenu. */
  hasSubmenu: Accessor<boolean>;
  /** Whether the caller reported the submenu open through `aria-expanded`. */
  isOpen: Accessor<boolean>;
  /** Drag-and-drop is not ported: these are the constant upstream defaults. */
  allowsDragging?: Accessor<boolean>;
  isDragging: Accessor<boolean>;
  isDropTarget: Accessor<boolean>;
}

/**
 * The render props an Indicator falls back to when it is rendered outside an
 * item: every flag `false` and no selection, as React Aria's empty context.
 */
const NEUTRAL_RENDER_PROPS: MenuItemRenderProps = {
  isHovered: () => false,
  isPressed: () => false,
  isSelected: () => false,
  isFocused: () => false,
  isFocusVisible: () => false,
  isDisabled: () => false,
  selectionMode: () => "none",
  selectionBehavior: () => "toggle",
  hasSubmenu: () => false,
  isOpen: () => false,
  isDragging: () => false,
  isDropTarget: () => false,
};

/** `http:`, `mailto:`, `tel:` …: what `openUrl` accepts; `#anchor` is not. */
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:/i;

export interface MenuItemRootProps<T = unknown> extends MenuItemVariants {
  /** The row content, or a render function called once with accessor values. */
  children?: JSX.Element | ((values: MenuItemRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. */
  className?: string | ((values: MenuItemRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: MenuItemRenderProps) => StyleProp<ViewStyle>);

  ref?: (node: ViewRef) => void;

  /** The collection key (an identity: read once). */
  id?: string | number;

  /** The object value in a dynamic collection. */
  value?: T;

  /** Typeahead text and the accessible-name fallback. */
  textValue?: string;

  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  "aria-describedby"?: string;

  /** Any truthy value marks the row as a submenu trigger (RAC reads `!!`). */
  "aria-haspopup"?: boolean | "menu" | "listbox" | "tree" | "grid" | "dialog";

  /** Whether the row's submenu is open; feeds `isOpen` and `accessibilityState.expanded`. */
  "aria-expanded"?: boolean | "true" | "false";

  /**
   * Registers the row as a submenu trigger (dropdown port sheet §5, first
   * change): the menu root calls it on ArrowRight while this row holds the
   * virtual focus, and the row's own activation calls it on a press. `focusFirst`
   * is the keyboard entry, which also takes the submenu's focus. Absent means
   * the row is not a submenu trigger.
   */
  openSubmenu?: (focusFirst?: boolean) => void;

  /**
   * Closes the submenu this row opened and keeps the focus on the row
   * (`useSubmenuTrigger.ts:188-210`); returns whether a submenu was open, so
   * ArrowLeft falls through to the collection when this row's submenu is
   * already closed. Absent on rows without a submenu.
   */
  closeSubmenu?: () => boolean;

  isDisabled?: boolean;

  /** Overrides the Section's and the Menu's value for this row (section 1). */
  shouldCloseOnSelect?: boolean;

  /** Takes precedence over the root's `onAction`; both are called, this one first. */
  onAction?: () => void;

  onPress?: (e: PressEvent) => void;

  onPressDown?: (e: PressEvent) => void;

  onPressUp?: (e: PressEvent) => void;

  onPressStart?: (e: PressEvent) => void;

  onPressEnd?: (e: PressEvent) => void;

  onPressChange?: (isPressed: boolean) => void;

  onLongPress?: (e: PressEvent) => void;

  onLongPressStart?: (e: PressEvent) => void;

  onLongPressEnd?: (e: PressEvent) => void;

  onHoverStart?: (e: NshMouseEvent) => void;

  onHoverEnd?: (e: NshMouseEvent) => void;

  onHoverChange?: (isHovered: boolean) => void;

  onMouseEnter?: (e: NshMouseEvent) => void;

  onMouseLeave?: (e: NshMouseEvent) => void;

  onFocus?: () => void;

  onBlur?: () => void;

  /** Called when the row gains or loses the menu's `focusedKey` (virtual focus). */
  onFocusChange?: (isFocused: boolean) => void;

  /** A DOM key event upstream; accepted, no effect (keys are the root's). */
  onKeyDown?: unknown;

  onKeyUp?: unknown;

  /**
   * Link props. `href` navigates through `openUrl` on activation (there is no
   * DOM anchor); `target`, `rel` and the rest of the anchor semantics stay
   * without effect (port sheet section 8).
   */
  href?: string;

  target?: string;

  rel?: string;

  download?: unknown;

  ping?: string;

  referrerPolicy?: string;

  hrefLang?: string;

  routerOptions?: unknown;

  "aria-hidden"?: boolean;

  slot?: string;

  render?: unknown;

  accessibilityLabel?: string;

  accessibilityHint?: string;

  accessibilityState?: AccessibilityState;

  testID?: string;

  nativeID?: string;

  tooltip?: JSX.Element;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * The key React Aria derives for an entry: `id` → the object's `id` → its
 * `key` → the item's index (`react-aria-components/src/Menu.tsx:513`). An entry
 * with none of them gets a generated key from the root; `textValue` is not part
 * of the order (`react-aria/dist/private/collections/Document.js:212`).
 */
function resolveKey(
  id: string | number | undefined,
  value: unknown,
  index: number | undefined,
): string | undefined {
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

  if (index != null) {
    return String(index);
  }

  return undefined;
}

/**
 * Menu.Item / MenuItemRoot: one `role="menuitem"` row. The root holds the
 * keyboard focus; the row holds its own hover, pressed and indicator state and
 * reads selection from the nearest manager (its Section's, when that Section
 * declared a `selectionMode`) and `focusedKey` from the menu primitive.
 */
export function MenuItemRoot<T>(props: MenuItemRootProps<T>): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "value",
    "textValue",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-haspopup",
    "aria-expanded",
    "openSubmenu",
    "closeSubmenu",
    "aria-hidden",
    "isDisabled",
    "variant",
    "shouldCloseOnSelect",
    "onAction",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onPressStart",
    "onPressEnd",
    "onPressChange",
    "onLongPress",
    "onLongPressStart",
    "onLongPressEnd",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onMouseEnter",
    "onMouseLeave",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "onKeyDown",
    "onKeyUp",
    "href",
    "target",
    "rel",
    "download",
    "ping",
    "referrerPolicy",
    "hrefLang",
    "routerOptions",
    "slot",
    "render",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
    "testID",
    "nativeID",
    "tooltip",
    "onLayout",
  ] as const);

  const list = MenuContext();

  if (!list) {
    return null;
  }

  const section = MenuSectionContext();
  const collectionItem = CollectionItemContext();

  // Identity values are read once on purpose: the key must not move under the
  // row while the collection is live (port sheet section 2). The dynamic
  // collection's value and index are accessors.
  const id = local.id;
  const value =
    local.value !== undefined ? local.value : collectionItem?.value();
  const resolvedKey = resolveKey(
    id,
    value,
    collectionItem ? collectionItem.index() : undefined,
  );
  // React Aria auto-keys an entry that carries no identity, so two id-less
  // static rows stay two collection nodes instead of sharing the empty string.
  const key = resolvedKey ?? list.createItemKey();

  const variant = computed(() => local.variant ?? "default");

  // RAC's `GroupSelectionManager`: a Section with its own `selectionMode` keeps
  // the selection local while focus stays on the menu's manager.
  const selectionManager = () =>
    section?.selectionManager() ?? list.selectionManager();

  const selectable = createSelectableItem({
    selectionManager,
    key: () => key,
    disabled: () => local.isDisabled === true || list.isDisabledKey(key),
    // RAC's `useMenuItem` selects on the completed press
    // (`useMenuItem.js:125`), so a press dragged off the row is cancelled.
    shouldSelectOnPressUp: () => true,
  });

  const labelSource = signal<{ read: () => string | undefined } | undefined>(
    undefined,
  );
  const descriptionSource = signal<
    { read: () => string | undefined } | undefined
  >(undefined);
  const labelText = computed(() => labelSource()?.read());
  const descriptionText = computed(() => descriptionSource()?.read());

  // Typeahead needs a string; a complex row cannot be read back from the
  // renderer, so `textValue` (or a registered Label) is the only source.
  const textValue = computed(() => local.textValue ?? labelText() ?? "");

  const isHovered = signal(false);
  const pointerPressed = signal(false);
  const hasIndicator = signal(false);
  const hasSubmenuIndicator = signal(false);

  const isSelected = computed(() => selectable.isSelected());
  const isFocused = computed(
    () => list.isFocused() && list.focusedKey() === key,
  );
  const isFocusVisible = computed(() => isFocused() && list.isKeyboard());
  const isDisabled = computed(() => selectable.isDisabled());
  // R-014 (keyboard half): the root records the entry held down by Return /
  // Space, because a key press never reaches the row itself.
  const isPressed = computed(
    () => pointerPressed() || list.keyboardPressedKey() === key,
  );

  const hasSubmenu = computed(() => Boolean(local["aria-haspopup"]));
  const isOpen = computed(
    () =>
      local["aria-expanded"] === true || local["aria-expanded"] === "true",
  );

  const renderProps: MenuItemRenderProps = {
    isHovered,
    isPressed,
    isSelected,
    isFocused,
    isFocusVisible,
    isDisabled,
    selectionMode: () => selectionManager().selectionMode(),
    selectionBehavior: () => selectionManager().selectionBehavior(),
    hasSubmenu,
    isOpen,
    isDragging: () => false,
    isDropTarget: () => false,
  };

  // `MenuItemProps` inherits FocusEvents upstream (`Menu.tsx:518-529`) and
  // `useMenuItem` wires `focusableProps` (`useMenuItem.js:160-230`). Rows here
  // only hold the menu's virtual focus, so gaining or losing `focusedKey` is
  // the moment those events report.
  let wasFocused = false;

  effect(() => {
    const focused = isFocused();

    if (focused === wasFocused) {
      return;
    }

    wasFocused = focused;
    local.onFocusChange?.(focused);

    if (focused) {
      local.onFocus?.();
    } else {
      local.onBlur?.();
    }
  });

  const slots = computed(() => menuItemVariants({ variant: variant() }));

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? className(renderProps)
      : className;
  };

  const classes = computed(() =>
    [slots().item(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  let node: ViewRef | undefined;

  /** The action half: the entry's own `onAction` first, then the menu's. */
  const fireAction = () => {
    local.onAction?.();
    list.onAction(key);
  };

  /**
   * React Aria's close rule, per press source and per key
   * (`react-aria@3.48.0/dist/private/menu/useMenuItem.js:114`): pointer closes
   * unless the menu is multiple; keyboard Enter always closes, keyboard Space
   * only when the mode has no selection state (or the row is a link). An
   * explicit `shouldCloseOnSelect` (Item → Section → Menu) wins over both, and a
   * submenu trigger never acts or closes.
   *
   * The key name arrives with the activation: the root's Return binding names
   * it, and an unnamed keyboard activation is the host press, which means Space.
   */
  const isLink = () => local.href != null;

  const shouldCloseAfterActivation = (
    source: "pointer" | "keyboard",
    keyName?: MenuActivationKey,
  ) => {
    const explicit =
      local.shouldCloseOnSelect ??
      section?.shouldCloseOnSelect?.() ??
      list.shouldCloseOnSelect();

    if (hasSubmenu()) {
      return false;
    }

    if (explicit != null) {
      return explicit;
    }

    const mode = selectionManager().selectionMode();

    if (source === "pointer") {
      return mode !== "multiple" || isLink();
    }

    return keyName === "Enter" || mode === "none" || isLink();
  };

  /**
   * The single activation entry for pointer, keyboard and the keymap bindings.
   * Selection and action are two halves (port sheet section 5): a press selects
   * on release, the keyboard does both here. A link row replays its navigation
   * through `openUrl` after the action, as React Aria's `useMenuItem` opens the
   * link after `performAction`.
   */
  const activate = (
    source: "pointer" | "keyboard",
    event?: PressEvent,
    modifiers?: SelectionModifiers,
    keyName?: MenuActivationKey,
  ) => {
    if (selectable.isDisabled()) {
      return;
    }

    if (source === "keyboard" && selectable.allowsSelection()) {
      selectable.onKeyDown(
        "enter",
        modifiers ?? (event ? modifiersFromPress(event) : undefined),
      );
    }

    if (hasSubmenu()) {
      // A submenu trigger never acts: it opens its submenu instead. React Aria
      // opens on press start for the keyboard and on the press for a pointer
      // (`useSubmenuTrigger.ts:233-250`), and the row carries no action; the
      // keyboard entry also takes the focus to the submenu's first row.
      local.openSubmenu?.(source === "keyboard");

      return;
    }

    fireAction();

    // The native anchor's navigation, replayed: only an absolute URL is handed
    // to the host; a relative path or `#anchor` fires the handlers and stops
    // (port sheet section 8, as Link does).
    const href = local.href;

    if (href !== undefined && ABSOLUTE_URL.test(href)) {
      void openUrl(href).catch(() => {});
    }

    if (shouldCloseAfterActivation(source, keyName)) {
      list.onClose();
    }
  };

  // The row's content, read where it is placed: a function of at least one
  // parameter is the HeroUI render prop (D17), anything else is a child value.
  const content = (): JSX.Element => {
    const value = local.children;

    if (typeof value === "function" && value.length >= 1) {
      return renderChildren(
        (value as (values: MenuItemRenderProps) => JSX.Element)(renderProps),
      );
    }

    return renderChildren(value as JSX.Element);
  };

  const descriptor: MenuItemDescriptor = {
    type: "item",
    key,
    textValue: () => textValue(),
    // Its `<Each>` row's index signal, read when the collection is built.
    order: collectionItem?.index,
    disabled: () => local.isDisabled === true || list.isDisabledKey(key),
    ref: () => node,
    activate,
    openSubmenu: local.openSubmenu
      ? (focusFirst?: boolean) => local.openSubmenu?.(focusFirst)
      : undefined,
    closeSubmenu: local.closeSubmenu
      ? () => local.closeSubmenu?.() ?? false
      : undefined,
  };

  const register = section?.register ?? list.register;

  cleanup(register(descriptor));
  cleanup(() => list.unregisterItemLayout(key));

  // R-010: `:has(.menu-item__indicator)` has no NSH form, so both indicator
  // slots report their presence and the row reserves the room while mounted.
  const registerIndicator = () => {
    hasIndicator.set(true);

    return () => hasIndicator.set(false);
  };

  const registerSubmenuIndicator = () => {
    hasSubmenuIndicator.set(true);

    return () => hasSubmenuIndicator.set(false);
  };

  const itemContext: MenuItemContextValue = {
    state: renderProps,
    variant,
    registerIndicator,
    registerSubmenuIndicator,
  };

  // The row's press handlers serve both a real press event and the Label's
  // forwarded press, which has no payload (the Label is `pointer-events-none`
  // upstream, so a press on it is a press on the row).
  const handlePressDown = (event?: PressEvent) => {
    if (event && isKeyboardPress(event)) {
      return;
    }

    // The pointer modality first: a press on an already focused row must drop
    // the keyboard ring even though no new focus event follows.
    list.notePointer();

    if (!selectable.isDisabled()) {
      pointerPressed.set(true);
      // macOS / web: give the root the focus so the arrows keep working after
      // a click; elsewhere `focus()` does nothing (port sheet section 8).
      list.focusRootFromPointer();
    }

    selectable.onPressDown(event);
    if (event) {
      local.onPressStart?.(event);
      local.onPressDown?.(event);
    }
    local.onPressChange?.(true);
  };

  const handlePressUp = (event?: PressEvent) => {
    if (event && isKeyboardPress(event)) {
      return;
    }

    if (pointerPressed()) {
      pointerPressed.set(false);
      local.onPressChange?.(false);
    }

    selectable.onPressUp(event);
    if (event) {
      local.onPressUp?.(event);
      local.onPressEnd?.(event);
    }
  };

  const handlePress = (event?: PressEvent) => {
    pointerPressed.set(false);
    activate(
      event && isKeyboardPress(event) ? "keyboard" : "pointer",
      event,
    );
    if (event) {
      local.onPress?.(event);
    }
  };

  const handleLongPress = (event: PressEvent) => {
    if (selectable.isDisabled()) {
      return;
    }

    local.onLongPressStart?.(event);
    local.onLongPress?.(event);
    local.onLongPressEnd?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

    if (selectable.isDisabled() || isHovered()) {
      return;
    }

    isHovered.set(true);
    local.onHoverStart?.(event);
    local.onHoverChange?.(true);

    // RAC's `useMenuItem` moves the virtual focus to the hovered row while the
    // keyboard ring is off (`useMenuItem.js:145-152`), so a pointer sweep after
    // a keyboard interaction leaves `focusedKey` on the row under the cursor.
    if (!list.isKeyboard()) {
      const manager = selectionManager();

      manager.setFocused(true);
      manager.setFocusedKey(key);
    }
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);
    // R-014 (pointer half): leaving the row ends a press that never reported
    // its release.
    pointerPressed.set(false);

    if (!isHovered()) {
      return;
    }

    isHovered.set(false);
    local.onHoverEnd?.(event);
    local.onHoverChange?.(false);
  };

  const handleLayout = (event: { bounds: Bounds }) => {
    list.registerItemLayout(key, event.bounds, section?.key);
    local.onLayout?.(event);
  };

  const accessibilityLabel = computed(
    () =>
      local["aria-label"] ??
      local.accessibilityLabel ??
      labelText() ??
      local.textValue,
  );

  // Item role, as React Aria's `useMenuItem` derives it: a submenu trigger is
  // always `menuitem`; otherwise the nearest manager's mode picks checkbox or
  // radio (port sheet section 2).
  const role = computed<AccessibilityRole>(() => {
    if (hasSubmenu()) {
      return "menuitem";
    }

    const mode = selectionManager().selectionMode();

    if (mode === "multiple") {
      return "menuitemcheckbox";
    }

    if (mode === "single") {
      return "menuitemradio";
    }

    return "menuitem";
  });

  const accessibilityState = computed<AccessibilityState>(() => {
    const state: AccessibilityState = {
      ...local.accessibilityState,
      disabled: isDisabled(),
    };

    if (hasSubmenu()) {
      if (local["aria-expanded"] !== undefined) {
        state.expanded = isOpen();
      }

      return state;
    }

    if (selectionManager().selectionMode() !== "none") {
      state.checked = isSelected();
    }

    return state;
  });

  // R-006: a press on the Label becomes a press on this row, since
  // `pointer-events-none` has no NSH channel.
  const field: FieldState = {
    // R-028: `danger` paints the Label with `text-danger`. Label documents
    // `isInvalid` as appearance only, which is exactly upstream's effect.
    isInvalid: () => variant() === "danger",
    registerLabel: (read) => {
      labelSource.set({ read });

      return () => labelSource.set(undefined);
    },
    focusField: () => {
      list.notePointer();

      if (selectable.isDisabled()) {
        return;
      }

      handlePressDown();
      handlePressUp();
      handlePress();
    },
  };

  const description: DescriptionContextValue = {
    registerDescription: (read) => {
      descriptionSource.set({ read });

      return () => descriptionSource.set(undefined);
    },
  };

  return (
    <FieldContext.Provider value={field}>
      <DescriptionContext.Provider value={description}>
        <MenuItemContext.Provider value={itemContext}>
          <View
            {...rest}
            ref={(next) => {
              node = next;
              local.ref?.(next);
            }}
            testID={local.testID}
            nativeID={local.nativeID}
            tooltip={local.tooltip}
            role={role()}
            // Entries are virtual-focus rows, never Tab stops (port sheet §5).
            focusable={false}
            disabled={isDisabled()}
            accessibilityLabel={accessibilityLabel()}
            accessibilityHint={local.accessibilityHint ?? descriptionText()}
            accessibilityState={accessibilityState()}
            accessibilityElementsHidden={local["aria-hidden"] ?? false}
            class={classes()}
            classList={{
              // R-010: inline-start room while a check / dot is mounted.
              "ps-7": hasIndicator(),
              // R-011: inline-end room while the submenu chevron is mounted on
              // a row that opens a submenu.
              "pe-7": hasSubmenu() && hasSubmenuIndicator(),
              // R-012: the keyboard focus ring on the focused row.
              "ring-2 ring-focus ring-offset-2 ring-offset-background":
                isFocusVisible(),
              // R-014: pressed scale (pointer down, or Return / Space held).
              "will-change-transform scale-[0.98]": isPressed(),
              // R-018: `status-disabled` as literals (theme notes).
              "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
            }}
            style={resolvedStyle()}
            onPress={handlePress}
            onPressDown={handlePressDown}
            onPressUp={handlePressUp}
            onLongPress={handleLongPress}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onLayout={handleLayout}
          >
            {content()}
          </View>
        </MenuItemContext.Provider>
      </DescriptionContext.Provider>
    </FieldContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Menu Item Indicator
 * -----------------------------------------------------------------------------------------------*/

export interface MenuItemIndicatorProps {
  /**
   * Custom indicator content, or a render function called once with accessors.
   * Empty means the built-in check or dot chosen by `type`.
   */
  children?: JSX.Element | ((values: MenuItemRenderProps) => JSX.Element);

  /** Appended after the indicator slot classes. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  ref?: (node: ViewRef) => void;

  /** The built-in indicator shape. @default "checkmark" */
  type?: "checkmark" | "dot";

  "aria-hidden"?: boolean;

  slot?: string;

  render?: unknown;

  accessibilityElementsHidden?: boolean;

  testID?: string;

  nativeID?: string;
}

/**
 * Menu.ItemIndicator / MenuItemIndicator: the absolutely positioned start-side
 * slot. HeroUI draws an SVG polyline hidden and drawn through
 * `stroke-dashoffset`; NSH has no SVG, so the defaults are Views whose borders
 * take `currentColor` (port sheet R-021 / R-022, section 8).
 */
export function MenuItemIndicator(
  props: MenuItemIndicatorProps,
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "type",
    "aria-hidden",
    "slot",
    "render",
    "accessibilityElementsHidden",
    "testID",
    "nativeID",
  ] as const);

  const item = MenuItemContext();
  const variant = computed(() => item?.variant() ?? "default");
  const state = item?.state ?? NEUTRAL_RENDER_PROPS;
  const isSelected = () => state.isSelected();
  const isMultiple = () => state.selectionMode() === "multiple";
  const type = local.type ?? "checkmark";

  // R-010: the row reserves `ps-7` while this slot is mounted.
  if (item) {
    cleanup(item.registerIndicator());
  }

  const slots = computed(() => menuItemVariants({ variant: variant() }));

  const classes = computed(() =>
    [slots().indicator(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-021: the built-in check is a View with two border sides rotated into a
  // tick. It writes no colour, so `currentColor` follows the slot's
  // `text-muted`, its danger `text-danger` (R-027) or the caller's own text
  // class. Selection toggles opacity and scale, the port's substitute for the
  // stroke drawing; the transition exists only while selected, as R-016 says.
  const checkmark = () => (
    <View
      // `border-l-2` is physical, as HeroUI's SVG polyline is: a logical
      // `border-s-2` would mirror the tick into an inverted V in RTL.
      class="size-2.5 border-b-2 border-l-2 -rotate-45"
      classList={{
        "opacity-100 scale-100": isSelected(),
        "opacity-0": !isSelected(),
        "transition-all duration-100 ease-linear motion-reduce:transition-none":
          isSelected() && !isMultiple(),
        "transition-all duration-[300ms] ease-linear motion-reduce:transition-none":
          isSelected() && isMultiple(),
      }}
    />
  );

  // R-022: the dot is a `size-2` View whose `border-4` sides meet in the middle
  // of the 8pt box, filling it with `currentColor`. It starts at
  // `scale-[0.7] opacity-0` and scales in while selected.
  // R-017: the selected state is exactly `scale-100 opacity-100`.
  const dot = () => (
    <View
      class="size-2 rounded-full border-4"
      classList={{
        "scale-[0.7] opacity-0": !isSelected(),
        "scale-100 opacity-100": isSelected(),
        "transition-all duration-[250ms] motion-reduce:transition-none":
          isMultiple(),
      }}
    />
  );

  const content = () => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        (children as (values: MenuItemRenderProps) => JSX.Element)(state),
      );
    }

    if (children !== undefined && children !== null) {
      return renderChildren(children as JSX.Element);
    }

    return type === "dot" ? dot() : checkmark();
  };

  return (
    <View
      {...rest}
      ref={(next) => local.ref?.(next)}
      testID={local.testID}
      nativeID={local.nativeID}
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden ?? true
      }
      class={classes()}
      // R-027: the danger variant tints the whole slot, and the built-in
      // check / dot inherits it through `currentColor`.
      classList={{ "text-danger": variant() === "danger" }}
      style={local.style}
    >
      {content()}
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Menu Item Submenu Indicator
 * -----------------------------------------------------------------------------------------------*/

export interface MenuItemSubmenuIndicatorProps {
  /** Custom chevron content; empty means `IconChevronRight`. */
  children?: JSX.Element;

  /** Appended after the submenu slot classes. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  ref?: (node: ViewRef) => void;

  "aria-hidden"?: boolean;

  slot?: string;

  render?: unknown;

  accessibilityElementsHidden?: boolean;

  testID?: string;

  nativeID?: string;
}

/**
 * Menu.Item.SubmenuIndicator / MenuItemSubmenuIndicator: the inline-end chevron
 * slot. It renders nothing unless the row is a submenu trigger, exactly as
 * upstream returns `null` without `hasSubmenu` (R-024).
 */
export function MenuItemSubmenuIndicator(
  props: MenuItemSubmenuIndicatorProps,
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "aria-hidden",
    "slot",
    "render",
    "accessibilityElementsHidden",
    "testID",
    "nativeID",
  ] as const);

  const item = MenuItemContext();

  if (!item || !item.state.hasSubmenu()) {
    return null;
  }

  // R-011: the row reserves `pe-7` while this slot is mounted.
  cleanup(item.registerSubmenuIndicator());

  const variant = computed(() => item.variant());
  const slots = computed(() => menuItemVariants({ variant: variant() }));

  const classes = computed(() =>
    [slots().submenuIndicator(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const content = () => {
    const children = local.children;

    if (children !== undefined && children !== null) {
      return renderChildren(children as JSX.Element);
    }

    // R-009: the default chevron is `size-3.5` (the more specific rule wins
    // over the base `size-3` upstream, R-025). R-023 / R-027: a Canvas icon
    // cannot read the ancestor's `text-*`, so its token is passed directly.
    return (
      <IconChevronRight
        className="size-3.5"
        color={variant() === "danger" ? "danger" : "muted"}
      />
    );
  };

  return (
    <View
      {...rest}
      ref={(next) => local.ref?.(next)}
      testID={local.testID}
      nativeID={local.nativeID}
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden ?? true
      }
      class={classes()}
      style={local.style}
    >
      {content()}
    </View>
  );
}
