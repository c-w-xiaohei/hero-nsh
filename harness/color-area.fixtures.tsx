import { effect, host, mount, Scroll, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import { ColorArea, EnvironmentScope } from "@heroui/react";
import type { Color } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import {
  ColorAreaContext,
  type ColorAreaContextValue,
} from "../src/components/color-area/color-area-context";

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
 *
 * Mobile cases (adapt-sheets/color-area.md §4):
 *   mobile        a 200pt area on the default white→mid-grey value with the
 *                 full probe surface: onChange/onChangeEnd (with lightness),
 *                 the thumb's hovered/dragging texts, `ctx-env`/`ctx-layout`/
 *                 `ctx-thumb` (the thumbFeedback seam channels —
 *                 M-001/M-002/M-006). `callerSlop=1` gives the Thumb an explicit
 *                 `hitSlop={2}`; the effective binding is a view prop
 *                 `nsh/test` cannot read (sheet §6), so M-002 asserts the
 *                 seam channel under the override instead.
 *   mobile-scroll the same area inside a vertical `Scroll` with overflow and
 *                 `scroll`/`scroll-drag` probes — M-005's transfer case.
 *   controlled    a controlled `value` held from a signal: `onChange` reports
 *                 every proposed color while `value` keeps printing the held
 *                 one — M-011's 受控 value/onChangeEnd 单发 half.
 * `host.params.scope` injects `input="touch"`/`"pointer"` via
 * `EnvironmentScope`; absent means the host-derived default.
 *
 * M-002 note (sheet §6): the effective `hitSlop` a Thumb binds
 * (`local.hitSlop ?? seam`) is a view prop — `nsh/test` cannot read it, so
 * caller priority degrades to "the seam still computes its own Edges under a
 * caller `hitSlop`" (asserted on `ctx-env`), the same registered gap radio
 * and pressable-feedback carry.
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
      lightness: color.getChannelValue("lightness"),
      hsl: color.toString("hsl"),
    });
}

/* -------------------------------------------------------------------------------------------------
 * Mobile cases (adapt-sheets/color-area.md §4 M-001…M-011)
 * -----------------------------------------------------------------------------------------------*/

type Scope = "" | "touch" | "pointer";

/**
 * `host.params.scope` picks the `EnvironmentScope` wrapper: "" is the
 * host-derived environment (the desktop-parity half of every `.mobile.` file),
 * "touch" / "pointer" inject an axis — same convention as radio.fixtures.tsx.
 */
function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  return scope === "" ? (
    <>{props.children}</>
  ) : (
    <EnvironmentScope input={scope}>{props.children}</EnvironmentScope>
  );
}

/* The live area context, for the `ctx-sample` view and the layout probes. */
let areaCtx: ColorAreaContextValue | undefined;

/**
 * A-001's observable surface: `ColorAreaContext` is internal (never in the
 * barrel), so this probe reads it by relative import — the same precedent
 * switch and radio set. `ctx-env` reports once per mount what the seam's gate
 * and the thumb's hitSlop channel hold.
 */
function CtxProbe() {
  const ctx = ColorAreaContext();
  const reportEnv = probe("ctx-env");

  effect(() => {
    areaCtx = ctx;
    reportEnv({
      enabled: ctx?.thumbFeedback.enabled() ?? false,
      hitSlop: ctx?.thumbFeedback.hitSlop() ?? null,
      seamPressed: ctx?.thumbFeedback.isPressed() ?? false,
      bounds: ctx?.thumbFeedback.bounds() ?? { width: 0, height: 0 },
    });
  });

  return null;
}

function sampleThumbChannels() {
  const c = areaCtx;
  if (c === undefined) {
    return;
  }
  probe("ctx-thumb")({
    enabled: c.thumbFeedback.enabled(),
    hitSlop: c.thumbFeedback.hitSlop() ?? null,
    seamPressed: c.thumbFeedback.isPressed(),
    pressOrigin: c.thumbFeedback.pressOrigin(),
    bounds: c.thumbFeedback.bounds(),
  });
}

// The hitSlop at the moment each thumb layout landed (`ctx.thumbFeedback
// .layout` runs before the caller's `onLayout`, so this is post-update).
function thumbLayoutProbe() {
  return (event: LayoutEvent) => {
    const c = areaCtx;
    probe("ctx-layout")({
      name: "thumb",
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
      hitSlop: c?.thumbFeedback.hitSlop() ?? null,
    });
  };
}

function MobileCase() {
  const callerSlop = String(host.params.callerSlop ?? "") === "1";

  return (
    <Stage>
      <ColorArea
        aria-label="Color"
        className="w-[200px]"
        defaultValue="hsl(0, 0%, 50%)"
        testID="area"
        onChange={recordColor("onChange")}
        onChangeEnd={recordColor("onChangeEnd")}
        onLayout={layoutProbe("area")}
        // `app.press` resolves only pressable views; a press on the panel is
        // the tap-to-jump input M-003/M-004 are about.
        onPress={(e) =>
          probe("press")({
            kind: "area",
            x: e.position.x,
            y: e.position.y,
            px: e.pagePosition.x,
            py: e.pagePosition.y,
          })
        }
      >
        <ColorArea.Thumb
          testID="thumb"
          hitSlop={callerSlop ? 2 : undefined}
          onPress={() => probe("press")({ kind: "thumb" })}
          onLayout={thumbLayoutProbe()}
          onHoverStart={() => probe("hover")({ kind: "start" })}
          onHoverEnd={() => probe("hover")({ kind: "end" })}
          onHoverChange={(v) => probe("hover")({ kind: "change", v })}
        >
          {({ isHovered, isDragging }) => (
            <View class="flex-col">
              <Text testID="hovered">{isHovered() ? "Hover" : "Idle"}</Text>
              <Text testID="dragging">{isDragging() ? "Dragging" : "Idle"}</Text>
            </View>
          )}
        </ColorArea.Thumb>
        <CtxProbe />
      </ColorArea>
      <View testID="ctx-sample" class="size-4" onPress={sampleThumbChannels} />
    </Stage>
  );
}

/**
 * M-005's scroll arbitration case: the area inside a vertical `Scroll` with
 * real overflow, so the host may hand the touches to the scroller mid-gesture.
 * `scroll` probes report whether a handover actually happened (offset moved /
 * drag events fired) — the test asserts the drop-semantics branch that matches
 * the observed host behaviour (sheet §6 registers the frame-level race).
 */
function MobileScrollCase() {
  return (
    <Stage>
      <Scroll
        testID="scroll"
        class="h-[400px]"
        onScroll={(e) => probe("scroll")({ x: e.offset.x, y: e.offset.y })}
        onScrollDragStart={() => probe("scroll-drag")({ kind: "start" })}
        onScrollDragEnd={() => probe("scroll-drag")({ kind: "end" })}
      >
        <View class="flex-col" style={{ height: 800 }}>
          <ColorArea
            aria-label="Color"
            className="w-[200px]"
            defaultValue="hsl(0, 0%, 50%)"
            testID="area"
            onChange={recordColor("onChange")}
            onChangeEnd={recordColor("onChangeEnd")}
            onPress={() => probe("press")({ kind: "area" })}
          >
            <ColorArea.Thumb testID="thumb" />
            <CtxProbe />
          </ColorArea>
        </View>
      </Scroll>
    </Stage>
  );
}

/**
 * M-011's controlled half: `value` is held by a signal the drag never
 * writes, so `onChange` keeps reporting proposals while the displayed color
 * (and the `value` probe) stays on the held one — the controlled contract
 * under an injected touch environment.
 */
function ControlledCase() {
  const value = signal("hsl(0, 50%, 50%)");

  return (
    <Stage>
      <ColorArea
        aria-label="Color"
        className="w-[200px]"
        testID="area"
        value={value()}
        onChange={recordColor("onChange")}
        onChangeEnd={recordColor("onChangeEnd")}
      >
        {({ state }) => (
          <View class="flex-col">
            <ColorArea.Thumb testID="thumb" />
            <Text testID="value">{state.value().toString("hsl")}</Text>
            <DisplayedValueProbe color={state.value} />
          </View>
        )}
      </ColorArea>
    </Stage>
  );
}

/* Reports the color the area actually displays on every change, so the test
 * can prove the controlled value never adopted a dragged proposal. */
function DisplayedValueProbe(props: { color: () => Color }) {
  const report = probe("value");

  effect(() => {
    report({ hsl: props.color().toString("hsl") });
  });

  return null;
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
        <CtxProbe />
      </ColorArea>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "keyboard");

  if (name === "drag") return <Scoped><DragCase /></Scoped>;
  if (name === "geometry") return <Scoped><GeometryCase /></Scoped>;
  if (name === "disabled") return <Scoped><DisabledCase /></Scoped>;
  if (name === "default-color") return <Scoped><DefaultColorCase /></Scoped>;
  if (name === "rtl-drag") return <Scoped><DragCase dir="rtl" /></Scoped>;
  if (name === "rtl-geometry") return <Scoped><GeometryCase dir="rtl" /></Scoped>;
  if (name === "mobile") return <Scoped><MobileCase /></Scoped>;
  if (name === "mobile-scroll") return <Scoped><MobileScrollCase /></Scoped>;
  if (name === "controlled") return <Scoped><ControlledCase /></Scoped>;

  return <Scoped><KeyboardCase /></Scoped>;
}

mount(Fixture);
