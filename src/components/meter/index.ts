import { MeterFill, type MeterFillProps } from "./meter-fill";
import { MeterOutput, type MeterOutputProps } from "./meter-output";
import { MeterRoot, type MeterRenderProps, type MeterRootProps } from "./meter-root";
import { MeterTrack, type MeterTrackProps } from "./meter-track";

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
