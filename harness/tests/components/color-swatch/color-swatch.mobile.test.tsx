import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
// Upstream imports the value model relatively (`./utils`); NSH bundles a test
// file on its own and leaves the `@heroui/react` alias external, so import the
// ported module directly instead (same as color-swatch.kobalte.test.tsx).
import { parseColor } from "../../../../src/components/color-swatch/colors/utils";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the color-swatch adapt unit, one test per row of
 * adapt-sheets/color-swatch.md §4 (M-001…M-003). Every 落点 in the sheet is
 * 保留: the swatch is a pure display element — its size/shape table gains no
 * `input`/`density` axis, the checkerboard stays a fixed render structure, and
 * press props already reach the root `View` through `viewProps(rest)`. These
 * tests pin that unchanged contract on both ends: the injected
 * `EnvironmentScope input="pointer"` (the desktop-parity half) and the
 * injected `EnvironmentScope input="touch"` (which a native phone's
 * host-derived environment already is, so M-001 also runs uninjected).
 *
 * The fixture is `harness/color-swatch.fixtures.tsx`, opened by
 * `host.params.case` (`matrix` / `named` / `press`) plus `scope` ("touch"
 * or "pointer" wraps the case in the matching `EnvironmentScope input`).
 * Probes in `app.storage()`: `layout` (per-swatch bounds) and `events`
 * (the onPress record).
 *
 * Native hosts fill the device screen, so the `platform:"windows"` /
 * 1024×768 pin is gone: where a row compares environments the pointer
 * half injects `scope="pointer"` explicitly — a native phone's
 * host-derived input is touch, and the host-derived default half stays
 * uninjected.
 */

type Params = Record<string, string>;

function openSwatch(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../color-swatch.fixtures.tsx", {
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

// adapt-sheets/color-swatch.md M-001: xs 16 / sm 24 / md 32 / lg 36 / xl 40,
// identical for both shapes (shape only moves the radius, which onLayout
// cannot read — it stays with the `color-swatch/sizes` screenshot).
const SIZE_PX: Record<string, number> = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 36,
  xl: 40,
};

const SHAPES = ["circle", "square"] as const;

/** The three accessible names the `named` case synthesizes, label text verbatim. */
function expectedNames(): string[] {
  const generated = parseColor("#0485F7").getColorName();
  return ["Brand blue", "Midnight, extra", `${generated}, night swatch`];
}

describe("color-swatch mobile", () => {
  // adapt-sheets/color-swatch.md M-001 (基线): default environment — the
  // 5×2 matrix reports its boxes through onLayout, pinned to the current
  // values; the transparent pair still lays out its size box; every swatch
  // is a `role=image` and the colorName/aria-label synthesis is unchanged.
  test("M-001 default environment: matrix bounds pinned, transparent boxes hold, role=image and names unchanged", async () => {
    const matrix = await openSwatch("matrix");
    await matrix.waitUntil(() => callsOf(matrix, "layout").length >= 12);

    const cells = layouts(matrix);
    const byName = new Map(cells.map((c) => [c.name, c] as const));
    expect(byName.size).toBe(12);

    for (const shape of SHAPES) {
      for (const [size, px] of Object.entries(SIZE_PX)) {
        const cell = byName.get(`swatch-${shape}-${size}`);
        expect(cell?.width).toBe(px);
        expect(cell?.height).toBe(px);
      }
    }

    // `color` absent and `color=""` both resolve to the transparent swatch,
    // which still occupies its configured box (md 32, lg square 36).
    expect(byName.get("swatch-nocolor")?.width).toBe(32);
    expect(byName.get("swatch-nocolor")?.height).toBe(32);
    expect(byName.get("swatch-empty")?.width).toBe(36);
    expect(byName.get("swatch-empty")?.height).toBe(36);

    expect(matrix.count("role:image")).toBe(12);

    const named = await openSwatch("named");
    expect(named.count("role:image")).toBe(3);
    for (const label of expectedNames()) {
      expect(named.shows(`role:image[${label}]`)).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/color-swatch.md M-002 (A-001, A-002, A-003): injected
  // `input="touch"` — every matrix bound equals the pointer run cell by
  // cell (no input/density axis engages on a static display part), and
  // `role=image` plus the name synthesis are unchanged.
  test("M-002 injected touch: matrix bounds identical to pointer, role=image and names unchanged", async () => {
    // Native relaunches the single host per `open()` — every read off an
    // earlier app dies with it, so the pointer run's cells are snapshotted
    // (plain data) before the touch open replaces the host.
    const pointer = await openSwatch("matrix", { scope: "pointer" });
    await pointer.waitUntil(() => callsOf(pointer, "layout").length >= 12);
    const pointerCells = layouts(pointer).map((cell) => ({ ...cell }));

    const touch = await openSwatch("matrix", { scope: "touch" });
    await touch.waitUntil(() => callsOf(touch, "layout").length >= 12);

    const byName = new Map(
      layouts(touch).map((e) => [e.name, e] as const),
    );
    expect(byName.size).toBe(12);
    for (const cell of pointerCells) {
      expect(byName.get(cell.name)?.width).toBe(cell.width);
      expect(byName.get(cell.name)?.height).toBe(cell.height);
    }
    expect(touch.count("role:image")).toBe(12);

    const named = await openSwatch("named", { scope: "touch" });
    expect(named.count("role:image")).toBe(3);
    for (const label of expectedNames()) {
      expect(named.shows(`role:image[${label}]`)).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/color-swatch.md M-003 (A-003): two environments — a swatch
  // without `onPress` has no press path at all (`app.press` finds no view
  // that hears presses and rejects; nothing can record a callback), while a
  // caller-wired `onPress` fires exactly once per environment through the
  // same `viewProps` passthrough. The "external click target" boundary is
  // the caller's job, not an environment branch.
  test("M-003 press passthrough is environment-independent; a bare swatch has no press path", async () => {
    for (const scope of ["pointer", "touch"] as const) {
      const app = await openSwatch("press", { scope });

      expect(app.count("role:image")).toBe(2);
      await expect(app.press("id:swatch-plain")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_NOT_FOUND",
      });
      expect(callsOf(app, "events")).toEqual([]);

      await app.press("id:swatch-press");
      await app.waitUntil(() => callsOf(app, "events").length === 1);
      expect(callsOf(app, "events")).toEqual([["press"]]);
    }
  }, 120_000);
});
