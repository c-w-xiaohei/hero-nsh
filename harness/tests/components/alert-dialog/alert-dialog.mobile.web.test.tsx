import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only mobile assertion for the alert-dialog adapt unit:
 * adapt-sheets/alert-dialog.md §4 M-005's "small pull released gently settles
 * back" half, which `alert-dialog.mobile.test.tsx`'s comment defers here.
 *
 * Why web-only and why a small dy: the swipe-dismiss release fires on
 * `dy >= cardHeight/2 OR vy/1000 >= 0.5`. `app.drag` moves the finger 10 pt
 * per display frame, so the release velocity scales with the drag's frame
 * count — a long pull always flings past 0.5 pt/ms and dismisses on both
 * targets (measured: dy=60 dismisses headless and web). A short pull stays
 * under the velocity bound and settles back; the web host is where the
 * gentler synthesized release was measured to reach that branch, so the
 * assertion lives behind the `platform: "web"` pin per the file-naming
 * convention. The injected `touch-compact` scope plus the `dismissable` /
 * `swipeable` params arm the swipe channel exactly as the headless half
 * does.
 */

type DragRecord = { panKeys: number; offset: number };

type LayoutRecord = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const VIEWPORT_W = 1024;
const VIEWPORT_H = 768;

function openWeb(params: Record<string, string | number | boolean> = {}): Promise<App> {
  return open("../../../alert-dialog.fixtures.tsx", {
    platform: "web",
    width: VIEWPORT_W,
    height: VIEWPORT_H,
    clock: {},
    host: { params: { fixture: "geometry", ...params } },
  });
}

function dragRecords(app: App): DragRecord[] {
  return callsOf(app, "drag").map((args) => args[0] as DragRecord);
}

function openChanges(app: App): boolean[] {
  return callsOf(app, "openChange").map((args) => args[0] as boolean);
}

function falseOpenChanges(app: App): boolean[] {
  return openChanges(app).filter((value) => value === false);
}

function lastLayout(app: App, name: string): LayoutRecord {
  const records = callsOf(app, "layout")
    .map((args) => args[0] as LayoutRecord)
    .filter((record) => record.name === name);
  const last = records.at(-1);

  if (!last) throw new Error(`no layout record for ${name}`);

  return last;
}

async function settle(app: App, ms = 80): Promise<void> {
  await app.clock?.runFor(ms);
}

describe("alert-dialog mobile (web)", () => {
  // adapt-sheets/alert-dialog.md M-005 (A-004), settle-back half. A 20 pt
  // pull is well under the half-height distance bound (the card is ~236 pt
  // tall here) and short enough that the synthesized release velocity stays
  // under the 0.5 pt/ms fling bound: the gesture claims the touches
  // (`panKeys > 0`), the offset tracks the pull and returns to 0 on release,
  // no `onOpenChange(false)` fires, and the card is still on screen after
  // the exit-hold window. This is the branch the headless file's dy=60
  // release cannot reach — it flings past the velocity bound and dismisses.
  test("M-005 web: a short gentle pull settles back, the card stays open", async () => {
    const app = await openWeb({
      scope: "touch-compact",
      dismissable: "1",
      swipeable: "1",
    });

    await settle(app, 300);
    const before = lastLayout(app, "dialog");

    await app.drag("id:ad-card", { y: 20 });
    await settle(app, 400);

    const drags = dragRecords(app);
    // The gesture claimed the touches and the offset followed the pull —
    // then returned to rest on the gentle release.
    expect(drags.some((record) => record.panKeys > 0)).toBe(true);
    expect(drags.some((record) => record.offset > 0)).toBe(true);
    expect(drags.at(-1)?.offset).toBe(0);

    // The card is still open: no close request fired and the layer is
    // still mounted at its pre-drag geometry.
    expect(falseOpenChanges(app)).toEqual([]);
    expect(app.shows("id:ad-card")).toBe(true);
    expect(lastLayout(app, "dialog")).toEqual(before);
  });
});
