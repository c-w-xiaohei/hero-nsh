import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the pagination adapt unit, one test per row of
 * adapt-sheets/pagination.md §4 (M-001…M-011).
 *
 * The fixture is `harness/pagination.fixtures.tsx`, opened by `host.params`:
 * `case` ("press" default — Previous + Link 1 isActive + Link 2 + Ellipsis +
 * Next with every pressable probe-wired; "sm" one sm Link; "disabled" an
 * isDisabled Previous + an isPending Link; "overflow" Summary + 9 links +
 * two Ellipsis; "sizes" one link per size) and `scope` ("pointer"/"touch"
 * through `EnvironmentScope input`). The host-derived default differs per
 * target — touch on ios/android, pointer on desktop and web — so the
 * desktop-parity baseline injects `scope:"pointer"` explicitly. No
 * `platform`/`width`/`height` open options and no `setViewport`: the
 * native targets fill the device screen and reject/resist both.
 *
 * Desktop-only halves moved to `pagination.mobile.headless.test.tsx`, a
 * local file that keeps the `platform:"windows"` pin: M-004's and M-011's
 * hover assertions (`app.hover` does not exist natively), M-008's 360 px
 * viewport (a real phone's screen cannot be resized) and M-009's exact
 * `md:` breakpoint size pins (breakpoint literals only resolve at ≥640 px).
 *
 * Observation channels, all in `app.storage()` through `@scenario/probe`:
 * `events` ([name, phase] for down/up/changeT/changeF/press/click),
 * `seam-edge` ({name, seam} per `feedback.isPressed` edge — silent under
 * pointer), `seam-env` ({name, enabled, hitSlop} on mount and every gate or
 * slop change), `seam-sample` ({name, seamPressed, scale, hitSlop, enabled}
 * read after each `press` event), `seam-hold` (the same read sampled +300 ms
 * and +1100 ms after each `isPressed` edge — the mid-hold and settled scale
 * reads `app.longPress` can reach), `layout` ({name, x, y, width, height}
 * per part `onLayout`), `onPress`/`onClick` (the caller-side callbacks on
 * every wired part) and `ellipsis` (fires only if an Ellipsis ever reports
 * a press).
 *
 * `viewStyle().backgroundColor` reads the resolved `bg-default` /
 * `bg-transparent` / `hover:bg-default-hover` classes for M-004 and M-009 —
 * `accessibilityState.current` and class names are not observable (sheet §6).
 */

type Params = Record<string, string>;

function openPagination(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../pagination.fixtures.tsx", {
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type Box = { name: string; x: number; y: number; width: number; height: number };

type SeamEnv = { name: string; enabled: boolean; hitSlop: Edges | null };

type SeamEdge = { name: string; seam: boolean };

type SeamSample = {
  name: string;
  seamPressed: boolean;
  scale: number;
  hitSlop: Edges | null;
  enabled: boolean;
};

type SeamHold = SeamSample & { midHold: boolean };

const PRESS_PARTS = ["prev", "link-1", "link-2", "next"];

/** The recorded event phases of one part, in order. */
function eventPhases(app: App, name: string): string[] {
  return callsOf(app, "events")
    .map((c) => c as [string, string])
    .filter((e) => e[0] === name)
    .map((e) => e[1]);
}

/** The full RAC release order one completed press must record (M-006). */
const PRESS_SEQUENCE = ["down", "changeT", "up", "changeF", "press", "click"];

function lastOf<T>(app: App, name: string): T {
  const all = callsOf(app, name);
  return all[all.length - 1][0] as T;
}

/** name → last reported seam-env (the effect refires on gate/slop change). */
function lastSeamEnv(app: App): Record<string, SeamEnv> {
  const out: Record<string, SeamEnv> = {};
  for (const call of callsOf(app, "seam-env")) {
    const e = call[0] as SeamEnv;
    out[e.name] = e;
  }
  return out;
}

/** name → last reported layout box. */
function lastBoxes(app: App): Record<string, Box> {
  const out: Record<string, Box> = {};
  for (const call of callsOf(app, "layout")) {
    const b = call[0] as Box;
    out[b.name] = b;
  }
  return out;
}

async function waitForBoxes(app: App, names: string[]): Promise<void> {
  await app.waitUntil(() =>
    names.every((n) => callsOf(app, "layout").some((c) => (c[0] as Box).name === n)),
  );
}

describe("pagination mobile", () => {
  // adapt-sheets/pagination.md M-001 (A-002, 负断言): under the default
  // pointer environment the touch-gated seam is a zero-cost pass-through —
  // `isPressed` never rises, `hitSlop()` stays undefined, `scale` is pinned
  // at 1 — while `onPressDown`/`onPressUp`/`onPressChange`/`onPress`/`onClick`
  // still fire in order.
  test("M-001 pointer baseline: the touch feedback path does not exist while the press contract holds", async () => {
    const app = await openPagination("press", { scope: "pointer" });

    for (const part of ["link-2", "prev", "next"]) {
      await app.press(`id:${part}`);
    }
    await app.waitUntil(
      () => callsOf(app, "events").filter((c) => c[1] === "press").length === 3,
    );

    // The press contract fired once per part, in the unchanged order.
    for (const part of ["link-2", "prev", "next"]) {
      expect(eventPhases(app, part)).toEqual(PRESS_SEQUENCE);
    }
    expect(callsOf(app, "onPress")).toHaveLength(3);
    expect(callsOf(app, "onClick")).toHaveLength(3);

    // The seam never woke: every edge report is seam=false and every
    // mount-time gate read is closed with no slop.
    const edges = callsOf(app, "seam-edge").map((c) => c[0] as SeamEdge);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((e) => e.seam === false)).toBe(true);

    const env = lastSeamEnv(app);
    for (const name of PRESS_PARTS) {
      expect(env[name]?.enabled).toBe(false);
      expect(env[name]?.hitSlop).toBeNull();
    }

    // The post-press sample of each wired part reads the channels at rest.
    const samples = callsOf(app, "seam-sample").map((c) => c[0] as SeamSample);
    expect(samples.length).toBeGreaterThanOrEqual(3);
    for (const s of samples) {
      expect(s.seamPressed).toBe(false);
      expect(s.scale).toBe(1);
      expect(s.hitSlop).toBeNull();
      expect(s.enabled).toBe(false);
    }
  }, 120_000);

  // adapt-sheets/pagination.md M-002 (A-002): injected touch — the seam's
  // `isPressed` completes the true→false roundtrip on Link, Previous and
  // Next while the user callbacks still fire; `hitSlop()` reports the
  // (44 − side)/2 padding for every sub-44 pt target — non-empty for the
  // sm case and zero on the horizontal sides of the wider-than-44 nav
  // buttons.
  test("M-002 injected touch: the seam round-trips per part and hitSlop pads every sub-44pt target", async () => {
    const app = await openPagination("press", { scope: "touch" });

    for (const part of ["link-2", "prev", "next"]) {
      await app.press(`id:${part}`);
    }
    await app.waitUntil(
      () => callsOf(app, "events").filter((c) => c[1] === "press").length === 3,
    );

    // The user-visible contract is unchanged under touch.
    for (const part of ["link-2", "prev", "next"]) {
      expect(eventPhases(app, part)).toEqual(PRESS_SEQUENCE);
    }

    // The seam's own flag round-tripped through each part's context probe.
    for (const part of ["link-2", "prev", "next"]) {
      const seams = callsOf(app, "seam-edge")
        .map((c) => c[0] as SeamEdge)
        .filter((e) => e.name === part)
        .map((e) => e.seam);
      expect(seams).toContain(true);
      expect(seams.indexOf(true)).toBeLessThan(seams.lastIndexOf(false));
      expect(seams.at(-1)).toBe(false);
    }

    // The computed hitSlop per part equals max(0, (44 − side) / 2) of that
    // part's own reported bounds, per edge.
    await waitForBoxes(app, PRESS_PARTS);
    const env = lastSeamEnv(app);
    const boxes = lastBoxes(app);
    for (const name of PRESS_PARTS) {
      const slop = env[name]?.hitSlop;
      expect(env[name]?.enabled).toBe(true);
      expect(slop).not.toBeNull();
      const box = boxes[name]!;
      const padX = Math.max(0, (44 - box.width) / 2);
      const padY = Math.max(0, (44 - box.height) / 2);
      expect(Math.abs(slop!.top - padY)).toBeLessThan(0.6);
      expect(Math.abs(slop!.bottom - padY)).toBeLessThan(0.6);
      expect(Math.abs(slop!.left - padX)).toBeLessThan(0.6);
      expect(Math.abs(slop!.right - padX)).toBeLessThan(0.6);
    }

    // The nav geometry is wider than 44 pt: Previous/Next get vertical
    // padding only — the "0 side" the sheet names for md.
    for (const name of ["prev", "next"]) {
      const slop = env[name]!.hitSlop!;
      expect(slop.left).toBe(0);
      expect(slop.right).toBe(0);
      expect(slop.top).toBeGreaterThan(0);
      expect(slop.bottom).toBeGreaterThan(0);
    }

    // size="sm": the sub-44 pt link pads on every side by the same formula.
    const small = await openPagination("sm", { scope: "touch" });
    await waitForBoxes(small, ["link-sm"]);
    const smEnv = lastSeamEnv(small);
    const smBox = lastBoxes(small)["link-sm"]!;
    expect(smEnv["link-sm"]?.enabled).toBe(true);
    const smSlop = smEnv["link-sm"]?.hitSlop;
    expect(smSlop).not.toBeNull();
    const smPad = Math.max(0, (44 - Math.min(smBox.width, smBox.height)) / 2);
    expect(Math.abs(smSlop!.top - smPad)).toBeLessThan(0.6);
    expect(Math.abs(smSlop!.bottom - smPad)).toBeLessThan(0.6);
    expect(Math.abs(smSlop!.left - smPad)).toBeLessThan(0.6);
    expect(Math.abs(smSlop!.right - smPad)).toBeLessThan(0.6);
  }, 120_000);

  // adapt-sheets/pagination.md M-003 (A-002): `scale.getValue()` dips below
  // 1 mid-press — the coefficient follows the container width
  // (1 − (1 − 0.985) · 300 / width) — and returns to 1 on release; under
  // the default pointer environment the same hold leaves the channel
  // pinned at 1 because the seam's gate is closed.
  test("M-003 injected touch hold: scale presses below 1 mid-hold and returns to 1; pointer stays 1", async () => {
    const touch = await openPagination("press", { scope: "touch" });
    await waitForBoxes(touch, ["link-2"]);
    const width = lastBoxes(touch)["link-2"]!.width;

    // `app.longPress` holds the press ~500 ms; the fixture's +300 ms
    // seam-hold sample lands mid-hold with the 300 ms scale timing done.
    await touch.longPress("id:link-2");
    await touch.waitUntil(
      () =>
        callsOf(touch, "seam-hold").filter((c) => {
          const h = c[0] as SeamHold;
          return h.name === "link-2" && h.midHold === true;
        }).length > 0,
    );

    const held = callsOf(touch, "seam-hold")
      .map((c) => c[0] as SeamHold)
      .filter((h) => h.name === "link-2" && h.midHold === true)
      .at(-1)!;
    expect(held.seamPressed).toBe(true);
    expect(held.scale).toBeLessThan(1);
    const expected = 1 - 0.015 * (300 / width);
    expect(Math.abs(held.scale - expected)).toBeLessThan(0.15);

    // The +1100 ms sample lands after release and the return animation:
    // the channel is back at rest.
    await touch.waitUntil(
      () =>
        callsOf(touch, "seam-hold").filter((c) => {
          const h = c[0] as SeamHold;
          return h.name === "link-2" && h.midHold === false;
        }).length > 0,
    );
    const settled = callsOf(touch, "seam-hold")
      .map((c) => c[0] as SeamHold)
      .filter((h) => h.name === "link-2" && h.midHold === false)
      .at(-1)!;
    expect(settled.seamPressed).toBe(false);
    expect(settled.scale).toBe(1);

    // Pointer: the gate never opens — no seam edge means no hold samples,
    // and the post-press sample reads the pinned channel.
    const pointer = await openPagination("press", { scope: "pointer" });
    await pointer.press("id:link-2");
    await pointer.waitUntil(() => callsOf(pointer, "seam-sample").length > 0);
    expect(callsOf(pointer, "seam-edge").filter((c) => (c[0] as SeamEdge).seam === true)).toHaveLength(0);
    expect(callsOf(pointer, "seam-hold")).toHaveLength(0);
    const sample = lastOf<SeamSample>(pointer, "seam-sample");
    expect(sample.scale).toBe(1);
    expect(sample.seamPressed).toBe(false);
    expect(sample.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/pagination.md M-004 (A-001): under touch the `input` axis
  // drops `hover:bg-default-hover` from the link slot, so a completed press
  // leaves no background behind (the sticky-hover regression the axis
  // exists to prevent). The hover halves — touch's hover paints nothing,
  // pointer's paints the desktop hover background — live in
  // `pagination.mobile.headless.test.tsx`, which can call `app.hover`.
  test("M-004 injected touch: a completed press leaves no hover background behind", async () => {
    const touch = await openPagination("press", { scope: "touch" });
    const base = touch.viewStyle("id:link-2")?.backgroundColor;

    await touch.press("id:link-2");
    await touch.waitUntil(() =>
      callsOf(touch, "events").some((c) => c[0] === "link-2" && c[1] === "press"),
    );
    expect(touch.viewStyle("id:link-2")?.backgroundColor).toBe(base);
  }, 120_000);

  // adapt-sheets/pagination.md M-005 (A-002): under touch, `isDisabled`
  // refuses the press at the host and `isPending` blocks the handlers
  // internally — for both the seam's `enabled()` is false, so no
  // `isPressed` edge, no `hitSlop`, `scale` at rest — while the
  // `accessibilityState.disabled` semantics stay unchanged (pending is not
  // disabled: the view stays pressable).
  test("M-005 injected touch: isDisabled and isPending close the seam and block the press", async () => {
    const app = await openPagination("disabled", { scope: "touch" });

    // isDisabled: the host refuses the press outright.
    expect(app.enabled("id:prev-disabled")).toBe(false);
    await expect(app.press("id:prev-disabled")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });

    // isPending: still a live view (`disabled` is not set), but every
    // handler is blocked — the press resolves and fires nothing.
    expect(app.enabled("id:link-pending")).toBe(true);
    await app.press("id:link-pending");
    await app.wait(200);

    // No user callback fired for either part.
    expect(
      callsOf(app, "events").filter((c) => c[0] === "prev-disabled" || c[0] === "link-pending"),
    ).toHaveLength(0);
    expect(callsOf(app, "onPress")).toHaveLength(0);
    expect(callsOf(app, "onClick")).toHaveLength(0);

    // The seam's gate is closed for both: no press edge was recorded and
    // the mount-time read reports enabled=false with no slop.
    expect(
      callsOf(app, "seam-edge").filter((c) => (c[0] as SeamEdge).seam === true),
    ).toHaveLength(0);
    const env = lastSeamEnv(app);
    for (const name of ["prev-disabled", "link-pending"]) {
      expect(env[name]?.enabled).toBe(false);
      expect(env[name]?.hitSlop).toBeNull();
    }
  }, 120_000);

  // adapt-sheets/pagination.md M-006 (A-002, 基线): the event sequence is
  // identical in both environments — `onPressDown` → `onPressChange(true)`
  // → `onPressUp` → `onPressChange(false)` → `onPress` → `onClick` — so the
  // feedback hooks introduce no second press owner and swap no callback.
  test("M-006 both environments keep the RAC release order per part", async () => {
    for (const scope of ["pointer", "touch"] as const) {
      const app = await openPagination("press", { scope });

      await app.press("id:link-2");
      await app.press("id:prev");
      await app.waitUntil(
        () => callsOf(app, "events").filter((c) => c[1] === "click").length === 2,
      );

      for (const part of ["link-2", "prev"]) {
        expect(eventPhases(app, part)).toEqual(PRESS_SEQUENCE);
      }
    }
  }, 120_000);

  // adapt-sheets/pagination.md M-007 (A-001, A-002): the `input` axis
  // produces no visible size change and `hitSlop` is not a layout input —
  // every pressable part's `onLayout` bounds under touch equal the pointer
  // environment's exactly.
  test("M-007 injected touch moves no laid-out box", async () => {
    // Snapshot the touch boxes before the next open: a native open
    // relaunches the single host and invalidates every earlier App.
    const touch = await openPagination("press", { scope: "touch" });
    await waitForBoxes(touch, PRESS_PARTS);
    const touchBoxes = lastBoxes(touch);

    const pointer = await openPagination("press", { scope: "pointer" });
    await waitForBoxes(pointer, PRESS_PARTS);
    const pointerBoxes = lastBoxes(pointer);
    for (const name of PRESS_PARTS) {
      expect(touchBoxes[name]).toEqual(pointerBoxes[name]);
    }
  }, 120_000);

  // adapt-sheets/pagination.md M-008 (A-005): the overflow case (Summary +
  // 9 links + 2 Ellipses) renders every part in both environments — the
  // `layout` probes report each item whether or not it sits in view — the
  // flex row never overlaps its items and a link stays pressable. The
  // viewport-pinned half (360 px: `shows()` visibility and the `flex-col
  // sm:flex-row` vertical stacking under 640 px) lives in
  // `pagination.mobile.headless.test.tsx` — a real phone's screen cannot
  // be resized, and `setViewport` is a headless step.
  test("M-008 overflow case: every part renders, items never overlap, a link stays pressable", async () => {
    for (const scope of ["pointer", "touch"] as const) {
      const app = await openPagination("overflow", { scope });

      await app.waitUntil(() => app.texts().includes("Page 4 of 9"));
      expect(app.texts()).toContain("Previous");
      expect(app.texts()).toContain("…");

      // Every Item reports a content-relative box and no two overlap — the
      // row may run past the viewport (callers truncate), but flex never
      // overlaps its items. Part-level `onLayout` bounds are item-local, so
      // the row geometry reads the `item-*` probes.
      const itemNames = [
        "item-prev",
        "item-ellipsis-start",
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `item-page-${n}`),
        "item-ellipsis-end",
        "item-next",
      ];
      await waitForBoxes(app, itemNames);
      const boxes = lastBoxes(app);
      const rects = itemNames.map((n) => boxes[n]!).sort((a, b) => a.x - b.x);
      for (let i = 1; i < rects.length; i += 1) {
        const prev = rects[i - 1]!;
        const cur = rects[i]!;
        const overlap =
          prev.x < cur.x + cur.width &&
          cur.x < prev.x + prev.width &&
          prev.y < cur.y + cur.height &&
          cur.y < prev.y + prev.height;
        if (overlap) {
          throw new Error(
            `overlapping boxes: ${JSON.stringify(prev)} vs ${JSON.stringify(cur)}`,
          );
        }
      }
      // The x order is the DOM order: prev, ellipsis, pages 1-9, ellipsis, next.
      expect(rects.map((r) => r.name)).toEqual(itemNames);

      // A link inside the viewport is pressable in both environments.
      await app.press("id:page-2");
      await app.waitUntil(() =>
        callsOf(app, "events").some((c) => c[0] === "page-2" && c[1] === "press"),
      );
    }
  }, 120_000);

  // adapt-sheets/pagination.md M-009 (基线): desktop zero drift — the
  // `isActive` link keeps its `bg-default` ground against the plain
  // link's `bg-transparent`, a press migrates no `current` state (the
  // owner is the caller's prop), and the three sizes keep their strict
  // sm < md < lg order. The exact bounds (28/32/36 at `md:` shrink) are
  // breakpoint literals that only resolve at ≥640 px — a phone viewport
  // stays under the breakpoint — so they pin in
  // `pagination.mobile.headless.test.tsx`.
  test("M-009 baseline: active-page styling is caller-owned and the three sizes keep their order", async () => {
    const app = await openPagination("press", { scope: "pointer" });

    const activeBg = app.viewStyle("id:link-1")?.backgroundColor;
    const plainBg = app.viewStyle("id:link-2")?.backgroundColor;
    expect(activeBg).toBeDefined();
    expect(activeBg).not.toBe(plainBg);

    await app.press("id:link-2");
    await app.waitUntil(() =>
      callsOf(app, "events").some((c) => c[0] === "link-2" && c[1] === "press"),
    );
    expect(app.viewStyle("id:link-1")?.backgroundColor).toBe(activeBg);

    const sizes = await openPagination("sizes", { scope: "pointer" });
    await waitForBoxes(sizes, ["size-sm", "size-md", "size-lg"]);
    const boxes = lastBoxes(sizes);
    expect(boxes["size-sm"]!.width).toBeGreaterThan(0);
    expect(boxes["size-sm"]!.width).toBeLessThan(boxes["size-md"]!.width);
    expect(boxes["size-md"]!.width).toBeLessThan(boxes["size-lg"]!.width);
    expect(boxes["size-sm"]!.height).toBeLessThan(boxes["size-md"]!.height);
    expect(boxes["size-md"]!.height).toBeLessThan(boxes["size-lg"]!.height);
  }, 120_000);

  // adapt-sheets/pagination.md M-010 (A-001, A-003): the fixture mounts
  // `Pagination` and `EnvironmentScope` through the `@heroui/react` entry
  // in both scopes, and every probe channel — seam edges, env gate,
  // samples, the event sequence, layout bounds — is readable through
  // `app.storage()`.
  test("M-010 the fixture opens in both environments and every probe channel records", async () => {
    for (const scope of ["pointer", "touch"] as const) {
      const app = await openPagination("press", { scope });
      for (const id of ["prev", "link-1", "link-2", "next", "ellipsis"]) {
        expect(app.shows(`id:${id}`)).toBe(true);
      }

      await waitForBoxes(app, PRESS_PARTS);
      const env = lastSeamEnv(app);
      for (const name of PRESS_PARTS) {
        expect(env[name]).toBeDefined();
      }

      await app.press("id:link-2");
      await app.waitUntil(() =>
        callsOf(app, "events").some((c) => c[0] === "link-2" && c[1] === "press"),
      );
      await app.waitUntil(() => callsOf(app, "seam-sample").length > 0);

      expect(
        callsOf(app, "events").some((c) => c[0] === "link-2" && c[1] === "click"),
      ).toBe(true);
      expect(callsOf(app, "seam-edge").length).toBeGreaterThan(0);
      expect(callsOf(app, "layout").length).toBeGreaterThan(0);
    }
  }, 120_000);

  // adapt-sheets/pagination.md M-011 (A-004): the Ellipsis is decorative —
  // it renders its `…` glyph in both environments and a press at its
  // position fires no callback and raises no seam edge. The "a hover
  // changes nothing either" half lives in
  // `pagination.mobile.headless.test.tsx`.
  test("M-011 Ellipsis renders its glyph and carries no interaction semantics in either environment", async () => {
    for (const scope of ["pointer", "touch"] as const) {
      const app = await openPagination("press", { scope });
      expect(app.texts()).toContain("…");

      // Whatever the harness resolves the press to, the ellipsis itself
      // wires nothing: no press channel may fire.
      await app.press("id:ellipsis").catch(() => undefined);
      await app.wait(150);
      expect(callsOf(app, "ellipsis")).toHaveLength(0);
      expect(
        callsOf(app, "events").filter((c) => c[0] === "ellipsis"),
      ).toHaveLength(0);
    }

    // The "a hover changes nothing either" half moved to
    // `pagination.mobile.headless.test.tsx` — `app.hover` does not exist
    // on the native targets.
  }, 120_000);
});
