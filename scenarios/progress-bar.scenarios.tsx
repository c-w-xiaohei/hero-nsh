import { Text, View } from "nsh";
import { Label, ProgressBar } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared ProgressBar scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app and this library render the same JSX.
 *
 *   progress-bar/default        story Default (T-001)
 *   progress-bar/sizes          story Sizes: sm 40 / md 60 / lg 80
 *   progress-bar/colors         story Colors: the five colors (T-003 screenshot)
 *   progress-bar/indeterminate  story Indeterminate, no Output
 *   progress-bar/custom-value   story CustomValue: currency, max 1000, value 750
 *   progress-bar/value-label    valueLabel overriding the formatted text (T-008)
 *   progress-bar/without-label  story WithoutLabel: aria-label only
 *   progress-bar/test-id        testID on the root (T-004)
 *   progress-bar/composition    testID on Output / Track / Fill (T-006)
 *   progress-bar/render-props.split
 *                               function children; HeroUI passes values, this
 *                               side passes accessors, so the two are written
 *                               separately (D17, port sheet 4b)
 *
 * The docs story sits in a 384-point (`w-96`) column; the entries keep that
 * width so the bars render at the documented size inside Stage.
 */

function Default() {
  return (
    <Stage>
      <View class="w-96">
        <ProgressBar value={60}>
          <Label>Loading</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </View>
    </Stage>
  );
}

function Sizes() {
  return (
    <Stage>
      <View class="w-96 flex-col gap-6">
        <ProgressBar size="sm" value={40}>
          <Label>Small</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <ProgressBar size="md" value={60}>
          <Label>Medium</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <ProgressBar size="lg" value={80}>
          <Label>Large</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </View>
    </Stage>
  );
}

function Colors() {
  return (
    <Stage>
      <View class="w-96 flex-col gap-6">
        <ProgressBar color="default" value={50}>
          <Label>Default</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <ProgressBar color="accent" value={50}>
          <Label>Accent</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <ProgressBar color="success" value={50}>
          <Label>Success</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <ProgressBar color="warning" value={50}>
          <Label>Warning</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <ProgressBar color="danger" value={50}>
          <Label>Danger</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </View>
    </Stage>
  );
}

function Indeterminate() {
  return (
    <Stage>
      <View class="w-96">
        <ProgressBar isIndeterminate>
          <Label>Loading...</Label>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </View>
    </Stage>
  );
}

function CustomValue() {
  return (
    <Stage>
      <View class="w-96">
        <ProgressBar
          formatOptions={{ style: "currency", currency: "USD" }}
          maxValue={1000}
          minValue={0}
          value={750}
        >
          <Label>Revenue</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </View>
    </Stage>
  );
}

function ValueLabel() {
  return (
    <Stage>
      <View class="w-96">
        <ProgressBar maxValue={10} minValue={0} value={3} valueLabel="3 of 10 completed">
          <Label>Progress Bar</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </View>
    </Stage>
  );
}

function WithoutLabel() {
  return (
    <Stage>
      <View class="w-96">
        <ProgressBar aria-label="Loading progress" value={45}>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </View>
    </Stage>
  );
}

function TestId() {
  return (
    <Stage>
      <View class="w-96">
        <ProgressBar aria-label="Loading" testID="progress-bar" value={50}>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </View>
    </Stage>
  );
}

function Composition() {
  return (
    <Stage>
      <View class="w-96">
        <ProgressBar aria-label="Loading" value={60}>
          <ProgressBar.Output testID="output" />
          <ProgressBar.Track testID="track">
            <ProgressBar.Fill testID="fill" />
          </ProgressBar.Track>
        </ProgressBar>
      </View>
    </Stage>
  );
}

/* D17 split: the render prop's argument is a values object on the HeroUI side
 * and an accessors object here. The readout uses both accessors so a broken
 * context shows up as text instead of silently rendering the default. */
function RenderPropsSplit() {
  return (
    <Stage>
      <View class="w-96">
        <ProgressBar value={60}>
          {({ percentage, valueText }) => (
            <>
              <Label>{valueText() ?? ""}</Label>
              <ProgressBar.Output />
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
              <Text>{`${percentage() ?? 0}%`}</Text>
            </>
          )}
        </ProgressBar>
      </View>
    </Stage>
  );
}

export const progressBarScenarios: Record<string, Component> = {
  "progress-bar/default": Default,
  "progress-bar/sizes": Sizes,
  "progress-bar/colors": Colors,
  "progress-bar/indeterminate": Indeterminate,
  "progress-bar/custom-value": CustomValue,
  "progress-bar/value-label": ValueLabel,
  "progress-bar/without-label": WithoutLabel,
  "progress-bar/test-id": TestId,
  "progress-bar/composition": Composition,
  "progress-bar/render-props.split": RenderPropsSplit,
};
