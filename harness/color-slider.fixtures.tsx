import { effect, host, mount, Scroll, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  Button,
  ColorSlider,
  EnvironmentScope,
  Label,
  parseColor,
  PressableFeedbackContext,
} from "@heroui/react";
import type { ColorChannel, PressableFeedbackContextValue } from "@heroui/react";
import {
  ColorSliderContext,
  ColorSliderPanContext,
} from "../src/components/color-slider/color-slider-context";
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
 *   mobile     adapt-sheet M-001…M-012 surface: full probes (onChange /
 *              onChangeEnd / hover / focus / layout / drag-state edges),
 *              a `dragging` marker, `track-hover` / `thumb-hover` markers
 *              floating outside the hit surfaces (`pointer-events-none`),
 *              and — with `probe=1` — a `SeamProbe` inside Track and Thumb
 *              reporting `ctx-env` (enabled / hitSlop / bounds / isPressed /
 *              pressOrigin / panKeys / panActive) plus a `sample-seams`
 *              button that resolves the animated channels into `ctx-seams`.
 *              `disabled=1` arms isDisabled.
 *   scroll     the same slider inside a real `Scroll` for M-004 / M-010: the
 *              scroll axis is perpendicular to the slider's (`horizontal`
 *              for a vertical slider, vertical otherwise), `onScroll` probes
 *              the offset, and a plain `pad` view proves the scroller moves
 *              when the gesture is not the slider's.
 *
 * host.params.scope picks the EnvironmentScope wrapper: "touch" injects
 * input="touch", anything else leaves the default environment — the
 * desktop-parity half of the same case (the switch fixures' convention).
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

/* -------------------------------------------------------------------------------------------------
 * Environment + probes (adapt sheet §4)
 * -----------------------------------------------------------------------------------------------*/

/** `scope=touch` injects the touch environment; anything else is the default. */
function Scoped(props: { children?: JSX.Element }) {
  return String(host.params.scope ?? "") === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    props.children
  );
}

function probeOn() {
  return String(host.params.probe ?? "") === "1";
}

/**
 * The seam contexts the mounted `SeamProbe`s resolved, kept for the
 * on-demand channel read: the `AnimatedValue` channels only answer through
 * `getValue()` promises, so `sampleSeamChannels` (the `sample-seams`
 * button) resolves them into `ctx-seams` records after the gesture under
 * test — the rest reads M-001 / M-011 make.
 */
const liveSeams: Record<string, PressableFeedbackContextValue> = {};

/**
 * The seam's only observable surface (sheet §6: `hitSlop` is a view prop
 * nsh/test cannot read). `PressableFeedbackContext` carries the part's
 * `hitSlop`/`bounds`/gate and the sync press flag; `ColorSliderPanContext`
 * carries the pan's resolved handler object — `panKeys` 0 under the default
 * environment is the negative assertion that no gesture path mounted.
 * Mounted only when `probe=1` asks for it.
 */
function SeamProbe(props: { id: string }) {
  const ctx = PressableFeedbackContext();
  const pan = ColorSliderPanContext();
  const report = probe("ctx-env");

  effect(() => {
    liveSeams[props.id] = ctx;
  });

  effect(() => {
    report({
      id: props.id,
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
      bounds: ctx.bounds(),
      isPressed: ctx.isPressed(),
      pressOrigin: ctx.pressOrigin(),
      panKeys: pan ? Object.keys(pan.panHandlers()).length : -1,
      panActive: pan ? pan.active() : false,
    });
  });

  return null;
}

/** Resolves both seams' animated channels into `ctx-seams` records. */
function sampleSeamChannels() {
  const report = probe("ctx-seams");

  for (const id of ["thumb", "track"] as const) {
    const ctx = liveSeams[id];

    if (!ctx) {
      continue;
    }

    void ctx.pressed.getValue().then((pressed) => {
      void ctx.scale.getValue().then((scale) => {
        void ctx.highlightOpacity.getValue().then((highlight) => {
          void ctx.rippleProgress.getValue().then((ripple) => {
            report({ id, pressed, scale, highlight, ripple });
          });
        });
      });
    });
  }
}

/** `dragging`/`idle` marker text the tests sample mid-gesture (M-003, M-010). */
function StateMarker() {
  const slider = ColorSliderContext();

  return (
    <Text testID="dragging">
      {slider?.state.isDragging() ? "dragging" : "idle"}
    </Text>
  );
}

/**
 * The `isDragging` edge record: the effect re-fires on every transition, so
 * `callsOf(app, "drag-state")` reads the whole true→false roundtrip after
 * the gesture ends — the mid-drag sample `app.drag` cannot give a
 * dual-target file (commands serialize; `dragAndHold` is headless-only).
 */
function DragStateProbe() {
  const slider = ColorSliderContext();
  const report = probe("drag-state");

  effect(() => {
    report(slider?.state.isDragging() ?? false);
  });

  return null;
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
        <ColorSlider
          channel="alpha"
          defaultValue="hsla(0, 100%, 50%, 0.5)"
          onChange={(color) =>
            probe("onChange")(color.getChannelValue("alpha"), color.toString("css"))
          }
          onChangeEnd={(color) =>
            probe("onChangeEnd")(color.getChannelValue("alpha"))
          }
        >
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

/**
 * The slider the `mobile` and `scroll` cases share: every callback the
 * assertions count (`onChange` per frame, one `onChangeEnd` per interaction,
 * the hover trio, focus) is probed, the markers report the drag and hover
 * flags, and `probe=1` mounts a `SeamProbe` inside each part.
 */
function ProbedSlider() {
  const channel = channelParam();
  const orientation = orientationParam();
  const isDisabled = String(host.params.disabled ?? "") === "1";

  return (
    <ColorSlider
      channel={channel}
      defaultValue={valueParam("hsl(0, 100%, 50%)")}
      orientation={orientation}
      isDisabled={isDisabled}
      onChange={(color) =>
        probe("onChange")(color.getChannelValue(channel), color.toString("css"))
      }
      onChangeEnd={(color) =>
        probe("onChangeEnd")(color.getChannelValue(channel))
      }
    >
      <Label>Hue</Label>
      <ColorSlider.Output testID="output" />
      <StateMarker />
      <DragStateProbe />
      <ColorSlider.Track
        testID="track"
        onLayout={layoutProbe("track")}
        onHoverStart={probe("trackHoverStart")}
        onHoverEnd={probe("trackHoverEnd")}
        onHoverChange={probe("trackHoverChange")}
      >
        {(values) => [
          /*
           * The marker floats above the track, `pointer-events-none`, so it
           * reports the flag without covering the hit surface (the text under
           * a finger would be `app.press`'s ERR_NSH_TEST_COVERED).
           */
          <Text testID="track-hover" class="absolute -top-7 pointer-events-none">
            {values.isHovered() ? "TrackHovered" : "TrackIdle"}
          </Text>,
          <ColorSlider.Thumb
            testID="thumb"
            onFocus={probe("onFocus")}
            onBlur={probe("onBlur")}
            onLayout={layoutProbe("thumb")}
            onHoverStart={probe("thumbHoverStart")}
            onHoverEnd={probe("thumbHoverEnd")}
            onHoverChange={probe("thumbHoverChange")}
          >
            {(thumbValues) => [
              <Text
                testID="thumb-hover"
                class="absolute -top-7 pointer-events-none"
              >
                {thumbValues.isHovered() ? "ThumbHovered" : "ThumbIdle"}
              </Text>,
              probeOn() ? <SeamProbe id="thumb" /> : null,
            ]}
          </ColorSlider.Thumb>,
          probeOn() ? <SeamProbe id="track" /> : null,
        ]}
      </ColorSlider.Track>
    </ColorSlider>
  );
}

function MobileCase() {
  return (
    <Stage>
      <View class={orientationParam() === "vertical" ? "h-64 w-24" : "w-[320px]"}>
        <ProbedSlider />
      </View>
      {probeOn() ? (
        <Button testID="sample-seams" onPress={sampleSeamChannels}>
          Sample seams
        </Button>
      ) : null}
    </Stage>
  );
}

/**
 * M-004 / M-010: the slider inside a real `Scroll`, so the native recognizer
 * competes for the gesture. The scroll axis is perpendicular to the slider's
 * — a cross-axis drag is the scroll's, an along-axis one the pan's claim —
 * and the content overfills the viewport so the Scroll can actually move.
 */
function ScrollCase() {
  const verticalSlider = orientationParam() === "vertical";

  return (
    <Stage>
      <View class="h-56 w-56">
        <Scroll
          testID="scroller"
          class="h-56 w-56"
          horizontal={verticalSlider}
          onScroll={(event) => probe("scroller")(event.offset)}
        >
          {verticalSlider ? (
            <View class="h-64 w-[640px] flex-row gap-8">
              <ProbedSlider />
              {/* The control area: a plain view proving the Scroll itself
                  moves when the gesture is not the slider's. */}
              <View testID="pad" class="h-64 w-48" />
            </View>
          ) : (
            <View class="h-[640px] w-[320px]">
              <ProbedSlider />
              <View testID="pad" class="h-24 w-full" />
            </View>
          )}
        </Scroll>
      </View>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "parts");

  if (name === "mobile") return <Scoped><MobileCase /></Scoped>;
  if (name === "scroll") return <Scoped><ScrollCase /></Scoped>;
  if (name === "keyboard") return <KeyboardCase />;
  if (name === "controlled") return <ControlledCase />;
  if (name === "disabled") return <DisabledCase />;
  if (name === "grid") return <GridCase />;
  if (name === "alpha") return <AlphaCase />;

  return <PartsCase />;
}

mount(Fixture);
