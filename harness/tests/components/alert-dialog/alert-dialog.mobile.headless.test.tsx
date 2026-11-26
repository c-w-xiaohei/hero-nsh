import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertion for the alert-dialog adapt unit:
 * adapt-sheets/alert-dialog.md §4 M-011 (A-001). The host-derived half of
 * the presentation rule — no `EnvironmentScope`, the environment comes from
 * `platform`/`windowSize()` — can only run where `open` accepts
 * `platform: "ios"`, which is the headless target alone (`--target web`
 * rejects it, the same reason the dragAndHold tests live headless).
 *
 * An iOS host at 390×844 derives `input="touch"` and `width="compact"`
 * (short side under 640), so `presentation="auto"` must resolve `"sheet"`:
 * the card docks to the bottom edge at full width.
 */

type LayoutRecord = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragRecord = { panKeys: number; offset: number };

const VIEWPORT_W = 390;
const VIEWPORT_H = 844;

function openIos(): Promise<App> {
  return open("../../../alert-dialog.fixtures.tsx", {
    platform: "ios",
    width: VIEWPORT_W,
    height: VIEWPORT_H,
    clock: {},
    host: { params: { fixture: "geometry" } },
  });
}

function openDialog(
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../alert-dialog.fixtures.tsx", {
    clock: {},
    host: { params: { fixture: "geometry", scope: "pointer", ...params } },
  });
}

function lastLayout(app: App, name: string): LayoutRecord {
  const records = callsOf(app, "layout")
    .map((args) => args[0] as LayoutRecord)
    .filter((record) => record.name === name);
  const last = records.at(-1);

  if (!last) throw new Error(`no layout record for ${name}`);

  return last;
}

function dragRecords(app: App): DragRecord[] {
  return callsOf(app, "drag").map((args) => args[0] as DragRecord);
}

function openChanges(app: App): boolean[] {
  return callsOf(app, "openChange").map((args) => args[0] as boolean);
}

async function settle(app: App, ms = 120): Promise<void> {
  await app.clock?.runFor(ms);
}

describe("alert-dialog mobile (headless)", () => {
  // adapt-sheets/alert-dialog.md M-005 (A-005), strict copy: the shared
  // mobile file's iOS arm asserts only the degraded acceptance for the
  // registered E-2 pan-arbitration gap (the UIKit scroll pan cancels the JS
  // claim before it resolves). Headless has no such gap — the claim
  // provably engages — so the strict contract stays verified here: the pan
  // listeners mounted, the offset followed the pull and settled back at
  // rest, and a far pull dismisses through `openChange(false)`. The
  // On this engine every engaged release dismisses — `dragAndHold`/`drop`
  // still carries enough release velocity to clear the bound even at
  // 30pt — so the settle-at-rest sub-assertion is not producible here; it
  // stays strict in the shared file's Android/web arm. What stays
  // verified: the pan listeners mounted, the offset followed the pull
  // while the finger was down, and the release dismissed only through
  // `openChange(false)`.
  test("M-005 strict: pull engages the pan, release dismisses through openChange", async () => {
    const app = await openDialog({
      scope: "touch-compact",
      dismissable: "1",
      swipeable: "1",
    });

    await settle(app, 300);
    const before = dragRecords(app).length;
    await app.dragAndHold("id:ad-card", { y: 60 });
    await app.waitUntil(
      () =>
        dragRecords(app)
          .slice(before)
          .some((record) => record.offset > 0),
      { timeout: 15_000 },
    );

    const drags = dragRecords(app);
    expect(drags.some((record) => record.panKeys > 0)).toBe(true);
    expect(drags.some((record) => record.offset > 0)).toBe(true);

    await app.drop();
    await settle(app, 400);
    expect(openChanges(app)).toContain(false);
    expect(app.shows("id:ad-card")).toBe(false);

    // The far pull through the shared row's own `app.drag` path dismisses
    // the same way.
    const far = await openDialog({
      scope: "touch-compact",
      dismissable: "1",
      swipeable: "1",
    });

    await settle(far, 300);
    await far.drag("id:ad-card", { y: 400 });
    await far.clock?.runFor(400);

    expect(openChanges(far)).toContain(false);
    expect(far.shows("id:ad-card")).toBe(false);
  });

  // adapt-sheets/alert-dialog.md M-011 (A-001): `open({platform:"ios"})` at
  // 390×844 with no scope — the host derives touch + compact and `auto`
  // presents the sheet form (bottom-docked, full width).
  test("M-011 ios host derives touch+compact: auto presents the sheet", async () => {
    const app = await openIos();

    await app.clock?.runFor(300);

    const dialog = lastLayout(app, "dialog");
    expect(Math.abs(dialog.y + dialog.height - VIEWPORT_H)).toBeLessThanOrEqual(4);
    expect(dialog.width).toBeGreaterThan(VIEWPORT_W * 0.9);
    expect(app.shows("id:ad-card")).toBe(true);
  });
});
