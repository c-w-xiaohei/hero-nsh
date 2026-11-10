import type { JSX, ViewRef } from "nsh";
import { computed, split, View } from "nsh";

import { PopoverRoot } from "../popover";
import type { Color } from "../color-swatch";
import { joinClassNames } from "./class-names";
import type {
  ColorPickerColorContextValue,
  ColorPickerContextValue,
} from "./color-picker-context";
import { ColorPickerColorContext, ColorPickerContext } from "./color-picker-context";
import { colorPickerVariants } from "./color-picker.styles";
import type { ColorPickerColorValue } from "./create-color-picker-state";
import { createColorPickerState } from "./create-color-picker-state";
import type { AriaProps, DataProps, DomEventProps, GlobalDomProps } from "./dom-props";

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ColorPicker.Root` (= `ColorPicker`): HeroUI 3.2.7's
 * `ColorPickerRootProps`, which is React Aria Components' `ColorPicker` (its
 * `value` / `defaultValue` / `onChange` plus `slot`) with HeroUI's own
 * `className` and a children prop narrowed from a render function to nodes.
 *
 * Root renders no host element upstream — RAC's `ColorPicker` is a context
 * provider, and HeroUI's `<div class="color-picker">` sits inside it — so the
 * DOM-only members are accepted and have no effect (port sheet §1.2, §8).
 */
export interface ColorPickerRootProps
  extends AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps {
  /**
   * The parts: `ColorPicker.Trigger` and `ColorPicker.Popover`. Read once,
   * inside the color provider and at this placement.
   */
  children: JSX.Element;

  /** Appended after the `base` slot class; later classes win. */
  className?: string;

  /**
   * The controlled color, a CSS string or a parsed `Color`. `null` — and no
   * value at all — means the picker starts with no color, as upstream's
   * `useColorPickerState` returns `null` rather than white.
   */
  value?: ColorPickerColorValue;

  /** The initial color in uncontrolled mode. */
  defaultValue?: ColorPickerColorValue;

  /** Called with the new `Color` whenever the picker's color changes. */
  onChange?: (color: Color) => void;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  nativeID?: string;

  testID?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no RAC slot context. */
  slot?: string;

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * ColorPickerRoot: one color, one trigger, one popover. It owns the color
 * state (the single source of truth for every color part inside it), the
 * overlay's open state through `Popover.Root`, and the wrapper view.
 *
 * Upstream's tree is `<ColorPicker> <DialogTrigger> <div class="color-picker">
 * {children} </div> </DialogTrigger> </ColorPicker>`; here it is the color
 * provider, `Popover.Root` (the same DialogTrigger) and one `View`.
 */
export function ColorPickerRoot(props: ColorPickerRootProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "value",
    "defaultValue",
    "onChange",
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

  const state = createColorPickerState({
    value: () => local.value,
    defaultValue: () => local.defaultValue,
    onChange: (color) => local.onChange?.(color),
  });

  // The one pair every color part inside the picker reads (port sheet §5,
  // change 1). The state setter is the only writer, so the picker stays the
  // single source of truth even when a child is also uncontrolled.
  const colorContext: ColorPickerColorContextValue = {
    value: state.color,
    onChange: (color) => state.setColor(color),
  };

  // No variant axes upstream: one table, read once.
  const slots = colorPickerVariants();
  const slotsContext: ColorPickerContextValue = { slots };

  // R-101: the base slot, then the caller's class.
  const classes = computed(() => joinClassNames(slots.base(), local.className));

  return (
    <ColorPickerColorContext.Provider value={colorContext}>
      <ColorPickerContext.Provider value={slotsContext}>
        <PopoverRoot>
          {/*
            The single read of `props.children`, at the placement and inside
            the providers (the `_common` exception: a component that provides a
            context must read the children where the context is in scope).
          */}
          <View
            ref={(node) => local.ref?.(node)}
            testID={local.testID}
            nativeID={local.id ?? local.nativeID}
            class={classes()}
          >
            {local.children}
          </View>
        </PopoverRoot>
      </ColorPickerContext.Provider>
    </ColorPickerColorContext.Provider>
  );
}
