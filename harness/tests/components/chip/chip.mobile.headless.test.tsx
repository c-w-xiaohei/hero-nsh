import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only half of adapt-sheets/chip.md M-001 (基线): the 12-cell
 * size × variant grid's exact geometry pins. The pins are per-engine
 * literals — headless, web, ios and android all measure text differently —
 * and the shared `chip.mobile.test.tsx` file runs on the native targets,
 * whose device screens have no `platform`/`width`/`height` to pin anyway.
 * This local file keeps the `platform:"windows"` desktop pin and asserts
 * the headless engine's measured values.
 */

function openChips(
  caseName: string,
  params: Record<string, string> = {},
): Promise<App> {
  return open("../../../chip.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
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

/* The grid's laid-out boxes on the headless engine, measured under the
 * pointer desktop pin — the labels differ in length, so the widths differ
 * per variant; pinned to the current values. */
const HEADLESS_GEOMETRY: Record<string, { width: number; height: number }> = {
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
};

describe("chip mobile headless", () => {
  test("M-001 geometry pin: the 12 grid cells keep their headless layout boxes", async () => {
    const grid = await openChips("grid");
    await grid.waitUntil(() => callsOf(grid, "layout").length >= 12);
    const cells = layouts(grid);
    expect(cells).toHaveLength(12);
    expect(cells.map((e) => e.name).sort()).toEqual(
      Object.keys(HEADLESS_GEOMETRY).sort(),
    );
    for (const cell of cells) {
      expect(cell.width).toBe(HEADLESS_GEOMETRY[cell.name]?.width);
      expect(cell.height).toBe(HEADLESS_GEOMETRY[cell.name]?.height);
    }
  }, 120_000);
});
