import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only half of adapt-sheets/modal.md M-005 (A-004): the "short pull
 * released gently settles back" assertion. On headless every synthesized
 * `app.drag` release carries flick velocity above the 500 pt/s dismiss
 * bound — measured: even dy=30 dismisses — so the settle branch is only
 * reachable where the host's release is gentler, which is the web target
 * (the same split alert-dialog's M-005 took, measured there: "the web
 * host's gentler release reaches the settle branch").
 */

type SwipeRecord = {
  presentation: string;
  panKeys: number;
  offset: number;
  atTop: boolean | null;
};

function openModal(): Promise<App> {
  return open("../../../modal.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    clock: {},
    host: {
      params: {
        case: "basic",
        scope: "touch-compact",
        dismissable: "1",
        swipeable: "1",
      },
    },
  });
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

describe("modal mobile (web)", () => {
  // adapt-sheets/modal.md M-005 (A-004): a pull below the half-height bound
  // released gently settles back — the card stays, the offset returns to
  // rest. The engagement and the distance-bound dismiss run on both targets
  // in modal.mobile.test.tsx.
  test("M-005 swipeable sheet on web: short pull settles back to rest", async () => {
    const app = await openModal();

    await app.clock?.runFor(400);

    await app.drag("id:mo-card", { y: 60 });
    await app.clock?.runFor(400);

    const swipes = swipeRecords(app);
    // The gesture engaged and displaced the card mid-drag…
    expect(swipes.some((record) => record.panKeys > 0)).toBe(true);
    expect(swipes.some((record) => record.offset > 0)).toBe(true);
    // …then the gentle release settled: offset back to 0, card still open,
    // no close requested.
    expect(lastSwipe(app).offset).toBe(0);
    expect(app.shows("id:mo-card")).toBe(true);
    expect(
      callsOf(app, "openChange").filter((args) => args[0] === false),
    ).toEqual([]);
  }, 90_000);
});
