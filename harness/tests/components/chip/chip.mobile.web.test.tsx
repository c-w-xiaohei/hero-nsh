import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only half of adapt-sheets/chip.md M-001 (基线): the 12-cell
 * size × variant grid's exact geometry pins on the web text engine. The
 * pins are per-engine literals — headless, web, ios and android all
 * measure text differently — so the headless table lives in
 * `chip.mobile.headless.test.tsx` and this file pins the web baseline the
 * original M-001 measured (`env` probe `os === "web"`). The shared
 * `chip.mobile.test.tsx` keeps the structural half that runs on every
 * target. The `platform:"web"` pin is the `.web.` convention: the web
 * target's page starts at 1024×768 in the desktop idiom, so `input`
 * resolves `"pointer"`.
 */

function openChips(
  caseName: string,
  params: Record<string, string> = {},
): Promise<App> {
  return open("../../../chip.fixtures.tsx", {
    platform: "web",
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

/* The grid's laid-out boxes on the web engine, measured under the pointer
 * desktop pin — the labels differ in length, so the widths differ per
 * variant; pinned to the values the original M-001 web table recorded. */
const WEB_GEOMETRY: Record<string, { width: number; height: number }> = {
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
};

describe("chip mobile (web)", () => {
  test("M-001 geometry pin: the 12 grid cells keep their web layout boxes", async () => {
    const grid = await openChips("grid");
    await grid.waitUntil(() => callsOf(grid, "layout").length >= 12);
    const cells = layouts(grid);
    expect(cells).toHaveLength(12);
    expect(cells.map((e) => e.name).sort()).toEqual(
      Object.keys(WEB_GEOMETRY).sort(),
    );
    for (const cell of cells) {
      expect(cell.width).toBe(WEB_GEOMETRY[cell.name]?.width);
      expect(cell.height).toBe(WEB_GEOMETRY[cell.name]?.height);
    }
  }, 120_000);
});
