import { computed, split, View } from "nsh";
import type { JSX, ViewProps, ViewRef, ViewStyle } from "nsh";

import { joinClassNames } from "./class-names";
import { SliderContext } from "./slider-context";
import {
  hostProps,
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
} from "./slider-dom-props";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Slider Fill
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Slider.Fill`: HeroUI 3.2.7's `SliderFillProps`, which is a
 * `div` (or another intrinsic element through the `E` generic) with
 * `children`, `className` and `style`.
 *
 * `style` is applied first and the position after it, as upstream does: a
 * caller's `style.left` is overridden by the fill's own percentage.
 */
export interface SliderFillProps
  extends Omit<ViewProps, "children" | "class" | "style">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** Rendered as upstream's `div` renders it; normally the fill is empty. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Style of the fill; the slider owns its offset and size. */
  style?: ViewProps["style"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** React's list identity; never reaches the host. */
  key?: string | number;

  /** Forwarded to the `View` host as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * Slider.Fill / SliderFill: the painted part of the track, from the range
 * start to the last thumb.
 *
 * R-073: the offset and the size are inline percentages — horizontal
 * `left` / `right` plus `width`, vertical `bottom` plus `height` — because the
 * numbers come from `state` and no class can carry them. The physical edge
 * follows the locale direction, exactly as React Aria's thumb positioning
 * does (port sheet section 4).
 */
export function SliderFill(props: SliderFillProps): JSX.Element {
  const [local, rest] = split(props, [
    "key",
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "slot",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // Read once, in the body: the slider this fill belongs to, if any. Outside a
  // root there is no range, so the fill stays empty.
  const slider = SliderContext();

  // R-047 / R-069: horizontal `.slider__fill` → `@apply h-full`; vertical →
  // `@apply w-full`. The class strings live here because orientation is not a
  // variant dimension.
  const classes = computed(() =>
    joinClassNames(
      slider?.slots().fill(),
      slider?.orientation() === "vertical" ? "w-full" : "h-full",
      local.className,
    ),
  );

  // `start = 多值 ? getThumbPercent(0) : 0`, `end = getThumbPercent(last)`,
  // both sorted; the width is their difference.
  const range = computed(() => {
    const state = slider?.state;

    if (!state) {
      return { start: 0, end: 0 };
    }

    const values = state.values();
    const startPercent = values.length > 1 ? state.getThumbPercent(0) : 0;
    const endPercent = state.getThumbPercent(values.length - 1) ?? 0;

    return startPercent <= endPercent
      ? { start: startPercent, end: endPercent }
      : { start: endPercent, end: startPercent };
  });

  // R-073: the physical edge is `left` in LTR and `right` in RTL; vertical
  // fills grow from the bottom.
  const positionStyle = computed<ViewStyle>(() => {
    const isVertical = slider?.orientation() === "vertical";
    const { start, end } = range();
    const offset: `${number}%` = `${start * 100}%`;
    const size: `${number}%` = `${(end - start) * 100}%`;

    if (isVertical) {
      return { bottom: offset, height: size };
    }

    return slider?.isRtl()
      ? { right: offset, width: size }
      : { left: offset, width: size };
  });

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      // The caller's style first, the slider's position after it.
      style={[local.style, positionStyle()]}
    >
      {renderChildren(local.children)}
    </View>
  );
}
