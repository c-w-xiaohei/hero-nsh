import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the chip adapt unit, one test per row of
 * adapt-sheets/chip.md §4 (M-001…M-004). Every 落点 in the sheet is 保留:
 * `onPress` and friends already reach the root `View` through
 * `viewProps(rest)`, so these tests pin the unchanged contract — a chip
 * with `onPress` is pressable in both environments, a chip without one
 * has no press path at all, and injected touch moves no geometry.
 *
 * The fixture is `harness/chip.fixtures.tsx`, opened by `host.params`:
 * `case` (static/grid/press), `scope` ("" or "touch" through
 * `EnvironmentScope`), `hitslop` (points passed through as `hitSlop`).
 * Probes in `app.storage()`: `events` (the pressDown/pressUp/press
 * sequence), `layout` (per-cell geometry of the size×variant grid) and
 * `env` (the host's `platform.os`/`desktop` — headless and web measure
 * text differently, so the M-001 geometry pins are per-target).
 *
 * Both environments are covered in the same file: the default (pointer,
 * which is also the desktop-parity baseline) and the injected touch one.
 */

type Params = Record<string, string>;

function openChips(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../chip.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function layouts(app: App): LayoutEntry[] {
  return callsOf(app, "layout").map((c) => c[0] as LayoutEntry);
}

type EnvReport = { os: string; desktop: boolean };

/** The host platform report the fixture probes once per mount. */
function envOf(app: App): EnvReport {
  return callsOf(app, "env").at(-1)?.[0] as EnvReport;
}

/* The M-001 geometry baseline, measured on the default environment — one
 * table per text-measuring target, since headless and web lay the same
 * labels out differently (the fixture's `env` probe says which is running).
 * The labels differ in length, so the widths differ per variant; pinned to
 * the current values either way. */
const GEOMETRY: Record<string, Record<string, { width: number; height: number }>> = {
  headless: {
    "chip-sm-primary": { width: 78, height: 15 },
    "chip-sm-secondary": { width: 92, height: 15 },
    "chip-sm-soft": { width: 59, height: 15 },
    "chip-sm-tertiary": { width: 85, height: 15 },
    "chip-md-primary": { width: 86, height: 19 },
    "chip-md-secondary": { width: 100, height: 19 },
    "chip-md-soft": { width: 67, height: 19 },
    "chip-md-tertiary": { width: 93, height: 19 },
    "chip-lg-primary": { width: 105, height: 25 },
    "chip-lg-secondary": { width: 121, height: 25 },
    "chip-lg-soft": { width: 82, height: 25 },
    "chip-lg-tertiary": { width: 113, height: 25 },
  },
  web: {
    "chip-sm-primary": { width: 72, height: 16 },
    "chip-sm-secondary": { width: 88, height: 16 },
    "chip-sm-soft": { width: 52, height: 16 },
    "chip-sm-tertiary": { width: 69, height: 16 },
    "chip-md-primary": { width: 81, height: 24 },
    "chip-md-secondary": { width: 97, height: 24 },
    "chip-md-soft": { width: 61, height: 24 },
    "chip-md-tertiary": { width: 78, height: 24 },
    "chip-lg-primary": { width: 91, height: 28 },
    "chip-lg-secondary": { width: 109, height: 28 },
    "chip-lg-soft": { width: 67, height: 28 },
    "chip-lg-tertiary": { width: 87, height: 28 },
  },
};

const PRESS_SEQUENCE = [
  ["pressDown"],
  ["pressUp"],
  ["press"],
];

describe("chip mobile", () => {
  // adapt-sheets/chip.md M-001 (基线): default environment — a bare `<Chip>`
  // renders its label and has no press path: `app.press` finds no view that
  // hears presses and rejects, so no callback can ever record. The 12
  // size × variant cells report their laid-out boxes through `onLayout`,
  // pinned to the current values of the running target (`env` probe:
  // headless and web measure text differently).
  test("M-001 default environment: static chip renders, has no press path, geometry pinned", async () => {
    const app = await openChips("static");

    expect(app.shows("id:chip-static")).toBe(true);
    expect(app.shows("text:Static chip")).toBe(true);
    await expect(app.press("id:chip-static")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    const grid = await openChips("grid");
    await grid.waitUntil(() => callsOf(grid, "layout").length >= 12);
    const cells = layouts(grid);
    expect(cells).toHaveLength(12);
    const baseline = GEOMETRY[envOf(grid).os === "web" ? "web" : "headless"];
    expect(cells.map((e) => e.name).sort()).toEqual(
      Object.keys(baseline).sort(),
    );
    for (const cell of cells) {
      expect(cell.width).toBe(baseline[cell.name]?.width);
      expect(cell.height).toBe(baseline[cell.name]?.height);
    }
  }, 120_000);

  // adapt-sheets/chip.md M-002 (基线): default environment — an `onPress`
  // chip fires the host press lifecycle once, in order: `onPressDown`,
  // `onPressUp`, then `onPress` (the order `viewProps` forwards them in).
  test("M-002 default environment: onPress chip records down, up, press in order", async () => {
    const app = await openChips("press");

    await app.press("id:chip-press");
    await app.waitUntil(() => callsOf(app, "events").length === 3);

    expect(callsOf(app, "events")).toEqual(PRESS_SEQUENCE);
  }, 120_000);

  // adapt-sheets/chip.md M-003 (A-001): injected `input="touch"` — the same
  // `viewProps` passthrough fires the identical sequence, and a
  // caller-passed `hitSlop` does not disturb it. The sheet's out-of-bounds
  // half ("边界外按压计入") is not observable through `nsh/test`: `press`
  // resolves a selector to the view or an ancestor that hears presses,
  // never by hit-area overlap — pressing `id:slop-target` rejects
  // `ERR_NSH_TEST_NOT_FOUND` with and without `hitSlop` (measured), so per
  // the sheet the assertion degrades to the callback recording.
  test("M-003 injected touch: onPress chip fires the same sequence, hitSlop passthrough holds", async () => {
    const app = await openChips("press", { scope: "touch" });

    await app.press("id:chip-press");
    await app.waitUntil(() => callsOf(app, "events").length === 3);
    expect(callsOf(app, "events")).toEqual(PRESS_SEQUENCE);

    const slop = await openChips("press", {
      scope: "touch",
      hitslop: "16",
    });
    await slop.press("id:chip-press");
    await slop.waitUntil(() => callsOf(slop, "events").length === 3);
    expect(callsOf(slop, "events")).toEqual(PRESS_SEQUENCE);
  }, 120_000);

  // adapt-sheets/chip.md M-004 (A-001, A-002): injected `input="touch"` —
  // the static chip still renders and still has no press path (no feedback
  // path is registered: `press` rejects the same way), and every grid
  // cell's box is identical to the pointer baseline — "静态用法保持展示"
  // on both ends.
  test("M-004 injected touch: static chip unchanged, grid geometry identical to pointer", async () => {
    const app = await openChips("static", { scope: "touch" });

    expect(app.shows("id:chip-static")).toBe(true);
    expect(app.shows("text:Static chip")).toBe(true);
    await expect(app.press("id:chip-static")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    const pointer = await openChips("grid");
    const touch = await openChips("grid", { scope: "touch" });
    await pointer.waitUntil(() => callsOf(pointer, "layout").length >= 12);
    await touch.waitUntil(() => callsOf(touch, "layout").length >= 12);

    const byName = new Map(
      layouts(touch).map((e) => [e.name, e] as const),
    );
    expect(byName.size).toBe(12);
    for (const cell of layouts(pointer)) {
      expect(byName.get(cell.name)?.width).toBe(cell.width);
      expect(byName.get(cell.name)?.height).toBe(cell.height);
    }
  }, 120_000);
});
