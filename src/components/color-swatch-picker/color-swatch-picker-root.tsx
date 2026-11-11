import type {
  Accessor,
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
  View,
} from "nsh";

import {
  createInteractionModality,
  createKeymapScope,
  createListState,
  createSelectableList,
  isKeyboardPress,
  type ListState,
  type SelectionModifiers,
} from "../../primitives";
import type { Color } from "../color-swatch";
import { joinClassNames } from "../color-picker/class-names";
import type { ColorPickerColorValue } from "../color-picker/create-color-picker-state";
import { createColorPickerState } from "../color-picker/create-color-picker-state";
import { ColorPickerColorContext } from "../color-picker/color-picker-context";
import type { AriaProps, DataProps, DomEventProps, GlobalDomProps } from "../color-picker/dom-props";
import type {
  ColorSwatchPickerContextValue,
  ColorSwatchPickerItemDescriptor,
  ColorSwatchPickerLayout,
  ColorSwatchPickerShape,
  ColorSwatchPickerSize,
} from "./color-swatch-picker-context";
import { ColorSwatchPickerContext } from "./color-swatch-picker-context";
import { colorSwatchPickerVariants } from "./color-swatch-picker.styles";

/** The live state HeroUI hands to the root's `className` and `style`. */
export interface ColorSwatchPickerRenderProps {
  isEmpty: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  /** Drag and drop is not ported: the constant upstream default. */
  isDropTarget: Accessor<boolean>;
  layout: Accessor<ColorSwatchPickerLayout>;
  orientation: Accessor<"vertical" | "horizontal">;
  /** The collection and its selection manager (this port's `ListState`). */
  state: ListState;
}

/**
 * The props of `ColorSwatchPicker.Root` (= `ColorSwatchPicker`): HeroUI
 * 3.2.7's `ColorSwatchPickerRootProps`, which is React Aria Components'
 * `ColorSwatchPicker` — a `ListBox` of single-select color options — plus the
 * three variant axes.
 *
 * The DOM-only members upstream (`render`, `slot`, the global DOM attributes,
 * the React DOM handlers) are accepted so code written against HeroUI keeps
 * compiling; port sheet §1.1 and §8 say what each can and cannot do.
 */
export interface ColorSwatchPickerRootProps
  extends AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps {
  /**
   * The options. Read once, inside the provider, at the placement (the
   * `_common` exception: this root provides a context to its parts).
   */
  children?: JSX.Element;

  /** Appended after the base slot classes; a function receives the render props. */
  className?: string | ((values: ColorSwatchPickerRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: ColorSwatchPickerRenderProps) => StyleProp<ViewStyle>);

  /** The controlled color: a CSS string or a parsed `Color`. */
  value?: ColorPickerColorValue;

  /** The initial color in uncontrolled mode; no color means an empty selection. */
  defaultValue?: ColorPickerColorValue;

  /** Called with the new `Color` when an option is selected. */
  onChange?: (color: Color) => void;

  /** The rows' arrangement. @default "grid" */
  layout?: ColorSwatchPickerLayout;

  /** The item size. @default "md" */
  size?: ColorSwatchPickerSize;

  /** The shape. @default "circle" */
  variant?: ColorSwatchPickerShape;

  /**
   * The listbox's accessible name. Upstream falls back to the localized
   * "Color swatch picker", as here.
   */
  "aria-label"?: string;

  accessibilityLabel?: string;

  /** Accepted, no effect: NSH resolves no accessible names from ids. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH resolves no descriptions from ids. */
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH resolves no detail relationships from ids. */
  "aria-details"?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no RAC slot context. */
  slot?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  nativeID?: string;

  testID?: string;

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * The listbox of color options. HeroUI 3.2.7's `ColorSwatchPicker` is a React
 * Aria `ListBox` with `selectionMode="single"`, `disallowEmptySelection` and
 * `selectedKeys={[color.toString("hexa")]}`; the selection is therefore never
 * stored, it is derived from the color (port sheet §2). This port keeps that
 * shape: one color state, a `selectedKeys` computed from it, and a collection
 * assembled from the options that registered themselves.
 */
export function ColorSwatchPickerRoot(
  props: ColorSwatchPickerRootProps,
): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "value",
    "defaultValue",
    "onChange",
    "layout",
    "size",
    "variant",
    "aria-label",
    "accessibilityLabel",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "id",
    "nativeID",
    "testID",
    "ref",
    "slot",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
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
  ] as const);

  const layout = computed<ColorSwatchPickerLayout>(() => local.layout ?? "grid");
  const size = computed<ColorSwatchPickerSize>(() => local.size ?? "md");
  const variant = computed<ColorSwatchPickerShape>(
    () => local.variant ?? "circle",
  );

  // Port sheet §5, change 1: inside a `ColorPicker` the picker owns the color.
  // Outside one the context is `undefined` and this is a normal uncontrolled /
  // controlled picker.
  const outer = ColorPickerColorContext();

  const state = createColorPickerState({
    value: () => (local.value !== undefined ? local.value : outer?.value()),
    defaultValue: () => local.defaultValue,
    onChange: (color) => {
      local.onChange?.(color);

      // Only when the outer picker is the one driving this list: a caller who
      // passed `value` keeps the list independent of the picker around it.
      if (local.value === undefined) {
        outer?.onChange(color);
      }
    },
  });

  // React Aria's `ColorMapContext`: the key of a selected option back to the
  // color the option registered, since a selection change only carries keys.
  const colors = new Map<string, Color>();

  const registerColor = (key: string, color: Color) => {
    colors.set(key, color);

    return () => {
      if (colors.get(key) === color) {
        colors.delete(key);
      }
    };
  };

  // Research 4.2: parts register themselves, and the registry becomes the
  // primitive's data source. Registration order is creation order, which is the
  // order the items were written in.
  const descriptors = signal<readonly ColorSwatchPickerItemDescriptor[]>([]);

  const register = (descriptor: ColorSwatchPickerItemDescriptor) => {
    descriptors.set([...descriptors(), descriptor]);

    return () => {
      descriptors.set(descriptors().filter((current) => current !== descriptor));
    };
  };

  const dataSource = computed(() =>
    descriptors().map((descriptor) => ({
      key: descriptor.key,
      textValue: descriptor.textValue(),
      disabled: descriptor.disabled(),
    })),
  );

  /**
   * The selected key is the color's `hexa` string, derived on every read: the
   * collection never owns a selection of its own (port sheet §2).
   */
  const selectedKeys = computed<Set<string>>(() => {
    const color = state.color();

    return color === undefined ? new Set() : new Set([color.toString("hexa")]);
  });

  const list = createListState({
    dataSource,
    getKey: () => "key",
    getTextValue: () => "textValue",
    getDisabled: () => "disabled",
    selectionMode: () => "single",
    // React Aria's ListBox default; with a single selection and a non-empty
    // requirement it behaves as "replace" for an already selected option.
    selectionBehavior: () => "toggle",
    selectedKeys,
    disallowEmptySelection: () => true,
    disabledBehavior: () => "all",
    onSelectionChange: (keys) => {
      // "all" cannot occur with `selectionMode: "single"`.
      if (keys === "all") {
        return;
      }

      const key = [...keys][0];

      if (key === undefined) {
        return;
      }

      const color = colors.get(key);

      if (color !== undefined) {
        state.setColor(color);
      }
    },
  });

  let rootNode: ViewRef | undefined;

  /** Focuses the root, the only Tab stop; a no-op where code focus is not offered. */
  const focusRoot = () => {
    rootNode?.focus();
  };

  // A pointer press gives the root no native focus, so the port focuses it for
  // the arrows to keep working (macOS / web). That focus event is not keyboard
  // focus, so the flag keeps the pointer modality (no focus ring), exactly as
  // `:focus-visible` would upstream (`color-swatch-picker.css`: `:focus-visible`).
  const canFocusViews = platform.os === "macos" || platform.os === "web";
  let pointerFocusPending = false;

  const focusRootFromPointer = () => {
    if (!canFocusViews) {
      return;
    }

    pointerFocusPending = true;
    rootNode?.focus();
  };

  const modality = createInteractionModality();

  cleanup(() => modality.reset());

  const rootFocused = signal(false);
  const keyboardPressedKey = signal<string | undefined>(undefined);

  const isFocusVisible = computed(() => rootFocused() && modality.isKeyboard());

  const selectableList = createSelectableList({
    collection: list.collection,
    selectionManager: list.selectionManager,
    orientation: () => "vertical",
    disallowEmptySelection: () => true,
    focusCollection: focusRoot,
  });

  const manager = () => list.selectionManager();

  /** The registration of the option that holds `key`. */
  const findDescriptor = (key: string) =>
    descriptors().find((descriptor) => descriptor.key === key);

  const isEmpty = computed(() => list.collection().getSize() === 0);

  const renderProps: ColorSwatchPickerRenderProps = {
    isEmpty,
    isFocused: rootFocused,
    isFocusVisible,
    isDropTarget: () => false,
    layout,
    orientation: () => "vertical",
    state: list,
  };

  const slots = computed(() =>
    colorSwatchPickerVariants({
      layout: layout(),
      size: size(),
      variant: variant(),
    }),
  );

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? className(renderProps)
      : className;
  };

  // R-001 / R-026: the base slot (which carries the grid arrangement and the
  // stack direction), then the caller's class.
  const classes = computed(() =>
    joinClassNames(slots().base(), resolvedClassName()),
  );

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

    findDescriptor(key)?.activate(source, event, modifiers);
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
  };

  const handleBlur = () => {
    rootFocused.set(false);
    selectableList.onFocusOut();
  };

  // R-013 (keyboard half): Return / Space on the focused root arrives here as
  // a press, never as a key.
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
    // A pointer press on the container's own gap does nothing, as upstream.
    if (!isKeyboardPress(event)) {
      return;
    }

    modality.setKeyboardModality();
    activateFocused("keyboard", event);
  };

  // Port sheet §2, keyboard: the arrows, Home / End, PageUp / PageDown and the
  // letter typeahead, bound only while the root has the focus. Return and Space
  // stay unbound (the host delivers them as the focused view's press).
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

  // Kobalte's type-select takes any single character
  // (`create-type-select.ts:42-47`); keymap has a name per printable key, so the
  // letters and digits are bound. Space stays out: it is the activation press.
  const printableBindings: Record<string, () => void> = {};

  for (const key of "abcdefghijklmnopqrstuvwxyz0123456789") {
    printableBindings[key] = () => runKey(key);
  }

  createKeymapScope({
    isActive: () => rootFocused(),
    bindings: navigationBindings,
    options: { repeat: true },
  });

  createKeymapScope({
    isActive: () => rootFocused(),
    bindings: printableBindings,
  });

  // The screen reader follows the focused key, the stand-in for
  // `aria-activedescendant` (port sheet §2). On the web a "screen reader focus"
  // is the page's own focus, which would take the keyboard focus off the list
  // and drop every binding (measured for ListBox); there the active option is
  // announced instead, so a reader still hears it.
  effect(() => {
    const key = manager().focusedKey();

    if (key == null || !rootFocused()) {
      return;
    }

    const descriptor = findDescriptor(key);

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

  const contextValue: ColorSwatchPickerContextValue = {
    layout,
    size,
    variant,
    list,
    selectionManager: () => manager(),
    state,
    register,
    registerColor,
    isFocused: rootFocused,
    focusedKey: () => manager().focusedKey(),
    isKeyboard: modality.isKeyboard,
    keyboardPressedKey,
    focusRoot,
    focusRootFromPointer,
    notePointer: () => modality.setPointerModality(),
    registerItemLayout: (key, bounds) =>
      selectableList.registerItemLayout(key, bounds),
    unregisterItemLayout: (key) => selectableList.unregisterItemLayout(key),
  };

  const accessibilityLabel = () =>
    (local["aria-label"] as string | undefined) ??
    local.accessibilityLabel ??
    "Color swatch picker";

  return (
    <ColorSwatchPickerContext.Provider value={contextValue}>
      <View
        ref={(node) => {
          rootNode = node;
          local.ref?.(node);
        }}
        testID={local.testID}
        nativeID={local.id ?? local.nativeID}
        role="listbox"
        // The root is the one Tab stop; the options are virtual-focus rows and
        // are never focusable themselves (port sheet §2.1).
        focusable={true}
        accessibilityLabel={accessibilityLabel()}
        class={classes()}
        style={resolvedStyle()}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPress={handlePress}
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        onLayout={(event) => selectableList.registerContainerLayout(event.bounds)}
      >
        {local.children}
      </View>
    </ColorSwatchPickerContext.Provider>
  );
}
