import { describe, expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import {
  advance,
  closeToast,
  DEFAULT_TOAST_TIMEOUT,
  lastCall,
  openToast,
  settleExit,
  showToast,
} from "../../testers/toast";

/*
 * Mobile assertions for the toast adapt unit (action D: touch swipe to
 * dismiss), one test per row of adapt-sheets/toast.md §4 that the shared
 * (headless + web) targets observe: M-001, M-002, M-004, M-005, M-007,
 * M-008, M-009, M-010. The held-press halves — M-003's release
 * spring-back and M-006's countdown suspension — live in
 * `toast.mobile.headless.test.tsx` because `dragAndHold`/`drop` synthesize
 * only on headless (sheet §6 host gap).
 *
 * The fixture is `harness/toast.fixtures.tsx`, opened by `host.params`:
 * `case` (`swipe` bottom stack, `swipe-top` top-placed, `swipe-hold` a
 * 1000 ms toast, plus the existing behaviour cases the baseline row
 * replays), `scope` ("" host default, "touch"/"pointer" through
 * `EnvironmentScope` — the fixture wraps every case), `count`,
 * `placement`, `timeout`, `swipeable` / `itemSwipeable` ("0"/"false" for
 * off). Every swipe case mounts a `SwipeProbe` inside each toast that
 * reports the internal `ToastItemContext.swipe` channel — `{key, keys,
 * active, offset, dragging}` — to `probe("swipe")`; `keys === 0` is the
 * direct evidence the gesture path is physically absent (M-001/M-007/
 * M-010). `probe("toast-layout")` records each root's onLayout frame for
 * M-009's stacking witness.
 *
 * Entry keys are `toast-<n>` assigned in `queue.add` order on a fresh
 * queue per mount, so `toast-1` is `Swipe-0` and `toast-2` is `Swipe-1`.
 * Each row's `onClose` probe is per-index (`onClose-0`, `onClose-1`, …),
 * which tells the tests which toast a gesture closed.
 *
 * The desktop pin is `platform: "windows"` (pointer input, 1024×768), the
 * w1 convention `openToast` supplies. Keyboard-focus baseline halves open
 * `platform: "web"` — the focus-capable host — the same channel
 * tabs.mobile.test.tsx uses inside a dual-target file.
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

type LayoutRecord = { title: string; width: number; height: number };

function layoutCalls(app: App): LayoutRecord[] {
  return callsOf(app, "toast-layout").map((args) => args[0] as LayoutRecord);
}

/** The last laid-out frame per toast title. */
function layoutHeights(app: App): Record<string, number> {
  const out: Record<string, number> = {};

  for (const record of layoutCalls(app)) {
    out[record.title] = record.height;
  }

  return out;
}

async function settle(app: App): Promise<void> {
  await advance(app, 40);
}

describe("toast mobile", () => {
  // adapt-sheets/toast.md M-001 (A-001, A-002, 负断言): under the default
  // pointer environment the swipe path does not exist — `panHandlers()`
  // resolves to the empty object (`keys === 0`), a drag records no
  // `dragging`/`offset` activity, nothing closes — and the timer channel
  // is untouched: a timed toast still auto-closes after the same drag,
  // proving no `"drag"` suspension leaked.
  test("M-001 default pointer environment: no swipe path, drag inert, timers unaffected", async () => {
    const app = await openToast("swipe");

    await app.waitUntil(() => callsOf(app, "swipe").length > 0);
    const initial = swipeCalls(app)[0]!;
    expect(initial.keys).toBe(0);
    expect(initial.active).toBe(false);
    expect(initial.offset).toBe(0);
    expect(initial.dragging).toBe(false);

    await app.drag("id:Swipe-0", { x: 0, y: 120 });
    await settle(app);

    for (const record of swipeCalls(app)) {
      expect(record.keys).toBe(0);
      expect(record.active).toBe(false);
      expect(record.dragging).toBe(false);
      expect(record.offset).toBe(0);
    }
    expect(callsOf(app, "onClose-0")).toHaveLength(0);
    expect(app.shows("role:alert")).toBe(true);
    expect(app.count("role:alert")).toBe(1);

    // The timer half: `swipe-hold` carries `timeout: 1000`; under pointer
    // the drag never claimed, so the countdown fires on schedule.
    const timed = await openToast("swipe-hold");
    await timed.waitUntil(() => callsOf(timed, "swipe").length > 0);
    await timed.drag("id:Swipe-0", { x: 0, y: 120 });
    await advance(timed, 1500);
    expect(callsOf(timed, "onClose-0").length).toBeGreaterThanOrEqual(1);
    await advance(timed, 400);
    expect(timed.count("role:alert")).toBe(0);
  }, 120_000);

  // adapt-sheets/toast.md M-002 (A-001): touch + `placement:"bottom"` — a
  // downward drag past the dismiss distance takes the queue's close path:
  // the entry's own `onClose` fires once, the exit hold plays, and the
  // sibling toast stays mounted and becomes the front row.
  test("M-002 touch + bottom: a downward drag past the threshold closes through the queue", async () => {
    const app = await openToast("swipe", {
      params: { count: 2, scope: "touch" },
    });

    await app.waitUntil(() => callsOf(app, "swipe").length >= 2);
    expect(app.count("role:alert")).toBe(2);
    expect(app.shows("label:2 notifications.")).toBe(true);

    await app.drag("id:Swipe-1", { x: 0, y: 120 });
    await settle(app);

    // Engagement evidence: some row recorded dismiss-direction travel.
    expect(
      swipeCalls(app).some((record) => Math.abs(record.offset) > 50),
    ).toBe(true);

    // Exactly one toast closed, through its own per-index onClose probe.
    const closedFirst = callsOf(app, "onClose-0").length;
    const closedSecond = callsOf(app, "onClose-1").length;
    expect(closedFirst + closedSecond).toBe(1);
    const survivor = closedFirst === 1 ? "Swipe-1" : "Swipe-0";

    await settleExit(app);
    expect(app.count("role:alert")).toBe(1);
    expect(app.shows("label:1 notification.")).toBe(true);
    expect(app.shows(`text:${survivor}`)).toBe(true);
    expect(closedFirst + closedSecond).toBe(1);
  }, 120_000);

  // adapt-sheets/toast.md M-004 (A-001, A-006): touch + a `top` placement —
  // "top" and "top start" both normalize to the upward dismiss direction,
  // so an upward drag past the threshold closes; the horizontal alignment
  // changes nothing.
  test("M-004 touch + top placements: an upward drag dismisses, alignment normalized", async () => {
    for (const placement of ["top", "top start"] as const) {
      const app = await openToast("swipe-top", {
        params: { placement, scope: "touch" },
      });

      await app.waitUntil(() => callsOf(app, "swipe").length > 0);
      expect(app.count("role:alert")).toBe(1);

      await app.drag("id:Swipe-0", { x: 0, y: -120 });
      await settle(app);

      // The drag engaged upward: the offset channel went negative.
      expect(swipeCalls(app).some((record) => record.offset < -50)).toBe(true);
      expect(callsOf(app, "onClose-0")).toHaveLength(1);

      await settleExit(app);
      expect(app.count("role:alert")).toBe(0);
    }
  }, 120_000);

  // adapt-sheets/toast.md M-005 (A-001): touch + `placement:"bottom"` — a
  // drag against the dismiss edge takes the rubber band: every recorded
  // offset stays within the 40 pt cap, the release returns the offset to
  // 0, and the toast never closes (the counter-direction branch owns the
  // release whatever velocity the host synthesizes).
  test("M-005 touch + bottom: a reverse drag rubber-bands within 40pt and springs back", async () => {
    const app = await openToast("swipe", { params: { scope: "touch" } });

    await app.waitUntil(() => callsOf(app, "swipe").length > 0);

    await app.drag("id:Swipe-0", { x: 0, y: -800 });
    await settle(app);

    const records = swipeCalls(app);
    expect(records.some((record) => record.offset < 0)).toBe(true);
    for (const record of records) {
      expect(Math.abs(record.offset)).toBeLessThanOrEqual(40);
    }
    expect(records.at(-1)?.offset).toBe(0);
    expect(callsOf(app, "onClose-0")).toHaveLength(0);
    expect(app.shows("role:alert")).toBe(true);
    expect(app.count("role:alert")).toBe(1);
  }, 120_000);

  // adapt-sheets/toast.md M-007 (A-001): `isSwipeable={false}` — at the
  // row level (`itemSwipeable`) and as the provider's stack default
  // (`swipeable`) — makes `enabled()` false, so `panHandlers()` is the
  // empty object even under touch (`keys === 0`), the drag moves nothing,
  // and nothing closes.
  test("M-007 touch + isSwipeable=false: the gesture path never mounts", async () => {
    const optOuts: Record<string, string>[] = [
      { itemSwipeable: "0" },
      { swipeable: "0" },
    ];

    for (const optOut of optOuts) {
      const app = await openToast("swipe", {
        params: { scope: "touch", ...optOut },
      });

      await app.waitUntil(() => callsOf(app, "swipe").length > 0);

      for (const record of swipeCalls(app)) {
        expect(record.keys).toBe(0);
        expect(record.active).toBe(false);
        expect(record.dragging).toBe(false);
        expect(record.offset).toBe(0);
      }

      await app.drag("id:Swipe-0", { x: 0, y: 120 });
      await settle(app);

      for (const record of swipeCalls(app)) {
        expect(record.keys).toBe(0);
        expect(record.active).toBe(false);
        expect(record.dragging).toBe(false);
        expect(record.offset).toBe(0);
      }
      expect(callsOf(app, "onClose-0")).toHaveLength(0);
      expect(app.shows("role:alert")).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/toast.md M-008 (基线): the existing behaviours are
  // unchanged in both environments — the default pointer side and the
  // injected touch side answer identically: CloseButton close, `queue.close`
  // / `clear`, `onClose`, timeout expiry, the persistent opt-out, the
  // hover/interaction suspend, the maxVisible mount rule, and the
  // focus handoff (`moveFocusFrom`, T-020/T-022) on the focus-capable web
  // host.
  test("M-008 baseline: queue, close, timeout, hover and focus semantics hold in both environments", async () => {
    for (const scope of [undefined, "touch"] as const) {
      const params: Record<string, string | number | boolean> = scope
        ? { scope }
        : {};

      // T-012/T-050: the CloseButton closes through the queue, onClose once.
      const close = await openToast("close-onclose", { params });
      await closeToast(close);
      expect(callsOf(close, "onClose")).toHaveLength(1);
      await settleExit(close);
      expect(close.count("role:alert")).toBe(0);

      // T-018: queue.clear() closes every toast, each onClose once.
      const cleared = await openToast("clear-two", { params });
      await showToast(cleared, "Clear");
      expect(callsOf(cleared, "onCloseA")).toHaveLength(1);
      expect(callsOf(cleared, "onCloseB")).toHaveLength(1);
      await settleExit(cleared);
      expect(cleared.count("role:alert")).toBe(0);

      // T-051: toast.close(key) through the queue.
      const keyed = await openToast("close-key", { params });
      await showToast(keyed, "Show");
      await showToast(keyed, "Close toast");
      await settleExit(keyed);
      expect(keyed.count("role:alert")).toBe(0);

      // T-013: the default timeout expires on schedule.
      const timed = await openToast("timeout-default", { params });
      await advance(timed, DEFAULT_TOAST_TIMEOUT);
      await settleExit(timed);
      expect(timed.count("role:alert")).toBe(0);

      // T-049: `timeout: 0` never counts down.
      const persistent = await openToast("persistent", { params });
      await advance(persistent, 1500);
      expect(persistent.shows("role:alert")).toBe(true);

      // T-062: hovering the stack suspends the countdown, leaving resumes.
      const hover = await openToast("hover-pause", { params });
      await hover.hover("role:alert");
      await advance(hover, 1000);
      expect(hover.shows("text:Pausing")).toBe(true);
      await hover.hover("role:button[Outside]");
      await advance(hover, 1100);
      await settleExit(hover);
      expect(hover.count("text:Pausing")).toBe(0);

      // T-059: toasts past maxVisibleToasts stay mounted and hidden.
      const capped = await openToast("maxvisible-three", { params });
      expect(capped.count("role:alert")).toBe(4);
    }

    // T-020/T-022: the focus handoff — Tab reaches region → frontmost toast
    // → its close button; closing the focused toast moves focus to the
    // remaining one. `platform: "web"` is the focus-capable host (the same
    // channel tabs.mobile.test.tsx uses); `scope` still injects the
    // environment, so the touch half runs the identical keyboard path.
    for (const scope of [undefined, "touch"] as const) {
      const app = await openToast("focus-stack", {
        params: { count: 2, ...(scope ? { scope } : {}) },
        platform: "web",
      });

      await app.keyboard.press("tab");
      await app.keyboard.press("tab");
      expect(lastCall(app, "toast-focus-")).toBe("toast-focus-Second");

      await app.keyboard.press("tab");
      await app.keyboard.press("enter");
      expect(lastCall(app, "toast-focus-")).toBe("toast-focus-First");

      await settleExit(app);
      expect(app.shows("text:Second")).toBe(false);
    }
  }, 120_000);

  // adapt-sheets/toast.md M-009 (A-001): the swipe writes only the `dragY`
  // transform channel — a counter-direction drag on the front toast
  // engages its offset and springs back, the sibling's swipe channel never
  // moves, every toast's laid-out height is untouched, and the stack's
  // mount/collapse rules (`maxVisibleToasts`, the notification count)
  // answer exactly as before.
  test("M-009 touch: swipe writes only dragY — stacking heights and queue rules hold", async () => {
    const app = await openToast("swipe", {
      params: { count: 2, scope: "touch" },
    });

    await app.waitUntil(() => callsOf(app, "swipe").length >= 2);
    await app.waitUntil(() => layoutCalls(app).length >= 2);
    expect(app.count("role:alert")).toBe(2);
    expect(app.shows("label:2 notifications.")).toBe(true);
    const heightsBefore = layoutHeights(app);

    // A reverse drag on the front toast (Swipe-1): dragY engages, and the
    // release can never dismiss — the counter-direction branch owns it.
    await app.drag("id:Swipe-1", { x: 0, y: -200 });
    await settle(app);

    const records = swipeCalls(app);
    // `toast-2` is Swipe-1, `toast-1` is Swipe-0 (fresh queue per mount,
    // keys assigned in add order).
    const front = records.filter((record) => record.key === "toast-2");
    const back = records.filter((record) => record.key === "toast-1");
    expect(front.length).toBeGreaterThan(0);
    expect(back.length).toBeGreaterThan(0);
    expect(front.some((record) => record.offset !== 0)).toBe(true);
    expect(front.at(-1)?.offset).toBe(0);
    for (const record of back) {
      expect(record.offset).toBe(0);
      expect(record.active).toBe(false);
      expect(record.dragging).toBe(false);
    }

    // The transform channel is the only thing the swipe wrote: laid-out
    // heights, the mounted count and the region label are all unchanged.
    expect(layoutHeights(app)).toEqual(heightsBefore);
    expect(app.count("role:alert")).toBe(2);
    expect(app.shows("label:2 notifications.")).toBe(true);
    expect(callsOf(app, "onClose-0")).toHaveLength(0);
    expect(callsOf(app, "onClose-1")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/toast.md M-010 (A-003): the fixture's observation channel
  // itself — `SwipeProbe` reports the mount state under every scope, and
  // the handler-key count is the physical-presence witness: 0 where no
  // listener mounts (host-default pointer and explicit pointer), >0 under
  // the injected touch environment.
  test("M-010 observation channel: SwipeProbe reports mount state under every scope", async () => {
    for (const scope of [undefined, "pointer", "touch"] as const) {
      const app = await openToast("swipe", {
        params: scope ? { scope } : {},
      });

      await app.waitUntil(() => callsOf(app, "swipe").length > 0);
      const initial = swipeCalls(app)[0]!;
      expect(initial.active).toBe(false);
      expect(initial.offset).toBe(0);
      expect(initial.dragging).toBe(false);

      if (scope === "touch") {
        expect(initial.keys).toBeGreaterThan(0);
      } else {
        expect(initial.keys).toBe(0);
      }
    }
  }, 120_000);
});
