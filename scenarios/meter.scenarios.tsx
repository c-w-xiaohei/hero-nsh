import { View } from "nsh";
import { Label, Meter } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared Meter scenarios, written with HeroUI's API only so the reference app
 * (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * Meter is a read-only range indicator: the only observable facts are the
 * formatted value text and the fill geometry. The upstream tests read DOM
 * attributes that NSH has none of, so every track keeps a fixed 300-point width
 * and the fill reports its bounds through `onLayout` → `probe("layout")`; a
 * 30% reading becomes a 90-point fill, which a wrong clamp or a missing
 * percentage branch fails.
 *
 * The label is the standalone `Label` (HeroUI has no Meter.Label); it reaches
 * the meter's accessible name through the root's FieldContext registration.
 *
 * `meter/sizes`, `meter/colors`, `meter/disabled` and `meter/custom-format`
 * serve the screenshot/manual pass (port sheet 4b); the behavior cases use the
 * seven entries above them.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layout(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function Default() {
  return (
    <Stage>
      <View class="w-[300px]">
        <Meter testID="meter" value={60}>
          <Label>Storage</Label>
          <Meter.Output testID="output" />
          <Meter.Track testID="track">
            <Meter.Fill testID="fill" onLayout={layout("fill")} />
          </Meter.Track>
        </Meter>
      </View>
    </Stage>
  );
}

function Defaults() {
  return (
    <Stage>
      <View class="w-[300px]">
        <Meter testID="meter">
          <Label>Meter</Label>
          <Meter.Output testID="value-label" />
          <Meter.Track testID="track">
            <Meter.Fill testID="fill" onLayout={layout("fill")} />
          </Meter.Track>
        </Meter>
      </View>
    </Stage>
  );
}

function ValueLabel() {
  return (
    <Stage>
      <View class="w-[300px]">
        <Meter testID="meter" maxValue={10} minValue={0} value={3} valueLabel="3 of 10 completed">
          <Label>Meter</Label>
          <Meter.Output testID="value-label" />
          <Meter.Track testID="track">
            <Meter.Fill testID="fill" onLayout={layout("fill")} />
          </Meter.Track>
        </Meter>
      </View>
    </Stage>
  );
}

function Value30() {
  return (
    <Stage>
      <View class="w-[300px]">
        <Meter testID="meter" value={30}>
          <Label>Meter</Label>
          <Meter.Output testID="value-label" />
          <Meter.Track testID="track">
            <Meter.Fill testID="fill" onLayout={layout("fill")} />
          </Meter.Track>
        </Meter>
      </View>
    </Stage>
  );
}

function ClampMin() {
  return (
    <Stage>
      <View class="w-[300px]">
        <Meter testID="meter" minValue={0} value={-1}>
          <Label>Meter</Label>
          <Meter.Output testID="value-label" />
          <Meter.Track testID="track">
            <Meter.Fill testID="fill" onLayout={layout("fill")} />
          </Meter.Track>
        </Meter>
      </View>
    </Stage>
  );
}

function ClampMax() {
  return (
    <Stage>
      <View class="w-[300px]">
        <Meter testID="meter" maxValue={100} value={200}>
          <Label>Meter</Label>
          <Meter.Output testID="value-label" />
          <Meter.Track testID="track">
            <Meter.Fill testID="fill" onLayout={layout("fill")} />
          </Meter.Track>
        </Meter>
      </View>
    </Stage>
  );
}

function Negative() {
  return (
    <Stage>
      <View class="w-[300px]">
        <Meter testID="meter" maxValue={5} minValue={-5} value={0}>
          <Label>Meter</Label>
          <Meter.Output testID="value-label" />
          <Meter.Track testID="track">
            <Meter.Fill testID="fill" onLayout={layout("fill")} />
          </Meter.Track>
        </Meter>
      </View>
    </Stage>
  );
}

function CustomFormat() {
  return (
    <Stage>
      <View class="w-[300px]">
        <Meter
          testID="meter"
          formatOptions={{ currency: "USD", style: "currency" }}
          maxValue={1000}
          value={750}
        >
          <Label>Revenue</Label>
          <Meter.Output testID="output" />
          <Meter.Track testID="track">
            <Meter.Fill testID="fill" onLayout={layout("fill")} />
          </Meter.Track>
        </Meter>
      </View>
    </Stage>
  );
}

function Sizes() {
  return (
    <Stage>
      <View class="w-[300px] flex-col gap-4">
        <Meter size="sm" value={40}>
          <Label>Small</Label>
          <Meter.Output />
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
        <Meter size="md" value={60}>
          <Label>Medium</Label>
          <Meter.Output />
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
        <Meter size="lg" value={80}>
          <Label>Large</Label>
          <Meter.Output />
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
      </View>
    </Stage>
  );
}

function Colors() {
  return (
    <Stage>
      <View class="w-[300px] flex-col gap-4">
        <Meter color="default" value={50}>
          <Label>Default</Label>
          <Meter.Output />
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
        <Meter color="accent" value={50}>
          <Label>Accent</Label>
          <Meter.Output />
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
        <Meter color="success" value={50}>
          <Label>Success</Label>
          <Meter.Output />
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
        <Meter color="warning" value={50}>
          <Label>Warning</Label>
          <Meter.Output />
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
        <Meter color="danger" value={50}>
          <Label>Danger</Label>
          <Meter.Output />
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
      </View>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <View class="w-[300px]">
        <Meter aria-disabled testID="meter" value={50}>
          <Label>Storage</Label>
          <Meter.Output testID="output" />
          <Meter.Track testID="track">
            <Meter.Fill testID="fill" />
          </Meter.Track>
        </Meter>
      </View>
    </Stage>
  );
}

export const meterScenarios: Record<string, Component> = {
  "meter/default": Default,
  "meter/defaults": Defaults,
  "meter/value-label": ValueLabel,
  "meter/value-30": Value30,
  "meter/clamp-min": ClampMin,
  "meter/clamp-max": ClampMax,
  "meter/negative": Negative,
  "meter/custom-format": CustomFormat,
  "meter/sizes": Sizes,
  "meter/colors": Colors,
  "meter/disabled": Disabled,
};
