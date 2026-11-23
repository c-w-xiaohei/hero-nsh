import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only half of the drawer mobile assertions (adapt-sheets/
 * drawer.md §4 M-004, M-007, M-008, M-009, M-015). Two capability
 * boundaries pin these tests here:
 *
 * - `dragAndHold`/`drop` — the held finger and the slow release the
 *   follow-the-finger and sub-threshold assertions need — synthesize only
 *   on headless (`test.d.ts:392-397`), the same reason `dragAndHold`
 *   tests live in `.headless.` files.
 * - A synthesized `app.drag` does not drive the web host's scroll
 *   recognizer (adapt sheet §6, sheet-handoff §6): the "push up stays a
 *   scroll" and "scrolled body releases the claim" halves need the real
 *   scroll recognizer headless provides.
 *
 * M-015 is the host-derived half of the environment contract:
 * `open({platform:"ios"})` carries no scope injection and the host reports
 * touch itself.
 */

type DragRecord = {
  keys: number;
  panelKeys: number;
  offset: number;
  atTop: boolean | null;
};

type LayoutRecord = {
  part: string;
  bounds: { origin: { x: number; y: number }; size: { width: number; height: number } };
};

function openDrawer(
  caseName: string,
  params: Record<string, unknown> = {},
  scope?: "touch",
): Promise<App> {
  return open("../../../drawer.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    clock: {},
    host: {
      params: { case: caseName, ...(scope ? { scope } : {}), ...params },
    },
  });
}

function dragCalls(app: App): DragRecord[] {
  return callsOf(app, "drag").map((args) => args[0] as DragRecord);
}

function lastDrag(app: App): DragRecord {
  const records = dragCalls(app);
  const last = records.at(-1);

  if (!last) throw new Error("the drag probe reported nothing");

  return last;
}

function layoutFor(app: App, part: string): LayoutRecord["bounds"] {
  const record = callsOf(app, "layout")
    .map((args) => args[0] as LayoutRecord)
    .filter((entry) => entry.part === part)
    .at(-1);

  if (!record) throw new Error(`no layout record for ${part}`);

  return record.bounds;
}

async function settle(app: App): Promise<void> {
  await app.waitUntil(() => callsOf(app, "drag").length > 0, { timeout: 15_000 });
  await app.clock?.runFor(40);
}

describe("drawer-mobile", () => {
  // adapt-sheets/drawer.md M-004 (A-001, A-002): a pull released short of
  // the panel-height threshold settles back to rest — offset returns to 0,
  // the panel keeps its bounds, no `onOpenChange`. `drop` releases at a
  // controlled speed here; `app.drag`'s flick-release (past the 500 pt/s
  // velocity bound) is what M-002/M-003 rely on, so the sub-threshold half
  // holds only on headless.
  test("M-004 touch: a sub-threshold pull settles back to rest", async () => {
    const app = await openDrawer("basic", {}, "touch");

    await settle(app);
    const panel = layoutFor(app, "dialog");
    const height = panel.size.height;

    // 10% of the panel — clearly below the 30% bound at any release speed
    // `drop` produces (a flick's 500 pt/s bound is what the release check
    // also measures; a slow drop keeps vy under it).
    await app.dragAndHold("id:dr-handle", { x: 0, y: Math.floor(height * 0.1) });
    // The gesture engaged before the release: the offset left 0 mid-hold,
    // so the settle below is a real reset, not a path that never mounted.
    await app.waitUntil(
      () => dragCalls(app).some((record) => record.offset > 0),
      { timeout: 15_000 },
    );
    await app.drop();
    await settle(app);

    expect(lastDrag(app).offset).toBe(0);
    expect(callsOf(app, "openChange")).toHaveLength(0);
    expect(layoutFor(app, "dialog")).toEqual(panel);
    expect(app.shows("id:dr-dialog")).toBe(true);
  });

  // adapt-sheets/drawer.md M-007 (A-001): the held drag reports the
  // clamped finger travel — `offset` tracks `max(0, dy)` while the finger
  // is down (the same channel the exit animation resumes from), and a slow
  // release settles back to 0 without closing. 60 points stays under the
  // dismiss bound on any real panel height (30% of it) and `drop`'s
  // release keeps the flick-speed half out of reach.
  test("M-007 touch: a held Handle drag reports max(0, dy), slow release resets", async () => {
    const app = await openDrawer("basic", {}, "touch");

    await settle(app);
    const height = layoutFor(app, "dialog").size.height;
    const travel = Math.min(60, Math.floor(height * 0.2));

    const before = dragCalls(app).length;
    await app.dragAndHold("id:dr-handle", { x: 0, y: travel });

    // Mid-drag records carry the process value while the finger is down.
    await app.waitUntil(
      () =>
        dragCalls(app)
          .slice(before)
          .some((record) => record.offset > 0),
      { timeout: 15_000 },
    );
    const held = dragCalls(app).at(-1)!;
    expect(held.offset).toBeGreaterThan(0);
    expect(held.offset).toBeLessThanOrEqual(travel + 1);

    await app.drop();
    await settle(app);
    expect(lastDrag(app).offset).toBe(0);
    expect(callsOf(app, "openChange")).toHaveLength(0);
    expect(app.shows("id:dr-dialog")).toBe(true);
  });

  // adapt-sheets/drawer.md M-008 (A-002): a push away from the dismiss
  // edge is never the panel's — `offset` stays 0 (the clamp) while the
  // Body's scroll takes the travel instead.
  test("M-008 touch: a panel push-up leaves offset 0 and scrolls the body", async () => {
    const app = await openDrawer("scroll", {}, "touch");

    await settle(app);
    expect(lastDrag(app).atTop).toBe(true);

    await app.drag("id:dr-body", { x: 0, y: -120 });
    await settle(app);

    expect(lastDrag(app).offset).toBe(0);
    const offsets = callsOf(app, "bodyScroll").map(
      (args) => (args[0] as { offset: { y: number } }).offset.y,
    );
    expect(offsets.at(-1) ?? 0).toBeGreaterThan(0);
    expect(lastDrag(app).atTop).toBe(false);
    expect(app.shows("id:dr-dialog")).toBe(true);
  });

  // adapt-sheets/drawer.md M-009 (A-002, A-003): the handoff boundary —
  // a pull while the Body is scrolled stays a scroll (offset 0, the body
  // keeps moving), and once the content is back at its start edge the
  // same pull claims the gesture and the offset follows.
  test("M-009 touch: scrolled body keeps the pull, back-at-top hands it to the panel", async () => {
    const app = await openDrawer("scroll", {}, "touch");

    await settle(app);
    await app.scroll("id:dr-body", 200);
    await settle(app);
    expect(lastDrag(app).atTop).toBe(false);

    const before = dragCalls(app).length;
    const scrollCalls = callsOf(app, "bodyScroll").length;
    await app.drag("id:dr-body", { x: 0, y: 120 });
    await settle(app);

    // The pull went to the scroll, not the panel: the drag offset never
    // left 0, and the body kept emitting scroll events (an overscroll
    // toward the top is the Scroll's own release semantics).
    expect(
      dragCalls(app)
        .slice(before)
        .every((record) => record.offset === 0),
    ).toBe(true);
    expect(callsOf(app, "bodyScroll").length).toBeGreaterThan(scrollCalls);
    const offsets = callsOf(app, "bodyScroll").map(
      (args) => (args[0] as { offset: { y: number } }).offset.y,
    );
    expect(Math.max(...offsets.slice(scrollCalls))).toBeGreaterThan(100);

    // Back at the start edge the pull is the panel's again.
    await app.scroll("id:dr-body", -300);
    await settle(app);
    expect(lastDrag(app).atTop).toBe(true);

    const reclaim = dragCalls(app).length;
    await app.drag("id:dr-body", { x: 0, y: 80 });
    await settle(app);
    expect(
      dragCalls(app)
        .slice(reclaim)
        .some((record) => record.offset > 0),
    ).toBe(true);
  });

  // adapt-sheets/drawer.md M-015 (A-001, A-002): `open({platform:"ios"})`
  // injects nothing — the host itself reports a touch environment, and
  // both gesture paths mount.
  test("M-015 host-derived touch on ios: both pans mount without a scope", async () => {
    const app = await open("../../../drawer.fixtures.tsx", {
      platform: "ios",
      clock: {},
      host: { params: { case: "basic" } },
    });

    await app.waitUntil(() => callsOf(app, "drag").length > 0, { timeout: 15_000 });
    const drag = lastDrag(app);
    expect(drag.keys).toBeGreaterThan(0);
    expect(drag.panelKeys).toBeGreaterThan(0);
  });
});
