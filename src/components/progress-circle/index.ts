import {
  ProgressCircleFillCircle,
  ProgressCircleTrack,
  ProgressCircleTrackCircle,
} from "./progress-circle-parts";
import type {
  ProgressCircleFillCircleProps,
  ProgressCircleTrackCircleProps,
  ProgressCircleTrackProps,
} from "./progress-circle-parts";
import { ProgressCircleRoot } from "./progress-circle-root";
import type {
  ProgressCircleRenderProps,
  ProgressCircleRootProps,
} from "./progress-circle-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ProgressCircle` is composed of four real parts, exactly as HeroUI 3.2.7
 * exports them; each part renders its own view.
 */
export const ProgressCircle = Object.assign(ProgressCircleRoot, {
  Root: ProgressCircleRoot,
  Track: ProgressCircleTrack,
  TrackCircle: ProgressCircleTrackCircle,
  FillCircle: ProgressCircleFillCircle,
});

export type ProgressCircle = {
  Props: ProgressCircleRootProps;
  RootProps: ProgressCircleRootProps;
  TrackProps: ProgressCircleTrackProps;
  TrackCircleProps: ProgressCircleTrackCircleProps;
  FillCircleProps: ProgressCircleFillCircleProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export {
  ProgressCircleRoot,
  ProgressCircleTrack,
  ProgressCircleTrackCircle,
  ProgressCircleFillCircle,
};

export type {
  ProgressCircleRootProps,
  ProgressCircleRootProps as ProgressCircleProps,
  ProgressCircleRenderProps,
  ProgressCircleTrackProps,
  ProgressCircleTrackCircleProps,
  ProgressCircleFillCircleProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { progressCircleVariants } from "./progress-circle.styles";

export type { ProgressCircleVariants } from "./progress-circle.styles";
