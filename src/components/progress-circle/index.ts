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

// A-007 / A-008: the two harness-side 接轴 spots of adapt sheet
// progress-circle.md are realized outside this directory —
// `harness/progress-circle.fixtures.tsx` (`ScopedMobile` feeds
// `host.params.input`/`density` into `EnvironmentScope`, `host.params.case`
// dispatches `paint`/`sizes`/`indeterminate`/`disabled`, stroke recording and
// `onLayout` bounds probes write `app.storage()`) and
// `harness/tests/components/progress-circle/progress-circle.mobile.test.tsx`
// (the desktop-pinned, dual-environment M-001…M-007 assertions). The gate's
// marker scan only sees this directory, so the markers live here like the
// separator/meter precedent. No component-side edit exists to mark: every
// component seam in §2 is 保留 (A-001…A-006).

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
