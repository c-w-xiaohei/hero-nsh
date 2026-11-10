import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { joinClassNames } from "./class-names";
import { SliderContext } from "./slider-context";
import {
  hostProps,
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
} from "./slider-dom-props";
import { getIndicatorState, getIndicatorStyle } from "./slider-indicator";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Slider Mark
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Slider.Mark`: HeroUI 3.2.7's `SliderMarkProps`, which is a
 * `div` (or another intrinsic element through the `E` generic) with children,
 * `className`, `style` and the value to label.
 */
export interface SliderMarkProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The value the label sits at. Out-of-range and non-finite values do not render. */
  value: number;

  /** The label; the formatted value when omitted, wrapped in `Text`. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Style of the label; the position is written after it, as upstream. */
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
 * Slider.Mark / SliderMark: one value label under (or beside) the track.
 *
 * R-018: every mark sits in the container's one cell (`grid-area: 1 / 1`) and
 * is then offset by its percentage, so a caller's order never shifts the
 * labels along the track.
 *
 * R-022: `[data-filled="true"]` → `text-foreground`; the base colour is
 * `text-muted`.
 *
 * The label is a `Text`: the mark's host is a `View`, which draws no bare
 * string (the WithMarks story passes `25` directly).
 */
export function SliderMark(props: SliderMarkProps): JSX.Element {
  const [local, rest] = split(props, [
    "key",
    "children",
    "className",
    "style",
    "value",
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

  // Read once, in the body: the slider this mark belongs to, if any.
  const slider = SliderContext();

  const isVertical = () => slider?.orientation() === "vertical";

  // React Aria renders a mark only for a finite value inside the thumbs'
  // bounds; it is never snapped to the step grid.
  const isVisible = computed(() => {
    const state = slider?.state;

    if (!state) {
      return false;
    }

    const value = local.value;
    const values = state.values();

    return (
      Number.isFinite(value) &&
      value >= state.getThumbMinValue(0) &&
      value <= state.getThumbMaxValue(values.length - 1)
    );
  });

  const indicator = computed(() => {
    const state = slider?.state;

    return state
      ? getIndicatorState(state, local.value)
      : { percent: 0, filled: false };
  });

  // R-041: the horizontal `.slider__mark` → `@apply -translate-x-1/2`.
  // R-060: the vertical `.slider__mark` → `@apply translate-y-1/2`.
  // R-061: the vertical `.slider__mark` → `align-self: end`.
  // R-042: in an RTL horizontal slider `-translate-x-1/2` becomes
  // `translate-x-1/2`.
  const classes = computed(() =>
    joinClassNames(
      slider?.slots().mark(),
      // R-018: `grid-area: 1 / 1` — all marks share the container's one cell.
      "row-start-1 col-start-1",
      isVertical()
        ? "translate-y-1/2 self-end"
        : slider?.isRtl()
          ? "translate-x-1/2"
          : "-translate-x-1/2",
      local.className,
    ),
  );

  // R-017's `text-muted` is the base; R-022 swaps it for `text-foreground`
  // once the value is inside the selected range.
  const classList = computed(() => ({
    "text-foreground": indicator().filled,
  }));

  return (
    <If when={isVisible()}>
      <View
        {...hostProps(rest)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        class={classes()}
        classList={classList()}
        // R-075: the caller's style first, the position after it.
        style={[
          local.style,
          getIndicatorStyle(indicator().percent, isVertical(), slider?.isRtl() ?? false),
        ]}
      >
        {local.children === undefined || local.children === null ? (
          <Text>{slider?.state.getFormattedValue(local.value) ?? ""}</Text>
        ) : (
          renderChildren(local.children)
        )}
      </View>
    </If>
  );
}
