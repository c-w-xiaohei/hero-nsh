import { context } from "nsh";
import type { Accessor } from "nsh";

import type { progressCircleVariants } from "./progress-circle.styles";

/**
 * What the progress circle root hands its parts. HeroUI passes the `tv()`
 * slots and RAC's `ProgressBarRenderProps` through a React context; the two
 * paints are not in that context upstream because CSS custom properties carry
 * them down the DOM. NSH has neither, so they travel here:
 * `--progress-circle-stroke` and `--progress-circle-track-stroke` become the
 * `stroke()` / `trackStroke()` accessors (port sheet R-002, R-003, R-016 …
 * R-020).
 *
 * Every part of the circle reads this context; none of them is a
 * register-only configuration part (research D15 / 4.3.1).
 */
export interface ProgressCircleContextValue {
  /** The `tv()` slot functions for the root's current variant selection. */
  slots: Accessor<ReturnType<typeof progressCircleVariants>>;

  /** `0..100`; `undefined` while indeterminate, as RAC's render props give it. */
  percentage: Accessor<number | undefined>;

  /** The formatted (or caller-supplied) value text. */
  valueText: Accessor<string | undefined>;

  /** `true` when there is no known value: the fill arc is a fixed quarter. */
  isIndeterminate: Accessor<boolean>;

  /** The fill paint: the `color` variant's token. */
  stroke: Accessor<string>;

  /** The track paint: always `--default`, never the `color` variant. */
  trackStroke: Accessor<string>;
}

/**
 * Rendered outside a root, a part falls back to no slot classes and no paint,
 * which is what upstream's unset custom properties give it.
 */
export const ProgressCircleContext = context<ProgressCircleContextValue | undefined>(
  undefined,
);
