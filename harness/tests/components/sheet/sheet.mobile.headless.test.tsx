import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only half of the sheet-handoff drag↔scroll assertions. A
 * synthesized `app.drag` does not drive the web host's scroll recognizer —
 * the same capability boundary `dragAndHold` sits behind — so the
 * "push away from the close edge stays a scroll" half of
 * adapt-sheets/sheet-handoff.md M-007 lives here: on headless the Scroll's
 * native recognizer takes a drag the predicate releases and emits real
 * offset progress, which the web target cannot produce.
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

function lastBodyOffset(app: App): number {
  const calls = callsOf(app, "bodyScroll");
  const last = calls.at(-1)?.[0] as { offset: { y: number } } | undefined;

  return last?.offset.y ?? 0;
}

async function settle(app: App): Promise<void> {
  await app.clock?.runFor(40);
}

describe("sheet-handoff", () => {
  // adapt-sheets/sheet-handoff.md M-007 (A-005, A-006), push-away half: at
  // the full detent with the content at its start edge, a push away from
  // the close edge stays a scroll — the direction predicate releases it —
  // and the detent's length never changes. The pull half runs in
  // sheet.mobile.test.tsx on both targets.
  test("M-007 touch + full detent + atTop: push-up keeps scrolling, the panel stays put", async () => {
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
    expect(lastBodyOffset(app)).toBeGreaterThan(0);
    expect(lastDetent(app).atTop).toBe(false);

    // Back at the start edge the pull claims again — both directions of
    // the handoff decision in one session.
    await app.scroll("id:body", -200);
    await settle(app);
    expect(lastDetent(app).atTop).toBe(true);

    const lengthsBefore = detentCalls(app).length;
    await app.drag("id:body", { x: 0, y: 120 });
    await settle(app);
    expect(
      detentCalls(app)
        .slice(lengthsBefore)
        .some((record) => record.length < 760),
    ).toBe(true);
    expect(app.shows("id:dialog")).toBe(true);
  });
});
