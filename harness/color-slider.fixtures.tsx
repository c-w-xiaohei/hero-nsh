import { host, mount, signal, Text, View } from "nsh";
import { Button, ColorSlider, Label, parseColor } from "@heroui/react";
import type { ColorChannel } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only ColorSlider fixtures (port sheet 4b), not shared scenarios.
 *
 * Every case is built from HeroUI's public API and records its callbacks through
 * `probe`, so a test reads them back from Storage. A `Color` cannot go through
 * Storage (it does not survive JSON), so the onChange probe stores the channel
 * number and the css string instead of the object.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case picks the case:
 *   parts      T-002: Output / Track / Thumb carry testIDs, channel hue
 *   keyboard   T-001, T-003: Label + Output + Track + Thumb with every probe;
 *              channel, orientation and value come from host.params
 *   controlled a controlled signal plus a `force-200` button that replaces it
 *   disabled   T-004: isDisabled with the same parts and probes
 *   grid       host.params withLabel / withOutput / orientation decide the four
 *              presence combinations; Output, Track and Thumb all report onLayout
 *   alpha      alpha channel hsla(0, 100%, 50%, 0.5), the checkerboard case
 */

const CHANNELS = [
  "hue",
  "saturation",
  "brightness",
  "lightness",
  "alpha",
  "red",
  "green",
  "blue",
] as const;

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: "output" | "track" | "thumb") {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function channelParam(): ColorChannel {
  const name = String(host.params.channel ?? "hue");

  return (CHANNELS as readonly string[]).includes(name) ? (name as ColorChannel) : "hue";
}

function orientationParam(): "horizontal" | "vertical" {
  return host.params.orientation === "vertical" ? "vertical" : "horizontal";
}

function valueParam(fallback: string): string {
  const value = host.params.value;

  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function PartsCase() {
  return (
    <Stage>
      <View class="w-[320px]">
        <ColorSlider channel="hue" defaultValue="hsl(0, 100%, 50%)">
          <Label>Hue</Label>
          <ColorSlider.Output testID="output" />
          <ColorSlider.Track testID="track">
            <ColorSlider.Thumb testID="thumb" />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
    </Stage>
  );
}

function KeyboardCase() {
  const channel = channelParam();
  const orientation = orientationParam();
  const value = valueParam("hsl(0, 100%, 50%)");

  return (
    <Stage>
      <View class={orientation === "vertical" ? "h-64 w-24" : "w-[320px]"}>
        <ColorSlider
          channel={channel}
          defaultValue={value}
          orientation={orientation}
          onChange={(color) => probe("onChange")(color.getChannelValue(channel), color.toString("css"))}
          onChangeEnd={(color) => probe("onChangeEnd")(color.getChannelValue(channel))}
        >
          <Label>Hue</Label>
          <ColorSlider.Output testID="output" onLayout={layoutProbe("output")} />
          <ColorSlider.Track testID="track" onLayout={layoutProbe("track")}>
            <ColorSlider.Thumb
              testID="thumb"
              onBlur={probe("onBlur")}
              onFocus={probe("onFocus")}
              onLayout={layoutProbe("thumb")}
            />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
    </Stage>
  );
}

function ControlledCase() {
  const color = signal(parseColor("hsl(0, 100%, 50%)"));

  return (
    <Stage>
      <View class="w-[320px]">
        <ColorSlider
          channel="hue"
          value={color()}
          onChange={(next) => {
            probe("onChange")(next.getChannelValue("hue"), next.toString("css"));
            color.set(next);
          }}
        >
          <Label>Hue</Label>
          <ColorSlider.Output testID="output" />
          <ColorSlider.Track testID="track">
            <ColorSlider.Thumb testID="thumb" />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
      <Button testID="force-200" onPress={() => color.set(parseColor("hsl(200, 100%, 50%)"))}>
        Force 200
      </Button>
      <Text testID="css">{color().toString("hsl")}</Text>
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <View class="w-[320px]">
        <ColorSlider
          channel="hue"
          defaultValue="hsl(200, 100%, 50%)"
          isDisabled
          onChange={(color) => probe("onChange")(color.getChannelValue("hue"))}
        >
          <Label>Hue</Label>
          <ColorSlider.Output testID="output" />
          <ColorSlider.Track testID="track">
            <ColorSlider.Thumb
              testID="thumb"
              onBlur={probe("onBlur")}
              onFocus={probe("onFocus")}
            />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
    </Stage>
  );
}

function GridCase() {
  const orientation = orientationParam();
  const withLabel = host.params.withLabel !== false && host.params.withLabel !== "false";
  const withOutput = host.params.withOutput !== false && host.params.withOutput !== "false";

  return (
    <Stage>
      <View class={orientation === "vertical" ? "h-64 w-24" : "w-[320px]"}>
        <ColorSlider
          aria-label="Hue"
          channel="hue"
          defaultValue="hsl(0, 100%, 50%)"
          orientation={orientation}
        >
          {withLabel ? <Label>Hue</Label> : null}
          {withOutput ? (
            <ColorSlider.Output testID="output" onLayout={layoutProbe("output")} />
          ) : null}
          <ColorSlider.Track testID="track" onLayout={layoutProbe("track")}>
            <ColorSlider.Thumb testID="thumb" onLayout={layoutProbe("thumb")} />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
    </Stage>
  );
}

function AlphaCase() {
  return (
    <Stage>
      <View class="w-[320px]">
        <ColorSlider channel="alpha" defaultValue="hsla(0, 100%, 50%, 0.5)">
          <Label>Alpha</Label>
          <ColorSlider.Output testID="output" />
          <ColorSlider.Track testID="track" onLayout={layoutProbe("track")}>
            <ColorSlider.Thumb testID="thumb" />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "parts");

  if (name === "keyboard") return <KeyboardCase />;
  if (name === "controlled") return <ControlledCase />;
  if (name === "disabled") return <DisabledCase />;
  if (name === "grid") return <GridCase />;
  if (name === "alpha") return <AlphaCase />;

  return <PartsCase />;
}

mount(Fixture);
