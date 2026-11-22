import { CanvasGradient, host, mount, Text, View } from "nsh";
import type { Component, JSX } from "nsh";
import {
  createDensity,
  createInput,
  EnvironmentScope,
  Spinner,
} from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only Spinner fixture (port sheet 4b), not a shared scenario.
 *
 * `host.params.case` picks the shape:
 *
 *   layout    The `lg` size next to the default `md` size; each root View's
 *             onLayout box is recorded so the test can read the size
 *             variant's observable effect: 32×32 points for `lg`, 24×24 for
 *             `md`. The upstream case asserts the BEM modifier class names
 *             instead, which D18 drops.
 *   gradient  Two colored spinners; `recordGradientStops` captures the color
 *             stops their arcs hand to the canvas, so X-001 can check the
 *             fade stays in the paint's hue instead of fading through the
 *             named `transparent` (black at alpha 0).
 *   sizes     (adapt sheet A-006) The four size variants sm/md/lg/xl side by
 *             side, each testID'd and onLayout-probed — the geometry source
 *             for the density-invariance rows (16/24/32/40 pt squares).
 *   label     (adapt sheet A-006) One spinner whose `aria-label` comes from
 *             `host.params.name`; absent, the component's own "Loading"
 *             default is what shows.
 *
 * `host.params.input` ("pointer"|"touch") and `host.params.density`
 * ("default"|"compact") feed `EnvironmentScope` inside `ScopedMobile`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline the mobile assertions compare against
 * (same convention as meter/kbd/badge fixtures). An `EnvProbe` inside the
 * scope reports the resolved pair as `env=input:… density:…` so the tests
 * can prove the injection engaged. Spinner has no environment branch of its
 * own (adapt sheet §2: every 落点 is 保留), so the wrapper changes nothing
 * the cases render.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find no
 * nsh.json and lose the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

type GradientStop = { offset: number; color: string };

let stopsRecorded = false;

/**
 * Records the color stops the Spinner's arcs hand to the canvas. The canvas
 * replays recorded operations natively, so this is the only place the fade's
 * colors are readable from a headless run: the 8-digit paint and its 00-alpha
 * twin must share the same RGB (X-001).
 */
function recordGradientStops() {
  if (stopsRecorded) return;

  stopsRecorded = true;

  const addColorStop = CanvasGradient.prototype.addColorStop;

  CanvasGradient.prototype.addColorStop = function (offset: number, color: string) {
    probe("gradient-stop")({ offset, color } satisfies GradientStop);
    return addColorStop.call(this, offset, color);
  };
}

/* -------------------------------------------------------------------------------------------------
 * Cases
 * -----------------------------------------------------------------------------------------------*/

function LayoutCase() {
  return (
    <View class="flex-row items-start gap-4 p-4">
      <Spinner size="lg" testID="spinner-lg" onLayout={layoutProbe("lg")} />
      <Spinner testID="spinner-md" onLayout={layoutProbe("md")} />
    </View>
  );
}

function GradientCase() {
  recordGradientStops();

  return (
    <View class="flex-row items-start gap-4 p-4">
      <Spinner color="success" />
      <Spinner color="danger" />
    </View>
  );
}

function SizesCase() {
  return (
    <View class="flex-row items-start gap-4 p-4">
      <Spinner size="sm" testID="spinner-sm" onLayout={layoutProbe("sm")} />
      <Spinner size="md" testID="spinner-md" onLayout={layoutProbe("md")} />
      <Spinner size="lg" testID="spinner-lg" onLayout={layoutProbe("lg")} />
      <Spinner size="xl" testID="spinner-xl" onLayout={layoutProbe("xl")} />
    </View>
  );
}

function LabelCase() {
  const name = String(host.params.name ?? "");

  return (
    <View class="flex-row items-start gap-4 p-4">
      <Spinner
        aria-label={name === "" ? undefined : name}
        testID="spinner-label"
        onLayout={layoutProbe("label")}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Environment scope + cases table
 * -----------------------------------------------------------------------------------------------*/

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value (`undefined` delegates to the
 * outer environment field by field), so a case opened without them is the
 * desktop-parity baseline.
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

const cases: Record<string, Component> = {
  layout: LayoutCase,
  gradient: GradientCase,
  sizes: SizesCase,
  label: LabelCase,
};

function Fixture() {
  const name = String(host.params.case ?? "layout");
  const Case = cases[name];

  return (
    <ScopedMobile>{Case ? <Case /> : <Text>{`unknown case: ${name}`}</Text>}</ScopedMobile>
  );
}

mount(Fixture);
