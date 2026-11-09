import { ProgressBarFill } from "./progress-bar-fill";
import type { ProgressBarFillProps } from "./progress-bar-fill";
import { ProgressBarOutput } from "./progress-bar-output";
import type { ProgressBarOutputProps } from "./progress-bar-output";
import { ProgressBarRoot } from "./progress-bar-root";
import type { ProgressBarRootProps } from "./progress-bar-root";
import { ProgressBarTrack } from "./progress-bar-track";
import type { ProgressBarTrackProps } from "./progress-bar-track";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ProgressBar` is the four-part compound of HeroUI 3.2.7: the root is the
 * whole component and also reachable as `ProgressBar.Root`; `Output`, `Track`
 * and `Fill` are real parts that read their slot and the value state from the
 * root's context and can be arranged freely inside it (and, like upstream,
 * rendered on their own with no slot classes).
 */
export const ProgressBar = Object.assign(ProgressBarRoot, {
  Root: ProgressBarRoot,
  Output: ProgressBarOutput,
  Track: ProgressBarTrack,
  Fill: ProgressBarFill,
});

export type ProgressBar = {
  Props: ProgressBarRootProps;
  RootProps: ProgressBarRootProps;
  OutputProps: ProgressBarOutputProps;
  TrackProps: ProgressBarTrackProps;
  FillProps: ProgressBarFillProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { ProgressBarRoot, ProgressBarOutput, ProgressBarTrack, ProgressBarFill };

export type {
  ProgressBarRootProps,
  ProgressBarRootProps as ProgressBarProps,
  ProgressBarOutputProps,
  ProgressBarTrackProps,
  ProgressBarFillProps,
};

export type { ProgressBarRenderProps } from "./context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { progressBarVariants } from "./progress-bar.styles";

export type { ProgressBarVariants } from "./progress-bar.styles";
