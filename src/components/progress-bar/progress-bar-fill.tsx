import {
  computed,
  createAnimatedValue,
  effect,
  LayoutAnimation,
  reduceMotion,
  signal,
  split,
  View,
} from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { joinClassNames } from "./class-names";
import { ProgressBarContext } from "./context";
import {
  hostProps,
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
} from "./progress-bar-dom-props";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * ProgressBar Fill
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ProgressBar.Fill`: HeroUI 3.2.7's `ProgressBarFillProps`, which
 * is a `div` (or another intrinsic element through the `E` generic) with
 * `children`, `className` and `style`.
 *
 * `style` is applied first and the width after it, as upstream does: a
 * caller's `style.width` is overridden by the bar's own percentage.
 */
export interface ProgressBarFillProps
  extends Omit<ViewProps, "children" | "class" | "style">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** Rendered as upstream's `div` renders it; normally the fill is empty. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Style of the fill; the bar owns `width` and `translate` and writes them after this. */
  style?: ViewProps["style"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the `View` host as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/** The share of the track the fill occupies while indeterminate (`w-2/5`). */
const INDETERMINATE_WIDTH = 40;

/**
 * ProgressBar.Fill / ProgressBarFill: the painted part of the track.
 *
 * Two motions meet here, and both are inline style because width and translate
 * are the only properties that change (port sheet section 4, R-014 … R-018):
 *
 * - the width follows `percentage`, or 40% while indeterminate. HeroUI
 *   transitions it with CSS; NSH does not transition layout properties, so a
 *   `LayoutAnimation` wraps the width write. The first commit does not animate,
 *   and reduced motion writes the value directly.
 * - while indeterminate the fill sweeps from `-100%` to `350%` of its own
 *   width. The CSS keyframes work in percentages of the element; a native
 *   animation works in points, so the trip is computed from the track's
 *   measured width and restarted when that width changes. Until it is known,
 *   and under reduced motion, the fill stays on the first frame.
 */
export function ProgressBarFill(props: ProgressBarFillProps): JSX.Element {
  const [local, rest] = split(props, [
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

  // Read once, in the body: the bar this fill belongs to, if any. Outside a
  // root there is no value, so the fill is empty rather than missing.
  const bar = ProgressBarContext();

  const percentage = () => bar?.state.percentage() ?? 0;
  const isIndeterminate = () => bar?.state.isIndeterminate() ?? false;
  const trackWidth = () => bar?.trackWidth() ?? 0;

  // R-012 … R-013 and the size / color variants in `progress-bar.styles.ts`,
  // then the caller's `className`.
  const classes = computed(() =>
    joinClassNames(bar?.slots().fill(), local.className),
  );

  // R-016: while indeterminate the target is `w-2/5`, i.e. 40%; otherwise the
  // percentage. Both go into the same width signal so the transition, when it
  // runs, covers the switch between the two states too.
  const targetWidth = () => (isIndeterminate() ? INDETERMINATE_WIDTH : percentage());

  // The width the next commit paints. It starts at the current target so the
  // first frame is already correct.
  const fillWidth = signal(targetWidth());

  let firstFrame = true;

  effect(() => {
    const next = targetWidth();

    if (firstFrame) {
      firstFrame = false;
      fillWidth.set(next);

      return;
    }

    // R-014: `transition: width 300ms var(--ease-out)` → a layout animation
    // around the width write.
    // R-015: `motion-reduce:transition-none` → the reduced-motion check
    // instead of the class, because the width lives in an inline style.
    if (!reduceMotion()) {
      LayoutAnimation.configureNext({ duration: 300, update: { type: "easeOut" } });
    }

    fillWidth.set(next);
  });

  // R-017: `animation: progress-bar-indeterminate 1.5s
  // cubic-bezier(0.65, 0, 0.35, 1) infinite`, the CSS keyframes `-100% → 350%`
  // of the fill's own width (`fillW = 0.4 × track width`), in points.
  // R-018: `motion-reduce:animate-none` → no animation under reduced motion;
  // like the class, the fill then sits on its first frame at `translate: 0`.
  const translate = createAnimatedValue(0);

  effect(() => {
    const indeterminate = isIndeterminate();
    const measured = trackWidth();

    if (!indeterminate || measured <= 0 || reduceMotion()) {
      translate.set(0);

      return;
    }

    const fillW = (measured * INDETERMINATE_WIDTH) / 100;

    translate.set(-fillW);
    void translate.keyframes([-fillW, 3.5 * fillW], {
      duration: 1500,
      easing: [0.65, 0, 0.35, 1],
      iterations: "infinite",
    });

    return () => {
      void translate.stop();
    };
  });

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      // The caller's style first, the bar's width and translate after it:
      // upstream writes `{...style, width}` in that order, so the bar owns
      // both properties.
      style={[local.style, { width: `${fillWidth()}%`, translate: [translate, 0] }]}
    >
      {renderChildren(local.children)}
    </View>
  );
}
