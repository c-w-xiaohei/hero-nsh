import { host, mount, Text, View } from "nsh";
import { ColorArea } from "@heroui/react";
import type { Color } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only ColorArea fixtures (port sheet 4b), not shared scenarios.
 *
 * Every case is built from HeroUI's public API and records callbacks through
 * `probe`, so the test reads them back from Storage. `Color` is turned into
 * plain numbers and strings before it is recorded, because probe serializes
 * through JSON and the value object is a class instance.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case picks the case:
 *   keyboard  T-004: defaultValue hsl(200, 50%, 50%), one Thumb, the current
 *             HSL string in a Text and every onChange recorded
 *   drag      X-001/X-004: a 200pt-wide area, onChange / onChangeEnd recorded,
 *             the Thumb's render prop printing isDragging and its color
 *   geometry  X-002: Root and Thumb both report onLayout; defaultValue
 *             hsl(90, 50%, 50%) puts the Thumb at 25% from the left and 50%
 *             from the top
 *   disabled  X-003: isDisabled, same probes; a pointer drag must stay silent
 *   default-color
 *             X-006: no value and no defaultValue, the current HSL string in a
 *             Text — React Aria starts an area on #ffffff
 *   rtl-drag  X-007: the drag case under `Stage direction="rtl"`; open it with
 *             an RTL `locale`, which is what the component reads
 *   rtl-geometry
 *             X-008: the geometry case under `Stage direction="rtl"`
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: "area" | "thumb") {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function recordColor(name: string) {
  return (color: Color) =>
    probe(name)({
      hue: color.getChannelValue("hue"),
      saturation: color.getChannelValue("saturation"),
      hsl: color.toString("hsl"),
    });
}

function KeyboardCase() {
  return (
    <Stage>
      <ColorArea
        aria-label="Color"
        defaultValue="hsl(200, 50%, 50%)"
        onChange={recordColor("onChange")}
      >
        {({ state }) => (
          <View class="flex-col gap-2">
            <ColorArea.Thumb onFocus={probe("onFocus")} />
            <Text testID="value">{state.value().toString("hsl")}</Text>
          </View>
        )}
      </ColorArea>
    </Stage>
  );
}

function DefaultColorCase() {
  return (
    <Stage>
      <ColorArea aria-label="Color">
        {({ state }) => (
          <View class="flex-col gap-2">
            <ColorArea.Thumb />
            <Text testID="value">{state.value().toString("hsl")}</Text>
          </View>
        )}
      </ColorArea>
    </Stage>
  );
}

function DragCase(props: { dir?: "ltr" | "rtl" }) {
  return (
    <Stage direction={props.dir}>
      <ColorArea
        aria-label="Color"
        className="w-[200px]"
        defaultValue="hsl(200, 50%, 50%)"
        testID="area"
        onChange={recordColor("onChange")}
        onChangeEnd={recordColor("onChangeEnd")}
      >
        <ColorArea.Thumb>
          {({ isDragging, color }) => (
            <View class="flex-col">
              <Text testID="dragging">{isDragging() ? "Dragging" : "Idle"}</Text>
              <Text testID="drag-color">{color().toString("hsl")}</Text>
            </View>
          )}
        </ColorArea.Thumb>
      </ColorArea>
    </Stage>
  );
}

function GeometryCase(props: { dir?: "ltr" | "rtl" }) {
  return (
    <Stage direction={props.dir}>
      <ColorArea
        aria-label="Color"
        className="w-[200px]"
        defaultValue="hsl(90, 50%, 50%)"
        testID="area"
        onLayout={layoutProbe("area")}
      >
        <ColorArea.Thumb testID="thumb" onLayout={layoutProbe("thumb")} />
      </ColorArea>
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <ColorArea
        aria-label="Color"
        defaultValue="hsl(200, 50%, 50%)"
        isDisabled
        testID="area"
        onChange={recordColor("onChange")}
        onChangeEnd={recordColor("onChangeEnd")}
      >
        <ColorArea.Thumb />
      </ColorArea>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "keyboard");

  if (name === "drag") return <DragCase />;
  if (name === "geometry") return <GeometryCase />;
  if (name === "disabled") return <DisabledCase />;
  if (name === "default-color") return <DefaultColorCase />;
  if (name === "rtl-drag") return <DragCase dir="rtl" />;
  if (name === "rtl-geometry") return <GeometryCase dir="rtl" />;

  return <KeyboardCase />;
}

mount(Fixture);
