import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the spinner adapt unit, one test per row of
 * adapt-sheets/spinner.md §4 (M-001…M-007). Spinner is action A, a pure
 * display indicator: no `input`/`density` axis, no gesture, no presentation —
 * every environment assertion compares the injected environment against the
 * pointer baseline and finds it identical.
 *
 * The fixture is `harness/spinner.fixtures.tsx`: `sizes` (all four size
 * variants with onLayout bounds probes), `layout` (lg + md), `label`
 * (`host.params.name` → `aria-label`) and `gradient` (canvas `gradient-stop`
 * probes), all mounted under `EnvironmentScope` fed by `host.params.input` /
 * `host.params.density`. Absent params leave the host-derived environment —
 * pointer + default density on the desktop pin — which is the baseline every
 * assertion compares against. `platform:"windows", width:1024, height:768`
 * pins the pointer host on headless and web so the phone-engine default-input
 * derivation cannot invert the suite (the switch M-001/3/4 lesson). No row
 * needs a platform injection or a held touch, so both targets run this one
 * file — no `.headless.`/`.web.` split.
 */

type Params = Record<string, string>;

function openSpinner(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "reducedMotion"> = {},
): Promise<App> {
  return open("../../../spinner.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type LayoutCall = { name: string; width: number; height: number };

/** The last recorded `layout` box for a spinner, keyed by its probe name. */
function lastLayout(app: App, name: string): LayoutCall {
  const found = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name)
    .at(-1);

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

async function waitForLayout(app: App, count: number): Promise<void> {
  await app.waitUntil(() => callsOf(app, "layout").length >= count);
}

/** The `sizes` case's four boxes, {name: [w, h]}, as a comparable plain object. */
function sizesBoxes(app: App): Record<string, [number, number]> {
  const boxes: Record<string, [number, number]> = {};
  for (const name of ["sm", "md", "lg", "xl"]) {
    const box = lastLayout(app, name);
    boxes[name] = [box.width, box.height];
  }
  return boxes;
}

const SIZE_TABLE: Record<string, [number, number]> = {
  sm: [16, 16],
  md: [24, 24],
  lg: [32, 32],
  xl: [40, 40],
};

type GradientStop = { offset: number; color: string };

/** X-001's read of the `gradient` case: 8 stops, two hues, alpha-only fades. */
function gradientStops(app: App): GradientStop[] {
  return callsOf(app, "gradient-stop").map((args) => args[0] as GradientStop);
}

function expectGradientContract(app: App): void {
  const stops = gradientStops(app);

  expect(stops).toHaveLength(8);

  const gradients = [stops.slice(0, 4), stops.slice(4, 8)];
  const hues = gradients.map((gradient) => gradient[0].color.slice(0, 7));

  expect(new Set(hues).size).toBe(2);

  for (const [index, gradient] of gradients.entries()) {
    const hue = hues[index];

    expect(gradient.map((stop) => stop.color)).toEqual([
      `${hue}ff`,
      `${hue}00`,
      `${hue}00`,
      `${hue}ff`,
    ]);
    expect(gradient.map((stop) => stop.offset)).toEqual([
      0.05271, 0.91793, 0.1524, 0.8715,
    ]);
  }
}

describe("spinner mobile", () => {
  // adapt-sheets/spinner.md M-001 (基线): default environment on the desktop
  // pin — the four `size` variants lay out as 16/24/32/40pt boxes, the root
  // shows as `role:progressbar` with the default "Loading" name, and the
  // icon sub-part mounts inside it; line for line the
  // spinner.heroui.test.tsx T-001/T-002/T-004 baseline.
  test("M-001 default environment: size boxes, progressbar name and icon mount", async () => {
    const app = await openSpinner("sizes");
    await waitForLayout(app, 4);

    expect(sizesBoxes(app)).toEqual(SIZE_TABLE);
    expect(app.shows("role:progressbar[Loading]")).toBe(true);
    expect(app.shows("role:progressbar[Loading] >> id:spinner-icon")).toBe(true);
  }, 120_000);

  // adapt-sheets/spinner.md M-002 (基线): the `label` case keeps the default
  // accessible name with no `name` param and honors the override (T-003
  // equivalent); `layout` still reports lg=32×32 / md=24×24 and `gradient`
  // records the same 8 stops as X-001 — the ScopedMobile wrapper is
  // transparent to the pre-existing cases.
  test("M-002 label override and pre-existing cases unchanged under the wrapper", async () => {
    const defaulted = await openSpinner("label");
    expect(defaulted.shows("role:progressbar[Loading]")).toBe(true);

    const named = await openSpinner("label", { name: "Saving changes" });
    expect(named.shows("role:progressbar[Saving changes]")).toBe(true);

    const layout = await openSpinner("layout");
    await waitForLayout(layout, 2);
    expect(lastLayout(layout, "lg")).toMatchObject({ width: 32, height: 32 });
    expect(lastLayout(layout, "md")).toMatchObject({ width: 24, height: 24 });

    const gradient = await openSpinner("gradient");
    await gradient.waitUntil(() => gradientStops(gradient).length >= 8);
    expectGradientContract(gradient);
  }, 120_000);

  // adapt-sheets/spinner.md M-003 (A-001…A-004): injected `input="touch"` —
  // the component realizes no `input` cell and the canvas/animation channel
  // has no environment branch, so every case's bounds, accessible name, icon
  // mount and gradient stops equal the pointer baseline.
  test("M-003 injected touch: every case is identical to the pointer baseline", async () => {
    const sizes = await openSpinner("sizes", { input: "touch" });
    await waitForLayout(sizes, 4);
    expect(sizesBoxes(sizes)).toEqual(SIZE_TABLE);
    expect(sizes.shows("role:progressbar[Loading] >> id:spinner-icon")).toBe(true);

    const layout = await openSpinner("layout", { input: "touch" });
    await waitForLayout(layout, 2);
    expect(lastLayout(layout, "lg")).toMatchObject({ width: 32, height: 32 });
    expect(lastLayout(layout, "md")).toMatchObject({ width: 24, height: 24 });

    const label = await openSpinner("label", {
      input: "touch",
      name: "Saving changes",
    });
    expect(label.shows("role:progressbar[Saving changes]")).toBe(true);

    const gradient = await openSpinner("gradient", { input: "touch" });
    await gradient.waitUntil(() => gradientStops(gradient).length >= 8);
    expectGradientContract(gradient);
  }, 120_000);

  // adapt-sheets/spinner.md M-004 (A-001, A-002): injected `density="compact"`
  // (stacked with touch) — the component table has no density cell, so the
  // `size-4/6/8/10` classes follow no preset: bounds equal the baseline.
  test("M-004 injected compact density: size bounds are identical to the baseline", async () => {
    const plain = await openSpinner("sizes");
    await waitForLayout(plain, 4);
    const compact = await openSpinner("sizes", {
      input: "touch",
      density: "compact",
    });
    await waitForLayout(compact, 4);

    expect(sizesBoxes(compact)).toEqual(sizesBoxes(plain));
    expect(sizesBoxes(compact)).toEqual(SIZE_TABLE);

    const layoutCompact = await openSpinner("layout", {
      input: "touch",
      density: "compact",
    });
    await waitForLayout(layoutCompact, 2);
    expect(lastLayout(layoutCompact, "lg")).toMatchObject({
      width: 32,
      height: 32,
    });
    expect(lastLayout(layoutCompact, "md")).toMatchObject({
      width: 24,
      height: 24,
    });
  }, 120_000);

  // adapt-sheets/spinner.md M-005 (A-005): injected touch — the spinner root
  // is not a press target ("不加按压"): `app.press` resolves no pressable
  // view and rejects, which is the "no press path" evidence; the tree and
  // the probe record are untouched (the case records `layout` calls only).
  test("M-005 injected touch: no press path — press rejects and nothing records", async () => {
    const app = await openSpinner("sizes", { input: "touch" });
    await waitForLayout(app, 4);
    const before = calls(app);

    await expect(app.press("id:spinner-md")).rejects.toThrow();

    expect(app.shows("id:spinner-md")).toBe(true);
    expect(sizesBoxes(app)).toEqual(SIZE_TABLE);
    // No component-owned callback exists, so the probe record is unchanged.
    expect(calls(app)).toEqual(before);
    expect(new Set(calls(app).map((call) => call.name))).toEqual(
      new Set(["layout"]),
    );
  }, 120_000);

  // adapt-sheets/spinner.md M-006 (A-001, A-004, A-005): `reducedMotion` with
  // injected touch — the reduce-motion acceptance degrades to "the component
  // mounts and its geometry and accessible surface are unchanged" (whether
  // the turn actually stops is not readable from nsh/test; sheet §6).
  test("M-006 reducedMotion + touch: mount, bounds and accessible name unchanged", async () => {
    const sizes = await openSpinner(
      "sizes",
      { input: "touch" },
      { reducedMotion: true },
    );
    await waitForLayout(sizes, 4);
    expect(sizesBoxes(sizes)).toEqual(SIZE_TABLE);
    expect(sizes.shows("role:progressbar[Loading] >> id:spinner-icon")).toBe(
      true,
    );

    const label = await openSpinner(
      "label",
      { input: "touch", name: "Saving changes" },
      { reducedMotion: true },
    );
    expect(label.shows("role:progressbar[Saving changes]")).toBe(true);
  }, 120_000);

  // adapt-sheets/spinner.md M-007 (A-006, A-007): the fixture channel itself
  // — all four cases dispatch and open, environment injection reaches the
  // app, and the probe storage reads back; `layout`/`gradient` are identical
  // with no injection, and the desktop pin keeps this file green on both
  // headless and --target web.
  test("M-007 fixture channel: every case opens, injects and records", async () => {
    for (const env of [{}, { input: "touch" }, { density: "compact" }] as Params[]) {
      const app = await openSpinner("sizes", env);
      await waitForLayout(app, 4);
      expect(app.shows("role:progressbar[Loading]")).toBe(true);
    }

    for (const caseName of ["layout", "label", "gradient"] as const) {
      const app = await openSpinner(caseName);
      expect(app.shows("role:progressbar")).toBe(true);
    }
  }, 120_000);
});
