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
import { cleanup, computed, effect, signal, split, View } from "nsh";

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
import { IconCheck } from "../icons";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { renderChildren } from "./children";
import {
  CollectionItemContext,
  ListBoxContainerContext,
  ListBoxContext,
  ListBoxItemContext,
  type ListBoxItemContextValue,
  type ListBoxItemDescriptor,
  ListBoxSectionContext,
} from "./list-box-context";
import { listboxItemVariants, type ListBoxItemVariants } from "./list-box.styles";

/** The live state HeroUI hands to item children, `className` and `style`. */
export interface ListBoxItemRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isSelected: Accessor<boolean>;
  /** The row holds `focusedKey` while the root has the keyboard focus. */
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  selectionMode: Accessor<SelectionMode>;
  selectionBehavior: Accessor<SelectionBehavior>;
  /** Drag-and-drop is not ported: these are the constant upstream defaults. */
  allowsDragging?: Accessor<boolean>;
  isDragging: Accessor<boolean>;
  isDropTarget: Accessor<boolean>;
}

/**
 * The render props React Aria hands a row's render function when the row is
 * rendered outside its list (Select's value, `SelectValue`): every flag is
 * `false` and the mode is a single toggle selection.
 */
const NEUTRAL_RENDER_PROPS: ListBoxItemRenderProps = {
  isHovered: () => false,
  isPressed: () => false,
  isSelected: () => false,
  isFocused: () => false,
  isFocusVisible: () => false,
  isDisabled: () => false,
  selectionMode: () => "single",
  selectionBehavior: () => "toggle",
  isDragging: () => false,
  isDropTarget: () => false,
};

export interface ListBoxItemRootProps<T = unknown> extends ListBoxItemVariants {
  children?: JSX.Element | ((values: ListBoxItemRenderProps) => JSX.Element);

  className?: string | ((values: ListBoxItemRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: ListBoxItemRenderProps) => StyleProp<ViewStyle>);

  ref?: (node: ViewRef) => void;

  /** The collection key (an identity: read once). */
  id?: string | number;

  /** The object value in a dynamic collection. */
  value?: T;

  /** Typeahead text and the accessible-name fallback. */
  textValue?: string;

  "aria-label"?: string;

  isDisabled?: boolean;

  /** Takes precedence over the root's `onAction`. */
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

  /** A DOM key event upstream; accepted, no effect (keys are the root's). */
  onKeyDown?: unknown;

  onKeyUp?: unknown;

  /** Link props: accepted, no effect (there is no DOM anchor). */
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
 * `key` → the item's index (`react-aria-components/src/ListBox.tsx:513`).
 */
function resolveKey(
  id: string | number | undefined,
  value: unknown,
  index: number | undefined,
  textValue: string | undefined,
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

  if (index != null) {
    return String(index);
  }

  return textValue ?? "";
}

/**
 * ListBox.Item / ListBoxItemRoot: one `role="option"` row. The root holds the
 * keyboard focus; the row holds its own hover, pressed and indicator state and
 * reads selection and `focusedKey` from the list primitive.
 */
export function ListBoxItemRoot<T>(
  props: ListBoxItemRootProps<T>,
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "value",
    "textValue",
    "aria-label",
    "aria-hidden",
    "isDisabled",
    "variant",
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

  const list = ListBoxContext();

  if (!list) {
    return null;
  }

  const section = ListBoxSectionContext();
  const collectionItem = CollectionItemContext();
  // R-043: the container (a Select popover) tightens the row's padding.
  const container = ListBoxContainerContext();

  // Identity values are read once on purpose: the key must not move under the
  // row while the collection is live (port sheet section 2). The dynamic
  // collection's value and index are accessors: a positional row gets a new
  // value in place, and its content is rebuilt from it by the root.
  const id = local.id;
  const value =
    local.value !== undefined ? local.value : collectionItem?.value();
  const key = resolveKey(
    id,
    value,
    collectionItem ? collectionItem.index() : undefined,
    local.textValue,
  );

  const variant = computed(() => local.variant ?? "default");
  const selectionManager = list.selectionManager;

  const selectable = createSelectableItem({
    selectionManager,
    key: () => key,
    disabled: () => local.isDisabled === true || list.isDisabledKey(key),
    shouldSelectOnPressUp: () => list.shouldSelectOnPressUp(),
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
  const textValue = computed(
    () => local.textValue ?? labelText() ?? "",
  );

  const isHovered = signal(false);
  const pointerPressed = signal(false);
  const hasIndicator = signal(false);

  const isSelected = computed(() => selectable.isSelected());
  // The collection's own focus flag, not the root view's: a virtual-focus list
  // (ComboBox) never gives its root the view focus, but React Aria's
  // `ListState.isFocused` is still true and drives the item's `data-focus`
  // (port sheet §5, first change).
  const isFocused = computed(
    () => selectionManager().isFocused() && list.focusedKey() === key,
  );
  const isFocusVisible = computed(() => isFocused() && list.isKeyboard());
  const isDisabled = computed(() => selectable.isDisabled());
  // R-013 (keyboard half): the root records the item held down by Return /
  // Space, because a key press never reaches the row itself.
  const isPressed = computed(
    () => pointerPressed() || list.keyboardPressedKey() === key,
  );

  const renderProps: ListBoxItemRenderProps = {
    isHovered,
    isPressed,
    isSelected,
    isFocused,
    isFocusVisible,
    isDisabled,
    selectionMode: () => selectionManager().selectionMode(),
    selectionBehavior: () => selectionManager().selectionBehavior(),
    isDragging: () => false,
    isDropTarget: () => false,
  };

  const slots = computed(() => listboxItemVariants({ variant: variant() }));

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? className(renderProps)
      : className;
  };

  // R-043: the item's own slot classes, then the container's, then the
  // caller's. The row's `classList` (`pe-7`, R-010 / R-044) is appended after
  // this string, so the room the indicator needs still wins over `px-2.5`.
  const classes = computed(() =>
    [slots().item(), container?.itemClass?.(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  let node: ViewRef | undefined;

  /** The action half: the item's own `onAction`, else the root's. */
  const fireAction = () => {
    const action = local.onAction;

    if (action) {
      action();
    } else {
      list.onAction(key);
    }
  };

  /** The single activation entry for pointer, keyboard and the Windows binding. */
  const activate = (
    source: "pointer" | "keyboard",
    event?: PressEvent,
    modifiers?: SelectionModifiers,
  ) => {
    if (selectable.isDisabled()) {
      return;
    }

    if (selectable.allowsSelection()) {
      if (source === "pointer") {
        // The selection already ran on press down or up; the release is only
        // the action half. With no event (a Label's forwarded press), there
        // is nothing left to do: `onPress()` without an event is the keyboard
        // activation and would select a second time.
        if (event) {
          selectable.onPress(event);
        }
      } else {
        selectable.onKeyDown(
          "enter",
          modifiers ?? (event ? modifiersFromPress(event) : undefined),
        );
      }

      return;
    }

    fireAction();
  };

  // The row's content, read where it is placed: a function of at least one
  // parameter is the HeroUI render prop (D17), anything else is a child value.
  //
  // It is deliberately not memoized in a `computed`: NSH's `computed` caches
  // the element array, and a cached copy drops a nested render-prop part (the
  // ListBox Indicator's `✓`, measured on the ListBox regression suite), so the
  // one read stays at the placement. A container that renders the selected
  // option (Select.Value) gets its own copy from `copyContent` below (port
  // sheet §5, fifth change; §8 registers the second construction).
  const content = (): JSX.Element => {
    const value = local.children;

    if (typeof value === "function" && value.length >= 1) {
      return renderChildren(
        (value as (values: ListBoxItemRenderProps) => JSX.Element)(renderProps),
      );
    }

    return renderChildren(value as JSX.Element);
  };

  /**
   * The row's content for a container that renders the selected option
   * (Select.Value). Upstream React Aria calls the item's render function with a
   * neutral render props object — every flag `false`, `selectionMode: "single"`
   * — so the copy never shows the row's focus ring or its checkmark
   * (`react-aria-components/src/Select.tsx`, `SelectValue`); the indicator is
   * then hidden by R-020. Reading the content here builds the copy at the
   * container's placement, never at the row's (port sheet §5, fifth change).
   */
  const copyContent = (): JSX.Element => {
    const value = local.children;

    if (typeof value === "function" && value.length >= 1) {
      return renderChildren(
        (value as (values: ListBoxItemRenderProps) => JSX.Element)(
          NEUTRAL_RENDER_PROPS,
        ),
      );
    }

    return renderChildren(value as JSX.Element);
  };

  const descriptor: ListBoxItemDescriptor = {
    type: "item",
    key,
    textValue: () => textValue(),
    // Its `<Each>` row's index signal, read when the collection is built: a
    // keyed row that moves reports its new position, so the registry order
    // follows the data rather than the order rows were created in.
    order: collectionItem?.index,
    disabled: () => local.isDisabled === true || list.isDisabledKey(key),
    ref: () => node,
    activate,
    // A Select's value renders the selected option's children; the container
    // hides the indicator inside that copy (R-020).
    children: copyContent,
  };

  const register = section?.register ?? list.register;

  cleanup(register(descriptor));
  cleanup(() => list.unregisterItemLayout(key));

  // R-010: `:has(.list-box-item__indicator)` has no NSH form, so the Indicator
  // reports its presence and the row adds `pe-7` while it is mounted.
  const registerIndicator = () => {
    hasIndicator.set(true);

    return () => hasIndicator.set(false);
  };

  const itemContext: ListBoxItemContextValue = {
    state: renderProps,
    variant,
    registerIndicator,
  };

  // The row's press handlers serve both a real press event and the Label's
  // forwarded press, which has no payload (the Label is `pointer-events-none`
  // upstream, so a press on it is a press on the row). With no event the
  // pointer path is implied: `onPress` must not fall into its keyboard branch,
  // or a second selection would run on release.
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
      // a click; elsewhere `focus()` does nothing (port sheet section 8). The
      // focus is press-driven, so the root keeps the pointer modality.
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

    if (list.shouldFocusOnHover()) {
      const manager = selectionManager();

      manager.setFocused(true);
      manager.setFocusedKey(key);
    }
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);
    // R-013 (pointer half): leaving the row ends a press that never reported
    // its release, as `usePress` cancels on leave.
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
    () => local["aria-label"] ?? local.accessibilityLabel ?? labelText() ?? local.textValue,
  );

  const accessibilityState = computed<AccessibilityState>(() => ({
    ...local.accessibilityState,
    selected: isSelected(),
    // `disabledBehavior: "selection"` keeps the row enabled (port sheet §2).
    disabled: isDisabled(),
  }));

  // R-007: a press on the Label becomes a press on this row, since
  // `pointer-events-none` has no NSH channel. Label is pressable, so the press
  // stops there and never reaches the row by itself.
  const field: FieldState = {
    // R-023: `danger` paints the Label with `text-danger`. Label documents
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

      // Upstream's Label is `pointer-events-none`, so a press on it is a press
      // on the row: run the item's whole activation path, down, up and press.
      // The Label's own press carries no payload, which the handlers accept.
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
        <ListBoxItemContext.Provider value={itemContext}>
          <View
            {...rest}
            ref={(next) => {
              node = next;
              local.ref?.(next);
            }}
            testID={local.testID}
            nativeID={local.nativeID}
            tooltip={local.tooltip}
            role="option"
            // Items are virtual-focus rows, never Tab stops (port sheet §5).
            focusable={false}
            disabled={isDisabled()}
            accessibilityLabel={accessibilityLabel()}
            accessibilityHint={local.accessibilityHint ?? descriptionText()}
            accessibilityState={accessibilityState()}
            accessibilityElementsHidden={
              local["aria-hidden"] ?? false
            }
            class={classes()}
            classList={{
              // R-010: inline-end padding while an indicator is mounted.
              "pe-7": hasIndicator(),
              // R-011: the keyboard focus ring on the focused row.
              "ring-2 ring-focus ring-offset-2 ring-offset-background":
                isFocusVisible(),
              // R-013: pressed scale (pointer down, or Return / Space held).
              "scale-[0.98]": isPressed(),
              // R-016: `status-disabled` as literals (theme notes).
              "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
              // Port sheet §5, third change: a row the owner's filter left out
              // stays mounted (so a changed filter restores it) but takes no
              // room and no presses.
              hidden: list.visibleKeys()?.has(key) === false,
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
        </ListBoxItemContext.Provider>
      </DescriptionContext.Provider>
    </FieldContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ListBox Item Indicator
 * -----------------------------------------------------------------------------------------------*/

export interface ListBoxItemIndicatorProps {
  /**
   * Custom indicator content, or a render function called once with accessors.
   * Empty means the built-in check.
   */
  children?: JSX.Element | ((values: ListBoxItemRenderProps) => JSX.Element);

  /** Appended after the indicator slot classes. */
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
 * ListBox.ItemIndicator / ListBoxItemIndicator: the absolutely positioned
 * check slot. HeroUI draws an SVG polyline hidden and drawn through
 * `stroke-dashoffset`; NSH has no SVG, so the default is a rotated View whose
 * border takes `currentColor` (port sheet R-019 / R-020, section 8).
 */
export function ListBoxItemIndicator(
  props: ListBoxItemIndicatorProps,
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

  const item = ListBoxItemContext();
  const container = ListBoxContainerContext();
  const variant = computed(() => item?.variant() ?? "default");
  const isSelected = () => item?.state.isSelected() ?? false;

  // R-020: inside a copy of a row (Select.Value) the indicator draws nothing.
  // The copy has no item context, so it would otherwise fall back to the
  // unchecked checkmark the value must not show.
  if (container?.itemIndicatorSuppressed?.() === true) {
    return null;
  }

  if (item) {
    cleanup(item.registerIndicator());
  }

  // R-045: a single-select popover removes the indicator's transition. The
  // indicator's own slot classes and the checkmark's carry one, so the later
  // `transition-none` is what overrides both (classList wins over class).
  const suppressTransition = () => container?.suppressIndicatorTransition?.() === true;

  const slots = computed(() => listboxItemVariants({ variant: variant() }));

  const classes = computed(() =>
    [slots().indicator(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const fallbackRenderProps: ListBoxItemRenderProps = NEUTRAL_RENDER_PROPS;

  const renderProps = item?.state ?? fallbackRenderProps;

  // R-019 / R-020: the built-in check is a View with two border sides rotated
  // into a tick. It writes no colour, so `currentColor` follows the slot's
  // `text-default-foreground`, its danger `text-danger` (R-022) or the
  // caller's own text class. Selection toggles opacity and scale, the port's
  // substitute for the stroke drawing.
  // A tick that is already there when the popover opens must not animate in
  // from its hidden state: upstream paints the selected row in its final state
  // at the first frame. The transition turns on one frame after the item is
  // laid out, so only a later selection change uses it.
  const settled = signal(false);
  effect(() => {
    const frame = requestAnimationFrame(() => settled.set(true));
    return () => cancelAnimationFrame(frame);
  });

  const checkmark = () => (
    <View
      class="size-2.5"
      classList={{
        "opacity-100 scale-100": isSelected(),
        "opacity-0 scale-75": !isSelected(),
        "transition-all duration-[250ms] ease-linear motion-reduce:transition-none":
          settled(),
        // R-045: a single-select popover draws no transition, on the checkmark
        // as well as on its slot.
        "transition-none": suppressTransition(),
      }}
    >
      {/* The upstream polyline, stroked by Canvas: the shape is the same one. */}
      <IconCheck
        className="size-full"
        color={variant() === "danger" ? "danger" : "default-foreground"}
      />
    </View>
  );

  const content = () => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        (children as (values: ListBoxItemRenderProps) => JSX.Element)(
          renderProps,
        ),
      );
    }

    if (children !== undefined && children !== null) {
      return renderChildren(children as JSX.Element);
    }

    return checkmark();
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
      // R-022: the danger variant tints the whole slot, and the built-in check
      // inherits it through `currentColor`.
      classList={{
        "text-danger": variant() === "danger",
        // R-045: no transition for a single-select popover's list.
        "transition-none": suppressTransition(),
      }}
      style={local.style}
    >
      {content()}
    </View>
  );
}
