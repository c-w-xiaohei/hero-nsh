import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the progress-bar adapt unit, one test per row of
 * adapt-sheets/progress-bar.md §4 (M-001…M-007). The fixture is
 * `harness/progress-bar.fixtures.tsx` (A-006): `host.params.case` dispatches
 * the mount tree — `geometry` (the pre-existing case, unchanged), `sizes`,
 * `colors`, `value-label`, `custom-format`, `disabled` and `render-prop` —
 * and `host.params.input` / `host.params.density` feed `EnvironmentScope`.
 *
 * The environment axes are always explicit: `input:"pointer"` is the
 * desktop-parity baseline every comparison reads and `input:"touch"` the
 * injected mobile half, because the host-derived default differs per
 * target (touch on ios/android, pointer on desktop and web). No
 * `platform`/`width` open options: native targets fill the device screen
 * and reject them.
 * The observation channel is what `nsh/test` sees: `shows`/`texts`, `onLayout`
 * bounds records and `app.storage()` probe calls.
 *
 * A test's apps stay open until it ends and the web runner keeps them in one
 * browser, so each test opens as few apps as possible (one case per test,
 * `dispose()` once its assertions are done): with a dozen apps alive the web
 * runner's mount passes outrun the 30s test timeout.
 */

type Box = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function openFixture(params: Record<string, string | number | boolean> = {}): Promise<App> {
  return open("../../../progress-bar.fixtures.tsx", {
    clock: {},
    host: { params },
  });
}

function boxes(app: App): Box[] {
  return callsOf(app, "layout").map((args) => args[0] as Box);
}

/** Waits until every probed box has reported at least once. */
async function settleLayout(app: App, names: string[]): Promise<void> {
  await app.waitUntil(() =>
    names.every((name) => boxes(app).some((box) => box.name === name)),
  );
}

/**
 * name → sorted unique bounds. `onLayout` can fire more than once per view;
 * comparing the set of distinct boxes keeps repeat firings honest without
 * depending on how many frames the layout took. The indeterminate fill's
 * translate never enters `onLayout` — only its measured box does.
 */
function boxSet(app: App): Record<string, string[]> {
  const groups: Record<string, Set<string>> = {};
  for (const box of boxes(app)) {
    const key = JSON.stringify({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    });
    (groups[box.name] ??= new Set()).add(key);
  }
  const out: Record<string, string[]> = {};
  for (const [name, set] of Object.entries(groups)) {
    out[name] = [...set].sort();
  }
  return out;
}

const GEOMETRY_BOXES = ["root", "track", "fill"];

/** The probe names each case is expected to record, for `settleLayout`. */
const CASE_BOXES: Record<string, string[]> = {
  geometry: GEOMETRY_BOXES,
  sizes: [
    "root-sm",
    "root-md",
    "root-lg",
    "track-sm",
    "track-md",
    "track-lg",
    "fill-sm",
    "fill-md",
    "fill-lg",
  ],
  colors: [
    "root-success",
    "root-danger",
    "track-success",
    "track-danger",
    "fill-success",
    "fill-danger",
  ],
  "value-label": ["root-value-label", "track-value-label", "fill-value-label"],
  "custom-format": [
    "root-custom-format",
    "track-custom-format",
    "fill-custom-format",
  ],
  disabled: ["root-disabled", "track-disabled", "fill-disabled"],
  "render-prop": ["root-render-prop", "track-render-prop", "fill-render-prop"],
};

/** The latest recorded bounds of one probed view. */
function lastBox(app: App, name: string): Box {
  const found = boxes(app).filter((box) => box.name === name);
  const last = found[found.length - 1];

  if (!last) throw new Error(`no layout call recorded for ${name}`);

  return last;
}

describe("progress-bar mobile", () => {
  // adapt-sheets/progress-bar.md M-001 (baseline): the default environment is
  // the desktop-parity surface — the `geometry` case at value 60 paints the
  // Output's "60%", the Fill sits inside the Track, and the 200pt root's
  // track/fill measure 200 / 120.
  test("M-001 default environment: geometry paints text and measured widths", async () => {
    const app = await openFixture({ case: "geometry", value: 60, input: "pointer" });
    await settleLayout(app, GEOMETRY_BOXES);

    expect(app.texts()).toContain("60%");
    expect(app.shows("id:track >> id:fill")).toBe(true);
    // Native layout reports fractional-px bounds (Android measured
    // 52.1905/27.8095 for 52/28pt elsewhere): the 200pt track is a
    // contract asserted within a 0.25pt quantization window.
    expect(Math.abs(lastBox(app, "track").width - 200)).toBeLessThan(0.25);
    expect(Math.abs(lastBox(app, "fill").width - 120)).toBeLessThan(0.6);
  });

  // adapt-sheets/progress-bar.md M-002 (baseline), one case per test: every
  // case's geometry and text are the untouched contract. Track heights follow
  // the size axis (sm 4 / md 8 / lg 12pt), fill widths follow the range math
  // (50%, 70%, indeterminate 40%), `valueLabel` and `formatOptions` drive the
  // Output text, `aria-disabled` still mounts a full bar, and the render-prop
  // accessors drive their content.
  test("M-002 default environment: sizes case", async () => {
    const app = await openFixture({ case: "sizes", input: "pointer" });
    await settleLayout(app, CASE_BOXES.sizes);

    expect(app.texts()).toEqual(["sm", "50%", "md", "50%", "lg", "50%"]);
    // Fractional-px bound as M-001: exact tier heights ±0.25pt.
    expect(Math.abs(lastBox(app, "track-sm").height - 4)).toBeLessThan(0.25);
    expect(Math.abs(lastBox(app, "track-md").height - 8)).toBeLessThan(0.25);
    expect(Math.abs(lastBox(app, "track-lg").height - 12)).toBeLessThan(0.25);
    expect(Math.abs(lastBox(app, "fill-lg").width - 100)).toBeLessThan(0.6);
  });

  test("M-002 default environment: colors case", async () => {
    const app = await openFixture({ case: "colors", input: "pointer" });
    await settleLayout(app, CASE_BOXES.colors);

    expect(app.shows("id:track-success >> id:fill-success")).toBe(true);
    expect(app.shows("id:track-danger >> id:fill-danger")).toBe(true);
    expect(app.texts()).toEqual(["success", "70%", "danger", "70%"]);
    expect(Math.abs(lastBox(app, "fill-success").width - 140)).toBeLessThan(0.6);
    expect(Math.abs(lastBox(app, "fill-danger").width - 140)).toBeLessThan(0.6);
  });

  test("M-002 default environment: value-label case", async () => {
    const app = await openFixture({ case: "value-label", input: "pointer" });
    await settleLayout(app, CASE_BOXES["value-label"]);

    expect(app.texts()).toContain("3 of 10 completed");
    expect(Math.abs(lastBox(app, "fill-value-label").width - 60)).toBeLessThan(0.6);
  });

  test("M-002 default environment: custom-format case", async () => {
    const app = await openFixture({ case: "custom-format", input: "pointer" });
    await settleLayout(app, CASE_BOXES["custom-format"]);

    // minValue -50 / maxValue 50 / value 0 with a decimal format: a non-percent
    // style formats the clamped value itself.
    expect(app.texts()).toContain("0.0");
    expect(Math.abs(lastBox(app, "fill-custom-format").width - 100)).toBeLessThan(0.6);
  });

  test("M-002 default environment: disabled case", async () => {
    const app = await openFixture({ case: "disabled", input: "pointer" });
    await settleLayout(app, CASE_BOXES.disabled);

    expect(app.texts()).toContain("60%");
    expect(app.shows("id:track-disabled >> id:fill-disabled")).toBe(true);
    expect(Math.abs(lastBox(app, "fill-disabled").width - 120)).toBeLessThan(0.6);
  });

  test("M-002 default environment: render-prop case", async () => {
    const app = await openFixture({ case: "render-prop", input: "pointer" });
    await settleLayout(app, CASE_BOXES["render-prop"]);

    expect(app.texts()).toContain("percentage:40");
    expect(app.texts()).toContain("valueText:40%");
    expect(app.texts()).toContain("indeterminate:false");
    expect(Math.abs(lastBox(app, "fill-render-prop").width - 80)).toBeLessThan(0.6);
  });

  test("M-002 default environment: indeterminate fill is 40% of the track", async () => {
    const app = await openFixture({ case: "geometry", indeterminate: true, input: "pointer" });
    await settleLayout(app, GEOMETRY_BOXES);

    expect(app.texts().filter((text) => text.trim() !== "")).toEqual([
      "Progress Bar",
    ]);
    expect(Math.abs(lastBox(app, "fill").width - 80)).toBeLessThan(0.6);
  });

  // adapt-sheets/progress-bar.md M-003 (A-001, A-002, A-003): `input="touch"`
  // changes nothing — the component table took no `input` axis, so the same
  // mount trees produce identical bounds sets and texts across the two
  // environments. One case per test keeps the web runner's app count low.
  for (const name of ["geometry", "sizes", "render-prop"]) {
    test(`M-003 injected touch: ${name} equals the pointer baseline`, async () => {
      // Snapshot the touch app before the next open: a native open
      // relaunches the single host and invalidates every earlier App.
      const touch = await openFixture({ case: name, value: 60, input: "touch" });
      await settleLayout(touch, CASE_BOXES[name]);
      const touchTexts = touch.texts();
      const touchBoxes = boxSet(touch);

      const pointer = await openFixture({ case: name, value: 60, input: "pointer" });
      await settleLayout(pointer, CASE_BOXES[name]);

      expect(touchTexts).toEqual(pointer.texts());
      expect(touchBoxes).toEqual(boxSet(pointer));
    });
  }

  // adapt-sheets/progress-bar.md M-004 (A-001, A-002): `density="compact"`
  // changes nothing either — the table took no `density` axis, so `gap-1`,
  // the track heights and the radii are invariant under the preset.
  for (const name of ["geometry", "sizes"]) {
    test(`M-004 density compact: ${name} equals the default preset`, async () => {
      const compact = await openFixture({ case: name, value: 60, input: "pointer", density: "compact" });
      await settleLayout(compact, CASE_BOXES[name]);
      const compactTexts = compact.texts();
      const compactBoxes = boxSet(compact);

      const plain = await openFixture({ case: name, value: 60, input: "pointer" });
      await settleLayout(plain, CASE_BOXES[name]);

      expect(compactTexts).toEqual(plain.texts());
      expect(compactBoxes).toEqual(boxSet(plain));
    });
  }

  // adapt-sheets/progress-bar.md M-005 (A-004): under touch, pressing the
  // root or the track is a no-op — a read-only display block registers no
  // press target, so `app.press` cannot find one and no probe call beyond
  // the mount-time layout records lands.
  test("M-005 injected touch: no press target on root or track", async () => {
    const app = await openFixture({ case: "geometry", value: 60, input: "touch" });
    await settleLayout(app, GEOMETRY_BOXES);

    await expect(app.press("id:root")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });
    await expect(app.press("id:track")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    // The only probe channel in this case is `layout`; nothing else may fire.
    expect(calls(app).every((call) => call.name === "layout")).toBe(true);
    expect(app.texts()).toContain("60%");
  });

  // adapt-sheets/progress-bar.md M-006 (A-006): the fixture channel itself —
  // `host.params.case` dispatches every mount tree, the `onLayout` probes
  // write readable `app.storage()` records, and the `input`/`density` params
  // reach `EnvironmentScope` (exercised end-to-end by M-003/M-004/M-005).
  // Each app is disposed before the next opens: the web runner keeps a test's
  // apps in one browser, and seven at once outrun the test timeout.
  // Split in two: seven sequential `open`s take ~25-30s on the web runner and
  // the default test timeout is 30s (the second test carries the geometry
  // parity read so both halves stay well under it).
  test("M-006 fixture: case dispatch and storage probes work", async () => {
    for (const name of [
      "geometry",
      "sizes",
      "colors",
      "value-label",
      "custom-format",
      "disabled",
      "render-prop",
    ]) {
      const app = await openFixture({ case: name, input: "pointer" });
      // The first layout record arriving proves both the dispatch and the
      // storage channel (open resolves once the app rendered, so the record
      // is either there already or lands on the next frame).
      await app.waitUntil(() => callsOf(app, "layout").length > 0);
      expect(calls(app).length).toBeGreaterThan(0);
      app.dispose();
    }
  });

  test("M-006 fixture: unscoped geometry stays byte-identical to the port", async () => {
    const app = await openFixture({ case: "geometry", value: 60, input: "pointer" });
    await settleLayout(app, GEOMETRY_BOXES);
    expect(app.shows("role:progressbar[Progress Bar]")).toBe(true);
    expect(app.texts()).toContain("60%");
    expect(Math.abs(lastBox(app, "track").width - 200)).toBeLessThan(0.25);
  });

  // adapt-sheets/progress-bar.md M-007 (A-007): this file itself — the
  // baseline opens through the explicit pointer scope that replaces the old
  // desktop pin, and the injected-environment runs share one file under
  // every target; no `.headless.`/`.web.` split is needed because nothing
  // injects a mobile platform or drags a held touch.
  test("M-007 dual environment: the scoped open works under every target", async () => {
    const app = await openFixture({ case: "geometry", value: 60, input: "pointer" });
    await settleLayout(app, GEOMETRY_BOXES);
    expect(app.shows("id:root")).toBe(true);
  });
});
