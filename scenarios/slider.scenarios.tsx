import { Text, View } from "nsh";
import { Label, Slider } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared Slider scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app and this library render the same JSX.
 *
 *   slider/default                      story Default (T-001)
 *   slider/vertical                     story Vertical
 *   slider/disabled                     story Disabled
 *   slider/range                        story Range; the story maps
 *                                       state.values, this one names both
 *                                       thumbs explicitly so the JSX stays
 *                                       shared (heroes render the same)
 *   slider/with-steps                   story WithSteps
 *   slider/steps-negative               T-015's it.each set -0.3 … 0.3 by 0.1
 *   slider/steps-offset                 T-015's set 10 … 21 by 3
 *   slider/steps-tiny                   T-015's set 0 … 3e-7 by 1e-7
 *   slider/steps-overshoot              T-015's set 5 … 10 by 20
 *   slider/steps-zero-range             T-015's set 5 … 5 by 1
 *                                       (the five grids are screenshot-only:
 *                                       the dots have no text, testID or role,
 *                                       so these entries give the reference
 *                                       comparison the same cases as HeroUI)
 *   slider/with-marks                   story WithMarks: bare string children,
 *                                       which the Mark wraps in Text
 *   slider/with-steps-and-marks         story WithStepsAndMarks
 *   slider/range-with-steps-and-marks   story RangeWithStepsAndMarks
 *   slider/vertical-with-steps-and-marks story VerticalWithStepsAndMarks
 *   slider/currency                     story Range with USD formatOptions, the
 *                                       formatting source for T-019
 *   slider/rtl                          a range slider with marks inside a
 *                                       right-to-left Stage (T-023 / T-024)
 *   slider/test-ids                     testID on Output / Track / Fill / Thumb
 *                                       (T-002)
 *   slider/render-props.split           function children; HeroUI passes
 *                                       values, this side passes accessors, so
 *                                       the two are written separately (D17)
 *   slider/track-render-props.split     the same for Track's children
 *   slider/thumb-render-props.split     the same for Thumb's children
 *
 * The docs story sits in a 384-point (`w-96`) column; the entries keep that
 * width so the sliders render at the documented size inside Stage.
 */

function Default() {
  return (
    <Stage>
      <View class="w-96">
        <Slider defaultValue={30}>
          <Label>Volume</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      </View>
    </Stage>
  );
}

function Vertical() {
  return (
    <Stage>
      <View class="h-96 w-96">
        <Slider defaultValue={30} orientation="vertical">
          <Label>Volume</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      </View>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <View class="w-96">
        <Slider defaultValue={30} isDisabled>
          <Label>Volume</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      </View>
    </Stage>
  );
}

function Range() {
  return (
    <Stage>
      <View class="w-96">
        <Slider defaultValue={[100, 500]} maxValue={1000} minValue={0} step={50}>
          <Label>Price Range</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb index={0} />
            <Slider.Thumb index={1} />
          </Slider.Track>
        </Slider>
      </View>
    </Stage>
  );
}

function WithSteps() {
  return (
    <Stage>
      <View class="w-96">
        <Slider defaultValue={40} step={10}>
          <Label>Volume</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Steps />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      </View>
    </Stage>
  );
}

/*
 * T-015's five parameter sets (upstream slider.test.tsx:272): the fixture starts
 * at minValue, renders no marks, and lets Steps cover the whole track. HeroUI
 * asserts the dots' data-value list; the dots are unreadable here, so the five
 * grids exist for the reference screenshot comparison.
 */
function StepGrid(props: {
  defaultValue: number;
  maxValue: number;
  minValue: number;
  step: number;
}) {
  return (
    <Stage>
      <View class="w-96">
        <Slider
          defaultValue={props.defaultValue}
          maxValue={props.maxValue}
          minValue={props.minValue}
          step={props.step}
        >
          <Label>Volume</Label>
          <Slider.Output testID="output" />
          <Slider.Track>
            <Slider.Steps />
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
          <Slider.Marks />
        </Slider>
      </View>
    </Stage>
  );
}

function StepsNegative() {
  return <StepGrid defaultValue={-0.3} maxValue={0.3} minValue={-0.3} step={0.1} />;
}

function StepsOffset() {
  return <StepGrid defaultValue={10} maxValue={21} minValue={10} step={3} />;
}

function StepsTiny() {
  return <StepGrid defaultValue={0} maxValue={3e-7} minValue={0} step={1e-7} />;
}

function StepsOvershoot() {
  return <StepGrid defaultValue={5} maxValue={10} minValue={5} step={20} />;
}

function StepsZeroRange() {
  return <StepGrid defaultValue={5} maxValue={5} minValue={5} step={1} />;
}

function WithMarks() {
  return (
    <Stage>
      <View class="w-96">
        <Slider defaultValue={40}>
          <Label>Volume</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
          <Slider.Marks>
            <Slider.Mark value={0}>Off</Slider.Mark>
            <Slider.Mark value={20}>Quiet</Slider.Mark>
            <Slider.Mark value={60}>Loud</Slider.Mark>
            <Slider.Mark value={100}>Max</Slider.Mark>
          </Slider.Marks>
        </Slider>
      </View>
    </Stage>
  );
}

function WithStepsAndMarks() {
  return (
    <Stage>
      <View class="w-96">
        <Slider defaultValue={0.4} maxValue={1} step={0.1}>
          <Label>Volume</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Steps />
            <Slider.Thumb />
          </Slider.Track>
          <Slider.Marks>
            <Slider.Mark value={0} />
            <Slider.Mark value={0.5} />
            <Slider.Mark value={1} />
          </Slider.Marks>
        </Slider>
      </View>
    </Stage>
  );
}

function RangeWithStepsAndMarks() {
  return (
    <Stage>
      <View class="w-96">
        <Slider defaultValue={[0.2, 0.8]} maxValue={1} step={0.1}>
          <Label>Volume</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Steps />
            <Slider.Thumb index={0} />
            <Slider.Thumb index={1} />
          </Slider.Track>
          <Slider.Marks>
            <Slider.Mark value={0} />
            <Slider.Mark value={0.5} />
            <Slider.Mark value={1} />
          </Slider.Marks>
        </Slider>
      </View>
    </Stage>
  );
}

function VerticalWithStepsAndMarks() {
  return (
    <Stage>
      <View class="h-72 w-96">
        <Slider defaultValue={0.4} maxValue={1} orientation="vertical" step={0.1}>
          <Label>Volume</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Steps />
            <Slider.Thumb />
          </Slider.Track>
          <Slider.Marks>
            <Slider.Mark value={0} />
            <Slider.Mark value={0.5} />
            <Slider.Mark value={1} />
          </Slider.Marks>
        </Slider>
      </View>
    </Stage>
  );
}

function Currency() {
  return (
    <Stage>
      <View class="w-96">
        <Slider
          defaultValue={[100, 500]}
          formatOptions={{ currency: "USD", style: "currency" }}
          maxValue={1000}
          minValue={0}
          step={50}
        >
          <Label>Price Range</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb index={0} />
            <Slider.Thumb index={1} />
          </Slider.Track>
        </Slider>
      </View>
    </Stage>
  );
}

function Rtl() {
  return (
    <Stage direction="rtl">
      <View class="w-96">
        <Slider aria-label="Volume" defaultValue={[20, 60]}>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Steps />
            <Slider.Thumb index={0} />
            <Slider.Thumb index={1} />
          </Slider.Track>
          <Slider.Marks>
            <Slider.Mark value={0} />
            <Slider.Mark value={100} />
          </Slider.Marks>
        </Slider>
      </View>
    </Stage>
  );
}

function TestIds() {
  return (
    <Stage>
      <View class="w-96">
        <Slider aria-label="Volume" defaultValue={30} testID="slider">
          <Slider.Output testID="output" />
          <Slider.Track testID="track">
            <Slider.Fill testID="fill" />
            <Slider.Thumb testID="thumb" />
          </Slider.Track>
        </Slider>
      </View>
    </Stage>
  );
}

/* D17 split: the render prop's argument is a values object on the HeroUI side
 * and an accessors object here. The readout names every accessor, so a broken
 * context shows up as text instead of silently rendering the default. */
function RenderPropsSplit() {
  return (
    <Stage>
      <View class="w-96">
        <Slider defaultValue={30}>
          {({ isDisabled, orientation, state }) => (
            <>
              <Label>Volume</Label>
              <Slider.Output />
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
              <Text testID="root-props">
                {`${orientation()} ${isDisabled() ? "disabled" : "enabled"} ${state.values().join(",")}`}
              </Text>
            </>
          )}
        </Slider>
      </View>
    </Stage>
  );
}

function TrackRenderPropsSplit() {
  return (
    <Stage>
      <View class="w-96">
        <Slider defaultValue={[100, 500]} maxValue={1000} minValue={0} step={50}>
          <Label>Price Range</Label>
          <Slider.Output />
          <Slider.Track>
            {({ isHovered, state }) => (
              <>
                <Slider.Fill />
                {state.values().map((_, index) => (
                  <Slider.Thumb index={index} />
                ))}
                <Text testID="track-hover">{isHovered() ? "Hovered" : "Idle"}</Text>
              </>
            )}
          </Slider.Track>
        </Slider>
      </View>
    </Stage>
  );
}

function ThumbRenderPropsSplit() {
  return (
    <Stage>
      <View class="w-96">
        <Slider defaultValue={30}>
          <Label>Volume</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb>
              {({ isDragging, isFocusVisible, isHovered }) => (
                <Text testID="thumb-props">
                  {`${isFocusVisible() ? "focus" : "idle"} ${isDragging() ? "dragging" : "still"} ${isHovered() ? "hovered" : "resting"}`}
                </Text>
              )}
            </Slider.Thumb>
          </Slider.Track>
        </Slider>
      </View>
    </Stage>
  );
}

export const sliderScenarios: Record<string, Component> = {
  "slider/default": Default,
  "slider/vertical": Vertical,
  "slider/disabled": Disabled,
  "slider/range": Range,
  "slider/with-steps": WithSteps,
  "slider/steps-negative": StepsNegative,
  "slider/steps-offset": StepsOffset,
  "slider/steps-tiny": StepsTiny,
  "slider/steps-overshoot": StepsOvershoot,
  "slider/steps-zero-range": StepsZeroRange,
  "slider/with-marks": WithMarks,
  "slider/with-steps-and-marks": WithStepsAndMarks,
  "slider/range-with-steps-and-marks": RangeWithStepsAndMarks,
  "slider/vertical-with-steps-and-marks": VerticalWithStepsAndMarks,
  "slider/currency": Currency,
  "slider/rtl": Rtl,
  "slider/test-ids": TestIds,
  "slider/render-props.split": RenderPropsSplit,
  "slider/track-render-props.split": TrackRenderPropsSplit,
  "slider/thumb-render-props.split": ThumbRenderPropsSplit,
};
