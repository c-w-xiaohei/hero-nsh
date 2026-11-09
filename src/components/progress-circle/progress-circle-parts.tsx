import {
  Canvas,
  computed,
  createAnimatedValue,
  Easing,
  effect,
  reduceMotion,
  split,
  View,
} from "nsh";
import type {
  AnimatedValue,
  CanvasRenderingContext2D,
  CanvasSize,
  JSX,
  ViewProps,
} from "nsh";

import { ProgressCircleContext } from "./context";
import { viewProps } from "./dom-props";
import type { AriaProps, DataProps, GlobalDomProps } from "./dom-props";
import {
  CIRCUMFERENCE,
  drawFillCircle,
  drawTrackCircle,
} from "./geometry";

/* -------------------------------------------------------------------------------------------------
 * Track
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ProgressCircle.Track`: HeroUI's `ProgressCircleTrackProps`,
 * which is React Aria's `DOMRenderProps<"svg">` plus `children` and
 * `className`, and, at the call site, any `<svg>` attribute.
 *
 * `<svg>`'s attributes (`viewBox`, `fill`, `width`, …) are accepted for API
 * parity and have no effect: the geometry lives in the canvases' drawing (port
 * sheet §3.1 and §8). NSH host props (`testID`, `style`, `ref`, …) still work.
 */
export interface ProgressCircleTrackProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The circles, in drawing order: track first, fill above it. */
  children?: JSX.Element;

  /** Appended after the slot class; a later class wins. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: the `<svg>` geometry is fixed in the canvases. */
  viewBox?: string;

  /** Accepted, no effect: the canvas fills nothing; it only strokes. */
  fill?: string;

  /** Accepted, no effect: the size comes from the `size` variant's track class. */
  width?: number | string;

  /** Accepted, no effect: the size comes from the `size` variant's track class. */
  height?: number | string;

  /** Accepted, no effect: the paints come from the root's `color` / tokens. */
  stroke?: string;

  /** Any other `<svg>` attribute, accepted and ignored. */
  [key: string]: unknown;
}

/**
 * `ProgressCircle.Track` / `ProgressCircleTrack`: the fixed-size box that holds
 * the two rings, and the part that turns while the value is indeterminate.
 *
 * Upstream's `<svg>` becomes a `View`: `relative` anchors the two absolutely
 * positioned canvases, and the indeterminate turn is NSH's built-in
 * `animate-spin` keyframe (R-009 / R-010), which is exactly the 1 s linear
 * infinite rotation HeroUI defines.
 */
export function ProgressCircleTrack(
  props: ProgressCircleTrackProps,
): JSX.Element {
  const circle = ProgressCircleContext();
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
  ] as const);

  const classes = computed(() =>
    [circle?.slots().track() ?? "", local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  return (
    <View
      {...viewProps(rest)}
      ref={(node) =>
        typeof local.ref === "function" ? local.ref(node) : undefined
      }
      nativeID={local.id ?? local.nativeID}
      // R-009 / R-010: `.progress-circle:not([aria-valuenow]) .progress-circle__track`
      // → `progress-circle-spin 1s linear infinite`, plus `motion-reduce:animate-none`.
      // NSH's `animate-spin` is the same 1 s linear infinite turn; the CSS
      // attribute selector becomes the state accessor.
      // R-012: upstream's `@keyframes progress-circle-spin` block is deleted —
      // `animate-spin` already carries that keyframe.
      classList={{
        "animate-spin motion-reduce:animate-none": circle?.isIndeterminate() ?? false,
      }}
      class={classes()}
      style={local.style}
    >
      {local.children}
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * TrackCircle
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ProgressCircle.TrackCircle`: HeroUI's
 * `ProgressCircleTrackCircleProps`, which is `DOMRenderProps<"circle">` plus
 * `children` and `className`, and, at the call site, any `<circle>` attribute.
 *
 * `<circle>`'s attributes (`cx`, `cy`, `r`, `strokeWidth`, `stroke`, …) are
 * accepted and have no effect: R-005's paint and the geometry are drawing
 * calls (port sheet §3.1 and §8).
 */
export interface ProgressCircleTrackCircleProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** Accepted, no effect: an SVG `<circle>` cannot render children. */
  children?: JSX.Element;

  /** Appended after the slot class; a later class wins. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: the center is fixed at 18 in the 36-unit space. */
  cx?: number | string;

  /** Accepted, no effect: the center is fixed at 18 in the 36-unit space. */
  cy?: number | string;

  /** Accepted, no effect: the radius is fixed at 16 in the 36-unit space. */
  r?: number | string;

  /** Accepted, no effect: the stroke width is fixed at 4 in the 36-unit space. */
  strokeWidth?: number | string;

  /** Accepted, no effect: the track paint is always the `default` token. */
  stroke?: string;

  /** Any other `<circle>` attribute, accepted and ignored. */
  [key: string]: unknown;
}

/**
 * `ProgressCircle.TrackCircle` / `ProgressCircleTrackCircle`: the full ring
 * behind the value arc. A real part with its own `Canvas`, reading its paint
 * from the root's context (R-005); not a registration of parameters into a
 * parent canvas (research D15 / 4.3.1).
 */
export function ProgressCircleTrackCircle(
  props: ProgressCircleTrackCircleProps,
): JSX.Element {
  const circle = ProgressCircleContext();
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
  ] as const);

  // Outside a root the custom property upstream would be unset, so nothing
  // is painted; `transparent` strokes draw nothing visible.
  const paint = () => circle?.trackStroke() ?? "transparent";

  const classes = computed(() =>
    [circle?.slots().trackCircle() ?? "", local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  return (
    <Canvas
      {...viewProps(rest)}
      ref={(node) =>
        typeof local.ref === "function" ? local.ref(node) : undefined
      }
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
      draw={(cx, size) => drawTrackCircle(cx, size, paint())}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * FillCircle
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ProgressCircle.FillCircle`: HeroUI's
 * `ProgressCircleFillCircleProps`, which is `DOMRenderProps<"circle">` plus
 * `children` and `className`, and, at the call site, any `<circle>` attribute.
 *
 * `strokeDasharray` / `strokeDashoffset` / `strokeLinecap` are the sharpest API
 * gap of this unit: upstream lets a caller draw a custom arc through them,
 * while the port derives the dash from `percentage` and fixes the caps
 * (port sheet §8).
 */
export interface ProgressCircleFillCircleProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** Accepted, no effect: an SVG `<circle>` cannot render children. */
  children?: JSX.Element;

  /** Appended after the slot class; a later class wins. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: derived from the value. */
  strokeDasharray?: number | string;

  /** Accepted, no effect: derived from the value, and animated (R-007 / R-008). */
  strokeDashoffset?: number | string;

  /** Accepted, no effect: the fill arc always uses round caps, as upstream. */
  strokeLinecap?: string;

  /** Any other `<circle>` attribute, accepted and ignored. */
  [key: string]: unknown;
}

/** `cubic-bezier(0, 0, 0.2, 1)`, Tailwind's `--ease-out` (port sheet §2). */
const EASE_OUT = Easing.bezier(0, 0, 0.2, 1);

/** R-007's transition length. */
const TRANSITION_MS = 300;

/**
 * `ProgressCircle.FillCircle` / `ProgressCircleFillCircle`: the value arc.
 *
 * The dash phase is an `AnimatedValue` owned by this instance. R-007 replaces
 * CSS's `transition: stroke-dashoffset 300ms var(--ease-out)` — a Canvas does
 * not take CSS transitions — with a native `timing` on the same phase, and
 * R-008 sets the phase directly under reduce-motion, exactly as
 * `motion-reduce:transition-none` does. The first frame lands on the target, so
 * mounting does not sweep in from zero, matching a CSS transition that has
 * nothing to animate yet.
 */
export function ProgressCircleFillCircle(
  props: ProgressCircleFillCircleProps,
): JSX.Element {
  const circle = ProgressCircleContext();
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
  ] as const);

  // R-006: the fill paint, from the root's `color` → token lookup.
  const paint = () => circle?.stroke() ?? "transparent";

  // The dash phase target: `C - pct/100 · C` for a value, `0.75 · C` while
  // indeterminate (upstream's fixed quarter arc). This is the one value
  // R-007's transition animates.
  const targetOffset = () => {
    if (circle?.isIndeterminate() ?? false) {
      return CIRCUMFERENCE * 0.75;
    }

    const percentage = circle?.percentage() ?? 0;

    return CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;
  };

  // Created with the first target: no entry animation.
  const offset: AnimatedValue = createAnimatedValue(targetOffset());
  let mounted = false;

  // R-007 / R-008: the 300 ms dash-phase transition, skipped entirely when the
  // user asks for less motion. `effect` re-runs when the value or the
  // reduce-motion preference changes; a new `timing` replaces the running
  // animation on the same value, so a retarget starts from wherever the old
  // one got to, as retargeting a CSS transition does. No cleanup stops it:
  // the value belongs to this instance, and the host cancels its animations
  // with the view; stopping in a teardown only races the app closing.
  effect(() => {
    const target = targetOffset();
    const reduce = reduceMotion();

    if (!mounted) {
      mounted = true;
      offset.set(target);

      return;
    }

    if (reduce) {
      offset.set(target);

      return;
    }

    void offset
      .timing(target, {
        duration: TRANSITION_MS,
        easing: EASE_OUT,
      })
      // A retarget or the app closing cancels the previous animation; its
      // promise then rejects, which is expected and has no listener to report
      // to (the new value is already set by the next run).
      .catch(() => undefined);

  });

  const classes = computed(() =>
    [circle?.slots().fillCircle() ?? "", local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  return (
    <Canvas
      {...viewProps(rest)}
      ref={(node) =>
        typeof local.ref === "function" ? local.ref(node) : undefined
      }
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
      draw={(cx: CanvasRenderingContext2D, size: CanvasSize) =>
        drawFillCircle(cx, size, paint(), offset)
      }
    />
  );
}
