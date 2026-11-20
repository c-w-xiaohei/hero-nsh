import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the sheet-handoff mechanism unit, one test per row
 * of adapt-sheets/sheet-handoff.md §4 (M-005…M-010, M-012, M-013). The
 * fixture is `harness/sheet.fixtures.tsx` — `handoff` rests at the 180-point
 * snap (partial detent, frozen Body), `handoff-full` and `handoff-locked`
 * have no snap points (full detent; `handoff-locked` is `!isDismissable`,
 * so a release that would dismiss returns to rest instead).
 *
 * `host.params.scope="touch"` mounts the `EnvironmentScope input="touch"`
 * the assertions inject; its absence is the default pointer environment —
 * the desktop-parity baseline, including the negative assertion that the
 * content gesture path does not exist there. `app.drag` and `app.scroll`
 * drive the touches on headless and web alike, so this file is a
 * dual-target `.mobile.test.tsx`.
 *
 * The observation channel is what `nsh/test` sees: the `detent` probe's
 * Storage records (`length`, `detents`, `isExpanded`, `atTop`, `dragging`
 * and the content pan's resolved key counts — `panKeys=0` is the direct
 * evidence the gesture path is physically absent under pointer),
 * `probe("bodyScroll")` for the forwarded `onScroll`, and `shows` for the
 * sheet's open state.
 */

type DetentRecord = {
  length: number;
  detents: number[];
  isExpanded: boolean;
  atTop: boolean;
  dragging: boolean;
  panKeys: number;
  scrollKeys: number;
};

function openSheet(caseName: string, scope?: "touch"): Promise<App> {
  return open("../../../sheet.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    clock: {},
    host: { params: { case: caseName, ...(scope ? { scope } : {}) } },
  });
}

function detentCalls(app: App): DetentRecord[] {
  return callsOf(app, "detent").map((args) => args[0] as DetentRecord);
}

function lastDetent(app: App): DetentRecord {
  const calls = detentCalls(app);
  const last = calls.at(-1);

  if (!last) throw new Error("the detent probe reported nothing");

  return last;
}

function lengths(app: App): number[] {
  return detentCalls(app).map((record) => record.length);
}

function bodyScrollCount(app: App): number {
  return callsOf(app, "bodyScroll").length;
}

// The host's `Scroll` emits `onScroll` for a gesture it claims even when
// `scrollable` is off — the events carry `offset.y: 0`. "The body did not
// scroll" is therefore an assertion on the offsets, not the event count.
function bodyOffsets(app: App): number[] {
  return callsOf(app, "bodyScroll").map(
    (args) => (args[0] as { offset: { y: number } }).offset.y,
  );
}

function lastBodyOffset(app: App): number {
  const calls = callsOf(app, "bodyScroll");
  const last = calls.at(-1)?.[0] as { offset: { y: number } } | undefined;

  return last?.offset.y ?? 0;
}

async function settle(app: App): Promise<void> {
  await app.clock?.runFor(40);
}

describe("sheet-handoff", () => {
  // adapt-sheets/sheet-handoff.md M-005 (A-004, A-006): the Body reports its
  // scroll offset and `atTop` follows it; the caller's own `onScroll` is
  // still forwarded every event.
  test("M-005 Body scroll reports offset: atTop flips and onScroll still forwards", async () => {
    const app = await openSheet("handoff-full", "touch");

    await settle(app);
    expect(lastDetent(app).atTop).toBe(true);

    await app.scroll("id:body", 120);
    await settle(app);

    // Every event reached both the caller's handler and the detent's
    // reporter.
    expect(bodyScrollCount(app)).toBeGreaterThanOrEqual(1);
    expect(lastBodyOffset(app)).toBeGreaterThan(0);
    expect(lastDetent(app).atTop).toBe(false);

    // Scrolling back to the start edge restores `atTop`.
    await app.scroll("id:body", -120);
    await settle(app);
    expect(lastDetent(app).atTop).toBe(true);
  });

  // adapt-sheets/sheet-handoff.md M-006 (A-005): under the injected touch
  // environment, a pull on the Body below the full detent drags the panel —
  // the reported length dips — and no scroll happens, because the gesture
  // claimed the touches before the Scroll.
  test("M-006 touch + partial detent: Body pull-down moves the panel, never scrolls", async () => {
    const app = await openSheet("handoff", "touch");

    await settle(app);
    expect(Math.round(lastDetent(app).length)).toBe(180);
    expect(lastDetent(app).isExpanded).toBe(false);

    await app.drag("id:body-touch", { x: 0, y: 120 });
    await settle(app);

    // Some mid-drag record reports a shrunken detent; the release then
    // settles back onto the 180 snap point (a snap sheet never closes on a
    // drag).
    const seen = lengths(app);
    expect(seen.some((length) => length < 170)).toBe(true);
    expect(bodyScrollCount(app)).toBe(0);
    expect(lastDetent(app).isExpanded).toBe(false);
    expect(app.shows("id:dialog")).toBe(true);
  });

  // adapt-sheets/sheet-handoff.md M-007 (A-005, A-006): at the full detent
  // with the content at its start edge, a push away from the close edge
  // stays a scroll — the direction predicate releases it — and a pull
  // toward it claims the gesture and shrinks the panel.
  //
  // `handoff-locked` is `!isDismissable`: the pull's release animates back
  // to the detent instead of dismissing, so the claim evidence lives in the
  // mid-drag records. The push runs first because `app.drag`'s release
  // carries a flick velocity that would settle a pull onto a snap decision
  // the second half does not need.
  test("M-007 touch + full detent + atTop: push-up scrolls, pull-down shrinks the panel", async () => {
    const app = await openSheet("handoff-locked", "touch");

    await settle(app);
    expect(lastDetent(app).isExpanded).toBe(true);
    expect(lastDetent(app).atTop).toBe(true);

    // Push away from the close edge: the gesture is released to the Scroll
    // and the detent's length never changes.
    const recordsBefore = detentCalls(app).length;
    await app.drag("id:body", { x: 0, y: -80 });
    await settle(app);
    expect(
      detentCalls(app)
        .slice(recordsBefore)
        .every((record) => record.length >= 767),
    ).toBe(true);
    expect(bodyScrollCount(app)).toBeGreaterThan(0);
    expect(lastBodyOffset(app)).toBeGreaterThan(0);
    expect(lastDetent(app).atTop).toBe(false);

    // Back at the start edge a pull toward the close edge claims: the panel
    // shrinks during the drag and no scroll event fires on its account.
    await app.scroll("id:body", -200);
    await settle(app);
    expect(lastDetent(app).atTop).toBe(true);

    const scrolls = bodyScrollCount(app);
    const lengthsBefore = detentCalls(app).length;
    await app.drag("id:body", { x: 0, y: 120 });
    await settle(app);

    expect(
      detentCalls(app)
        .slice(lengthsBefore)
        .some((record) => record.length < 760),
    ).toBe(true);
    expect(bodyScrollCount(app)).toBe(scrolls);
    expect(app.shows("id:dialog")).toBe(true);
  });

  // adapt-sheets/sheet-handoff.md M-008 (A-005): a content-area drag reuses
  // `sheetDismissTarget` — past the threshold the release dismisses; with
  // dismissal locked the same gesture settles back to rest.
  test("M-008 touch + no snapPoints: drag past the threshold dismisses, a locked sheet settles", async () => {
    // 320 points clears the 25%-of-panel dismiss bound on its own: the
    // release animation takes the panel out and the sheet closes.
    const dismissed = await openSheet("handoff-full", "touch");
    await settle(dismissed);
    await dismissed.drag("id:body", { x: 0, y: 320 });
    await dismissed.clock?.runFor(600);
    expect(dismissed.shows("id:dialog")).toBe(false);

    // The same gesture on a `!isDismissable` sheet: `sheetDismissTarget`
    // answers the rest position, so the release animates back instead of
    // closing. `app.drag` releases with a flick velocity above the 0.4
    // points/ms bound, so an unlocked sheet could not stand in for the
    // settle case at any drag length.
    const locked = await openSheet("handoff-locked", "touch");
    await settle(locked);
    await locked.drag("id:body", { x: 0, y: 320 });
    await locked.clock?.runFor(600);
    expect(locked.shows("id:dialog")).toBe(true);
    expect(lastDetent(locked).length).toBeGreaterThan(700);
  });

  // adapt-sheets/sheet-handoff.md M-009 (A-005, negative): under the default
  // pointer environment the content gesture path does not exist —
  // `panHandlers()` resolves to an empty object (`panKeys=0`) and a pull on
  // the Body moves neither the panel nor a frozen Scroll.
  test("M-009 default pointer environment: no content gesture path at all", async () => {
    const app = await openSheet("handoff");

    await settle(app);

    // Physical absence: the accessor resolves to no handlers at all.
    expect(lastDetent(app).panKeys).toBe(0);

    const recordsBefore = detentCalls(app).length;
    await app.drag("id:body-touch", { x: 0, y: 120 });
    await settle(app);

    expect(
      detentCalls(app)
        .slice(recordsBefore)
        .every((record) => record.length >= 170),
    ).toBe(true);
    // The frozen Scroll may still emit events for a claimed gesture; the
    // honest assertion is that its offset never left the start edge.
    expect(bodyOffsets(app).every((offset) => offset === 0)).toBe(true);
    expect(app.shows("id:dialog")).toBe(true);
  });

  // adapt-sheets/sheet-handoff.md M-010 (A-006, baseline): the Body's
  // scrollable rule is unchanged by the mechanism — frozen below the full
  // detent, free at it — in both environments.
  test("M-010 baseline: Body scrolls only at the full detent, in both environments", async () => {
    for (const scope of [undefined, "touch"] as const) {
      const app = await openSheet("handoff", scope);

      await settle(app);
      // Frozen below the full detent: `app.scroll` rejects as the
      // non-scrollable case always did.
      await expect(app.scroll("id:body", 80)).rejects.toThrow();

      // The Handle's own drag expands the sheet to the full detent.
      await app.drag("id:handle", { x: 0, y: -590 });
      await settle(app);
      expect(lastDetent(app).isExpanded).toBe(true);

      await app.scroll("id:body", 120);
      await settle(app);
      expect(bodyScrollCount(app)).toBeGreaterThan(0);
    }
  });

  // adapt-sheets/sheet-handoff.md M-012 (A-005, baseline): the Handle's
  // existing responder drag keeps driving the detent under touch — the new
  // gesture seam did not gate the existing desktop path.
  test("M-012 baseline: Handle drag still moves the detent under touch", async () => {
    const app = await openSheet("handoff", "touch");

    await settle(app);

    const recordsBefore = detentCalls(app).length;
    await app.drag("id:handle", { x: 0, y: 120 });
    await settle(app);

    expect(
      detentCalls(app)
        .slice(recordsBefore)
        .some((record) => record.length < 170),
    ).toBe(true);
    expect(lastDetent(app).isExpanded).toBe(false);
  });

  // adapt-sheets/sheet-handoff.md M-013 (A-008): the fixture's observation
  // channel itself — the detent probe reports the mount state, and the same
  // case mounts under the scope injection the other assertions use.
  test("M-013 observation channel: DetentProbe reports mount state, scope remounts", async () => {
    for (const scope of [undefined, "touch"] as const) {
      const app = await openSheet("handoff", scope);

      await settle(app);
      const initial = lastDetent(app);

      // snapPoints=[180] gives two resting lengths (180 + the full reveal);
      // the sheet opens at the partial detent and the Body starts at its
      // start edge.
      expect(initial.detents).toHaveLength(2);
      expect(Math.round(initial.length)).toBe(180);
      expect(initial.isExpanded).toBe(false);
      expect(initial.atTop).toBe(true);
    }
  });
});
