import { CanvasGradient, host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import { EnvironmentScope, Spinner } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only Spinner fixture (port sheet 4b), not a shared scenario.
 *
 * `layout` renders the `lg` size next to the default `md` size and records each
 * root View's onLayout box, so the test can read the size variant's observable
 * effect: 32×32 points for `lg`, 24×24 for `md`. The upstream case asserts the
 * BEM modifier class names instead, which D18 drops.
 *
 * `gradient` renders two colored spinners and records the color stops their
 * arcs hand to the canvas, so X-001 can check the fade stays in the paint's
 * hue instead of fading through the named `transparent` (black at alpha 0).
 *
 * The mobile adapt sheet (adapt-sheets/spinner.md A-006) adds two cases the
 * `.mobile.` assertions drive, all mounted under `ScopedMobile` so every case
 * — old and new — sees the same injected environment: `sizes` renders all
 * four `size` variants with onLayout bounds probes (the density-invariance
 * geometry source), and `label` maps `host.params.name` to `aria-label`
 * (absent → the default "Loading" accessible name). `host.params.input` /
 * `host.params.density` feed `EnvironmentScope`; absent params keep the
 * host-derived environment, so the pre-existing `layout`/`gradient` cases are
 * transparent to the wrapper (same convention as badge.fixtures.tsx).
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

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so opening this fixture without
 * them is the desktop-parity baseline the mobile assertions compare against
 * (adapt-sheets/spinner.md A-006, badge.fixtures.tsx's ScopedMobile).
 */
function ScopedMobile(props: { children?: JSX.Element }) {
  const input = String(host.params.input ?? "");
  const density = String(host.params.density ?? "");

  return (
    <EnvironmentScope
      input={input === "touch" || input === "pointer" ? input : undefined}
      density={density === "compact" || density === "default" ? density : undefined}
    >
      {props.children}
    </EnvironmentScope>
  );
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

/** adapt-sheets/spinner.md M-001/M-003/M-004: every `size` variant's own box. */
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

/** adapt-sheets/spinner.md M-002: `host.params.name` → `aria-label`. */
function LabelCase() {
  const name = String(host.params.name ?? "");

  return (
    <View class="flex-row items-start gap-4 p-4">
      <Spinner aria-label={name === "" ? undefined : name} />
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "layout");

  if (name === "gradient") {
    recordGradientStops();

    return (
      <ScopedMobile>
        <View class="flex-row items-start gap-4 p-4">
          <Spinner color="success" />
          <Spinner color="danger" />
        </View>
      </ScopedMobile>
    );
  }

  if (name === "sizes") {
    return (
      <ScopedMobile>
        <SizesCase />
      </ScopedMobile>
    );
  }

  if (name === "label") {
    return (
      <ScopedMobile>
        <LabelCase />
      </ScopedMobile>
    );
  }

  if (name !== "layout") return <Text>{`unknown case: ${name}`}</Text>;

  return (
    <ScopedMobile>
      <View class="flex-row items-start gap-4 p-4">
        <Spinner size="lg" testID="spinner-lg" onLayout={layoutProbe("lg")} />
        <Spinner testID="spinner-md" onLayout={layoutProbe("md")} />
      </View>
    </ScopedMobile>
  );
}

mount(Fixture);
