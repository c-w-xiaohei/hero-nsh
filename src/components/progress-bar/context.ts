import { context } from "nsh";
import type { Accessor } from "nsh";

import type { progressBarVariants } from "./progress-bar.styles";

/**
 * The render prop values of `ProgressBarRoot` (HeroUI 3.2.7's
 * `ProgressBarRenderProps`), as accessors per D17. They are also the parts'
 * state: upstream hands the same object to `children` and to
 * `ProgressBarContext`.
 */
export interface ProgressBarRenderProps {
  /** The value as a percentage of the range; `undefined` when indeterminate. */
  percentage: Accessor<number | undefined>;

  /** The formatted value, or the caller's `valueLabel`; `undefined` when indeterminate. */
  valueText: Accessor<string | undefined>;

  /** Whether the bar shows motion instead of a value. */
  isIndeterminate: Accessor<boolean>;
}

/**
 * What the root hands to `Output`, `Track` and `Fill`: the slot table it
 * resolved from `color` and `size`, the derived state, and the one piece of
 * cross-part state NSH needs. Exactly HeroUI's context plus `trackWidth` /
 * `setTrackWidth` (port sheet section 2): the indeterminate animation is
 * measured in points, so the Track reports its laid-out width.
 *
 * Not exported from the package entry: HeroUI does not export its context
 * either.
 */
export interface ProgressBarContextValue {
  slots: Accessor<ReturnType<typeof progressBarVariants>>;
  state: ProgressBarRenderProps;
  trackWidth: Accessor<number>;
  setTrackWidth: (width: number) => void;
}

export const ProgressBarContext = context<
  ProgressBarContextValue | undefined
>(undefined);
