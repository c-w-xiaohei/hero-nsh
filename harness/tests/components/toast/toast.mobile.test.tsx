import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { advance, settleExit } from "../../testers/toast";

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
 * 1000 ms toast, the multi-stack variants below, plus the existing
 * behaviour cases the baseline row replays), `scope` ("" host default,
 * "touch"/"pointer" through `EnvironmentScope` — the fixture wraps every
 * case), `count`, `placement`, `timeout`, `swipeable` / `itemSwipeable`
 * ("0"/"false" for off). Every swipe case mounts a `SwipeProbe` inside
 * each toast that reports the internal `ToastItemContext.swipe` channel —
 * `{key, keys, active, offset, dragging, tag}` — to `probe("swipe")`;
 * `keys === 0` is the direct evidence the gesture path is physically
 * absent (M-001/M-007/M-010) and `tag` namespaces a record to its stack.
 * `probe("toast-layout")` records each root's onLayout frame for M-009's
 * stacking witness.
 *
 * Sequential `open()`s exhaust the web target's browser pool (the M3
 * gate proved it twice — M-008's per-case opens in r1, a connect timeout
 * on the next `platform:"web"` open in r2), so every row that would open
 * an app per variant mounts its variants as sibling stacks in ONE page:
 * `swipe-mixed` (inert + timed), `swipe-top-dual` ("top" + "top start"),
 * `swipe-off` (row + provider opt-out), `swipe-tri` (default / pointer /
 * touch environments) and `focus-dual` (unscoped + touch). Each stack's
 * toasts carry a `titlePrefix` (also the testID and layout title), the
 * `onClose` probes take a `closeLabel`, and the SwipeProbe records carry
 * the `tag`.
 *
 * Entry keys are `toast-<n>` assigned in `queue.add` order on a fresh
 * queue per mount, so `toast-1` is `Swipe-0` and `toast-2` is `Swipe-1`.
 * Each row's `onClose` probe is per-index (`onClose-0`, `onClose-1`, …),
 * which tells the tests which toast a gesture closed.
 *
 * The `scope:"pointer"` default replaces `openToast`'s `platform:"windows"`
 * pin — `open()` platform/width/height options are rejected on ios/android,
 * so the pointer environment is injected per open through `host.params`.
 * The M-008 baseline halves ride `app.hover`/Tab focus (desktop/web-only)
 * and live in `toast.mobile.web.test.tsx`.
 */

/** The local opener: `openToast`'s shape minus the windows pin — same
 * manual clock and `reducedMotion:false`, with `scope` injected through
 * `host.params` ("pointer" default, per-test override). */
function openToastMobile(
  caseName: string,
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../toast.fixtures.tsx", {
    clock: {},
    reducedMotion: false,
    host: { params: { case: caseName, scope: "pointer", ...params } },
  });
}

type SwipeRecord = {
  key: string;
  keys: number;
  active: boolean;
  offset: number;
  dragging: boolean;
  /** The stack this record came from in a multi-stack case; "" for `swipe`. */
  tag?: string;
};

function swipeCalls(app: App, tag?: string): SwipeRecord[] {
  const records = callsOf(app, "swipe").map((args) => args[0] as SwipeRecord);

  return tag === undefined ? records : records.filter((record) => record.tag === tag);
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
    // `swipe-mixed` mounts the inert stack ("Base", timeout 0) and the
    // timed stack ("Hold", timeout 1000) side by side — one open, both
    // halves of the row.
    const app = await openToastMobile("swipe-mixed");

    await app.waitUntil(() => swipeCalls(app, "base").length > 0);
    const initial = swipeCalls(app, "base")[0]!;
    expect(initial.keys).toBe(0);
    expect(initial.active).toBe(false);
    expect(initial.offset).toBe(0);
    expect(initial.dragging).toBe(false);

    await app.drag("id:Base-0", { x: 0, y: 120 });
    await settle(app);

    for (const record of swipeCalls(app, "base")) {
      expect(record.keys).toBe(0);
      expect(record.active).toBe(false);
      expect(record.dragging).toBe(false);
      expect(record.offset).toBe(0);
    }
    expect(callsOf(app, "onClose-0")).toHaveLength(0);
    expect(app.shows("text:Base-0")).toBe(true);
    expect(app.count("role:alert")).toBe(2);

    // The timer half: the Hold stack carries `timeout: 1000`; under
    // pointer the drag never claimed, so its countdown fires on schedule
    // and no `"drag"` suspension leaked into the sibling stack.
    await app.waitUntil(() => swipeCalls(app, "hold").length > 0);
    await advance(app, 1500);
    expect(callsOf(app, "onCloseH-0").length).toBeGreaterThanOrEqual(1);
    await advance(app, 400);
    expect(app.count("role:alert")).toBe(1);
    expect(app.shows("text:Base-0")).toBe(true);
  }, 120_000);

  // adapt-sheets/toast.md M-002 (A-001): touch + `placement:"bottom"` — a
  // downward drag past the dismiss distance takes the queue's close path:
  // the entry's own `onClose` fires once, the exit hold plays, and the
  // sibling toast stays mounted and becomes the front row.
  test("M-002 touch + bottom: a downward drag past the threshold closes through the queue", async () => {
    const app = await openToastMobile("swipe", { count: 2, scope: "touch" });

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
    // `swipe-top-dual` mounts the "top" and "top start" stacks (tags
    // "top"/"ts", close probes `onClose-0`/`onCloseS-0`) under one open.
    const app = await openToastMobile("swipe-top-dual");

    await app.waitUntil(() => swipeCalls(app, "top").length > 0);
    await app.waitUntil(() => swipeCalls(app, "ts").length > 0);
    expect(app.count("role:alert")).toBe(2);

    await app.drag("id:Top-0", { x: 0, y: -120 });
    await settle(app);

    // The drag engaged upward: the offset channel went negative.
    expect(swipeCalls(app, "top").some((record) => record.offset < -50)).toBe(true);
    expect(callsOf(app, "onClose-0")).toHaveLength(1);

    await app.drag("id:TS-0", { x: 0, y: -120 });
    await settle(app);

    expect(swipeCalls(app, "ts").some((record) => record.offset < -50)).toBe(true);
    expect(callsOf(app, "onCloseS-0")).toHaveLength(1);

    await settleExit(app);
    expect(app.count("role:alert")).toBe(0);
  }, 120_000);

  // adapt-sheets/toast.md M-005 (A-001): touch + `placement:"bottom"` — a
  // drag against the dismiss edge takes the rubber band: every recorded
  // offset stays within the 40 pt cap, the release returns the offset to
  // 0, and the toast never closes (the counter-direction branch owns the
  // release whatever velocity the host synthesizes).
  test("M-005 touch + bottom: a reverse drag rubber-bands within 40pt and springs back", async () => {
    const app = await openToastMobile("swipe", { scope: "touch" });

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
    // `swipe-off` mounts the row-level opt-out ("Item",
    // `itemSwipeable` → `isSwipeable={false}` on the Toast) and the
    // provider-default opt-out ("Prov", provider `isSwipeable={false}`)
    // as sibling touch stacks under one open.
    const app = await openToastMobile("swipe-off");

    await app.waitUntil(() => swipeCalls(app, "item").length > 0);
    await app.waitUntil(() => swipeCalls(app, "provider").length > 0);

    for (const record of swipeCalls(app)) {
      expect(record.keys).toBe(0);
      expect(record.active).toBe(false);
      expect(record.dragging).toBe(false);
      expect(record.offset).toBe(0);
    }

    await app.drag("id:Item-0", { x: 0, y: 120 });
    await app.drag("id:Prov-0", { x: 0, y: 120 });
    await settle(app);

    for (const record of swipeCalls(app)) {
      expect(record.keys).toBe(0);
      expect(record.active).toBe(false);
      expect(record.dragging).toBe(false);
      expect(record.offset).toBe(0);
    }
    expect(callsOf(app, "onClose-0")).toHaveLength(0);
    expect(callsOf(app, "onCloseP-0")).toHaveLength(0);
    expect(app.count("role:alert")).toBe(2);
  }, 120_000);

  // adapt-sheets/toast.md M-008 (基线): the existing behaviours — the
  // queue/close/timeout/hover/cap replay and the Tab focus handoff — ride
  // `app.hover` and `keyboard.press("tab")` focus moves, which are
  // desktop/web-only. Both halves live in toast.mobile.web.test.tsx.

  // adapt-sheets/toast.md M-009 (A-001): the swipe writes only the `dragY`
  // transform channel — a counter-direction drag on the front toast
  // engages its offset and springs back, the sibling's swipe channel never
  // moves, every toast's laid-out height is untouched, and the stack's
  // mount/collapse rules (`maxVisibleToasts`, the notification count)
  // answer exactly as before.
  test("M-009 touch: swipe writes only dragY — stacking heights and queue rules hold", async () => {
    const app = await openToastMobile("swipe", { count: 2, scope: "touch" });

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
    // `swipe-tri` mounts all three environments as sibling stacks — the
    // host default (tag "default"), an explicit pointer scope ("pointer")
    // and a touch scope ("touch") — under one open.
    const app = await openToastMobile("swipe-tri");

    for (const tag of ["default", "pointer", "touch"] as const) {
      await app.waitUntil(() => swipeCalls(app, tag).length > 0);
      const initial = swipeCalls(app, tag)[0]!;
      expect(initial.active).toBe(false);
      expect(initial.offset).toBe(0);
      expect(initial.dragging).toBe(false);

      if (tag === "touch") {
        expect(initial.keys).toBeGreaterThan(0);
      } else {
        expect(initial.keys).toBe(0);
      }
    }
  }, 120_000);
});
