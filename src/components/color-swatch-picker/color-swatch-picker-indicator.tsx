import type { JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { joinClassNames } from "../color-picker/class-names";
import type { AriaProps, DataProps, DomEventProps, GlobalDomProps } from "../color-picker/dom-props";
import type { Color } from "../color-swatch";
import { parseColor } from "../color-swatch";
import type { ColorSwatchPickerItemRenderProps } from "./color-swatch-picker-item";
import {
  ColorSwatchPickerContext,
  ColorSwatchPickerItemContext,
} from "./color-swatch-picker-context";
import { colorSwatchPickerVariants } from "./color-swatch-picker.styles";

/** The indicator's children: nodes, or a render function of the item's state. */
export type ColorSwatchPickerIndicatorChildren =
  | JSX.Element
  | ((values: ColorSwatchPickerItemRenderProps) => JSX.Element);

/**
 * The props of `ColorSwatchPicker.Indicator`: HeroUI 3.2.7's
 * `ColorSwatchPickerIndicatorProps`, a `span` with an `aria-hidden` and either
 * fixed children or a render function of the item's render props.
 */
export interface ColorSwatchPickerIndicatorProps
  extends AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps {
  /** Read once, at the placement. Omitted, the default checkmark is drawn. */
  children?: ColorSwatchPickerIndicatorChildren;

  /** Appended after the `indicator` slot classes. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** The mark is decoration: hidden from the accessibility tree by default. */
  "aria-hidden"?: boolean;

  accessibilityElementsHidden?: boolean;

  accessibilityLabel?: string;

  /** Forwarded to the indicator `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;

  testID?: string;

  nativeID?: string;

  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

/**
 * Calculate relative luminance of a color
 * Uses the formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * Returns a value between 0 (black) and 1 (white)
 *
 * Moved verbatim from HeroUI 3.2.7's
 * `color-swatch-picker.tsx` (`getColorLuminance`).
 */
function getColorLuminance(color: Color): number {
  const r = color.getChannelValue("red");
  const g = color.getChannelValue("green");
  const b = color.getChannelValue("blue");

  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * ColorSwatchPickerIndicator: the selected mark, drawn over the swatch.
 *
 * R-019 (the slot) lives in the styles file. R-020 is the structural rewrite of
 * the default child: upstream draws a 12×12 `svg` polyline with `currentColor`
 * and a 1.5pt round stroke; NSH has no inline SVG and no checkmark in `icons`,
 * so the default is a `size-1/3`, `rotate-45` view whose `border-b` / `border-r`
 * draw the two strokes (1pt, no round caps; port sheet §8). R-021 / R-022 /
 * R-024 are that view's `scale-0` start, its 150ms transition and its
 * `scale-100` selected state. R-023 is the root's `text-white` / `text-black`:
 * without a color a border follows `currentColor`, so the whole subtree —
 * caller children included — takes the contrast color.
 */
export function ColorSwatchPickerIndicator(
  props: ColorSwatchPickerIndicatorProps,
): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "testID",
    "nativeID",
    "render",
    "slot",
    "aria-hidden",
    "accessibilityElementsHidden",
    "accessibilityLabel",
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

  /** R-023: a light background takes a black mark, a dark one a white mark. */
  const isLightColor = computed(() => {
    const color = item?.state.color();

    return color === undefined ? false : getColorLuminance(color) > 0.5;
  });

  const classes = computed(() =>
    joinClassNames(slots().indicator(), local.className),
  );

  const isSelected = () => item?.state.isSelected() ?? false;

  const content = () => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return (children as (values: ColorSwatchPickerItemRenderProps) => JSX.Element)(
        item?.state ?? NEUTRAL_RENDER_PROPS,
      );
    }

    if (children !== undefined && children !== null) {
      // R-020: the caller's node replaces the default but keeps the 1/3 box
      // and the inherited color, which upstream's `> *` rule gave it. Its own
      // size wins inside the box; whether it follows the selected state is its
      // own decision (R-024).
      return (
        <View class="flex size-1/3 items-center justify-center">
          {children as JSX.Element}
        </View>
      );
    }

    // R-020 / R-021 / R-022 / R-024: the default checkmark.
    return (
      <View
        class="size-1/3 rotate-45 border-b border-r transition-transform duration-150 ease-out motion-reduce:transition-none"
        classList={{
          "scale-0": !isSelected(),
          "scale-100": isSelected(),
        }}
      />
    );
  };

  return (
    <View
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.nativeID}
      // The selected state is already on the option; the mark is decoration.
      accessibilityElementsHidden={
        local.accessibilityElementsHidden ??
        (local["aria-hidden"] as boolean | undefined) ??
        true
      }
      accessibilityLabel={local.accessibilityLabel}
      importantForAccessibility="no-hide-descendants"
      class={classes()}
      classList={{
        "text-black": isLightColor(),
        "text-white": !isLightColor(),
      }}
      style={local.style}
    >
      {content()}
    </View>
  );
}

/**
 * The render props an Indicator outside an Item sees: every flag `false` and a
 * single toggle selection, the same neutral shape React Aria hands a copy.
 */
const NEUTRAL_RENDER_PROPS: ColorSwatchPickerItemRenderProps = {
  color: () => parseColor("#0000"),
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
