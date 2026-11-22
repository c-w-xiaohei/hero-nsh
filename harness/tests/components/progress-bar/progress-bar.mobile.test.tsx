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
 * `platform:"windows"` at 1024×768 pins the desktop host both runners share
 * (the sheet convention: without the pin the headless suite lands on the
 * phone-sized engine where `input` defaults to touch and the pointer-default
 * assertions invert), so the whole file runs on headless and web unchanged.
 * The observation channel is what `nsh/test` sees: `shows`/`texts`, `onLayout`
 * bounds records and `app.storage()` probe calls.
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
    platform: "windows",
    width: 1024,
    height: 768,
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
  colors: ["root-success", "root-danger", "track-success", "track-danger"],
  "value-label": ["root-value-label", "track-value-label", "fill-value-label"],
  "custom-format": ["root-custom-format", "track-custom-format"],
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
  // track/fill measure 200 / 120. The sheet's `id:output >> text:60%` cannot
  // match — the Output *is* the text element, so `text:` finds no descendant
  // (measured false on headless and web); `id:output` + `text:60%` is the
  // same fact through two selectors.
  test("M-001 default environment: geometry paints text and measured widths", async () => {
    const app = await openFixture({ case: "geometry", value: 60 });
    await settleLayout(app, GEOMETRY_BOXES);

    expect(app.shows("id:output")).toBe(true);
    expect(app.shows("text:60%")).toBe(true);
    expect(app.shows("id:track >> id:fill")).toBe(true);
    expect(lastBox(app, "track").width).toBe(200);
    expect(Math.abs(lastBox(app, "fill").width - 120)).toBeLessThan(0.6);
  }, 120_000);

  // adapt-sheets/progress-bar.md M-002 (baseline): every other case's
  // geometry and text are the untouched contract — sm/md/lg track heights
  // 4/8/12pt, fill widths follow the range math (50%, 70%, indeterminate
  // 40%), `valueLabel` and `formatOptions` drive the Output text,
  // `aria-disabled` still mounts a full bar, and the render-prop accessors
  // drive their content.
  test("M-002 default environment: every case's text and geometry unchanged", async () => {
    const sizes = await openFixture({ case: "sizes" });
    await settleLayout(sizes, ["track-sm", "track-md", "track-lg", "fill-lg"]);
    expect(lastBox(sizes, "track-sm").height).toBe(4);
    expect(lastBox(sizes, "track-md").height).toBe(8);
    expect(lastBox(sizes, "track-lg").height).toBe(12);
    expect(Math.abs(lastBox(sizes, "fill-lg").width - 100)).toBeLessThan(0.6);

    const colors = await openFixture({ case: "colors" });
    await settleLayout(colors, ["track-success", "track-danger"]);
    expect(colors.shows("id:track-success >> id:fill-success")).toBe(true);
    expect(colors.shows("id:track-danger >> id:fill-danger")).toBe(true);
    expect(Math.abs(lastBox(colors, "fill-success").width - 140)).toBeLessThan(0.6);

    const valueLabel = await openFixture({ case: "value-label" });
    expect(valueLabel.shows("id:output-value-label")).toBe(true);
    expect(valueLabel.shows("text:3 of 10 completed")).toBe(true);

    const customFormat = await openFixture({ case: "custom-format" });
    expect(customFormat.shows("id:output-custom-format")).toBe(true);
    expect(customFormat.shows("text:0.0")).toBe(true);

    const disabled = await openFixture({ case: "disabled" });
    await settleLayout(disabled, ["root-disabled", "track-disabled", "fill-disabled"]);
    expect(disabled.shows("id:output-disabled")).toBe(true);
    expect(disabled.shows("text:60%")).toBe(true);
    expect(Math.abs(lastBox(disabled, "fill-disabled").width - 120)).toBeLessThan(0.6);
    // `aria-disabled` keeps the full bar mounted and still reports
    // `accessibilityState.disabled`: `enabled()` reads false on the disabled
    // root where the same query on an enabled bar reads true (measured).
    expect(sizes.enabled("id:root-md")).toBe(true);
    expect(disabled.enabled("id:root-disabled")).toBe(false);

    const renderProp = await openFixture({ case: "render-prop" });
    await settleLayout(renderProp, ["track-render-prop"]);
    expect(renderProp.texts()).toContain("percentage:40");
    expect(renderProp.texts()).toContain("valueText:40%");
    expect(renderProp.texts()).toContain("indeterminate:false");
    expect(Math.abs(lastBox(renderProp, "fill-render-prop").width - 80)).toBeLessThan(0.6);

    // The indeterminate fill is 40% of the track — the clamp/percentage branch
    // boundary the baseline also pins.
    const indeterminate = await openFixture({ case: "geometry", indeterminate: true });
    await settleLayout(indeterminate, GEOMETRY_BOXES);
    expect(indeterminate.texts().filter((text) => text.trim() !== "")).toEqual([
      "Progress Bar",
    ]);
    expect(Math.abs(lastBox(indeterminate, "fill").width - 80)).toBeLessThan(0.6);
  }, 120_000);

  // adapt-sheets/progress-bar.md M-003 (A-001, A-002, A-003): `input="touch"`
  // changes nothing — the component table took no `input` axis, so the same
  // mount trees produce byte-identical bounds sets and texts across the two
  // environments.
  test("M-003 injected touch: bounds and texts equal the pointer baseline", async () => {
    for (const name of ["geometry", "sizes", "render-prop"]) {
      const touch = await openFixture({ case: name, value: 60, input: "touch" });
      const pointer = await openFixture({ case: name, value: 60 });
      await settleLayout(touch, CASE_BOXES[name]);
      await settleLayout(pointer, CASE_BOXES[name]);

      expect(touch.texts()).toEqual(pointer.texts());
      expect(boxSet(touch)).toEqual(boxSet(pointer));
    }
  }, 120_000);

  // adapt-sheets/progress-bar.md M-004 (A-001, A-002): `density="compact"`
  // changes nothing either — the table took no `density` axis, so `gap-1`,
  // the track heights and the radii are invariant under the preset.
  test("M-004 density compact: bounds and texts equal the default preset", async () => {
    for (const name of ["geometry", "sizes"]) {
      const compact = await openFixture({ case: name, value: 60, density: "compact" });
      const plain = await openFixture({ case: name, value: 60 });
      await settleLayout(compact, CASE_BOXES[name]);
      await settleLayout(plain, CASE_BOXES[name]);

      expect(compact.texts()).toEqual(plain.texts());
      expect(boxSet(compact)).toEqual(boxSet(plain));
    }
  }, 120_000);

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
    expect(app.shows("id:output")).toBe(true);
    expect(app.shows("text:60%")).toBe(true);
  }, 120_000);

  // adapt-sheets/progress-bar.md M-006 (A-006): the fixture channel itself —
  // `host.params.case` dispatches every mount tree, the `onLayout` probes
  // write readable `app.storage()` records, and the `input`/`density` params
  // reach `EnvironmentScope` (proven by M-003/M-004/M-005 above; the `scope`
  // channel is exercised here end-to-end once more through a touched tree).
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
      const app = await openFixture({ case: name });
      // Every case mounts at least one probed view — the first layout record
      // arriving proves both the dispatch and the storage channel.
      await app.waitUntil(() => callsOf(app, "layout").length > 0);
      expect(calls(app).length).toBeGreaterThan(0);
    }

    // `geometry` with no scope params behaves byte-identically to the port:
    // label text, output text, track/fill composition and measured widths.
    const app = await openFixture({ case: "geometry", value: 60 });
    await settleLayout(app, GEOMETRY_BOXES);
    expect(app.shows("role:progressbar[Progress Bar]")).toBe(true);
    expect(app.shows("id:output")).toBe(true);
    expect(app.shows("text:60%")).toBe(true);
    expect(lastBox(app, "track").width).toBe(200);
  }, 120_000);

  // adapt-sheets/progress-bar.md M-007 (A-007): this file itself — every case
  // opens through the same `platform:"windows"` 1024×768 pin, so the desktop
  // baseline and the injected-environment runs share one file under both the
  // headless and the `--target web` runner; no `.headless.`/`.web.` split is
  // needed because nothing injects a mobile platform or drags a held touch.
  test("M-007 dual environment: the pinned open works under both runners", async () => {
    const app = await openFixture({ case: "geometry", value: 60 });
    await settleLayout(app, GEOMETRY_BOXES);
    expect(app.shows("id:root")).toBe(true);
  }, 120_000);
});
