import {
  DateInputGroupInput,
  type DateInputGroupInputProps,
  type DateInputGroupInputRenderProps,
} from "./date-input-group-input";
import {
  DateInputGroupInputContainer,
  type DateInputGroupInputContainerProps,
} from "./date-input-group-input-container";
import { DateInputGroupPrefix, type DateInputGroupPrefixProps } from "./date-input-group-prefix";
import {
  DateInputGroupRoot,
  type DateInputGroupHoverEvent,
  type DateInputGroupRenderProps,
  type DateInputGroupRootProps,
} from "./date-input-group-root";
import {
  DateInputGroupSegment,
  type DateInputGroupSegmentProps,
  type DateInputGroupSegmentRenderProps,
} from "./date-input-group-segment";
import { DateInputGroupSuffix, type DateInputGroupSuffixProps } from "./date-input-group-suffix";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/

/**
 * `DateInputGroup` — HeroUI's compound export for the group around a date or
 * time field's segments and affixes. `DateInputGroup.Root === DateInputGroup`,
 * as upstream.
 */
export const DateInputGroup = Object.assign(DateInputGroupRoot, {
  Root: DateInputGroupRoot,
  Input: DateInputGroupInput,
  InputContainer: DateInputGroupInputContainer,
  Segment: DateInputGroupSegment,
  Prefix: DateInputGroupPrefix,
  Suffix: DateInputGroupSuffix,
});

export type DateInputGroup = {
  Props: DateInputGroupRootProps;
  RootProps: DateInputGroupRootProps;
  InputProps: DateInputGroupInputProps;
  InputContainerProps: DateInputGroupInputContainerProps;
  SegmentProps: DateInputGroupSegmentProps;
  PrefixProps: DateInputGroupPrefixProps;
  SuffixProps: DateInputGroupSuffixProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/

export {
  DateInputGroupInput,
  DateInputGroupInputContainer,
  DateInputGroupPrefix,
  DateInputGroupRoot,
  DateInputGroupSegment,
  DateInputGroupSuffix,
};

export type {
  DateInputGroupRootProps,
  DateInputGroupRootProps as DateInputGroupProps,
  DateInputGroupInputProps,
  DateInputGroupInputContainerProps,
  DateInputGroupSegmentProps,
  DateInputGroupPrefixProps,
  DateInputGroupSuffixProps,
  DateInputGroupRenderProps,
  DateInputGroupInputRenderProps,
  DateInputGroupSegmentRenderProps,
  DateInputGroupHoverEvent,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/

export { dateInputGroupVariants } from "./date-input-group.styles";

export type {
  DateInputGroupVariants,
  DateInputGroupVariant,
} from "./date-input-group.styles";

/* -------------------------------------------------------------------------------------------------
 * Field state primitive and its types
 * -----------------------------------------------------------------------------------------------*/

export { createDateFieldState } from "./create-date-field-state";

export type {
  CreateDateFieldStateProps,
  DateFieldState,
  DateFieldValidationError,
} from "./create-date-field-state";

export type {
  DateSegment,
  DateSegmentType,
  FormatterOptions,
  Granularity,
  MaxGranularity,
} from "./date-field-utils";
