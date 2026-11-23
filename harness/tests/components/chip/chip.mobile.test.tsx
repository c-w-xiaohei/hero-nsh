import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
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
 * `case` (static/grid/press), `scope` ("pointer"/"touch" through
 * `EnvironmentScope`), `hitslop` (points passed through as `hitSlop`).
 * Probes in `app.storage()`: `events` (the pressDown/pressUp/press
 * sequence) and `layout` (per-cell geometry of the size×variant grid).
 *
 * Both environments are covered in the same file: `scope:"pointer"` is the
 * desktop-parity baseline and `scope:"touch"` the injected mobile half —
 * explicit because the host-derived default differs per target (touch on
 * ios/android, pointer on desktop and web). No `platform`/`width`/`height`
 * open options: the native targets fill the device screen and reject them.
 *
 * One M-001 half moved out: the 12-cell grid's exact width/height pins are
 * per-engine literals — ios and android measure text differently again —
 * so the headless table lives in `chip.mobile.headless.test.tsx` and the
 * web table in `chip.mobile.web.test.tsx`, both local files CI never runs.
 * This file keeps the structural half (all 12 cells report, and injected
 * touch moves no box).
 */

type Params = Record<string, string>;

function openChips(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../chip.fixtures.tsx", {
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

const PRESS_SEQUENCE = [
  ["pressDown"],
  ["pressUp"],
  ["press"],
];

describe("chip mobile", () => {
  // adapt-sheets/chip.md M-001 (基线): pointer baseline — a bare `<Chip>`
  // renders its label and has no press path: `app.press` finds no view that
  // hears presses and rejects, so no callback can ever record. The 12
  // size × variant cells all report their laid-out boxes through `onLayout`
  // (their exact width/height pins are per-engine and moved to
  // `chip.mobile.headless.test.tsx` — ios and android measure text
  // differently again).
  test("M-001 pointer baseline: static chip renders, has no press path, grid reports 12 cells", async () => {
    const app = await openChips("static", { scope: "pointer" });

    expect(app.shows("id:chip-static")).toBe(true);
    expect(app.shows("text:Static chip")).toBe(true);
    await expect(app.press("id:chip-static")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    const grid = await openChips("grid", { scope: "pointer" });
    await grid.waitUntil(() => callsOf(grid, "layout").length >= 12);
    const cells = layouts(grid);
    expect(cells).toHaveLength(12);
    for (const cell of cells) {
      expect(cell.width).toBeGreaterThan(0);
      expect(cell.height).toBeGreaterThan(0);
    }
  }, 120_000);

  // adapt-sheets/chip.md M-002 (基线): default environment — an `onPress`
  // chip fires the host press lifecycle once, in order: `onPressDown`,
  // `onPressUp`, then `onPress` (the order `viewProps` forwards them in).
  test("M-002 pointer baseline: onPress chip records down, up, press in order", async () => {
    const app = await openChips("press", { scope: "pointer" });

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

    const pointer = await openChips("grid", { scope: "pointer" });
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
