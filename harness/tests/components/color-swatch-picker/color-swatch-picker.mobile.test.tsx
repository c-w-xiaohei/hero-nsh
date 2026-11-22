import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the color-swatch-picker adapt unit, one test per row
 * of adapt-sheets/color-swatch-picker.md §4 (M-001…M-008). The fixture is
 * `harness/color-swatch-picker.fixtures.tsx`:
 *
 *   case        "select" (the upstream three-preset tree), "mobile" (xs/sm/md
 *               pickers whose Items report `layout` bounds), "ctx-probe"
 *               (the PressableFeedbackContext surface), "events" (the
 *               press/hover chain probes), "hover" (the render-prop isHovered
 *               marker)
 *   input       "" = host-derived (pointer on this pin — the desktop-parity
 *               half), "touch" = `EnvironmentScope input="touch"`
 *   density     "" = host-derived, "compact" / "default" = the density axis
 *   tiny        "1" = inline style overrides `min-h-11 min-w-11` on the
 *               ctx-probe items, so `hitSlop` computes a real expansion
 *
 * The `platform: "windows"` pin is the `.mobile.test.tsx` convention: without
 * it a suite run lands the app on the phone-sized headless engine where
 * `platform.desktop` is false and `input` defaults to touch, inverting every
 * pointer-default assertion. `nsh/test` observes only effects — probe calls
 * through `app.storage()`, `onLayout` bounds, `shows`/`enabled`/`spanStyle` —
 * never class names.
 */

type Params = Record<string, string>;

function openPicker(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../color-swatch-picker.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type PressedEdge = { seam: boolean; active: boolean };

type CtxState = {
  seamPressed: boolean;
  active: boolean;
  pressed: number;
  scale: number;
  highlight: number;
  ripple: number;
  origin: { x: number; y: number } | null;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  enabled: boolean;
};

type CtxChannels = {
  seamPressed: boolean;
  pressed: number;
  scale: number;
  origin: { x: number; y: number } | null;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  enabled: boolean;
};

type CtxEnv = {
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  selected?: boolean;
};

type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function lastOf<T>(app: App, name: string): T {
  const list = callsOf(app, name);
  return list[list.length - 1][0] as T;
}

function edges(app: App): PressedEdge[] {
  return callsOf(app, "ctx-pressed").map((c) => c[0] as PressedEdge);
}

function layouts(app: App, name: string): LayoutEntry[] {
  return callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((l) => l.name === name);
}

async function lastLayout(app: App, name: string): Promise<LayoutEntry> {
  await app.waitUntil(() => layouts(app, name).length > 0);
  return layouts(app, name).at(-1)!;
}

function eventKinds(app: App): string[] {
  return callsOf(app, "events").map((c) => String(c[0]));
}

/** The press half of the chain — web's `app.press` delivers a hover prelude
 *  (`mouse-enter`/`hover-start`/`hover-change`) headless does not, so the
 *  order assertion filters to the press events themselves. */
function pressChain(app: App): string[] {
  return eventKinds(app).filter((k) =>
    k === "down" || k === "up" || k === "press",
  );
}

function onChangeHexes(app: App): string[] {
  return callsOf(app, "onChange").map((c) => (c[0] as { hex: string }).hex);
}

describe("color-swatch-picker mobile", () => {
  // adapt-sheets/color-swatch-picker.md M-001 (A-003, 负断言): under the
  // default pointer environment the touch-gated seam is inert — the
  // `seam` edge never rises, `ctx-channels` shows `enabled` false, `pressed`
  // at rest, `scale` 1, `hitSlop`/`origin` empty — while the selection
  // contract works: `onChange` records the second preset exactly once.
  test("M-001 default environment: feedback channels stay inert while selection works", async () => {
    const app = await openPicker("ctx-probe");

    // The press lands on the probed item itself: `ctx-channels` samples
    // item-0's context, so only a press on item-0 makes the post-press rest
    // read causal.
    await app.press("id:ctx-item-0");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(onChangeHexes(app)).toEqual(["#ef4444"]);

    // The seam edge never fires under pointer (that silence IS the
    // negative assertion). `active` — the item's own pressed flag — may
    // commit only its settle value on a quick headless press, so only the
    // absence of a `seam: true` edge is asserted.
    const list = edges(app);
    expect(list.every((e) => !e.seam)).toBe(true);
    expect(list.at(-1)?.seam).toBe(false);

    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.enabled).toBe(false);
    expect(channels.pressed).toBeLessThan(0.5);
    expect(channels.scale).toBe(1);
    expect(channels.origin).toBeNull();
    expect(channels.hitSlop).toBeNull();
  }, 120_000);

  // adapt-sheets/color-swatch-picker.md M-002 (A-001): injected touch lifts
  // every Item's visible hit face to 44×44 (`min-h-11 min-w-11` on the item
  // slot) — xs 16→44, sm 24→44, md 32→44 — while the default environment
  // keeps 16/24/32.
  test("M-002 injected touch: item bounds reach 44pt; default environment keeps content size", async () => {
    const touch = await openPicker("mobile", { input: "touch" });
    for (const size of ["xs", "sm", "md"]) {
      for (let index = 0; index < 3; index += 1) {
        const box = await lastLayout(touch, `${size}-box-${index}`);
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }

    const pointer = await openPicker("mobile");
    for (const [size, side] of [
      ["xs", 16],
      ["sm", 24],
      ["md", 32],
    ] as const) {
      for (let index = 0; index < 3; index += 1) {
        const box = await lastLayout(pointer, `${size}-box-${index}`);
        expect(box.width).toBe(side);
        expect(box.height).toBe(side);
      }
    }
  }, 120_000);

  // adapt-sheets/color-swatch-picker.md M-003 (A-003): injected touch — a
  // quick press round-trips `isPressed` (the `seam` edge or, on web, the
  // deferred `ctx-state` sample carries the held read), `longPress` records
  // engaged mid-run samples, and `enabled` is true. The `tiny=1` half:
  // pinned under 44pt, the seam's `hitSlop` computes a real expansion.
  test("M-003 injected touch: seam round-trips, enabled gate open, tiny item computes hitSlop", async () => {
    const app = await openPicker("ctx-probe", { input: "touch", tiny: "1" });

    const env = lastOf<CtxEnv>(app, "ctx-env");
    expect(env.enabled).toBe(true);
    // Pinned to 16×16, the 44pt target leaves (44-16)/2 = 14pt of slop per
    // side — the view-prop half of the hit area (the gap is registered in
    // sheet §6: only the computed value is observable).
    expect(env.hitSlop).not.toBeNull();
    expect(env.hitSlop!.left).toBeGreaterThan(0);

    // A completed press: `active` (the unconditional flag) round-trips; the
    // seam's own rise is what the deferred/polled `ctx-state` samples
    // capture (web collapses the edge into one gesture turn).
    await app.press("id:ctx-item-0");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(onChangeHexes(app)).toEqual(["#ef4444"]);
    expect(edges(app).at(-1)?.seam).toBe(false);

    // A hold: `ctx-state` engaged samples — `seamPressed` true while the
    // hold lasts, `origin` recorded, the computed `hitSlop` live. On web
    // the first engaged sample can land mid-animation (`pressed` still
    // running to 1), so the channel values are asserted as "any engaged
    // sample saw them move", not as one settled read.
    await app.longPress("id:ctx-item-0");
    await app.waitUntil(() =>
      callsOf(app, "ctx-state").some((c) => (c[0] as CtxState).seamPressed),
    );
    const engaged = callsOf(app, "ctx-state")
      .map((c) => c[0] as CtxState)
      .filter((s) => s.seamPressed);
    expect(engaged.length).toBeGreaterThan(0);
    expect(engaged.some((s) => s.pressed > 0)).toBe(true);
    expect(engaged.some((s) => s.scale < 1)).toBe(true);
    expect(engaged.at(-1)!.origin).not.toBeNull();
    expect(engaged.at(-1)!.hitSlop).not.toBeNull();
    expect(engaged.at(-1)!.enabled).toBe(true);
  }, 120_000);

  // adapt-sheets/color-swatch-picker.md M-004 (A-002): injected touch —
  // `app.hover`/`app.press` leave `isHovered` at Idle and no hover callback
  // fires (web's sticky hover suppressed), while the raw host
  // `onMouseEnter`/`onMouseLeave` callbacks still pass on both sides. The
  // default environment's hover round-trips.
  test("M-004 injected touch suppresses hover state and callbacks; default environment keeps it", async () => {
    const touch = await openPicker("hover", { input: "touch" });
    expect(touch.shows("text:Idle")).toBe(true);

    await touch.hover("id:hv-item-0");
    expect(touch.shows("text:Hovered")).toBe(false);
    expect(touch.shows("text:Idle")).toBe(true);

    // The host `onMouseEnter`/`onMouseLeave` callbacks still pass under
    // touch (the A-002 ruling) — only the component's hover channel is
    // gated. Hovering away must fire `mouse-leave` while `hover-end`
    // stays silent.
    expect(callsOf(touch, "onMouseEnter").length).toBeGreaterThan(0);
    expect(callsOf(touch, "onHoverStart")).toHaveLength(0);

    await touch.hover("id:away");
    expect(callsOf(touch, "onMouseLeave").length).toBeGreaterThan(0);
    expect(callsOf(touch, "onHoverEnd")).toHaveLength(0);

    await touch.press("id:hv-item-0");
    await touch.waitUntil(() => callsOf(touch, "onChange").length === 1);
    expect(touch.shows("text:Hovered")).toBe(false);
    expect(callsOf(touch, "onHoverStart")).toHaveLength(0);
    expect(callsOf(touch, "onHoverChange")).toHaveLength(0);

    const pointer = await openPicker("hover");
    await pointer.hover("id:hv-item-0");
    expect(pointer.shows("text:Hovered")).toBe(true);
    expect(callsOf(pointer, "onHoverStart")).toHaveLength(1);
    expect(callsOf(pointer, "onHoverChange")).toEqual([[true]]);
    // The host mouse callbacks pass on the pointer side too.
    expect(callsOf(pointer, "onMouseEnter").length).toBeGreaterThan(0);

    await pointer.hover("id:away");
    await pointer.waitFor("text:Idle");
    expect(callsOf(pointer, "onHoverEnd")).toHaveLength(1);
    expect(callsOf(pointer, "onHoverChange")).toEqual([[true], [false]]);
    expect(callsOf(pointer, "onMouseLeave").length).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/color-swatch-picker.md M-005 (A-004, 基线): dual
  // environment — press-selects `onChange` (lowercase hex), a disabled item
  // refuses the press and never moves the selection, the item's `isSelected`
  // channel flips on the probed item (the observable half of "the selected
  // item's Indicator shows and the swatch shrinks" — the paint is X-001's
  // screenshot coverage), and the event chain keeps the desktop order in
  // both environments.
  test("M-005 dual environment: selection, disabled gate, isSelected channel and press chain unchanged", async () => {
    for (const params of [{}, { input: "touch" }] as Params[]) {
      const app = await openPicker("events", params);

      await app.press("id:ev-item-1");
      await app.waitUntil(() => callsOf(app, "onChange").length === 1);
      expect(onChangeHexes(app)).toEqual(["#22c55e"]);
      expect(pressChain(app)).toEqual(["down", "up", "press"]);

      const disabled = await openPicker("events", {
        ...params,
        disabled: "1",
      });
      expect(disabled.enabled("id:ev-item-1")).toBe(false);
      // The disabled option refuses the press outright and the selection
      // does not move; only then does an enabled sibling select.
      await expect(disabled.press("id:ev-item-1")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(disabled, "onChange")).toHaveLength(0);
      await disabled.press("id:ev-item-0");
      await disabled.waitUntil(() => callsOf(disabled, "onChange").length === 1);
      expect(onChangeHexes(disabled)).toEqual(["#ef4444"]);

      // The `isSelected` channel on the probed item (ctx-probe case): it
      // rises on its own press and falls when the selection moves to a
      // sibling — single-select semantics, identical in both environments.
      const probed = await openPicker("ctx-probe", params);
      await probed.press("id:ctx-item-0");
      await probed.waitUntil(() => {
        const env = callsOf(probed, "ctx-env")
          .map((c) => c[0] as CtxEnv)
          .at(-1);
        return env?.selected === true;
      });
      await probed.press("id:ctx-item-1");
      await probed.waitUntil(() => {
        const env = callsOf(probed, "ctx-env")
          .map((c) => c[0] as CtxEnv)
          .at(-1);
        return env?.selected === false;
      });
      expect(onChangeHexes(probed)).toEqual(["#ef4444", "#22c55e"]);
    }
  }, 120_000);

  // adapt-sheets/color-swatch-picker.md M-006 (A-001): `density="compact"`
  // tightens the row gap one step (gap-2 → gap-1.5, 8pt → 6pt) — adjacent
  // md boxes sit closer than under the default environment; no scope keeps
  // the 8pt gap.
  test("M-006 compact density tightens the row gap", async () => {
    const gaps = async (params: Params): Promise<number[]> => {
      const app = await openPicker("mobile", params);
      const [a, b] = await Promise.all([
        lastLayout(app, "md-box-0"),
        lastLayout(app, "md-box-1"),
      ]);
      return [Math.round(b.x - (a.x + a.width))];
    };

    const [plain] = await gaps({});
    const [compact] = await gaps({ density: "compact" });
    const [explicit] = await gaps({ density: "default" });

    expect(plain).toBe(8);
    expect(explicit).toBe(8);
    expect(compact).toBe(6);
  }, 120_000);

  // adapt-sheets/color-swatch-picker.md M-008 (A-006): the fixture mounts
  // in every environment the tests inject — no scope, `input="touch"`,
  // `density="compact"` — and every probe surface reports.
  test("M-008 fixture mounts under every injected environment and probes report", async () => {
    for (const params of [
      {},
      { input: "touch" },
      { density: "compact" },
    ] as Params[]) {
      // The `events` case exercises the whole mount surface — picker, probes
      // and a selection — under each environment pair.
      const app = await openPicker("events", params);
      await app.press("id:ev-item-0");
      await app.waitUntil(() => callsOf(app, "onChange").length === 1);
      app.dispose();
    }

    // The probe cases mount too (once each, the touch half carrying them).
    const app = await openPicker("mobile", { input: "touch" });
    await lastLayout(app, "xs-box-0");
    app.dispose();

    const probeApp = await openPicker("ctx-probe", { input: "touch" });
    expect(callsOf(probeApp, "ctx-env")).not.toHaveLength(0);
    probeApp.dispose();

    const hoverApp = await openPicker("hover", { input: "touch" });
    expect(hoverApp.shows("text:Idle") || hoverApp.shows("text:Hovered")).toBe(
      true,
    );
    hoverApp.dispose();
  }, 120_000);

  // adapt-sheets/color-swatch-picker.md M-005 (A-004, 基线, keyboard half):
  // the root's key bindings are input-independent — on the web host (the
  // one that moves view focus with Tab) arrows, Home/End and typeahead run
  // the same selection under touch as under pointer.
  test("M-005 keyboard navigation is identical under touch and pointer (web host)", async () => {
    for (const params of [{}, { input: "touch" }] as Params[]) {
      const app = await open("../../../color-swatch-picker.fixtures.tsx", {
        platform: "web",
        host: { params: { case: "select", ...params } },
      });

      await app.keyboard.press("tab");
      // The picker's selectable list is vertical-only, so Down/Up are the
      // navigation keys (RAC listbox semantics; Left/Right are inert).
      await app.keyboard.press("arrowdown");
      await app.keyboard.press("enter");
      await app.waitUntil(() => callsOf(app, "onChange").length === 1);
      expect(onChangeHexes(app)).toEqual(["#22c55e"]);

      await app.keyboard.press("arrowdown");
      await app.keyboard.press("space");
      await app.waitUntil(() => callsOf(app, "onChange").length === 2);
      expect(onChangeHexes(app)).toEqual(["#22c55e", "#3b82f6"]);

      await app.keyboard.press("home");
      await app.keyboard.press("enter");
      await app.waitUntil(() => callsOf(app, "onChange").length === 3);
      expect(onChangeHexes(app)).toEqual(["#22c55e", "#3b82f6", "#ef4444"]);

      // Typeahead moves the focused key without selecting on its own: the
      // options' accessible names are the colors' English names, and "v"
      // matches the third option's name but not the middle one's, so from
      // Home's first option it lands two keys ahead — Enter then selects
      // #3b82f6. A broken typeahead leaves focus on the first option and
      // selects #ef4444 instead, so the hex itself is the assertion.
      await app.keyboard.press("home");
      await app.keyboard.press("v");
      await app.keyboard.press("enter");
      await app.waitUntil(() => callsOf(app, "onChange").length === 4);
      expect(onChangeHexes(app)).toEqual([
        "#22c55e",
        "#3b82f6",
        "#ef4444",
        "#3b82f6",
      ]);
    }
  }, 120_000);
});
