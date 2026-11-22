import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { dayCellSelector, rangeValues } from "../../testers/range-calendar";

/*
 * Headless-only mobile assertions for the range-calendar adapt unit — the
 * one row of adapt-sheets/range-calendar.md §4 that needs steps only the
 * headless engine provides:
 *
 *   M-011  `dragAndHold`/`drop`/`drag` — the only steps that keep a finger
 *          down while it travels across cells, which is how a "slide to
 *          extend the range" gesture would have to work if it existed. The
 *          sheet's A-008 verdict is that it does NOT exist (Native has no
 *          range-calendar and no upstream drag-select contract), so these
 *          rows assert the absence: a held drag that crosses several cells
 *          and a press cancelled mid-flight both leave `anchorDate` null,
 *          fire no `onChange` and add no selection.
 *
 * The shared file `range-calendar.mobile.test.tsx` covers M-001…M-010 and
 * M-012…M-014. Probe payloads match it: `layout`, `range-change`,
 * `seam-env`/`seam-edge`/`seam-state` from `harness/range-calendar.fixtures.tsx`.
 */

type Params = Record<string, string>;

function openCal(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../range-calendar.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

type Edges =
  | { top?: number; right?: number; bottom?: number; left?: number }
  | number
  | null;

type Channel = {
  enabled: boolean;
  isPressed: boolean;
  hitSlop: Edges;
  bounds: { width: number; height: number };
  origin: { x: number; y: number } | null;
};

type RangeStateProbe = {
  anchor: string | null;
  invalid: boolean;
  value: { start: string; end: string } | null;
};

type SeamEnv = RangeStateProbe & {
  input: string;
  cellCount: number;
  nav: {
    previous: { enabled: boolean; isPressed: boolean; hitSlop: Edges } | null;
    next: { enabled: boolean; isPressed: boolean; hitSlop: Edges } | null;
  };
};

type SeamEdge = {
  cells: string[];
  nav: { previous: boolean; next: boolean };
  anchor: string | null;
  invalid: boolean;
  value: { start: string; end: string } | null;
};

type SeamState = RangeStateProbe & {
  input: string;
  cellCount: number;
  nav: { previous: Channel | null; next: Channel | null };
  cells: ({ date: string } & Channel)[];
};

async function waitForLayout(app: App, name: string): Promise<void> {
  await app.waitUntil(() =>
    callsOf(app, "layout").some((c) => (c[0] as LayoutEntry).name === name),
  { timeout: 15_000 } );
}

function lastSeamEnv(app: App): SeamEnv {
  return callsOf(app, "seam-env").map((c) => c[0] as SeamEnv).at(-1)!;
}

function seamEdges(app: App): SeamEdge[] {
  return callsOf(app, "seam-edge").map((c) => c[0] as SeamEdge);
}

function seamStates(app: App): SeamState[] {
  return callsOf(app, "seam-state").map((c) => c[0] as SeamState);
}

function lastSeamState(app: App): SeamState {
  return seamStates(app).at(-1)!;
}

function cellOf(state: SeamState, date: string) {
  return state.cells.find((c) => c.date === date);
}

describe("range-calendar mobile (headless)", () => {
  // adapt-sheets/range-calendar.md M-011 (A-008): slide-select does not
  // exist. Under an injected touch environment a finger that lands on a day
  // cell, travels ~4 columns while held and lifts produces no `onPress`, no
  // `anchorDate` and no selection delta — the range state only ever moves
  // through `onPress`'s two-step `selectDate`. The press-cancel half (hold,
  // drag off the cell, release) is equally inert.
  test("M-011 injected touch: drag across cells and press-cancel both select nothing", async () => {
    const app = await openCal("default", { scope: "touch" });
    await waitForLayout(app, "day-2026-08-20");
    const selectedBefore = app.count("role:button[/selected/]");
    expect(selectedBefore).toBeGreaterThan(0);

    // The slide gesture a "drag to extend the range" feature would need:
    // `app.drag` lands on Aug20 (the press engages — the seam's edge log
    // records it), travels ~4 columns while held and lifts: the press is
    // cancelled before `onPress`, so no `onChange`, no anchor, no delta.
    await app.drag(dayCellSelector("2026-08-20"), { x: 160, y: 0 });
    await app.wait(200);

    expect(rangeValues(app)).toHaveLength(0);
    expect(app.count("role:button[/selected/]")).toBe(selectedBefore);
    expect(seamEdges(app).some((e) => e.cells.includes("2026-08-20"))).toBe(true);

    await app.press("id:rc-sample");
    await app.waitUntil(() => callsOf(app, "seam-state").length > 0, { timeout: 15_000 } );
    expect(lastSeamEnv(app).anchor).toBeNull();
    const cell = cellOf(lastSeamState(app), "2026-08-20")!;
    expect(cell.isPressed).toBe(false);

    // Press-cancel half, vertical this time: `app.drag` lands on Aug22,
    // moves ~3 rows down while held and lifts — the press that went down
    // mid-flight is cancelled on the way, still nothing commits.
    await app.drag(dayCellSelector("2026-08-22"), { x: 0, y: 140 });
    await app.wait(200);

    expect(rangeValues(app)).toHaveLength(0);
    expect(app.count("role:button[/selected/]")).toBe(selectedBefore);
    await app.press("id:rc-sample");
    await app.waitUntil(() => callsOf(app, "seam-state").length > 1, { timeout: 15_000 } );
    expect(lastSeamEnv(app).anchor).toBeNull();
    const cancelled = cellOf(lastSeamState(app), "2026-08-22")!;
    expect(cancelled.isPressed).toBe(false);
    app.dispose();
  }, 120_000);
});
