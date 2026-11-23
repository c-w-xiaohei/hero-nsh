import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import type { AlertDialogPresentation } from "@heroui/react";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the alert-dialog adapt unit, one test per row of
 * adapt-sheets/alert-dialog.md §4 (M-001…M-010, M-012; M-011 lives in
 * alert-dialog.mobile.headless.test.tsx). The fixture is
 * `harness/alert-dialog.fixtures.tsx` — `geometry` renders the upstream part
 * tree with the `host.params` the rows drive: `scope` (EnvironmentScope
 * input/width), `presentation`, `dismissable`, `swipeable`, `open` ("0" starts
 * closed so `ad-trigger` opens) and `placement`.
 *
 * Every open pins `platform: "windows"` at 1024×768 — the desktop `pointer`
 * environment is the default half of each row, and `scope` injects the touch
 * half. The observation channel is what `nsh/test` sees: the `layout` probe's
 * per-part bounds, the `drag` probe (`panKeys` — 0 when the swipe gesture is
 * gated off, the physical-absence evidence — plus every offset the gesture
 * writes), the `events` probe (the trigger's press chain and the close
 * trigger's `closePress`), `openChange`, `shows`/`count`, and the merged
 * `calls()` stream for cross-probe ordering.
 */

const VIEWPORT_W = 1024;
const VIEWPORT_H = 768;
const CENTER_Y = VIEWPORT_H / 2;

type LayoutRecord = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragRecord = { panKeys: number; offset: number };

function openDialog(
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../alert-dialog.fixtures.tsx", {
    platform: "windows",
    width: VIEWPORT_W,
    height: VIEWPORT_H,
    clock: {},
    host: { params: { fixture: "geometry", ...params } },
  });
}

function layoutRecords(app: App, name: string): LayoutRecord[] {
  return callsOf(app, "layout")
    .map((args) => args[0] as LayoutRecord)
    .filter((record) => record.name === name);
}

function lastLayout(app: App, name: string): LayoutRecord {
  const records = layoutRecords(app, name);
  const last = records.at(-1);

  if (!last) throw new Error(`no layout record for ${name}`);

  return last;
}

function centerY(record: LayoutRecord): number {
  return record.y + record.height / 2;
}

function dragRecords(app: App): DragRecord[] {
  return callsOf(app, "drag").map((args) => args[0] as DragRecord);
}

function eventArgs(app: App): string[] {
  return callsOf(app, "events").map((args) => String(args[0]));
}

function openChanges(app: App): boolean[] {
  return callsOf(app, "openChange").map((args) => args[0] as boolean);
}

function falseOpenChanges(app: App): boolean[] {
  return openChanges(app).filter((value) => value === false);
}

async function settle(app: App, ms = 80): Promise<void> {
  await app.clock?.runFor(ms);
}

describe("alert-dialog mobile", () => {
  // adapt-sheets/alert-dialog.md M-001 (A-001, A-002, A-003): touch +
  // compact under `presentation="auto"` presents the bottom-docked sheet —
  // the card's bottom edge on the window's, full-bleed width, no centering.
  test("M-001 touch-compact auto presents the bottom-docked sheet", async () => {
    const app = await openDialog({ scope: "touch-compact" });

    await settle(app, 300);

    const dialog = lastLayout(app, "dialog");
    const container = lastLayout(app, "container");
    // Dock to the surface's bottom edge — measured against the layout
    // container's own bottom, not `VIEWPORT_H`: a real Windows window's
    // caption keeps ~39pt off the client area, so the surface the overlay
    // spans is shorter than the requested viewport and the card still docks
    // to its bottom.
    expect(
      Math.abs(dialog.y + dialog.height - (container.y + container.height)),
    ).toBeLessThanOrEqual(4);
    expect(dialog.width).toBeGreaterThan(VIEWPORT_W * 0.9);
    expect(centerY(dialog)).toBeGreaterThan(CENTER_Y + 100);
  });

  // adapt-sheets/alert-dialog.md M-002 (A-001): a `"panel"` pin beats the
  // touch + compact auto rule — the card stays centered under the `max-w-md`
  // cap instead of docking. (The title keeps 'panel' single-quoted: a
  // backslash-escaped `\"` survives into the gate's scanned title and the
  // executed name then never matches it.)
  test("M-002 presentation='panel' pin holds the centered panel under touch-compact", async () => {
    const pin: AlertDialogPresentation = "panel";
    const app = await openDialog({ scope: "touch-compact", presentation: pin });

    await settle(app, 300);

    const dialog = lastLayout(app, "dialog");
    expect(Math.abs(centerY(dialog) - CENTER_Y)).toBeLessThanOrEqual(40);
    // The `max-w-md` cap: far below the sheet's full-bleed ~1024.
    expect(dialog.width).toBeLessThan(600);
    expect(dialog.width).toBeGreaterThan(200);
  });

  // adapt-sheets/alert-dialog.md M-003 (A-004, negative): under the default
  // pointer environment the swipe path is physically absent even with every
  // prop that could allow it set — `panKeys` resolves to 0 (no responder
  // props exist to spread), the offset never leaves 0, the card does not
  // move and nothing closes. The `presentation="sheet"` pin isolates the
  // input gate: it is the only one of the four `enabled` conditions left
  // standing under pointer.
  test("M-003 pointer + sheet pin + dismissable + swipeable: no gesture path at all", async () => {
    const app = await openDialog({
      presentation: "sheet",
      dismissable: "1",
      swipeable: "1",
    });

    await settle(app, 300);
    const before = lastLayout(app, "dialog");

    await app.drag("id:ad-card", { y: 200 });
    await settle(app, 120);

    const drags = dragRecords(app);
    expect(drags.length).toBeGreaterThan(0);
    expect(drags.every((record) => record.panKeys === 0 && record.offset === 0)).toBe(
      true,
    );
    expect(lastLayout(app, "dialog")).toEqual(before);
    expect(app.shows("id:ad-card")).toBe(true);
    expect(falseOpenChanges(app)).toEqual([]);
  });

  // adapt-sheets/alert-dialog.md M-004 (A-004, negative): the second gate —
  // touch + sheet + `isDismissable` but no explicit `isSwipeable` — still
  // mounts no gesture. "仅显式允许" means the default never slides.
  test("M-004 touch+sheet+dismissable without isSwipeable: drag leaves the card at rest", async () => {
    const app = await openDialog({
      scope: "touch-compact",
      presentation: "sheet",
      dismissable: "1",
    });

    await settle(app, 300);

    await app.drag("id:ad-card", { y: 200 });
    await settle(app, 120);

    const drags = dragRecords(app);
    expect(drags.length).toBeGreaterThan(0);
    expect(drags.every((record) => record.panKeys === 0 && record.offset === 0)).toBe(
      true,
    );
    expect(app.shows("id:ad-card")).toBe(true);
    expect(falseOpenChanges(app)).toEqual([]);
  });

  // adapt-sheets/alert-dialog.md M-005 (A-004): with all four gates open the
  // card follows the finger — the drag probe shows `panKeys > 0` (the gesture
  // path is mounted) and `offset` tracking the pull — and every release
  // resets the offset to rest. A pull past the distance bound dismisses
  // through `onOpenChange(false)` and the card leaves after the exit-hold
  // window.
  //
  // The row's "short pull released gently settles back" half is asserted in
  // `alert-dialog.mobile.web.test.tsx`: `app.drag` moves the finger 10 pt
  // per display frame, so the release velocity scales with the drag's frame
  // count — this file's dy=60 pull flings past the 0.5 pt/ms dismiss bound
  // on every target (measured headless and web), while the web file's 20 pt
  // pull stays under it and reaches the settle branch. What this file
  // asserts is what every target agrees on at this drag length: engagement,
  // the offset reset, and the velocity-bound dismiss.
  test("M-005 swipeable sheet: drag engages, offset resets, far pull dismisses", async () => {
    const app = await openDialog({
      scope: "touch-compact",
      dismissable: "1",
      swipeable: "1",
    });

    await settle(app, 300);
    await app.drag("id:ad-card", { y: 60 });
    await settle(app, 120);

    const drags = dragRecords(app);
    // The gesture claimed: the pan resolved handlers and the offset
    // followed the pull frame by frame, then returned to rest on release.
    expect(drags.some((record) => record.panKeys > 0)).toBe(true);
    expect(drags.some((record) => record.offset > 0)).toBe(true);
    expect(drags.at(-1)?.offset).toBe(0);

    // A far pull clears the half-height distance bound on its own.
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

  // adapt-sheets/alert-dialog.md M-006 (A-005): under an injected touch
  // environment the trigger's press chain is the desktop chain verbatim —
  // same events, same order, same bounds — and the press still opens.
  test("M-006 touch trigger press: event order identical to pointer, bounds unchanged", async () => {
    const touch = await openDialog({ scope: "touch-regular", open: "0" });
    await settle(touch);
    await touch.press("id:ad-trigger");
    await settle(touch);

    const pointer = await openDialog({ open: "0" });
    await settle(pointer);
    await pointer.press("id:ad-trigger");
    await settle(pointer);

    expect(eventArgs(touch)).toEqual(eventArgs(pointer));
    expect(eventArgs(touch)).toContain("pressDown");
    expect(eventArgs(touch)).toContain("pressUp");
    expect(eventArgs(touch)).toContain("press");
    expect(touch.shows("id:ad-card")).toBe(true);
    expect(pointer.shows("id:ad-card")).toBe(true);

    const bounds = layoutRecords(touch, "trigger");
    expect(bounds.length).toBeGreaterThan(0);
    const first = bounds[0];
    for (const record of bounds) {
      expect(record).toEqual(first);
    }
  });

  // adapt-sheets/alert-dialog.md M-007 (A-005, negative): the same press
  // under the default pointer environment produces the same chain and the
  // same unchanged bounds — the press-feedback seam's `enabled=false` half
  // is a physical no-op (`hitSlop()` answers `undefined`, the press
  // callbacks record nothing). `hitSlop` itself has no `nsh/test` read
  // channel; the seam's own unit asserts it (adapt sheet §6).
  test("M-007 pointer trigger press: identical chain, bounds unchanged", async () => {
    const app = await openDialog({ open: "0" });
    await settle(app);

    const before = layoutRecords(app, "trigger").at(-1);
    expect(before).toBeDefined();

    await app.press("id:ad-trigger");
    await settle(app);

    expect(eventArgs(app)).toEqual(["pressDown", "pressUp", "press"]);
    expect(app.shows("id:ad-card")).toBe(true);
    expect(openChanges(app)).toContain(true);

    const after = layoutRecords(app, "trigger").at(-1);
    expect(after).toEqual(before);
  });

  // adapt-sheets/alert-dialog.md M-008 (A-008): the fixture's observation
  // carrier itself — it mounts under the default and the injected
  // environment, and every probe the §4 rows read back is populated.
  test("M-008 fixture mounts in both environments, all probes readable", async () => {
    for (const scope of [undefined, "touch-compact"] as const) {
      const app = await openDialog(scope ? { scope } : {});

      await settle(app, 300);

      expect(layoutRecords(app, "container").length).toBeGreaterThan(0);
      expect(layoutRecords(app, "dialog").length).toBeGreaterThan(0);
      expect(layoutRecords(app, "header").length).toBeGreaterThan(0);
      expect(layoutRecords(app, "body").length).toBeGreaterThan(0);
      expect(layoutRecords(app, "footer").length).toBeGreaterThan(0);
      expect(dragRecords(app).length).toBeGreaterThan(0);
      expect(app.shows("id:ad-card")).toBe(true);
    }
  });

  // adapt-sheets/alert-dialog.md M-009 (baseline): the desktop defaults are
  // unchanged — centered panel under the width cap, `isDismissable=false`
  // blocks the outside press, `isKeyboardDismissDisabled=true` blocks
  // Escape/back, the CloseTrigger keeps its close→onPress order, and the
  // placement axis still moves the card.
  test("M-009 baseline: defaults, dismiss gates, close order, placement", async () => {
    // Centered panel with the max-w cap (auto placement at this width).
    const app = await openDialog();
    await settle(app, 300);

    const dialog = lastLayout(app, "dialog");
    expect(Math.abs(centerY(dialog) - CENTER_Y)).toBeLessThanOrEqual(40);
    expect(dialog.width).toBeLessThan(600);

    // `isKeyboardDismissDisabled=true`: Escape asks and is refused; `back()`
    // is attempted the same way — where the host cannot drive it the
    // rejection is itself the "nothing happened" signal (adapt sheet §5/§6).
    await app.keyboard.press("escape");
    await settle(app, 60);
    expect(app.shows("id:ad-card")).toBe(true);
    await app.back().catch(() => {});
    await settle(app, 60);
    expect(app.shows("id:ad-card")).toBe(true);
    expect(falseOpenChanges(app)).toEqual([]);

    // CloseTrigger: the slot's close runs before the caller's `onPress` —
    // read off the merged probe stream.
    await app.press("id:ad-close");
    await settle(app, 300);

    const stream = calls(app);
    const closeIndex = stream.findIndex(
      (call) => call.name === "openChange" && call.args[0] === false,
    );
    const pressIndex = stream.findIndex(
      (call) => call.name === "events" && call.args[0] === "closePress",
    );
    expect(closeIndex).toBeGreaterThanOrEqual(0);
    expect(pressIndex).toBeGreaterThan(closeIndex);
    expect(app.shows("id:ad-card")).toBe(false);

    // `isDismissable=false` (the default): an outside press does not close.
    // `placement="top"` leaves the backdrop's middle uncovered so the press
    // reaches the paint layer — on headless. The web hit test stops at the
    // layout carrier (the modal X-004 measurement), where the press is a
    // no-op and this half degrades to vacuous; recorded, not faked.
    const outside = await openDialog({ placement: "top" });
    await settle(outside, 300);
    await outside.press("id:ad-backdrop");
    await settle(outside, 120);
    expect(outside.shows("id:ad-card")).toBe(true);
    expect(falseOpenChanges(outside)).toEqual([]);

    // The placement axis still moves the card: top high, bottom low,
    // center (and auto at this width) centered — asserted as bounds, the
    // observable half of the class sets.
    const centerYOf = async (placement: string) => {
      const placed = await openDialog({ placement });
      await settle(placed, 300);
      return centerY(lastLayout(placed, "dialog"));
    };

    const topY = await centerYOf("top");
    const middleY = await centerYOf("center");
    const bottomY = await centerYOf("bottom");

    expect(topY).toBeLessThan(middleY - 60);
    expect(bottomY).toBeGreaterThan(middleY + 60);
    expect(Math.abs(middleY - CENTER_Y)).toBeLessThanOrEqual(40);
  });

  // adapt-sheets/alert-dialog.md M-010 (baseline + A-004's fourth gate):
  // touch but a regular-width window still resolves `"panel"` under auto,
  // and on a panel the swipe channel never attaches even with
  // `isDismissable` + `isSwipeable` both set.
  test("M-010 touch-regular auto stays panel; swipe never attaches on panel", async () => {
    const app = await openDialog({
      scope: "touch-regular",
      dismissable: "1",
      swipeable: "1",
    });

    await settle(app, 300);

    const dialog = lastLayout(app, "dialog");
    expect(Math.abs(centerY(dialog) - CENTER_Y)).toBeLessThanOrEqual(40);
    expect(dialog.width).toBeLessThan(600);

    await app.drag("id:ad-card", { y: 200 });
    await settle(app, 120);

    const drags = dragRecords(app);
    expect(drags.length).toBeGreaterThan(0);
    expect(drags.every((record) => record.panKeys === 0 && record.offset === 0)).toBe(
      true,
    );
    expect(app.shows("id:ad-card")).toBe(true);
    expect(falseOpenChanges(app)).toEqual([]);
  });

  // adapt-sheets/alert-dialog.md M-012 (A-007): `AlertDialogPresentation`
  // reaches the public surface — the top-level `import type` plus the
  // annotation on the pin below; `nsh check harness` failing on either means
  // index.ts never re-exported the type. The runtime half (what the pin
  // resolves to) is covered by M-001/M-002, so this test re-drives the same
  // pin call and asserts the panel geometry as the observable smoke check.
  test("M-012 AlertDialogPresentation annotates the presentation pin", async () => {
    const pin: AlertDialogPresentation = "panel";
    const app = await openDialog({ scope: "touch-compact", presentation: pin });

    await settle(app, 300);

    expect(pin).toBe("panel");
    const dialog = lastLayout(app, "dialog");
    expect(Math.abs(centerY(dialog) - CENTER_Y)).toBeLessThanOrEqual(40);
    expect(dialog.width).toBeLessThan(600);
  });
});
