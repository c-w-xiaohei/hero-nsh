import type { Accessor, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { joinClassNames } from "../color-picker/class-names";
import type { AriaProps, DataProps, DomEventProps, GlobalDomProps } from "../color-picker/dom-props";
import type { Color } from "../color-swatch";
import { parseColor } from "../color-swatch";
import { ColorSwatchPickerContext, ColorSwatchPickerItemContext } from "./color-swatch-picker-context";
import { colorSwatchPickerVariants } from "./color-swatch-picker.styles";

/** The value HeroUI's `ColorSwatch` render props carry. */
export interface ColorSwatchPickerSwatchRenderProps {
  color: Accessor<Color>;
}

/** The swatch's children: nodes, or a render function called with the color. */
export type ColorSwatchPickerSwatchChildren =
  | JSX.Element
  | ((values: ColorSwatchPickerSwatchRenderProps) => JSX.Element);

/**
 * The props of `ColorSwatchPicker.Swatch`: HeroUI 3.2.7's
 * `ColorSwatchPickerSwatchProps`, which is React Aria Components'
 * `ColorSwatch` — a plain colored box, not HeroUI's `ColorSwatch` component
 * with its checkerboard and inner ring (port sheet §5).
 */
export interface ColorSwatchPickerSwatchProps
  extends AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps {
  /** Read once, at the placement. */
  children?: ColorSwatchPickerSwatchChildren;

  /** Appended after the `swatch` slot classes; a function receives the render props. */
  className?: string | ((values: ColorSwatchPickerSwatchRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: ColorSwatchPickerSwatchRenderProps) => StyleProp<ViewStyle>);

  /**
   * The color to paint. Optional: inside an Item it defaults to the item's
   * color; used on its own it must be given, as upstream.
   */
  color?: string | Color;

  /** Forwarded to the swatch `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;

  testID?: string;

  nativeID?: string;

  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

/**
 * ColorSwatchPickerSwatch: the colored box inside an option. It owns exactly
 * one property, the background color (inline), and gets its radius from the
 * root's variants (R-014 / R-034 … R-047), because NSH's `rounded-*` takes no
 * `inherit`.
 */
export function ColorSwatchPickerSwatch(
  props: ColorSwatchPickerSwatchProps,
): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "color",
    "ref",
    "testID",
    "nativeID",
    "render",
    "slot",
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

  const item = ColorSwatchPickerItemContext();
  const root = ColorSwatchPickerContext();

  const slots = computed(() =>
    colorSwatchPickerVariants({
      layout: root?.layout() ?? "grid",
      size: root?.size() ?? "md",
      variant: root?.variant() ?? "circle",
    }),
  );

  /** The explicit `color`, else the item's; `#0000` when used on its own. */
  const color = computed<Color>(() => {
    const value = local.color;

    if (value !== undefined && value !== "") {
      return typeof value === "string" ? parseColor(value) : value;
    }

    return item?.state.color() ?? parseColor("#0000");
  });

  const isSelected = () => item?.state.isSelected() ?? false;

  const renderProps: ColorSwatchPickerSwatchRenderProps = { color };

  const classes = computed(() =>
    joinClassNames(
      slots().swatch(),
      typeof local.className === "function"
        ? local.className(renderProps)
        : local.className,
    ),
  );

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  const content = () => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return (children as (values: ColorSwatchPickerSwatchRenderProps) => JSX.Element)(
        renderProps,
      );
    }

    return children as JSX.Element;
  };

  return (
    <View
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.nativeID}
      class={classes()}
      classList={{
        // R-012: `transform: scale(0.77)` while the option is selected, which
        // reveals the item's border color around the shrunken swatch.
        // R-018: `scale(1.1)` on hover, and only while not selected: upstream's
        // selected rule comes later in the stylesheet, NSH's `hover:` variant
        // beats a plain utility, so the two states are mutually exclusive
        // (port sheet §8).
        "scale-[0.77]": isSelected(),
        "hover:scale-110": !isSelected(),
        // R-041: `.color-swatch-picker--square.color-swatch-picker--sm
        // .item[data-selected] .swatch` is the one size where selection really
        // shrinks the radius (8 → 6pt). The swatch reads the root's axes,
        // since NSH has no descendant selectors.
        "rounded-md":
          isSelected() &&
          (root?.variant() ?? "circle") === "square" &&
          (root?.size() ?? "md") === "sm",
      }}
      // The color is the only inline property this part owns; the caller's
      // style comes after it, so it can restate it (D13).
      style={[{ backgroundColor: color().toString("css") }, resolvedStyle()]}
    >
      {content()}
    </View>
  );
}
