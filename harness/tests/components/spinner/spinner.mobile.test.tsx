import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the spinner adapt unit, one test per row of
 * adapt-sheets/spinner.md §4 (M-001…M-007). The fixture is
 * `harness/spinner.fixtures.tsx`: `host.params.case` picks the mount
 * (`layout`/`gradient` are the pre-existing cases, `sizes`/`label` are the
 * A-006 additions) and `host.params.input` / `host.params.density` feed the
 * `EnvironmentScope` wrapper. The axes are always explicit —
 * `input:"pointer"` is the desktop-parity baseline every injected run
 * compares against and `input:"touch"` the injected mobile half —
 * because the host-derived default differs per target (touch on
 * ios/android, pointer on desktop and web). No `platform`/`width` open
 * options: native targets fill the device screen and reject them. The
 * fixture's `EnvProbe` reports the
 * resolved pair as `env=input:… density:…`; the injected-environment rows
 * assert it so a param that never reached the scope cannot pass vacuously,
 * and `contentTexts` filters it out of cross-environment text comparisons.
 *
 * Spinner is a pure display indicator — every §2 落点 is 保留: no input or
 * density axis, no gesture path, no presentation container. What these rows
 * pin is that nothing moves anyway: the size boxes, the accessible name,
 * the icon mount and the canvas gradient stops are identical on both
 * environments, a touch press finds no press path, and the reduced-motion
 * host still mounts the same geometry.
 *
 * M-007's dual-runner contract holds because no case injects a phone
 * platform or needs a held touch.
 */

type Box = {
  name: string;
  width: number;
  height: number;
};

type EnvParams = {
  input?: "pointer" | "touch";
  density?: "default" | "compact";
};

function openSpinner(
  params: Record<string, string>,
  options: { reducedMotion?: boolean } = {},
): Promise<App> {
  return open("../../../spinner.fixtures.tsx", {
    ...(options.reducedMotion ? { reducedMotion: true } : {}),
    host: { params },
  });
}

/** `case` + optional environment params, the shape most rows open with. */
function openCase(caseName: string, env: EnvParams = {}): Promise<App> {
  return openSpinner({
    case: caseName,
    ...(env.input ? { input: env.input } : {}),
    ...(env.density ? { density: env.density } : {}),
  });
}

function boxes(app: App): Box[] {
  return callsOf(app, "layout").map((args) => args[0] as Box);
}

/** The last bounds a probed view reported; onLayout can fire more than once. */
function lastBox(app: App, name: string): Box {
  const found = boxes(app).filter((box) => box.name === name).pop();

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

/** Waits until every named `onLayout` probe has reported at least once. */
async function settleLayout(app: App, names: string[]): Promise<void> {
  await app.waitUntil(
    () => names.every((name) => boxes(app).some((box) => box.name === name)),
    // The web target's first frames arrive slower than headless; the default
    // 5 s window flaked there on a clean run (meter.mobile.test.tsx note).
    { timeout: 30_000 },
  );
}

/**
 * name → sorted unique bounds. Repeat onLayout firings collapse to the set
 * of distinct boxes, so an environment comparison does not depend on how
 * many frames the layout took (the badge/kbd `boxSet` convention).
 */
function boxSet(app: App): Record<string, string[]> {
  const groups: Record<string, Set<string>> = {};
  for (const box of boxes(app)) {
    const key = JSON.stringify({ width: box.width, height: box.height });
    (groups[box.name] ??= new Set()).add(key);
  }
  const out: Record<string, string[]> = {};
  for (const [name, set] of Object.entries(groups)) {
    out[name] = [...set].sort();
  }
  return out;
}

/** `texts()` minus the fixture's EnvProbe line, which names the environment on purpose. */
function contentTexts(app: App): string[] {
  return app.texts().filter((text) => !text.startsWith("env="));
}

type GradientStop = { offset: number; color: string };

function gradientStops(app: App): GradientStop[] {
  return callsOf(app, "gradient-stop").map((args) => args[0] as GradientStop);
}

const SIZE_BOXES: Record<string, { width: number; height: number }> = {
  sm: { width: 16, height: 16 },
  md: { width: 24, height: 24 },
  lg: { width: 32, height: 32 },
  xl: { width: 40, height: 40 },
};

const SIZE_NAMES = ["sm", "md", "lg", "xl"] as const;

describe("spinner mobile", () => {
  // adapt-sheets/spinner.md M-001 (基线): the `sizes` case under the default
  // environment — the four size variants report their contract squares
  // (16/24/32/40 pt), every root registers `role:progressbar` with the
  // default accessible name "Loading", and the decorative icon mounts under
  // it. Same baseline the heroui file pins in T-001/T-002/T-004.
  test("M-001 default environment: size squares, named progressbar, icon mounted", async () => {
    const app = await openCase("sizes", { input: "pointer" });

    await settleLayout(app, [...SIZE_NAMES]);
    for (const name of SIZE_NAMES) {
      expect(lastBox(app, name)).toMatchObject(SIZE_BOXES[name]);
      expect(app.shows(`id:spinner-${name}`)).toBe(true);
    }

    expect(app.shows("role:progressbar[Loading]")).toBe(true);
    expect(app.shows("role:progressbar[Loading] >> id:spinner-icon")).toBe(true);
  }, 120_000);

  // adapt-sheets/spinner.md M-002 (基线): the pre-existing cases under the
  // default environment — ScopedMobile is transparent to them. `label`
  // takes the accessible name from `host.params.name` (absent → the
  // component's "Loading" default, `name="Saving changes"` → the override,
  // T-003's observable face); `layout` keeps lg=32×32 next to md=24×24
  // (T-004); `gradient` records the same 8 stops X-001 pins — two arcs,
  // each fading its own hue through the 00-alpha twin at the fixed offsets.
  test("M-002 baseline: label name override, layout geometry, gradient stops", async () => {
    const fallback = await openCase("label", { input: "pointer" });
    expect(fallback.shows("role:progressbar[Loading]")).toBe(true);

    const named = await openSpinner({
      case: "label",
      name: "Saving changes",
      input: "pointer",
    });
    expect(named.shows("role:progressbar[Saving changes]")).toBe(true);

    const layout = await openCase("layout", { input: "pointer" });
    await settleLayout(layout, ["lg", "md"]);
    expect(lastBox(layout, "lg")).toMatchObject({ width: 32, height: 32 });
    expect(lastBox(layout, "md")).toMatchObject({ width: 24, height: 24 });

    const gradient = await openCase("gradient", { input: "pointer" });
    const stops = gradientStops(gradient);

    expect(stops).toHaveLength(8);

    const gradients = [stops.slice(0, 4), stops.slice(4, 8)];
    const hues = gradients.map((arc) => arc[0].color.slice(0, 7));

    // The two spinners carry different colors, so a constant paint fails this.
    expect(new Set(hues).size).toBe(2);

    for (const [index, arc] of gradients.entries()) {
      const hue = hues[index];

      expect(arc.map((stop) => stop.color)).toEqual([
        `${hue}ff`,
        `${hue}00`,
        `${hue}00`,
        `${hue}ff`,
      ]);
      expect(arc.map((stop) => stop.offset)).toEqual([0.05271, 0.91793, 0.1524, 0.8715]);
    }
  }, 120_000);

  // adapt-sheets/spinner.md M-003 (A-001…A-004): under injected
  // `input="touch"` every case reports the same bounds, the same accessible
  // names, the same icon mount and the same gradient stops as the pointer
  // baseline — the component table carries no `input` axis and the canvas
  // draw has no environment branch, so the render is constant on both ends.
  test("M-003 injected touch changes no bound, name, icon or gradient stop", async () => {
    const sizesPointer = await openCase("sizes", { input: "pointer" });
    const sizesTouch = await openCase("sizes", { input: "touch" });

    // The scope really engaged — without this line the comparisons below
    // would pass even if `host.params.input` never reached EnvironmentScope.
    expect(sizesTouch.texts()).toContain("env=input:touch density:default");
    expect(sizesPointer.texts()).toContain("env=input:pointer density:default");

    await settleLayout(sizesPointer, [...SIZE_NAMES]);
    await settleLayout(sizesTouch, [...SIZE_NAMES]);
    expect(boxSet(sizesTouch)).toEqual(boxSet(sizesPointer));
    expect(sizesTouch.shows("role:progressbar[Loading] >> id:spinner-icon")).toBe(true);

    const layoutPointer = await openCase("layout", { input: "pointer" });
    const layoutTouch = await openCase("layout", { input: "touch" });
    await settleLayout(layoutPointer, ["lg", "md"]);
    await settleLayout(layoutTouch, ["lg", "md"]);
    expect(boxSet(layoutTouch)).toEqual(boxSet(layoutPointer));

    const labelPointer = await openCase("label", { input: "pointer" });
    const labelTouch = await openCase("label", { input: "touch" });
    await settleLayout(labelPointer, ["label"]);
    await settleLayout(labelTouch, ["label"]);
    expect(boxSet(labelTouch)).toEqual(boxSet(labelPointer));
    expect(labelTouch.shows("role:progressbar[Loading]")).toBe(true);

    const namedTouch = await openSpinner({
      case: "label",
      name: "Saving changes",
      input: "touch",
    });
    expect(namedTouch.shows("role:progressbar[Saving changes]")).toBe(true);

    const gradientPointer = await openCase("gradient", { input: "pointer" });
    const gradientTouch = await openCase("gradient", { input: "touch" });
    expect(gradientStops(gradientTouch)).toEqual(gradientStops(gradientPointer));
  }, 120_000);

  // adapt-sheets/spinner.md M-004 (A-001, A-002): under injected
  // `density="compact"` — alone and stacked with `input="touch"`, the mobile
  // combination — the size and layout geometry equals the default
  // environment's: the component table has no `density` cell, so
  // `size-4/6/8/10` does not follow the preset.
  test("M-004 injected compact density changes no bound", async () => {
    for (const caseName of ["sizes", "layout"] as const) {
      const names = caseName === "sizes" ? [...SIZE_NAMES] : ["lg", "md"];
      const plain = await openCase(caseName, { input: "pointer" });
      const compact = await openCase(caseName, { input: "pointer", density: "compact" });
      const both = await openCase(caseName, { input: "touch", density: "compact" });

      // Same non-vacuity guard as M-003: both presets must be mounted.
      expect(compact.texts()).toContain("env=input:pointer density:compact");
      expect(both.texts()).toContain("env=input:touch density:compact");

      await settleLayout(plain, names);
      await settleLayout(compact, names);
      await settleLayout(both, names);

      expect(boxSet(compact)).toEqual(boxSet(plain));
      expect(boxSet(both)).toEqual(boxSet(plain));
    }
  }, 120_000);

  // adapt-sheets/spinner.md M-005 (A-005): "不加按压" holds on the touch
  // end — a press on the spinner root either finds nothing pressable or
  // reaches no callback; the probe channel records layout reports only and
  // nothing about the mount changes. Tolerant of the concrete failure mode,
  // per the sheet (separator M-006 / meter M-005 convention).
  test("M-005 injected touch: pressing the spinner root fires no callback", async () => {
    const app = await openCase("sizes", { input: "touch" });
    await settleLayout(app, [...SIZE_NAMES]);

    const before = boxSet(app);
    const beforeTexts = app.texts();

    await expect(app.press("id:spinner-md")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    const names = calls(app).map((call) => call.name);
    expect(new Set(names)).toEqual(new Set(["layout"]));
    expect(boxSet(app)).toEqual(before);
    expect(app.texts()).toEqual(beforeTexts);
    expect(app.shows("role:progressbar[Loading]")).toBe(true);
  }, 120_000);

  // adapt-sheets/spinner.md M-006 (A-001, A-004, A-005): under
  // `reducedMotion: true` with injected touch the component still mounts —
  // same size squares, same accessible name, icon present. nsh/test cannot
  // read whether the rotation actually stopped (sheet §6 host gap), so the
  // acceptance degrades to mount/geometry/reachability invariance.
  test("M-006 reducedMotion + injected touch: mount, geometry and name constant", async () => {
    // The plain-touch run is the comparison baseline; the two reducedMotion
    // opens are the same mounts under the weakened-motion host option.
    const plain = await openCase("sizes", { input: "touch" });
    const reduced = await open("../../../spinner.fixtures.tsx", {
      reducedMotion: true,
      host: { params: { case: "sizes", input: "touch" } },
    });
    const reducedLabel = await open("../../../spinner.fixtures.tsx", {
      reducedMotion: true,
      host: { params: { case: "label", input: "touch" } },
    });

    await settleLayout(plain, [...SIZE_NAMES]);
    await settleLayout(reduced, [...SIZE_NAMES]);

    expect(boxSet(reduced)).toEqual(boxSet(plain));
    for (const name of SIZE_NAMES) {
      expect(lastBox(reduced, name)).toMatchObject(SIZE_BOXES[name]);
    }
    expect(reduced.shows("role:progressbar[Loading]")).toBe(true);
    expect(reduced.shows("role:progressbar[Loading] >> id:spinner-icon")).toBe(true);

    expect(reducedLabel.shows("role:progressbar[Loading]")).toBe(true);
    await settleLayout(reducedLabel, ["label"]);
    expect(lastBox(reducedLabel, "label")).toMatchObject({ width: 24, height: 24 });
  }, 120_000);

  // adapt-sheets/spinner.md M-007 (A-006, A-007): the fixture channel works —
  // `case` dispatches all four mounts, `input`/`density` injection reaches
  // the scope (the env line proves it), the onLayout and gradient-stop
  // probes record into `app.storage()` and read back, and the `layout`/
  // `gradient` cases keep their pre-mobile behavior verbatim under the
  // explicit pointer scope that replaced the desktop pin.
  test("M-007 fixture channel: cases dispatch, injections engage, probes record", async () => {
    const mounts: Array<{
      params: Record<string, string>;
      selector: string;
      probes: string[];
    }> = [
      { params: { case: "sizes" }, selector: "id:spinner-xl", probes: [...SIZE_NAMES] },
      { params: { case: "layout" }, selector: "id:spinner-lg", probes: ["lg", "md"] },
      { params: { case: "label" }, selector: "role:progressbar[Loading]", probes: ["label"] },
      { params: { case: "gradient" }, selector: "role:progressbar[Loading]", probes: [] },
    ];

    for (const mount of mounts) {
      const app = await openSpinner({ ...mount.params, input: "pointer" });
      expect(app.shows(mount.selector)).toBe(true);
      // The injected pointer scope is the baseline — pointer + default density.
      expect(app.texts()).toContain("env=input:pointer density:default");
      await settleLayout(app, mount.probes);
      for (const name of mount.probes) {
        expect(lastBox(app, name).width).toBeGreaterThan(0);
      }
    }

    const gradient = await openCase("gradient", { input: "pointer" });
    expect(gradientStops(gradient)).toHaveLength(8);

    // The pre-existing cases are verbatim under the wrapper: layout still
    // reports lg=32/md=24 and gradient still records its 8 stops (M-002
    // pins the full assertion; this is the channel-level recheck).
    const layout = await openCase("layout", { input: "pointer" });
    await settleLayout(layout, ["lg", "md"]);
    expect(lastBox(layout, "lg")).toMatchObject({ width: 32, height: 32 });
    expect(lastBox(layout, "md")).toMatchObject({ width: 24, height: 24 });
  }, 120_000);
});
