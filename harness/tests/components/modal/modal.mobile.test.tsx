import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import type { ModalPresentation } from "@heroui/react";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the modal adapt unit, one test per row of
 * adapt-sheets/modal.md §4 (M-001…M-010, M-012, M-013; M-011 lives in
 * modal.mobile.headless.test.tsx, the web-only halves of M-005 and the
 * M-009 `size` axis in modal.mobile.web.test.tsx, the headless halves of
 * M-009/M-013 in modal.mobile.headless.test.tsx). The fixture is
 * `harness/modal.fixtures.tsx` — `basic` is the upstream part tree,
 * `scrollable` adds 40 tall Body rows; `host.params` carries `scope`
 * (EnvironmentScope input/width), `presentation`, `dismissable`, `swipeable`,
 * `scroll`, `size`, `placement` and `open` ("0" starts closed so `mo-trigger`
 * opens).
 *
 * `open()` platform/width/height options are rejected on ios/android, so
 * `scope:"pointer"` is the default half of each row (the role the old
 * `platform:"windows"` pin played) and `scope` keeps injecting the touch
 * half; geometry reads the `container`/`absDialog` records rather than
 * viewport constants because native screens vary. The observation channel
 * is what `nsh/test` sees: the `layout` probe's
 * per-part bounds, the `swipe` probe (`panKeys` — 0 when the swipe gesture is
 * gated off, the physical-absence evidence — plus `offset`, `atTop` and the
 * resolved `presentation`), the `drag` probe (offset deltas the pan wrote),
 * the `scroll` probe (the Body's forwarded `onScroll`), the `events` probe
 * (the trigger's press chain), `closePress`, `openChange`, `shows`/`count`,
 * and the merged `calls()` stream for cross-probe ordering.
 *
 * Coordinate note: `onLayout` bounds are parent-relative — the `container`
 * record is screen-absolute (its carrier is the full-window layer at 0,0),
 * while `dialog`/`body` report inside their parent. `absDialog` composes the
 * two so "the card's box" can be asserted the way the sheet words it.
 *
 * Timeouts: the multi-mount rows (M-005, M-006, M-008, M-009, M-013) open
 * several apps per test; on the web target each open costs seconds and the
 * default 30 s cap is where the page-load flake lives, so they carry an
 * explicit 90 s budget.
 */

type LayoutRecord = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SwipeRecord = {
  presentation: string;
  panKeys: number;
  offset: number;
  atTop: boolean | null;
};

function openModal(
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../modal.fixtures.tsx", {
    clock: {},
    host: { params: { case: "basic", scope: "pointer", ...params } },
  });
}

function openModalCase(
  caseName: string,
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../modal.fixtures.tsx", {
    clock: {},
    host: { params: { case: caseName, scope: "pointer", ...params } },
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

/** The dialog's box in screen coordinates: container origin + dialog origin. */
function absDialog(app: App): {
  x: number;
  y: number;
  width: number;
  height: number;
  centerY: number;
} {
  const container = lastLayout(app, "container");
  const dialog = lastLayout(app, "dialog");

  return {
    x: container.x + dialog.x,
    y: container.y + dialog.y,
    width: dialog.width,
    height: dialog.height,
    centerY: container.y + dialog.y + dialog.height / 2,
  };
}

function swipeRecords(app: App): SwipeRecord[] {
  return callsOf(app, "swipe").map((args) => args[0] as SwipeRecord);
}

function lastSwipe(app: App): SwipeRecord {
  const records = swipeRecords(app);
  const last = records.at(-1);

  if (!last) throw new Error("no swipe probe record");

  return last;
}

function dragRecords(app: App): { from: number; to: number }[] {
  return callsOf(app, "drag").map(
    (args) => args[0] as { from: number; to: number },
  );
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

function scrollOffsets(app: App): number[] {
  return callsOf(app, "scroll").map(
    (args) => (args[0] as { offset: { y: number } }).offset.y,
  );
}

async function settle(app: App, ms = 120): Promise<void> {
  await app.clock?.runFor(ms);
}

async function settleOpen(app: App): Promise<void> {
  await app.clock?.runFor(400);
}

describe("modal mobile", () => {
  // adapt-sheets/modal.md M-001 (A-001, A-002, A-003): touch + compact under
  // `presentation="auto"` presents the bottom-docked sheet — the card's bottom
  // edge on the window's, full-bleed width, no centering.
  test(
    "M-001 touch-compact auto presents the bottom-docked sheet",
    async () => {
      const app = await openModal({ scope: "touch-compact" });

      await settleOpen(app);

      const dialog = absDialog(app);
      const stage = lastLayout(app, "container");
      expect(
        Math.abs(dialog.y + dialog.height - (stage.y + stage.height)),
      ).toBeLessThanOrEqual(4);
      expect(dialog.width).toBeGreaterThan(stage.width * 0.9);
      expect(dialog.centerY).toBeGreaterThan(stage.y + stage.height / 2 + 100);
      expect(lastSwipe(app).presentation).toBe("sheet");
    },
    90_000,
  );

  // adapt-sheets/modal.md M-002 (A-001): a `"panel"` pin beats the touch +
  // compact auto rule — the card stays centered under the `max-w-md` cap.
  //
  // adapt-sheets/modal.md M-012 (A-008): the `ModalPresentation` type
  // annotation on the pin is the compile-time half of the index.ts export
  // assertion — `nsh check harness` failing on it would mean the type never
  // reached the public surface.
  test(
    'M-002 presentation="panel" pin holds the centered panel under touch-compact',
    async () => {
      const pin: ModalPresentation = "panel";
      const app = await openModal({ scope: "touch-compact", presentation: pin });

      await settleOpen(app);

      const dialog = absDialog(app);
      const stage = lastLayout(app, "container");
      expect(
        Math.abs(dialog.centerY - (stage.y + stage.height / 2)),
      ).toBeLessThanOrEqual(40);
      // The `max-w-md` cap: far below the sheet's full-bleed width.
      expect(dialog.width).toBeLessThan(Math.min(600, stage.width));
      expect(dialog.width).toBeGreaterThan(200);
      expect(lastSwipe(app).presentation).toBe("panel");
    },
    90_000,
  );

  // adapt-sheets/modal.md M-003 (A-004, negative): under the default pointer
  // environment the swipe path is physically absent even with every prop
  // that could allow it set — `panHandlers()` resolves to an empty object
  // (`panKeys=0`, no responder props exist to spread), the offset never
  // leaves 0, the `drag` probe records nothing, the card does not move and
  // nothing closes.
  test(
    "M-003 pointer + dismissable + swipeable: no gesture path at all",
    async () => {
      const app = await openModal({ dismissable: "1", swipeable: "1" });

      await settleOpen(app);
      const before = lastLayout(app, "dialog");

      await app.drag("id:mo-card", { y: 200 });
      await settle(app, 200);

      const swipes = swipeRecords(app);
      expect(swipes.length).toBeGreaterThan(0);
      expect(
        swipes.every((record) => record.panKeys === 0 && record.offset === 0),
      ).toBe(true);
      expect(dragRecords(app)).toEqual([]);
      expect(lastLayout(app, "dialog")).toEqual(before);
      expect(app.shows("id:mo-card")).toBe(true);
      expect(falseOpenChanges(app)).toEqual([]);
    },
    90_000,
  );

  // adapt-sheets/modal.md M-004 (A-004, negative): the second gate — touch +
  // sheet + `isDismissable` but no explicit `isSwipeable` — still mounts no
  // gesture. "仅显式允许" means the default never slides.
  test(
    "M-004 touch+sheet+dismissable without isSwipeable: drag leaves the card at rest",
    async () => {
      const app = await openModal({
        scope: "touch-compact",
        presentation: "sheet",
        dismissable: "1",
      });

      await settleOpen(app);

      await app.drag("id:mo-card", { y: 200 });
      await settle(app, 200);

      const swipes = swipeRecords(app);
      expect(swipes.length).toBeGreaterThan(0);
      expect(
        swipes.every((record) => record.panKeys === 0 && record.offset === 0),
      ).toBe(true);
      expect(dragRecords(app)).toEqual([]);
      expect(app.shows("id:mo-card")).toBe(true);
      expect(falseOpenChanges(app)).toEqual([]);
    },
    90_000,
  );

  // adapt-sheets/modal.md M-005 (A-004): with all four gates open the card
  // follows the finger — the swipe probe shows `panKeys > 0` (the gesture
  // path is mounted) and `offset` tracking the pull — and a pull past the
  // distance bound dismisses through `onOpenChange(false)` and the card
  // leaves after the exit-hold window.
  //
  // The row's "short pull released gently settles back" half is asserted in
  // `modal.mobile.web.test.tsx`: on headless every synthesized release
  // carries flick velocity above the 500 pt/s dismiss bound (`app.drag`
  // measured: even dy=30 dismisses), while the web host's gentler release
  // reaches the settle branch. What this file asserts is what both targets
  // agree on: engagement and the distance-bound dismiss.
  test(
    "M-005 swipeable sheet: drag engages the pan, far pull dismisses",
    async () => {
      const app = await openModal({
        scope: "touch-compact",
        dismissable: "1",
        swipeable: "1",
      });

      await settleOpen(app);
      await app.drag("id:mo-card", { y: 60 });
      await settle(app, 200);

      const swipes = swipeRecords(app);
      // The gesture claimed: the pan resolved handlers and the offset
      // followed the pull frame by frame.
      expect(swipes.some((record) => record.panKeys > 0)).toBe(true);
      expect(swipes.some((record) => record.offset > 0)).toBe(true);
      expect(dragRecords(app).some((record) => record.to > 0)).toBe(true);

      // A far pull clears the half-height distance bound on its own.
      const far = await openModal({
        scope: "touch-compact",
        dismissable: "1",
        swipeable: "1",
      });

      await settleOpen(far);
      await far.drag("id:mo-card", { y: 400 });
      await far.waitFor("id:mo-card", { state: "gone", timeout: 10_000 });

      expect(falseOpenChanges(far)).toEqual([false]);
      expect(far.shows("id:mo-card")).toBe(false);
    },
    90_000,
  );

  // adapt-sheets/modal.md M-006 (A-006): under an injected touch environment
  // the trigger's press chain is the desktop chain verbatim — same events,
  // same order, same bounds — and the press still opens.
  test(
    "M-006 touch trigger press: event order identical to pointer, bounds unchanged",
    async () => {
      const touch = await openModal({ scope: "touch-regular", open: "0" });
      await settle(touch, 300);
      await touch.press("id:mo-trigger");
      await touch.waitFor("id:mo-card", { timeout: 10_000 });

      const pointer = await openModal({ open: "0" });
      await settle(pointer, 300);
      await pointer.press("id:mo-trigger");
      await pointer.waitFor("id:mo-card", { timeout: 10_000 });

      expect(eventArgs(touch)).toEqual(eventArgs(pointer));
      expect(eventArgs(touch)).toEqual(["pressDown", "pressUp", "press"]);
      expect(openChanges(touch)).toContain(true);
      expect(touch.shows("id:mo-card")).toBe(true);
      expect(pointer.shows("id:mo-card")).toBe(true);

      const bounds = layoutRecords(touch, "trigger");
      expect(bounds.length).toBeGreaterThan(0);
      const first = bounds[0];
      for (const record of bounds) {
        expect(record).toEqual(first);
      }
    },
    90_000,
  );

  // adapt-sheets/modal.md M-007 (A-006, negative): the same press under the
  // default pointer environment produces the same chain and the same
  // unchanged bounds — the press-feedback seam's `enabled=false` half is a
  // physical no-op (`hitSlop()` answers `undefined`, the press callbacks
  // record nothing). `hitSlop` itself has no `nsh/test` read channel; the
  // seam's own unit asserts it (adapt sheet §6).
  test(
    "M-007 pointer trigger press: identical chain, bounds unchanged",
    async () => {
      const app = await openModal({ open: "0" });
      await settle(app, 300);

      const before = layoutRecords(app, "trigger").at(-1);
      expect(before).toBeDefined();

      await app.press("id:mo-trigger");
      await app.waitFor("id:mo-card", { timeout: 10_000 });

      expect(eventArgs(app)).toEqual(["pressDown", "pressUp", "press"]);
      expect(openChanges(app)).toContain(true);
      expect(app.shows("id:mo-card")).toBe(true);

      const after = layoutRecords(app, "trigger").at(-1);
      expect(after).toEqual(before);
    },
    90_000,
  );

  // adapt-sheets/modal.md M-008 (A-009): the fixture's observation carrier
  // itself — both cases mount under the default and the injected
  // environment, and every probe the §4 rows read back is populated. The
  // `drag` probe only writes on an offset change, so it is exercised by the
  // swipe rows (M-005/M-013), not here.
  test(
    "M-008 fixture mounts in both environments, all probes readable",
    async () => {
      for (const caseName of ["basic", "scrollable"] as const) {
        for (const scope of [undefined, "touch-compact"] as const) {
          const params: Record<string, string> = {
            open: "0",
            ...(scope ? { scope } : {}),
          };
          const app = await openModalCase(caseName, params);

          await settle(app, 300);

          // Open first: the probes live inside the presented dialog, so a
          // closed mount records nothing yet.
          await app.press("id:mo-trigger");
          await app.waitFor("id:mo-card", { timeout: 10_000 });
          await settle(app, 300);

          expect(layoutRecords(app, "container").length).toBeGreaterThan(0);
          expect(layoutRecords(app, "dialog").length).toBeGreaterThan(0);
          expect(layoutRecords(app, "body").length).toBeGreaterThan(0);
          expect(swipeRecords(app).length).toBeGreaterThan(0);
          expect(eventArgs(app)).toEqual(["pressDown", "pressUp", "press"]);
          expect(openChanges(app)).toContain(true);

          if (caseName === "scrollable") {
            await app.scroll("id:mo-body", 100);
            await settle(app, 60);
            expect(scrollOffsets(app).length).toBeGreaterThan(0);
          }

          await app.press("id:mo-close");
          await app.waitFor("id:mo-card", { state: "gone", timeout: 10_000 });
          expect(falseOpenChanges(app)).toContain(false);
          expect(callsOf(app, "closePress").length).toBe(1);
        }
      }
    },
    90_000,
  );

  // adapt-sheets/modal.md M-009 (baseline): the desktop defaults are
  // unchanged — centered panel under the width cap, `isKeyboardDismissDisabled=false`
  // keeps Escape, and the CloseTrigger keeps its close→onPress order. The
  // outside-press half (`isDismissable=true` keeps it armed) lives in
  // modal.mobile.headless.test.tsx: the web hit test stops at the layout
  // carrier (the X-004 measurement) and the centered panel covers the
  // backdrop's middle at every placement (measured `ERR_NSH_TEST_COVERED`).
  test(
    "M-009 baseline: defaults, Escape, close order",
    async () => {
      // Centered panel with the max-w cap (auto placement at this width).
      const app = await openModal();
      await settleOpen(app);

      const dialog = absDialog(app);
      const stage = lastLayout(app, "container");
      expect(
        Math.abs(dialog.centerY - (stage.y + stage.height / 2)),
      ).toBeLessThanOrEqual(40);
      expect(dialog.width).toBeLessThan(Math.min(600, stage.width));

      // `isKeyboardDismissDisabled=false` (the default): Escape closes through
      // the native Dialog's `closeOnEscape`.
      await app.keyboard.press("escape");
      await app.waitFor("id:mo-card", { state: "gone", timeout: 10_000 });
      expect(falseOpenChanges(app)).toEqual([false]);

      // CloseTrigger: the slot's close runs before the caller's `onPress` —
      // read off the merged probe stream.
      const closing = await openModal();
      await settleOpen(closing);
      await closing.press("id:mo-close");
      await closing.waitFor("id:mo-card", { state: "gone", timeout: 10_000 });

      const stream = calls(closing);
      const closeIndex = stream.findIndex(
        (call) => call.name === "openChange" && call.args[0] === false,
      );
      const pressIndex = stream.findIndex(
        (call) => call.name === "closePress",
      );
      expect(closeIndex).toBeGreaterThanOrEqual(0);
      expect(pressIndex).toBeGreaterThan(closeIndex);
    },
    90_000,
  );

  // adapt-sheets/modal.md M-009 (baseline), axes half: the scroll / size /
  // placement props still mount and render their desktop output. Split from
  // the defaults half because each axis value is a fresh mount — on the web
  // target a run of sequential opens is where the page-load flake lives, and
  // isolating them keeps one slow open from taking the whole row down.
  //
  // Placement note (measured while writing this file): all placement values
  // produce identical bounds — the container's height is content-driven (the
  // carrier row's `items-center` never stretches it), so the dialog's
  // placement margins have no free space to distribute. That is the desktop
  // baseline this row pins; the mobile layer must not change it.
  test(
    "M-009 baseline: scroll, size and placement axes unchanged",
    async () => {
      // `scroll="inside"`: the Body's Scroll reports offsets to the caller's
      // `onScroll` (and the atTop channel ahead of it).
      const inside = await openModalCase("scrollable");
      await settleOpen(inside);
      await inside.scroll("id:mo-body", 100);
      await settle(inside, 60);
      expect(scrollOffsets(inside).length).toBeGreaterThan(0);
      expect(scrollOffsets(inside).at(-1)).toBeGreaterThan(0);

      // `scroll="outside"`: the Body is a plain View — its `onScroll` never
      // fires — while the carrier Scroll reaches the far row.
      const outside = await openModalCase("scrollable", { scroll: "outside" });
      await settleOpen(outside);
      await outside.scroll("id:mo-body", 100);
      await settle(outside, 60);
      expect(callsOf(outside, "scroll")).toEqual([]);
      expect(outside.shows("text:Row 39")).toBe(true);

      // `size`: the max-w caps need a window wider than 512 pt to tell the
      // sizes apart — on a phone-width screen every cap clamps to the same
      // box. That half lives in modal.mobile.web.test.tsx.

      // `placement`: top/center/bottom mount and render identical card
      // bounds — the desktop baseline measured above (the margins have no
      // free space to move within a content-height container).
      const placements = ["top", "center", "bottom"] as const;
      const placementBounds: LayoutRecord[] = [];
      for (const placement of placements) {
        const placed = await openModal({ placement });
        await settleOpen(placed);
        expect(placed.shows("id:mo-card")).toBe(true);
        placementBounds.push(lastLayout(placed, "dialog"));
      }
      for (const record of placementBounds) {
        expect(record).toEqual(placementBounds[0]);
      }
    },
    90_000,
  );

  // adapt-sheets/modal.md M-010 (baseline + A-004's fourth gate): touch but a
  // regular-width window still resolves `"panel"` under auto, and on a panel
  // the swipe channel never attaches even with `isDismissable` +
  // `isSwipeable` both set.
  test(
    "M-010 touch-regular auto stays panel; swipe never attaches on panel",
    async () => {
      const app = await openModal({
        scope: "touch-regular",
        dismissable: "1",
        swipeable: "1",
      });

      await settleOpen(app);

      const dialog = absDialog(app);
      const stage = lastLayout(app, "container");
      expect(
        Math.abs(dialog.centerY - (stage.y + stage.height / 2)),
      ).toBeLessThanOrEqual(40);
      expect(dialog.width).toBeLessThan(Math.min(600, stage.width));
      expect(lastSwipe(app).presentation).toBe("panel");

      await app.drag("id:mo-card", { y: 200 });
      await settle(app, 200);

      const swipes = swipeRecords(app);
      expect(swipes.length).toBeGreaterThan(0);
      expect(
        swipes.every((record) => record.panKeys === 0 && record.offset === 0),
      ).toBe(true);
      expect(app.shows("id:mo-card")).toBe(true);
      expect(falseOpenChanges(app)).toEqual([]);
    },
    90_000,
  );

  // adapt-sheets/modal.md M-013 (A-004, A-005), both-target half: with the
  // content scrolled off its start edge the pull is not the swipe — the pan
  // never claims (`offset` stays 0) — and back at the top the same pull
  // claims and displaces the card. The "the Scroll keeps the gesture" half
  // (real offset progress during the drag) needs the host's scroll
  // recognizer and lives in modal.mobile.headless.test.tsx — `app.drag`
  // does not drive the web host's scroll recognizer (adapt sheet §6).
  test(
    "M-013 atTop arbitration: off-top pull never claims, at-top pull displaces",
    async () => {
      const app = await openModalCase("scrollable", {
        scope: "touch-compact",
        dismissable: "1",
        swipeable: "1",
      });

      await settleOpen(app);
      expect(lastSwipe(app).atTop).toBe(true);

      // Scroll the Body off its start edge: `atTop` flips and stays honest.
      await app.scroll("id:mo-body", 200);
      await settle(app, 60);
      expect(lastSwipe(app).atTop).toBe(false);

      // A pull while scrolled: the claim gate says no — the offset never
      // leaves 0 and the card stays put.
      await app.drag("id:mo-body", { y: 100 });
      await settle(app, 200);
      expect(lastSwipe(app).offset).toBe(0);
      expect(app.shows("id:mo-card")).toBe(true);

      // Back at the start edge the same pull claims: the offset follows the
      // finger (the release outcome differs by target — headless flick
      // dismisses, web settles — so only the claim is asserted here).
      await app.scroll("id:mo-body", -400);
      await settle(app, 60);
      expect(lastSwipe(app).atTop).toBe(true);

      await app.drag("id:mo-body", { y: 100 });
      await settle(app, 200);

      expect(swipeRecords(app).some((record) => record.offset > 0)).toBe(true);
      expect(dragRecords(app).some((record) => record.to > 0)).toBe(true);
    },
    90_000,
  );
});
