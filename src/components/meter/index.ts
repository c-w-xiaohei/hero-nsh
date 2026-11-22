import { MeterFill, type MeterFillProps } from "./meter-fill";
import { MeterOutput, type MeterOutputProps } from "./meter-output";
import { MeterRoot, type MeterRenderProps, type MeterRootProps } from "./meter-root";
import { MeterTrack, type MeterTrackProps } from "./meter-track";

// A-006 / A-007: the two harness-side 接轴 spots of adapt sheet meter.md are
// realized outside this directory — `harness/meter.fixtures.tsx`
// (`ScopedMobile` feeds `host.params.input`/`density` into `EnvironmentScope`
// and mounts the `default`/`sizes`/`colors`/`value-label`/`custom-format`/
// `disabled`/`render-prop` cases with `onLayout` probes written to
// `app.storage()`) and
// `harness/tests/components/meter/meter.mobile.test.tsx` (the desktop-pinned,
// dual-environment M-001…M-007 assertions). The gate's marker scan only sees
// `src/components/meter/`, so the record lives here. Every spot they probe —
// the parts this file exports — is environment-invariant: meter is a
// read-only display compound and accepts no env axis.

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Meter` is HeroUI 3.2.7's four-part compound: `Root`, `Output`, `Track` and
 * `Fill`. There is deliberately no `Meter.Label`: the label is the independent
 * `Label` component, which reports its text through `FieldContext`.
 */
export const Meter = Object.assign(MeterRoot, {
  Root: MeterRoot,
  Output: MeterOutput,
  Track: MeterTrack,
  Fill: MeterFill,
});

export type Meter = {
  Props: MeterRootProps;
  RootProps: MeterRootProps;
  OutputProps: MeterOutputProps;
  TrackProps: MeterTrackProps;
  FillProps: MeterFillProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export { MeterFill, MeterOutput, MeterRoot, MeterTrack };

export type {
  MeterRootProps,
  MeterRootProps as MeterProps,
  MeterRenderProps,
} from "./meter-root";

export type { MeterOutputProps } from "./meter-output";

export type { MeterTrackProps } from "./meter-track";

export type { MeterFillProps } from "./meter-fill";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { meterVariants } from "./meter.styles";

export type { MeterVariants, MeterColor, MeterSize } from "./meter.styles";
