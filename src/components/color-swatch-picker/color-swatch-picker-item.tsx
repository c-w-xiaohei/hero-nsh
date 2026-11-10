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
import { cleanup, computed, reduceMotion, signal, split, untracked, View } from "nsh";

import {
  createSelectableItem,
  isKeyboardPress,
  modifiersFromPress,
  type SelectionBehavior,
  type SelectionMode,
  type SelectionModifiers,
} from "../../primitives";
import { joinClassNames } from "../color-picker/class-names";
import type { AriaProps, DataProps, DomEventProps, GlobalDomProps } from "../color-picker/dom-props";
import type { Color } from "../color-swatch";
import { parseColor } from "../color-swatch";
import type { ColorSwatchPickerItemContextValue } from "./color-swatch-picker-context";
import {
  ColorSwatchPickerContext,
  ColorSwatchPickerItemContext,
} from "./color-swatch-picker-context";
import { colorSwatchPickerVariants } from "./color-swatch-picker.styles";

/** The live state HeroUI hands to an item's children, `className` and `style`. */
export interface ColorSwatchPickerItemRenderProps {
  /** The item's color, parsed. */
  color: Accessor<Color>;
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isSelected: Accessor<boolean>;
  /** The row holds `focusedKey` while the root has the keyboard focus. */
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  selectionMode: Accessor<SelectionMode>;
  selectionBehavior: Accessor<SelectionBehavior>;
  /** Drag and drop is not ported: the constant upstream defaults. */
  isDragging: Accessor<boolean>;
  isDropTarget: Accessor<boolean>;
}

/** The children of an item: nodes, or the render-prop form HeroUI also takes. */
export type ColorSwatchPickerItemChildren =
  | JSX.Element
  | ((values: ColorSwatchPickerItemRenderProps) => JSX.Element);

/**
 * The props of `ColorSwatchPicker.Item`: HeroUI 3.2.7's
 * `ColorSwatchPickerItemProps`, which is React Aria Components'
 * `ColorSwatchPickerItem` — the color, `isDisabled`, the render-prop surface
 * and the press / hover handlers of a `ListBoxItem`.
 */
export interface ColorSwatchPickerItemProps
  extends AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps {
  /** Read once, inside the item's provider, at the placement. */
  children?: ColorSwatchPickerItemChildren;

  /** Appended after the `item` slot classes; a function receives the render props. */
  className?: string | ((values: ColorSwatchPickerItemRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: ColorSwatchPickerItemRenderProps) => StyleProp<ViewStyle>);

  /**
   * The item's color: a CSS string or a parsed `Color`. It is the item's
   * identity — the collection key is its `hexa` string — and its default is
   * fully transparent, as upstream's `#0000`.
   */
  color?: string | Color;

  /** Blocks focus, selection and presses for this option. */
  isDisabled?: boolean;

  /** The option's accessible name; defaults to the color's English name. */
  "aria-label"?: string;

  accessibilityLabel?: string;

  accessibilityState?: AccessibilityState;

  /** Accepted, no effect: the option holds no focus of its own here. */
  "aria-hidden"?: boolean;

  /** Forwarded to the item `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;

  testID?: string;

  nativeID?: string;

  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  onPress?: (event: PressEvent) => void;
  onPressStart?: (event: PressEvent) => void;
  onPressEnd?: (event: PressEvent) => void;
  onPressDown?: (event: PressEvent) => void;
  onPressUp?: (event: PressEvent) => void;
  onPressChange?: (isPressed: boolean) => void;
  onLongPress?: (event: PressEvent) => void;
  onLongPressStart?: (event: PressEvent) => void;
  onLongPressEnd?: (event: PressEvent) => void;
  onHoverStart?: (event: NshMouseEvent) => void;
  onHoverEnd?: (event: NshMouseEvent) => void;
  onHoverChange?: (isHovered: boolean) => void;
  onMouseEnter?: (event: NshMouseEvent) => void;
  onMouseLeave?: (event: NshMouseEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * ColorSwatchPickerItem: one `role="option"` row holding a Swatch and an
 * Indicator. HeroUI builds it on `ListBoxItem`; this port keeps the row's own
 * box (ListBoxItem's padding, radius and `data-*` styles would show through and
 * fail B2 of the base decision) and reuses only the selection primitives.
 *
 * The root holds the focus; the row reads `focusedKey` and its selection from
 * the list primitive, and an NSH press selects on press down, as React Aria's
 * `useSelectableItem` does for a non-draggable list.
 */
export function ColorSwatchPickerItem(
  props: ColorSwatchPickerItemProps,
): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "color",
    "isDisabled",
    "aria-label",
    "accessibilityLabel",
    "accessibilityState",
    "aria-hidden",
    "ref",
    "testID",
    "nativeID",
    "render",
    "slot",
    "onPress",
    "onPressStart",
    "onPressEnd",
    "onPressDown",
    "onPressUp",
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
    "onClick",
    "onDoubleClick",
    "onMouseDown",
    "onMouseUp",
    "onMouseMove",
    "onPointerDown",
    "onPointerUp",
    "onKeyDown",
    "onKeyUp",
    "onFocusCapture",
    "onBlurCapture",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  const list = ColorSwatchPickerContext();

  if (!list) {
    return null;
  }

  const selectionManager = list.selectionManager;

  /** The item's color; `undefined` and `""` mean upstream's `#0000`. */
  const color = computed<Color>(() => {
    const value = local.color;

    if (value === undefined || value === "") {
      return parseColor("#0000");
    }

    return typeof value === "string" ? parseColor(value) : value;
  });

  // The key is an identity: read once, so it cannot move under a live
  // collection (port sheet §2, "item key"). A later `color` still repaints the
  // swatch and the name, as the color computed is reactive.
  const registeredColor = untracked(() => color());
  const key = registeredColor.toString("hexa");

  const selectable = createSelectableItem({
    selectionManager,
    key: () => key,
    disabled: () => local.isDisabled === true,
    shouldSelectOnPressUp: () => false,
  });

  const isHovered = signal(false);
  const pointerPressed = signal(false);

  const isSelected = computed(() => selectable.isSelected());
  const isFocused = computed(
    () => list.isFocused() && list.focusedKey() === key,
  );
  const isFocusVisible = computed(() => isFocused() && list.isKeyboard());
  const isDisabled = computed(() => selectable.isDisabled());
  // R-013 (keyboard half): the root records the option held down by Return /
  // Space, because a key press never reaches the row itself.
  const isPressed = computed(
    () => pointerPressed() || list.keyboardPressedKey() === key,
  );

  const textValue = computed(() => color().getColorName("en"));

  const renderProps: ColorSwatchPickerItemRenderProps = {
    color,
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

  const slots = computed(() =>
    colorSwatchPickerVariants({
      layout: list.layout(),
      size: list.size(),
      variant: list.variant(),
    }),
  );

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function" ? className(renderProps) : className;
  };

  // R-002 / R-027 … R-031 / R-033 / R-036 / R-039 / R-043 / R-046: the item
  // slot (size and shape from the root's variants), then the caller's class.
  const classes = computed(() =>
    joinClassNames(slots().item(), resolvedClassName()),
  );

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  /**
   * R-010: the selected border takes the item's own color. Upstream writes it
   * through `--color-swatch-current` and a `[data-selected]` rule; NSH has no
   * CSS variables (D18), so the same value is inline and replaces the base
   * `border-transparent` while selected. It is the one property with two
   * sources in this component, switched by state.
   *
   * R-005: the transition's property list, inline because NSH has no
   * `transition-<property>` class; reduce-motion clears it, or the inline list
   * would win over `transition-none`.
   */
  const style = () => [
    { transitionProperty: reduceMotion() ? "none" : "border-color, box-shadow" },
    resolvedStyle(),
    isSelected() ? { borderColor: color().toString("css") } : undefined,
  ];

  let node: ViewRef | undefined;

  /** The single activation entry for a pointer press and the Windows binding. */
  const activate = (
    source: "pointer" | "keyboard",
    event?: PressEvent,
    modifiers?: SelectionModifiers,
  ) => {
    if (selectable.isDisabled()) {
      return;
    }

    if (source === "pointer") {
      // The selection already ran on press down; the release is the action
      // half, and this component has none.
      if (event) {
        selectable.onPress(event);
      }
    } else {
      selectable.onKeyDown(
        "enter",
        modifiers ?? (event ? modifiersFromPress(event) : undefined),
      );
    }
  };

  const descriptor = {
    key,
    textValue: () => textValue(),
    // Only the item's own prop: the collection asks its data source for a
    // disabled key, so reading the selection manager here (which consults the
    // collection) would close a loop.
    disabled: () => local.isDisabled === true,
    ref: () => node,
    activate,
  };

  cleanup(list.register(descriptor));
  cleanup(list.registerColor(key, registeredColor));
  // PageUp / PageDown move by a viewport, which the keyboard delegate can only
  // compute from the rows' bounds (create-selectable-list.ts:55-61, as
  // ListBoxItem does at src/components/list-box/list-box-item.tsx:597).
  cleanup(() => list.unregisterItemLayout(key));

  const content = () => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return (children as (values: ColorSwatchPickerItemRenderProps) => JSX.Element)(
        renderProps,
      );
    }

    return children as JSX.Element;
  };

  const itemContext: ColorSwatchPickerItemContextValue = { state: renderProps };

  const handlePressDown = (event?: PressEvent) => {
    if (event && isKeyboardPress(event)) {
      return;
    }

    // The pointer modality first: a press on an already focused root must drop
    // the keyboard ring even though no new focus event follows.
    list.notePointer();

    if (!selectable.isDisabled()) {
      pointerPressed.set(true);
      // macOS / web: give the root the focus so the arrows keep working after
      // a click; elsewhere `focus()` does nothing (port sheet §8).
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
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);
    // Leaving ends a press that never reported its release, as `usePress`
    // cancels on leave.
    pointerPressed.set(false);

    if (!isHovered()) {
      return;
    }

    isHovered.set(false);
    local.onHoverEnd?.(event);
    local.onHoverChange?.(false);
  };

  const handleLayout = (event: { bounds: Bounds }) => {
    list.registerItemLayout(key, event.bounds);
  };

  const accessibilityLabel = computed(
    () =>
      (local["aria-label"] as string | undefined) ??
      local.accessibilityLabel ??
      textValue(),
  );

  const accessibilityState = computed<AccessibilityState>(() => ({
    ...local.accessibilityState,
    selected: isSelected(),
    disabled: isDisabled(),
  }));

  return (
    <ColorSwatchPickerItemContext.Provider value={itemContext}>
      <View
        ref={(next) => {
          node = next;
          local.ref?.(next);
        }}
        testID={local.testID}
        nativeID={local.nativeID}
        role="option"
        // Options are virtual-focus rows, never Tab stops (port sheet §2.1).
        focusable={false}
        disabled={isDisabled()}
        accessibilityLabel={accessibilityLabel()}
        accessibilityState={accessibilityState()}
        accessibilityElementsHidden={
          (local["aria-hidden"] as boolean | undefined) ?? false
        }
        class={classes()}
        classList={{
          // R-008: `status-focused` → the 2pt focus ring with a 2pt offset and
          // no outline. `data-focus-visible` has no channel; the modality does
          // the same job (port sheet §8).
          "ring-2 ring-focus ring-offset-2 ring-offset-background outline-none":
            isFocusVisible(),
          // R-009: `status-disabled` → the literals (theme notes); `disabled`
          // already blocks presses.
          "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
          // R-011: `box-shadow: var(--field-shadow)`, both appearances (a
          // shadow cannot switch with the theme).
          "shadow-field dark:shadow-field-dark": isSelected(),
        }}
        style={style()}
        onPress={handlePress}
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        onLongPress={handleLongPress}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={local.onFocus}
        onBlur={local.onBlur}
        onLayout={handleLayout}
      >
        {content()}
      </View>
    </ColorSwatchPickerItemContext.Provider>
  );
}
