import { SliderFill } from "./slider-fill";
import type { SliderFillProps } from "./slider-fill";
import { SliderMark } from "./slider-mark";
import type { SliderMarkProps } from "./slider-mark";
import { SliderMarks } from "./slider-marks";
import type { SliderMarksProps } from "./slider-marks";
import { SliderOutput } from "./slider-output";
import type { SliderOutputProps } from "./slider-output";
import { SliderRoot } from "./slider-root";
import type { SliderRootProps } from "./slider-root";
import { SliderSteps } from "./slider-steps";
import type { SliderStepsProps } from "./slider-steps";
import { SliderThumb } from "./slider-thumb";
import type { SliderThumbProps } from "./slider-thumb";
import { SliderTrack } from "./slider-track";
import type { SliderTrackProps } from "./slider-track";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Slider` is the eight-part compound of HeroUI 3.2.7: the root is the whole
 * component and also reachable as `Slider.Root`; `Output`, `Track`, `Fill`,
 * `Thumb`, `Steps`, `Marks` and `Mark` are real parts that read their slot and
 * the value state from the root's context and can be arranged freely inside it.
 */
export const Slider = Object.assign(SliderRoot, {
  Root: SliderRoot,
  Output: SliderOutput,
  Track: SliderTrack,
  Fill: SliderFill,
  Thumb: SliderThumb,
  Steps: SliderSteps,
  Marks: SliderMarks,
  Mark: SliderMark,
});

export type Slider = {
  Props: SliderRootProps;
  RootProps: SliderRootProps;
  OutputProps: SliderOutputProps;
  TrackProps: SliderTrackProps;
  FillProps: SliderFillProps;
  ThumbProps: SliderThumbProps;
  StepsProps: SliderStepsProps;
  MarksProps: SliderMarksProps;
  MarkProps: SliderMarkProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export {
  SliderRoot,
  SliderOutput,
  SliderTrack,
  SliderFill,
  SliderThumb,
  SliderSteps,
  SliderMarks,
  SliderMark,
};

export type {
  SliderRootProps,
  SliderRootProps as SliderProps,
  SliderOutputProps,
  SliderTrackProps,
  SliderFillProps,
  SliderThumbProps,
  SliderStepsProps,
  SliderMarksProps,
  SliderMarkProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { sliderVariants } from "./slider.styles";

export type { SliderVariants } from "./slider.styles";
