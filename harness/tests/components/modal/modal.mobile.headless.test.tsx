import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the modal adapt unit:
 *
 *   adapt-sheets/modal.md M-011 (A-001) — the host-derived half of the
 *   presentation rule. `open({platform:"ios"})` is only accepted on the
 *   headless target (`--target web` rejects it, the same reason the
 *   dragAndHold tests live headless), so the "the environment comes from
 *   `platform`/`windowSize()`, not `EnvironmentScope`" half can only run
 *   here.
 *
 *   adapt-sheets/modal.md M-009 (baseline) — the outside-press half. The
 *   web hit test stops at the layout carrier that covers the backdrop paint
 *   layer (the X-004 measurement), so a press that should dismiss reports
 *   nothing there; headless delivers it to the paint layer's `handlePress`.
 *   Under `presentation="sheet"` the card docks to the bottom edge, which
 *   leaves the backdrop's middle genuinely uncovered — under the centered
 *   panel the card always covers it (measured: `ERR_NSH_TEST_COVERED` on
 *   every placement/size), so the sheet carrier is the only geometry where
 *   this assertion can run at all.
 *
 *   adapt-sheets/modal.md M-013 (A-004, A-005) — the scroll-arbitration
 *   half. `app.drag` does not drive the web host's scroll recognizer, so
 *   "the gesture stays a scroll and the Body offset keeps changing" can
 *   only be observed where the Scroll's native recognizer takes the
 *   released drag (sheet-handoff M-007's split, adapt sheet §6).
 *
 * M-005 and M-009's Escape half carry their strict copies here: the
 * shared mobile file's iOS arm asserts only the degraded acceptance for
 * the registered E-2 (pan arbitration) and E-3 (Escape first responder)
 * gaps — headless has neither, so the strict displacement/dismiss
 * contract stays verified on this engine. M-013's own test below is
 * already its strict copy (offset engages, the drag channel records
 * displacement, the close fires through `openChange`).
 */

const VIEWPORT_W = 1024;
const VIEWPORT_H = 768;

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
  caseName = "basic",
): Promise<App> {
  return open("../../../modal.fixtures.tsx", {
    platform: "windows",
    width: VIEWPORT_W,
    height: VIEWPORT_H,
    clock: {},
    host: { params: { case: caseName, ...params } },
  });
}

function openIos(): Promise<App> {
  return open("../../../modal.fixtures.tsx", {
    platform: "ios",
    width: 390,
    height: 844,
    clock: {},
    host: { params: { case: "basic" } },
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
  y: number;
  width: number;
  height: number;
} {
  const container = lastLayout(app, "container");
  const dialog = lastLayout(app, "dialog");

  return {
    y: container.y + dialog.y,
    width: dialog.width,
    height: dialog.height,
  };
}

function swipeRecords(app: App): SwipeRecord[] {
  return callsOf(app, "swipe").map((args) => args[0] as SwipeRecord);
}

function dragRecords(app: App): { from: number; to: number }[] {
  return callsOf(app, "drag").map(
    (args) => args[0] as { from: number; to: number },
  );
}

function lastSwipe(app: App): SwipeRecord {
  const records = swipeRecords(app);
  const last = records.at(-1);

  if (!last) throw new Error("no swipe probe record");

  return last;
}

function scrollOffsets(app: App): number[] {
  return callsOf(app, "scroll").map(
    (args) => (args[0] as { offset: { y: number } }).offset.y,
  );
}

function falseOpenChanges(app: App): boolean[] {
  return callsOf(app, "openChange")
    .map((args) => args[0] as boolean)
    .filter((value) => value === false);
}

async function settle(app: App, ms = 120): Promise<void> {
  await app.clock?.runFor(ms);
}

describe("modal mobile (headless)", () => {
  // adapt-sheets/modal.md M-005 (A-005), strict copy: headless has no
  // E-2 arbitration gap — the claim provably engages — so the strict
  // contract stays verified here: listeners mounted, the offset and the
  // drag channel followed the pull, and the release dismisses through
  // `openChange(false)`. On this engine every engaged release dismisses —
  // `dragAndHold`/`drop` still carries enough release velocity to clear
  // the bound even at 30pt — so the settle-at-rest sub-assertion is not
  // producible here; it stays strict in the shared file's Android/web arm.
  test("M-005 strict: pull engages the pan and drag channels, release dismisses", async () => {
    const app = await openModal({
      scope: "touch-compact",
      dismissable: "1",
      swipeable: "1",
    });

    await app.clock?.runFor(400);
    const before = swipeRecords(app).length;
    await app.dragAndHold("id:mo-card", { y: 60 });
    await app.waitUntil(
      () =>
        swipeRecords(app)
          .slice(before)
          .some((record) => record.offset > 0),
      { timeout: 15_000 },
    );

    const swipes = swipeRecords(app);
    expect(swipes.some((record) => record.panKeys > 0)).toBe(true);
    expect(swipes.some((record) => record.offset > 0)).toBe(true);
    expect(dragRecords(app).some((record) => record.to > 0)).toBe(true);

    await app.drop();
    await settle(app, 400);
    expect(falseOpenChanges(app)).toEqual([false]);
    await app.waitFor("id:mo-card", { state: "gone", timeout: 10_000 });

    // The far pull through the shared row's own `app.drag` path dismisses
    // the same way.
    const far = await openModal({
      scope: "touch-compact",
      dismissable: "1",
      swipeable: "1",
    });

    await far.clock?.runFor(400);
    await far.drag("id:mo-card", { y: 400 });
    await far.waitFor("id:mo-card", { state: "gone", timeout: 10_000 });

    expect(falseOpenChanges(far)).toEqual([false]);
    expect(far.shows("id:mo-card")).toBe(false);
  }, 90_000);

  // adapt-sheets/modal.md M-009 (baseline), Escape half, strict copy:
  // headless has no E-3 first-responder gap — JS key bubbling reaches the
  // Dialog — so the strict `closeOnEscape` contract stays verified here:
  // Escape closes through `openChange(false)` and the card leaves.
  test("M-009 strict: Escape closes through openChange(false)", async () => {
    const app = await openModal();
    await app.clock?.runFor(400);
    expect(app.shows("id:mo-card")).toBe(true);

    await app.keyboard.press("escape");
    await app.waitFor("id:mo-card", { state: "gone", timeout: 10_000 });
    expect(falseOpenChanges(app)).toEqual([false]);
  }, 90_000);

  // adapt-sheets/modal.md M-011 (A-001): `open({platform:"ios"})` at 390×844
  // with no scope — the host derives `input="touch"` (`platform.desktop`
  // false) and `width="compact"` (short side under 640), so
  // `presentation="auto"` must resolve `"sheet"`: the card docks to the
  // bottom edge at full width.
  test("M-011 ios host derives touch+compact: auto presents the sheet", async () => {
    const app = await openIos();

    await app.clock?.runFor(400);

    const dialog = absDialog(app);
    expect(Math.abs(dialog.y + dialog.height - 844)).toBeLessThanOrEqual(4);
    expect(dialog.width).toBeGreaterThan(390 * 0.9);
    expect(lastSwipe(app).presentation).toBe("sheet");
    expect(app.shows("id:mo-card")).toBe(true);
  }, 90_000);

  // adapt-sheets/modal.md M-009 (baseline), outside-press half:
  // `isDismissable=true` (the default) keeps the outside press armed — under
  // the sheet carrier the backdrop's middle is uncovered, so the press
  // reaches the paint layer and `dismiss()` runs `close()`. The panel
  // geometry cannot express this (the centered card covers the backdrop's
  // middle at every placement — measured `ERR_NSH_TEST_COVERED`), and the
  // web target cannot deliver it (the carrier covers the paint layer, the
  // X-004 measurement); both degradations are recorded, not faked.
  test("M-009 sheet carrier: outside press on the free backdrop dismisses", async () => {
    const app = await openModal({ scope: "touch-compact" });

    await app.clock?.runFor(400);
    await app.press("id:mo-backdrop");
    await app.waitFor("id:mo-card", { state: "gone", timeout: 10_000 });

    expect(falseOpenChanges(app)).toEqual([false]);
    expect(app.shows("id:mo-card")).toBe(false);
  }, 90_000);

  // adapt-sheets/modal.md M-013 (A-004, A-005), scroll-arbitration half:
  // with the Body scrolled off its start edge, a pull on it stays a scroll —
  // the Scroll's recognizer takes the drag and the offset keeps changing —
  // while the swipe's offset stays 0; back at the top the same pull claims
  // the gesture and the card follows the finger.
  test("M-013 atTop arbitration: off-top drag keeps scrolling, at-top drag claims", async () => {
    const app = await openModal(
      {
        scope: "touch-compact",
        dismissable: "1",
        swipeable: "1",
      },
      "scrollable",
    );

    await app.clock?.runFor(400);
    expect(lastSwipe(app).atTop).toBe(true);

    // Scroll the Body off its start edge.
    await app.scroll("id:mo-body", 200);
    await settle(app, 60);
    expect(lastSwipe(app).atTop).toBe(false);

    // A pull while scrolled: the gesture is not the swipe — the pan's offset
    // stays 0 and the Scroll keeps the touches, emitting real offset
    // progress (the half the web target cannot produce).
    const scrollsBefore = scrollOffsets(app).length;
    await app.drag("id:mo-body", { y: 100 });
    await settle(app, 200);

    const newOffsets = scrollOffsets(app).slice(scrollsBefore);
    expect(newOffsets.length).toBeGreaterThan(0);
    expect(newOffsets.at(-1)).toBeGreaterThan(0);
    expect(lastSwipe(app).offset).toBe(0);
    expect(app.shows("id:mo-card")).toBe(true);

    // Back at the start edge the same pull claims: the offset follows the
    // finger, and the headless release's flick velocity clears the dismiss
    // bound — the card leaves through `onOpenChange(false)`.
    await app.scroll("id:mo-body", -400);
    await settle(app, 60);
    expect(lastSwipe(app).atTop).toBe(true);

    await app.drag("id:mo-body", { y: 100 });
    await settle(app, 200);

    expect(swipeRecords(app).some((record) => record.offset > 0)).toBe(true);
    expect(falseOpenChanges(app)).toContain(false);
    await app.waitFor("id:mo-card", { state: "gone", timeout: 10_000 });
  }, 90_000);
});
