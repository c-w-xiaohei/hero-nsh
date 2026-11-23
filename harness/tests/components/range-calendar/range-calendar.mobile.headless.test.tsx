import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { dayCellSelector, rangeValues } from "../../testers/range-calendar";

/*
 * Headless-only mobile assertions for the range-calendar adapt unit — the
 * rows of adapt-sheets/range-calendar.md §4 that need steps only the
 * headless engine provides:
 *
 *   M-004  `app.hover` — the touch hover-gating row: hover events still
 *          arrive under injected touch while no hover paint lingers, and
 *          the pointer control proves the hover surface is observable.
 *          Native ios/android have no mouse channel, so the row moved here
 *          whole rather than split.
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
 * The shared file `range-calendar.mobile.test.tsx` covers M-001…M-003,
 * M-005…M-010 and M-012…M-014. Probe payloads match it: `layout`,
 * `range-change`, `cell-hover`, `seam-env`/`seam-edge`/`seam-state` from
 * `harness/range-calendar.fixtures.tsx`. Environment params match it too:
 * `testInput` ("pointer"/"touch") picks the fixture's environment.
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

/** Today's ISO date on the test host's calendar — the `today` case's month. */
function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A same-month neighbour of `iso`, ten days away, clamped inside the month. */
function siblingIso(iso: string): string {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  const sibling = (day! > 15 ? day! - 10 : day! + 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month!)}-${pad(sibling)}`;
}

describe("range-calendar mobile (headless)", () => {
  // adapt-sheets/range-calendar.md M-004 (A-001, A-004): under touch the
  // cell's hover classes are not emitted (`input() !== "touch"` gate), so a
  // hover — sticky on web — leaves no background path. What `nsh/test` can
  // observe here: the cell's `onHoverStart`/`onHoverEnd` contract still
  // fires under touch (the `hovered` signal is contract surface), presses
  // still commit, and the component's one selector-readable hover surface —
  // the nav button's `hover:bg-default` — provably resolves under pointer
  // and stays empty under touch. The cell's own painted view sits one level
  // below `role=button` with no selector identity, so its sticky-hover pixel
  // residue is sheet §6's registered host gap (real-device acceptance).
  test("M-004 injected touch: hover events still arrive and no hover paint lingers; pointer hover paints", async () => {
    const today = todayIso();
    const plain = siblingIso(today);
    const plainSel = dayCellSelector(plain);
    const todaySel = dayCellSelector(today);
    const NEXT = "role:button[/^Next$/]";

    const touch = await openCal("today", { testInput: "touch" });
    await waitForLayout(touch, `day-${today}`);

    // The hover contract still records under touch — only the paint is gated.
    await touch.hover(plainSel);
    await touch.waitUntil(() =>
      callsOf(touch, "cell-hover").some((c) => c[0] === `${plain}:start`),
    { timeout: 15_000 } );
    await touch.hover(todaySel);
    await touch.waitUntil(() =>
      callsOf(touch, "cell-hover").some((c) => c[0] === `${today}:start`),
    { timeout: 15_000 } );

    // Presses on the plain and the today cell still commit the two-step chain.
    await touch.press(plainSel);
    await touch.waitUntil(() => callsOf(touch, "range-change").length === 1, { timeout: 15_000 } );
    await touch.press(todaySel);
    await touch.waitUntil(() => callsOf(touch, "range-change").length === 2, { timeout: 15_000 } );

    // The readable hover surface: `hover:bg-default` on the nav button is
    // gated off under touch — nothing paints on hover, and nothing lingers
    // after the press that follows it (the sticky-hover half).
    const navBg = () => touch.viewStyle(NEXT)?.backgroundColor ?? null;
    await touch.hover(NEXT);
    await touch.wait(150);
    expect(navBg()).toBeNull();
    await touch.press(NEXT);
    await touch.wait(150);
    expect(navBg()).toBeNull();
    touch.dispose();

    // The pointer control proves the hover style is observable at all, so
    // the touch half cannot pass vacuously.
    const pointer = await openCal("today", { testInput: "pointer" });
    await waitForLayout(pointer, `day-${today}`);
    await pointer.hover(NEXT);
    await pointer.waitUntil(() => pointer.viewStyle(NEXT)?.backgroundColor != null, { timeout: 15_000 } );
    await pointer.hover(plainSel);
    await pointer.waitUntil(() =>
      callsOf(pointer, "cell-hover").some((c) => c[0] === `${plain}:start`),
    { timeout: 15_000 } );
    await pointer.press(plainSel);
    await pointer.waitUntil(() => callsOf(pointer, "range-change").length === 1, { timeout: 15_000 } );
    pointer.dispose();
  }, 120_000);

  // adapt-sheets/range-calendar.md M-011 (A-008): slide-select does not
  // exist. Under an injected touch environment a finger that lands on a day
  // cell, travels ~4 columns while held and lifts produces no `onPress`, no
  // `anchorDate` and no selection delta — the range state only ever moves
  // through `onPress`'s two-step `selectDate`. The press-cancel half (hold,
  // drag off the cell, release) is equally inert.
  test("M-011 injected touch: drag across cells and press-cancel both select nothing", async () => {
    const app = await openCal("default", { testInput: "touch" });
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
