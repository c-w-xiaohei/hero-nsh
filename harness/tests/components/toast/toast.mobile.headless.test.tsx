import { describe, expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { advance, openToast } from "../../testers/toast";

/*
 * Headless-only halves of the toast mobile assertions
 * (adapt-sheets/toast.md §4): M-003's held drag and release spring-back,
 * and M-006's drag-suspended countdown. `app.dragAndHold`/`app.drop`
 * synthesize only on the headless target — on `--target web` the release
 * is uncontrolled (sheet §6 host gap).
 *
 * Measured host limitation, verified on this target: every synthesized
 * `drop()` release carries ~584 pt/s of velocity — above the 500 pt/s
 * `toastDismissTarget` bound — and holding the finger down longer does
 * not decay it (checked at 120 ms and 800 ms of hold). `toastDismissTarget`
 * dismisses whenever travel > 0 and |velocity| > 500, so ANY release with
 * net forward travel takes the swipe-dismiss path: the sheet's "低速释放"
 * (low-speed release) is not synthesizable in either direction of travel.
 * The only release the host can produce that does not dismiss is a
 * counter-direction one (travel <= 0 fails the `travel > 0` gate before
 * velocity is read). M-003 and M-006 therefore hold a reverse drag — the
 * rubber-band side of `onDrag` — which exercises the same spring-back and
 * timer-resume code paths the forward sub-threshold release would have.
 *
 * Same fixture and channels as the dual file: `swipe`/`swipe-hold` cases
 * under `scope: "touch"`, `SwipeProbe`'s `{key, keys, active, offset,
 * dragging}` records in `probe("swipe")`, per-index `onClose-N` probes.
 */

type SwipeRecord = {
  key: string;
  keys: number;
  active: boolean;
  offset: number;
  dragging: boolean;
};

function swipeCalls(app: App): SwipeRecord[] {
  return callsOf(app, "swipe").map((args) => args[0] as SwipeRecord);
}

function lastSwipe(app: App): SwipeRecord {
  const records = swipeCalls(app);
  const last = records.at(-1);

  if (!last) throw new Error("the swipe probe reported nothing");

  return last;
}

describe("toast mobile (headless)", () => {
  // adapt-sheets/toast.md M-003 (A-001): touch + `placement:"bottom"` — a
  // held drag keeps every recorded offset under the 50 pt dismiss
  // distance, and the release springs the offset back to 0 without
  // closing. The sheet's forward `dy < 50` hold cannot be released at low
  // speed on this host (see the header: ~584 pt/s synthesized release
  // velocity dismisses any forward-travel release), so the hold runs
  // counter-direction — the rubber band caps |offset| at 40 — which is
  // the only release that exercises the spring-back branch.
  test("M-003 touch + bottom: a held drag springs back on release without closing", async () => {
    const app = await openToast("swipe", { params: { scope: "touch" } });

    await app.waitUntil(() => callsOf(app, "swipe").length > 0);
    expect(app.count("role:alert")).toBe(1);

    // -200 pt of counter-direction travel rubber-bands to a ~10 pt offset
    // (linear over the 768 pt window height, capped at 40): enough for a
    // clearly nonzero engagement signal, still far under the dismiss
    // distance the forward direction would face.
    await app.dragAndHold("id:Swipe-0", { x: 0, y: -200 });
    await app.waitUntil(() =>
      callsOf(app, "swipe").some(
        (args) => (args[0] as SwipeRecord).dragging === true,
      ),
    );

    // The drag engaged (nonzero offset records exist) and every recorded
    // offset stayed under the 50 pt dismiss distance.
    const held = swipeCalls(app);
    expect(held.some((record) => Math.abs(record.offset) > 0)).toBe(true);
    for (const record of held) {
      expect(Math.abs(record.offset)).toBeLessThan(50);
    }

    await app.drop();
    await app.waitUntil(() => {
      const last = lastSwipe(app);
      return last.offset === 0 && last.dragging === false;
    });

    expect(callsOf(app, "onClose-0")).toHaveLength(0);
    expect(app.shows("role:alert")).toBe(true);
    expect(app.count("role:alert")).toBe(1);
  }, 120_000);

  // adapt-sheets/toast.md M-006 (A-002): touch — a claimed swipe suspends
  // the queue's countdown under the `"drag"` key. Holding the drag past
  // the toast's 1000 ms timeout leaves it mounted; `drop()` releases the
  // timers and the toast auto-closes about a second later through the
  // ordinary timeout path. The drag runs counter-direction for the same
  // reason as M-003: the synthesized release cannot avoid the swipe-dismiss
  // path with forward travel, and a swipe-dismiss would fire `onClose`
  // immediately — the `onClose-0 === 0` check right after `drop()` is what
  // proves the later close came from the resumed countdown, not the
  // gesture.
  test("M-006 touch: holding a swipe suspends the countdown; release resumes it", async () => {
    const app = await openToast("swipe-hold", { params: { scope: "touch" } });

    await app.waitUntil(() => callsOf(app, "swipe").length > 0);
    expect(app.shows("role:alert")).toBe(true);

    await app.dragAndHold("id:Swipe-0", { x: 0, y: -60 });
    await app.waitUntil(() =>
      callsOf(app, "swipe").some(
        (args) => (args[0] as SwipeRecord).dragging === true,
      ),
    );

    // Held well past the 1000 ms timeout: the "drag" suspension keeps the
    // toast alive where an unsuspended countdown would have closed it.
    await advance(app, 1500);
    expect(app.shows("role:alert")).toBe(true);
    expect(app.count("role:alert")).toBe(1);
    expect(callsOf(app, "onClose-0")).toHaveLength(0);

    await app.drop();

    // The release sprang back rather than dismissing: the offset is back
    // at 0, the drag flag is down, no onClose fired, and the toast is
    // still mounted — so whatever closes it next is the countdown.
    await app.waitUntil(() => {
      const last = lastSwipe(app);
      return last.offset === 0 && last.dragging === false;
    });
    expect(callsOf(app, "onClose-0")).toHaveLength(0);
    expect(app.shows("role:alert")).toBe(true);

    // The countdown resumes with the time the pause preserved (at most
    // the original 1000 ms — `ToastTimer.pause` keeps `remaining`) and
    // fires; the exit hold then removes the row.
    await advance(app, 1200);
    expect(callsOf(app, "onClose-0")).toHaveLength(1);
    await advance(app, 400);
    expect(app.count("role:alert")).toBe(0);
  }, 120_000);
});
