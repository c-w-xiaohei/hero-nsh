import { computed, split, View } from "nsh";
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

/* -------------------------------------------------------------------------------------------------
 * Slider Steps
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Slider.Steps`: HeroUI 3.2.7's `SliderStepsProps`, which is a
 * `div` (or another intrinsic element through the `E` generic) with
 * `className`. It renders no children of its own.
 */
export interface SliderStepsProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** Appended after the slot classes; later classes win. */
  className?: string;

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

/** HeroUI's `getDecimalPlaces` (`slider.tsx`), for the step grid's precision. */
function getDecimalPlaces(value: number): number {
  const [coefficient, exponent = "0"] = value.toString().split("e");

  return Math.max(0, (coefficient!.split(".")[1]?.length ?? 0) - Number(exponent));
}

/**
 * Slider.Steps / SliderSteps: one decorative dot per step of the range.
 *
 * R-078: the dots are decoration, so the whole subtree is hidden from
 * assistive technologies (`aria-hidden` upstream, NSH's two hiding props).
 * The dots take no pointer events, which keeps every press on the track.
 *
 * The range is refused as a whole when it cannot produce a sane grid: a
 * non-finite or inverted range, a non-positive or non-finite step, or more
 * than a thousand dots (port sheet section 2 and R-100).
 */
export function SliderSteps(props: SliderStepsProps): JSX.Element {
  const [local, rest] = split(props, [
    "key",
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

  // Read once, in the body: the slider these dots belong to, if any.
  const slider = SliderContext();

  if (!slider) {
    return null;
  }

  const isVertical = () => slider.orientation() === "vertical";

  // R-011 in `slider.styles.ts`, then the caller's `className`.
  const classes = computed(() => joinClassNames(slider.slots().steps(), local.className));

  // The step values, or `undefined` when the grid is refused (the guard list
  // is upstream's, in its order — `step = Infinity` stops at "not finite",
  // not at "<= 0").
  const stepValues = computed<number[] | undefined>(() => {
    const state = slider.state;
    const minValue = state.getThumbMinValue(0);
    const maxValue = state.getThumbMaxValue(state.values().length - 1);
    const step = state.step();
    const stepCount = (maxValue - minValue) / step;
    // Account for decimal division such as (0.3 - 0) / 0.1 without adding an
    // off-step endpoint.
    const count = Math.floor(stepCount + Number.EPSILON * Math.max(1, stepCount) * 4) + 1;

    if (
      !Number.isFinite(minValue) ||
      !Number.isFinite(maxValue) ||
      maxValue < minValue ||
      !Number.isFinite(step) ||
      step <= 0 ||
      !Number.isFinite(count) ||
      count <= 0 ||
      count > 1000
    ) {
      return undefined;
    }

    const precision = Math.max(getDecimalPlaces(minValue), getDecimalPlaces(step));

    return Array.from({ length: count }, (_, index) => {
      // Avoid cumulative floating-point drift in decimal steps.
      const raw = minValue + index * step;

      return Math.min(maxValue, precision <= 100 ? Number(raw.toFixed(precision)) : raw);
    });
  });

  // R-039: the horizontal dot → `@apply top-1/2 -translate-x-1/2
  // -translate-y-1/2`.
  // R-057: the vertical dot → `@apply left-1/2 -translate-x-1/2
  // translate-y-1/2`.
  // R-042: in an RTL horizontal slider `-translate-x-1/2` becomes
  // `translate-x-1/2`.
  const positionClasses = () => {
    if (isVertical()) {
      return "left-1/2 -translate-x-1/2 translate-y-1/2";
    }

    return joinClassNames(
      "top-1/2 -translate-y-1/2",
      slider.isRtl() ? "translate-x-1/2" : "-translate-x-1/2",
    );
  };

  return (
    <If when={stepValues()}>
      {(values) => (
        <View
          {...hostProps(rest)}
          ref={(node) => local.ref?.(node)}
          nativeID={local.id ?? local.nativeID}
          class={classes()}
          style={local.style}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Each of={values()}>
            {(value) => {
              const indicator = getIndicatorState(slider.state, value());

              return (
                <View
                  class={joinClassNames(slider.slots().step(), positionClasses())}
                  classList={{
                    // R-013: `[data-filled="true"]` → `bg-accent-foreground/25`
                    // over the base `bg-muted/25`.
                    "bg-accent-foreground/25": indicator.filled,
                  }}
                  style={getIndicatorStyle(indicator.percent, isVertical(), slider.isRtl())}
                />
              );
            }}
          </Each>
        </View>
      )}
    </If>
  );
}
