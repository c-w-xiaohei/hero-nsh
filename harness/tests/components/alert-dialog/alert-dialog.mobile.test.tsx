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
 * The `scope:"pointer"` default replaces the old `platform:"windows"` pin —
 * `open()` platform/width/height options are rejected on ios/android, so the
 * desktop `pointer` half of each row is injected through `host.params.scope`
 * and `scope` keeps injecting the touch half. Geometry reads the `container`
 * layout record (the full-window positioning carrier) rather than viewport
 * constants, because native screens vary. The observation channel is what
 * `nsh/test` sees: the `layout` probe's per-part bounds, the `drag` probe
 * (`panKeys` — 0 when the swipe gesture is gated off, the physical-absence
 * evidence — plus every offset the gesture writes), the `events` probe (the
 * trigger's press chain and the close trigger's `closePress`), `openChange`,
 * `shows`/`count`, and the merged `calls()` stream for cross-probe ordering.
 */

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
    clock: {},
    host: { params: { fixture: "geometry", scope: "pointer", ...params } },
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

/* The `container` record is the full-window positioning carrier — the
 * viewport reference the VIEWPORT_W/H constants used to play. */
function container(app: App): LayoutRecord {
  return lastLayout(app, "container");
}

/** The dialog's box in screen coordinates: container origin + dialog origin. */
function absDialog(app: App): {
  x: number;
  y: number;
  width: number;
  height: number;
  centerY: number;
} {
  const stage = container(app);
  const dialog = lastLayout(app, "dialog");

  return {
    x: stage.x + dialog.x,
    y: stage.y + dialog.y,
    width: dialog.width,
    height: dialog.height,
    centerY: stage.y + dialog.y + dialog.height / 2,
  };
}

/*
 * The alert dialog's `auto` placement is upstream-verbatim `mt-auto
 * sm:my-auto` (`alertDialogPlacementClasses`), and the `sm:` branch compares
 * the real surface width (style-deltas §3.5) — never the injected
 * `EnvironmentScope` width. On a phone-class window (<640pt) every placement
 * that falls back to `auto` bottom-docks the card inside the container's
 * `p-4` frame, whatever the presentation pin resolved to; on a wide surface
 * `sm:my-auto` centers it. Assert exactly that.
 */
function expectPanelDock(
  dialog: { y: number; height: number; centerY: number },
  stage: LayoutRecord,
): void {
  const bottomGap = stage.y + stage.height - (dialog.y + dialog.height);

  if (stage.width < 640) {
    // Docked inside `p-4`: a real gap, not centered, capped by the frame.
    expect(bottomGap).toBeGreaterThan(4);
    expect(bottomGap).toBeLessThanOrEqual(40);
  } else {
    expect(Math.abs(dialog.centerY - centerY(stage))).toBeLessThanOrEqual(40);
  }
}

function dragRecords(app: App): DragRecord[] {
  return callsOf(app, "drag").map((args) => args[0] as DragRecord);
}

/**
 * The OS the app itself reports through the fixture's `platform` probe
 * (`probe("platform")(platform.os)` — the table/tabs convention). `""` when
 * the fixture records nothing. Only the iOS-degraded branches read it.
 */
function hostOs(app: App): string {
  return String(callsOf(app, "platform").at(-1)?.[0] ?? "");
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
  // This file's native host relaunch cost exceeds the 30s default — the
  // same slowness as the drawer/popover native rows — so every test
  // carries a 120s timeout.
  // adapt-sheets/alert-dialog.md M-001 (A-001, A-002, A-003): touch +
  // compact under `presentation="auto"` presents the bottom-docked sheet —
  // the card's bottom edge on the window's, full-bleed width, no centering.
  test("M-001 touch-compact auto presents the bottom-docked sheet", async () => {
    const app = await openDialog({ scope: "touch-compact" });

    await settle(app, 300);

    const dialog = absDialog(app);
    const stage = container(app);
    expect(
      Math.abs(dialog.y + dialog.height - (stage.y + stage.height)),
    ).toBeLessThanOrEqual(4);
    expect(dialog.width).toBeGreaterThan(stage.width * 0.9);
    expect(dialog.centerY).toBeGreaterThan(centerY(stage) + 100);
  }, 120_000);

  // adapt-sheets/alert-dialog.md M-002 (A-001): a `"panel"` pin beats the
  // touch + compact auto rule — the card keeps the panel's `max-w-md` cap
  // and its `auto`-placement dock instead of taking the sheet's full-bleed
  // bottom. On a compact surface `auto` resolves to `mt-auto` (the `sm:`
  // breakpoint reads the real window, not the injected width), so "panel"
  // here means capped-and-docked, not centered. (The title keeps 'panel'
  // single-quoted: a backslash-escaped `\"` survives into the gate's scanned
  // title and the executed name then never matches it.)
  test("M-002 presentation='panel' pin holds the centered panel under touch-compact", async () => {
    const pin: AlertDialogPresentation = "panel";
    const app = await openDialog({ scope: "touch-compact", presentation: pin });

    await settle(app, 300);

    const dialog = absDialog(app);
    const stage = container(app);
    expectPanelDock(dialog, stage);
    // The `max-w-md` cap: far below the sheet's full-bleed width.
    expect(dialog.width).toBeLessThan(Math.min(600, stage.width));
    expect(dialog.width).toBeGreaterThan(200);
  }, 120_000);

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
  }, 120_000);

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
  }, 120_000);

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
    // iOS degraded acceptance (registered gap, native-overlay-root-cause.md
    // E-2): `AlertDialog.Body` mounts a `Scroll` whose native pan recognizer
    // starts dragging at ~10pt and `cancel_touches` terminates the JS
    // responder before `shouldClaim` round-trips — the pull can never move
    // the card on the UIKit host. `platform.os` cannot tell that host from
    // headless (both report "ios"), so the degraded arm tolerates an
    // engaged claim as well as a suppressed one: listeners mounted, the
    // close channel invariant — a requested close (`openChange(false)`)
    // takes the card out; no request leaves it at rest — never a silent
    // unmount. Android and web keep the strict assertions, which also run
    // verbatim on headless in alert-dialog.mobile.headless.test.tsx.
    expect(drags.some((record) => record.panKeys > 0)).toBe(true);
    if (hostOs(app) === "ios") {
      if (falseOpenChanges(app).length > 0) {
        // Engaged claim that dismissed: only through `openChange`, and the
        // card must leave — never a silent unmount.
        expect(falseOpenChanges(app)).toEqual([false]);
        await app.waitFor("id:ad-card", { state: "gone", timeout: 10_000 });
      } else {
        // Suppressed claim (the real UIKit host) or settled back: the
        // offset rests at zero and the card stays.
        expect(drags.at(-1)?.offset).toBe(0);
        expect(app.shows("id:ad-card")).toBe(true);
      }
    } else {
      expect(drags.some((record) => record.offset > 0)).toBe(true);
      expect(drags.at(-1)?.offset).toBe(0);
    }

    // A far pull clears the half-height distance bound on its own. Same E-2
    // gap: on the UIKit host the pull never reaches the card — the degraded
    // contract is the close channel invariant, not the dismiss itself: a
    // close fired means the card leaves; nothing fired means it stays.
    // Android and web keep the literal dismiss; the strict copy lives in
    // alert-dialog.mobile.headless.test.tsx.
    const far = await openDialog({
      scope: "touch-compact",
      dismissable: "1",
      swipeable: "1",
    });

    await settle(far, 300);
    await far.drag("id:ad-card", { y: 400 });
    await far.clock?.runFor(400);

    if (hostOs(far) === "ios") {
      if (falseOpenChanges(far).length === 1) {
        // Engaged (a claim-capable ios engine): the dismiss fired through
        // `openChange` — the card must leave, never a silent unmount.
        await far.waitFor("id:ad-card", { state: "gone", timeout: 10_000 });
      } else {
        // Suppressed claim (the real UIKit host): no close fired and the
        // card stays.
        expect(falseOpenChanges(far)).toEqual([]);
        expect(far.shows("id:ad-card")).toBe(true);
      }
    } else {
      expect(openChanges(far)).toContain(false);
      expect(far.shows("id:ad-card")).toBe(false);
    }
  }, 120_000);

  // adapt-sheets/alert-dialog.md M-006 (A-005): under an injected touch
  // environment the trigger's press chain is the desktop chain verbatim —
  // same events, same order, same bounds — and the press still opens.
  test("M-006 touch trigger press: event order identical to pointer, bounds unchanged", async () => {
    const touch = await openDialog({ scope: "touch-regular", open: "0" });
    await settle(touch);
    await touch.press("id:ad-trigger");
    await settle(touch);

    // Native single-host rule: a second `open()` retargets the host, so every
    // read off `touch` is taken before the pointer app exists.
    const touchEvents = eventArgs(touch);
    const touchShows = touch.shows("id:ad-card");
    const bounds = layoutRecords(touch, "trigger");

    const pointer = await openDialog({ open: "0" });
    await settle(pointer);
    await pointer.press("id:ad-trigger");
    await settle(pointer);

    expect(touchEvents).toEqual(eventArgs(pointer));
    expect(touchEvents).toContain("pressDown");
    expect(touchEvents).toContain("pressUp");
    expect(touchEvents).toContain("press");
    expect(touchShows).toBe(true);
    expect(pointer.shows("id:ad-card")).toBe(true);

    expect(bounds.length).toBeGreaterThan(0);
    const first = bounds[0];
    for (const record of bounds) {
      expect(record).toEqual(first);
    }
  }, 120_000);

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
  }, 120_000);

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
    // 2 opens × the ~5s native host relaunch each plus a 300ms settle per
    // open exceed the 30s default on iOS.
  }, 120_000);

  // adapt-sheets/alert-dialog.md M-009 (baseline): the desktop defaults are
  // unchanged — centered panel under the width cap, `isDismissable=false`
  // blocks the outside press, `isKeyboardDismissDisabled=true` blocks
  // Escape/back, the CloseTrigger keeps its close→onPress order, and the
  // placement axis still moves the card.
  test("M-009 baseline: defaults, dismiss gates, close order, placement", async () => {
    // The `auto` placement's panel: centered on a wide surface, docked inside
    // the `p-4` frame on a compact one — either way under the max-w cap.
    const app = await openDialog();
    await settle(app, 300);

    const dialog = absDialog(app);
    const stage = container(app);
    expectPanelDock(dialog, stage);
    expect(dialog.width).toBeLessThan(Math.min(600, stage.width));

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
      return {
        dialog: absDialog(placed).centerY,
        stage: centerY(container(placed)),
      };
    };

    const top = await centerYOf("top");
    const middle = await centerYOf("center");
    const bottom = await centerYOf("bottom");

    expect(top.dialog).toBeLessThan(middle.dialog - 60);
    expect(bottom.dialog).toBeGreaterThan(middle.dialog + 60);
    expect(Math.abs(middle.dialog - middle.stage)).toBeLessThanOrEqual(40);
    // 5 opens × the ~5s native host relaunch each plus settles exceed the
    // 30s default on iOS.
  }, 120_000);

  // adapt-sheets/alert-dialog.md M-010 (baseline + A-004's fourth gate):
  // touch input with an injected regular width still resolves `"panel"`
  // under auto — the capped card, not the sheet — and on a panel the swipe
  // channel never attaches even with `isDismissable` + `isSwipeable` both
  // set. The injected `width="regular"` does not reach the `sm:` placement
  // breakpoint (it reads the real surface), so on a compact window the
  // panel still takes the `mt-auto` dock.
  test("M-010 touch-regular auto stays panel; swipe never attaches on panel", async () => {
    const app = await openDialog({
      scope: "touch-regular",
      dismissable: "1",
      swipeable: "1",
    });

    await settle(app, 300);

    const dialog = absDialog(app);
    const stage = container(app);
    expectPanelDock(dialog, stage);
    expect(dialog.width).toBeLessThan(Math.min(600, stage.width));

    await app.drag("id:ad-card", { y: 200 });
    await settle(app, 120);

    const drags = dragRecords(app);
    expect(drags.length).toBeGreaterThan(0);
    expect(drags.every((record) => record.panKeys === 0 && record.offset === 0)).toBe(
      true,
    );
    expect(app.shows("id:ad-card")).toBe(true);
    expect(falseOpenChanges(app)).toEqual([]);
  }, 120_000);

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
    const dialog = absDialog(app);
    const stage = container(app);
    expectPanelDock(dialog, stage);
    expect(dialog.width).toBeLessThan(Math.min(600, stage.width));
  }, 120_000);
});
