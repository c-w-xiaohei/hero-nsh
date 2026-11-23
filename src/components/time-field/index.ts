import {
  DateInputGroupInput,
  type DateInputGroupInputContainerProps,
  DateInputGroupInputContainer,
  type DateInputGroupInputProps,
  DateInputGroupPrefix,
  type DateInputGroupPrefixProps,
  DateInputGroupRoot,
  type DateInputGroupRootProps,
  DateInputGroupSegment,
  type DateInputGroupSegmentProps,
  DateInputGroupSuffix,
  type DateInputGroupSuffixProps,
} from "../date-input-group";
import { TimeFieldRoot } from "./time-field-root";
import type { TimeFieldRenderProps, TimeFieldRootProps } from "./time-field-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `TimeField` is HeroUI 3.2.7's time input: a root that bridges the public
 * `TimeValue` to the field state, and the six `date-input-group` parts bound by
 * identity, exactly as upstream's `index.ts:17-25` does. Every part is a real
 * component, usable as `TimeField.Group` and as `DateInputGroupRoot`.
 *
 * A-002: `TimeField.Segment` is `DateInputGroupSegment` by identity — the
 * soft-keyboard channel mount, `keyboardType` resolution and the `input`
 * variant axis (`min-h-11`) all arrive through that part; this unit copies no
 * axis and adds no style axis of its own.
 *
 * A-007: the harness-side 接轴 spot of adapt sheet time-field.md is realized
 * in `harness/time-field.fixtures.tsx` — the `Scoped` wrapper (host.params
 * `scope:"touch"` → `EnvironmentScope input="touch"`) around every case plus
 * the `readonly` and `keyboard-type` cases with their probes.
 */
export const TimeField = Object.assign(TimeFieldRoot, {
  Root: TimeFieldRoot,
  Group: DateInputGroupRoot,
  Input: DateInputGroupInput,
  InputContainer: DateInputGroupInputContainer,
  Segment: DateInputGroupSegment,
  Prefix: DateInputGroupPrefix,
  Suffix: DateInputGroupSuffix,
});

export type TimeField = {
  Props: TimeFieldRootProps;
  RootProps: TimeFieldRootProps;
  GroupProps: DateInputGroupRootProps;
  InputProps: DateInputGroupInputProps;
  InputContainerProps: DateInputGroupInputContainerProps;
  SegmentProps: DateInputGroupSegmentProps;
  PrefixProps: DateInputGroupPrefixProps;
  SuffixProps: DateInputGroupSuffixProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { TimeFieldRoot };

export type { TimeFieldRootProps, TimeFieldRootProps as TimeFieldProps };

/* -------------------------------------------------------------------------------------------------
 * Render props and field state
 * -----------------------------------------------------------------------------------------------*/
// `TimeValue` itself is deliberately not exported here: HeroUI gets it from
// `react-aria-components/TimeField` and does not re-export it (port sheet §1.1).
export type { TimeFieldRenderProps };
export type {
  CreateTimeFieldStateProps,
  TimeFieldGranularity,
  TimeFieldState,
} from "./create-time-field-state";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { timeFieldVariants } from "./time-field.styles";

export type { TimeFieldVariants } from "./time-field.styles";
