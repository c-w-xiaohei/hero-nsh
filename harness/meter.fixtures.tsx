import { host, mount, Text, View } from "nsh";
import type { Component, JSX } from "nsh";
import { createDensity, createInput, EnvironmentScope, Label, Meter } from "@heroui/react";
import type { MeterRenderProps } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Meter adapt unit (adapt-sheets/meter.md §2 A-006,
 * §4 M-001…M-007). The shared scenarios (`scenarios/meter.scenarios.tsx`) have
 * no channel for `EnvironmentScope`, so the dual-environment tests drive this
 * entry instead.
 *
 * `host.params.case` picks the mount:
 *
 *   default        One meter (`value={60}`): `Label` "Storage" + Output +
 *                  Track + Fill, every part testID'd and `onLayout`-probed
 *                  (`root`/`track`/`output`/`fill`) inside a 300-point track
 *                  column — the fill reports 180 = 300 × 60%.
 *   sizes          Three meters sm/md/lg (40/60/80) on 300-point tracks;
 *                  the track bounds pin the size variant's height contract
 *                  (4/8/12 pt) and each fill its percentage width.
 *   colors         `success` and `danger` meters at 50%; the fills' resolved
 *                  backgrounds distinguish the paint contract.
 *   value-label    `valueLabel` verbatim: Output shows "3 of 10 completed",
 *                  the fill still tracks percentage (30 of 100 → 90 pt).
 *   custom-format  `formatOptions` currency USD, 750/1000: Output shows the
 *                  formatted value, the fill is 75% of 300.
 *   disabled       `aria-disabled` on the root: the registered label, the
 *                  Output text and the fill geometry stay while the root
 *                  reports disabled.
 *   render-prop    Function children `{ percentage, valueText }` (accessors):
 *                  a custom Output text built from them plus the parts.
 *
 * `host.params.input` ("pointer"|"touch") and `host.params.density`
 * ("default"|"compact") feed `EnvironmentScope` inside `ScopedMobile`; an
 * absent param keeps the host-derived value, so a case opened without them is
 * the desktop-parity baseline. An `EnvProbe` inside the scope reports the
 * resolved pair as `env=input:… density:…` so the tests can prove the
 * injection engaged (and filter the line out of `texts()` comparisons, where
 * the two environments differ on purpose). Nothing else touches the
 * environment — Meter has no environment branch of its own (A-001…A-005 all
 * 保留).
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... would find
 * no nsh.json and lose the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** The whole bounds box, recorded as one probe call for `callsOf(app, "layout")`. */
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

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them is
 * the desktop-parity baseline.
 */
function ScopedMobile(props: { children?: JSX.Element }) {
  const input = String(host.params.input ?? "");
  const density = String(host.params.density ?? "");

  return (
    <EnvironmentScope
      input={input === "touch" || input === "pointer" ? input : undefined}
      density={density === "compact" || density === "default" ? density : undefined}
    >
      <EnvProbe />
      {props.children}
    </EnvironmentScope>
  );
}

/** Reports the scope-resolved environment so a test can see the wrapper worked. */
function EnvProbe() {
  const input = createInput();
  const density = createDensity();

  return <Text>{`env=input:${input()} density:${density()}`}</Text>;
}

/** Every case's track column: 300 points so a fill box is the percentage in points. */
function Column(props: { children?: JSX.Element }) {
  return (
    <View class="p-6">
      <View class="w-[300px]">{props.children}</View>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * default (M-001, M-003…M-006)
 * -----------------------------------------------------------------------------------------------*/

function DefaultCase() {
  return (
    <Column>
      <Meter testID="meter" value={60} onLayout={layout("root")}>
        <Label>Storage</Label>
        <Meter.Output testID="output" onLayout={layout("output")} />
        <Meter.Track testID="track" onLayout={layout("track")}>
          <Meter.Fill testID="fill" onLayout={layout("fill")} />
        </Meter.Track>
      </Meter>
    </Column>
  );
}

/* -------------------------------------------------------------------------------------------------
 * sizes / colors (M-002, M-006)
 * -----------------------------------------------------------------------------------------------*/

function SizesCase() {
  return (
    <Column>
      <View class="flex-col gap-4">
        <Meter testID="meter-sm" size="sm" value={40}>
          <Label>Small</Label>
          <Meter.Output testID="output-sm" />
          <Meter.Track testID="track-sm" onLayout={layout("track-sm")}>
            <Meter.Fill testID="fill-sm" onLayout={layout("fill-sm")} />
          </Meter.Track>
        </Meter>
        <Meter testID="meter-md" size="md" value={60}>
          <Label>Medium</Label>
          <Meter.Output testID="output-md" />
          <Meter.Track testID="track-md" onLayout={layout("track-md")}>
            <Meter.Fill testID="fill-md" onLayout={layout("fill-md")} />
          </Meter.Track>
        </Meter>
        <Meter testID="meter-lg" size="lg" value={80}>
          <Label>Large</Label>
          <Meter.Output testID="output-lg" />
          <Meter.Track testID="track-lg" onLayout={layout("track-lg")}>
            <Meter.Fill testID="fill-lg" onLayout={layout("fill-lg")} />
          </Meter.Track>
        </Meter>
      </View>
    </Column>
  );
}

function ColorsCase() {
  return (
    <Column>
      <View class="flex-col gap-4">
        <Meter testID="meter-success" color="success" value={50}>
          <Label>Success</Label>
          <Meter.Output testID="output-success" />
          <Meter.Track testID="track-success">
            <Meter.Fill testID="fill-success" onLayout={layout("fill-success")} />
          </Meter.Track>
        </Meter>
        <Meter testID="meter-danger" color="danger" value={50}>
          <Label>Danger</Label>
          <Meter.Output testID="output-danger" />
          <Meter.Track testID="track-danger">
            <Meter.Fill testID="fill-danger" onLayout={layout("fill-danger")} />
          </Meter.Track>
        </Meter>
      </View>
    </Column>
  );
}

/* -------------------------------------------------------------------------------------------------
 * value-label / custom-format / disabled / render-prop (M-002, M-006)
 * -----------------------------------------------------------------------------------------------*/

function ValueLabelCase() {
  return (
    <Column>
      <Meter testID="meter" maxValue={10} minValue={0} value={3} valueLabel="3 of 10 completed">
        <Label>Meter</Label>
        <Meter.Output testID="value-label" />
        <Meter.Track testID="track">
          <Meter.Fill testID="fill" onLayout={layout("fill")} />
        </Meter.Track>
      </Meter>
    </Column>
  );
}

function CustomFormatCase() {
  return (
    <Column>
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
    </Column>
  );
}

function DisabledCase() {
  return (
    <Column>
      <Meter aria-disabled testID="meter" value={50}>
        <Label>Storage</Label>
        <Meter.Output testID="output" />
        <Meter.Track testID="track">
          <Meter.Fill testID="fill" onLayout={layout("fill")} />
        </Meter.Track>
      </Meter>
    </Column>
  );
}

function RenderPropCase() {
  return (
    <Column>
      <Meter testID="meter" value={40}>
        {(values: MeterRenderProps) => (
          <>
            <Label>Progress</Label>
            <Meter.Output testID="output">{`done ${Math.round(values.percentage())}% (${values.valueText()})`}</Meter.Output>
            <Meter.Track testID="track">
              <Meter.Fill testID="fill" onLayout={layout("fill")} />
            </Meter.Track>
          </>
        )}
      </Meter>
    </Column>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  default: DefaultCase,
  sizes: SizesCase,
  colors: ColorsCase,
  "value-label": ValueLabelCase,
  "custom-format": CustomFormatCase,
  disabled: DisabledCase,
  "render-prop": RenderPropCase,
};

function Fixture() {
  const name = String(host.params.case ?? "default");
  const Case = cases[name] ?? DefaultCase;

  return (
    <ScopedMobile>
      <Case />
    </ScopedMobile>
  );
}

mount(Fixture);
