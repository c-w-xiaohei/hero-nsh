import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the switch adapt unit — one test per row of
 * adapt-sheets/switch.md §4 (M-001…M-011), the headless halves: mid-hold
 * channel samples need `app.longPress`/`dragAndHold`, and `open({platform:
 * "ios"})` host derivation exists only here.
 *
 * The fixture is `harness/switch.fixtures.tsx`, opened by `host.params`:
 * `case` (log/press/readonly/disabled/without-label/layout/readonly-validate
 * …), `scope` ("" = the host's default pointer environment — the
 * desktop-parity half — or "touch" through `EnvironmentScope`), `probe`
 * ("1" mounts the CtxProbe seam surface plus the `ctx-sample` button).
 *
 * The ctx probes mirror the control-field convention, with the switch's own
 * two press flags: `active` is the root's unconditional pressed signal
 * (`isActive` — the raw held flag that paints `:active`, round-trips under
 * pointer too, and survives `isReadOnly`), `seam`/`seamPressed` is the
 * `createPressFeedback` factory's gated flag (`input()==="touch" &&
 * !isDisabled`). `ctx-state`/`ctx-channels` add `pressed`, `scale` (via
 * `getValue()` — `viewStyle` cannot resolve AnimatedValue-bound styles, the
 * registered host gap), `hitSlop`, `origin`, `bounds` and `enabled`.
 */

type Params = Record<string, string>;

function openSwitch(
  caseName: string,
  params: Params = {},
  options: { platform?: "windows" | "ios"; width?: number; height?: number } = {},
): Promise<App> {
  return open("../../../switch.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

const CONTROL = "role:switch[Enable notifications]";

type Edges = { top: number; right: number; bottom: number; left: number };

type PressedEdge = { seam: boolean; active: boolean };

type CtxState = {
  pressed: number;
  scale: number;
  seamPressed: boolean;
  active: boolean;
  hitSlop: Edges | null;
  origin: { x: number; y: number } | null;
  bounds: { width: number; height: number };
  enabled: boolean;
  selected: boolean;
};

type CtxChannels = Omit<CtxState, "bounds">;

type CtxEnv = {
  enabled: boolean;
  hitSlop: Edges | null;
  selected: boolean;
  disabled: boolean;
  readonly: boolean;
};

type LayoutEntry = { name: string; width: number; height: number };

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

function edges(app: App): PressedEdge[] {
  return callsOf(app, "ctx-pressed").map((c) => c[0] as PressedEdge);
}

/** `ctx-state` samples that ran while the seam's press was held. */
function heldSamples(app: App): CtxState[] {
  return callsOf(app, "ctx-state")
    .map((c) => c[0] as CtxState)
    .filter((s) => s.seamPressed === true);
}

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

function eventKinds(app: App): string[] {
  return callsOf(app, "events").map((c) => String(c[0]));
}

describe("switch mobile (headless)", () => {
  // adapt-sheets/switch.md M-001 (A-002, 负断言): under the default pointer
  // environment the touch-gated seam is inert — `pressed`/`scale` hold rest,
  // `hitSlop` stays null, `origin` never records, `enabled` is false — while
  // the press contract works unchanged (`onChange` fires exactly once) and
  // the unconditional `isActive` signal still round-trips.
  test("M-001 default environment: feedback channels stay inert while toggle works", async () => {
    const app = await openSwitch("log", { probe: "1" });

    await app.press(CONTROL);
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([[true]]);

    const list = edges(app);
    expect(list.some((e) => e.active)).toBe(true);
    expect(list.at(-1)).toEqual({ seam: false, active: false });
    expect(list.every((e) => !e.seam)).toBe(true);

    await app.waitUntil(() => callsOf(app, "ctx-state").length > 0);
    for (const call of callsOf(app, "ctx-state")) {
      const s = call[0] as CtxState;
      expect(s.seamPressed).toBe(false);
      expect(s.pressed).toBeLessThan(0.5);
      expect(s.scale).toBe(1);
      expect(s.hitSlop).toBeNull();
      expect(s.origin).toBeNull();
      expect(s.enabled).toBe(false);
    }

    // A fresh post-press on-demand read shows the same rest state.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.pressed).toBeLessThan(0.5);
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/switch.md M-002 (A-002): under an injected touch environment
  // a press engages the seam — `isPressed` round-trips, a held sample reads
  // `scale` ≈0.96 and `pressed` at 1 — and a label-less face laid out under
  // 44 pt reports a non-empty `hitSlop`.
  test("M-002 injected touch: seam roundtrips, held scale ≈0.96, short face gets hitSlop", async () => {
    const app = await openSwitch("press", { scope: "touch", probe: "1" });

    await app.press(CONTROL);
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(edges(app)).toContainEqual({ seam: true, active: true });
    expect(edges(app).at(-1)).toEqual({ seam: false, active: false });

    // A held press: the +600 ms sample lands mid-hold (delayLongPress 2500)
    // and reads the settled pressed end — scale at its ≈0.96 target
    // (ignoreScaleCoefficient), pressed at 1, origin recorded.
    await app.longPress(CONTROL);
    await app.waitUntil(() => heldSamples(app).length >= 1);
    const held = heldSamples(app).at(-1)!;
    expect(held.seamPressed).toBe(true);
    expect(held.pressed).toBeGreaterThan(0.99);
    expect(held.scale).toBeLessThan(1);
    expect(held.scale).toBeGreaterThan(0.9);
    expect(held.enabled).toBe(true);
    expect(held.origin).not.toBeNull();

    // The label-less face: Content is just the 40×20 track — under 44 pt —
    // so the seam's invisible half pads it out. `hitSlop` needs the measured
    // bounds, so read a post-layout `ctx-state` sample, not the mount-time
    // `ctx-env` (which can run before `onLayout`).
    const bare = await openSwitch("without-label", { scope: "touch", probe: "1" });
    expect(lastOf<CtxEnv>(bare, "ctx-env").enabled).toBe(true);
    await bare.waitUntil(() =>
      callsOf(bare, "ctx-state").some(
        (c) => (c[0] as CtxState).hitSlop !== null,
      ),
    );
    // Under touch `min-h-11` lifts the face to the 44 pt height minimum, so
    // the expansion lands on the horizontal sides (the 40 pt track width).
    const slop = lastOf<CtxState>(bare, "ctx-state").hitSlop!;
    expect(Math.max(slop.left, slop.right)).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/switch.md M-003 (A-001): the `input` axis's `min-h-11` gives
  // the touch face its 44 pt visible minimum; the default environment's face
  // keeps its content height.
  test("M-003 touch face measures at least 44pt, default environment unchanged", async () => {
    const touch = await openSwitch("layout", { scope: "touch" });
    await touch.waitUntil(() =>
      callsOf(touch, "layout").some((c) => (c[0] as LayoutEntry).name === "content"),
    );
    expect(layoutFor(touch, "content").height).toBeGreaterThanOrEqual(44);

    const pointer = await openSwitch("layout");
    await pointer.waitUntil(() =>
      callsOf(pointer, "layout").some((c) => (c[0] as LayoutEntry).name === "content"),
    );
    expect(layoutFor(pointer, "content").height).toBeLessThan(44);
  }, 120_000);

  // adapt-sheets/switch.md M-004 (A-003): under touch the hover writes stay
  // off — neither `app.hover` nor a press raises `isHovered` (a web sticky
  // hover cannot pin the face); the default environment's hover round-trips.
  test("M-004 injected touch suppresses hover, default environment keeps it", async () => {
    const touch = await openSwitch("log", { scope: "touch", probe: "1" });
    await touch.hover(CONTROL);
    expect(touch.shows("text:Idle")).toBe(true);
    expect(touch.shows("text:Hovered")).toBe(false);
    await touch.press(CONTROL);
    await touch.waitUntil(() => callsOf(touch, "onChange").length === 1);
    expect(touch.shows("text:Idle")).toBe(true);
    // No hover callbacks reported either.
    expect(callsOf(touch, "onHoverStart")).toHaveLength(0);
    expect(callsOf(touch, "onHoverEnd")).toHaveLength(0);

    const pointer = await openSwitch("log");
    await pointer.hover(CONTROL);
    expect(pointer.shows("text:Hovered")).toBe(true);
    await pointer.hover("id:away");
    await pointer.waitFor("text:Idle");
    expect(pointer.shows("text:Idle")).toBe(true);
  }, 120_000);

  // adapt-sheets/switch.md M-005 (A-001, A-002): under touch `isDisabled`
  // closes the seam gate and the press path alike — no feedback round-trip,
  // `app.enabled` false, no toggle, no callbacks.
  test("M-005 injected touch + isDisabled: gate closed, press inert", async () => {
    const app = await openSwitch("disabled", { scope: "touch", probe: "1" });

    expect(app.enabled(CONTROL)).toBe(false);
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(false);

    await expect(app.press(CONTROL)).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(edges(app).every((e) => !e.seam && !e.active)).toBe(true);
  }, 120_000);

  // adapt-sheets/switch.md M-006 (A-002): under touch a read-only press runs
  // the seam's round-trip (matching `isActive`'s held paint) but never
  // dispatches press callbacks and never toggles.
  test("M-006 injected touch + isReadOnly: seam roundtrips, no callbacks, no toggle", async () => {
    const app = await openSwitch("readonly", { scope: "touch", probe: "1" });
    expect(app.shows("text:Off")).toBe(true);

    await app.press(CONTROL);

    await app.waitUntil(() => edges(app).length >= 2);
    expect(edges(app)).toContainEqual({ seam: true, active: true });
    expect(edges(app).at(-1)).toEqual({ seam: false, active: false });

    // The read-only gate held: nothing dispatched, nothing changed.
    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(callsOf(app, "onPress")).toHaveLength(0);
    expect(callsOf(app, "onPressStart")).toHaveLength(0);
    expect(app.shows("text:Off")).toBe(true);
  }, 120_000);

  // adapt-sheets/switch.md M-007 (A-005): a ControlField row with the default
  // `variant="switch"` piece — row press commits `onSelectedChange` exactly
  // once, the track/thumb render and follow the row's value, no second
  // toggle path. Both environments agree.
  test("M-007 ControlField switch piece: one commit per row press, state follows", async () => {
    const openRow = (params: Params) =>
      open("../../../control-field.fixtures.tsx", {
        platform: "windows",
        width: 1024,
        height: 768,
        host: { params: { case: "row", variant: "switch", ...params } },
      });

    for (const params of [{} as Params, { scope: "touch" }]) {
      const app = await openRow(params);
      expect(app.shows("id:cf-switch-track")).toBe(true);
      expect(app.shows("id:cf-switch-thumb")).toBe(true);

      await app.press("id:cf-row");
      await app.waitUntil(() => callsOf(app, "change").length === 1);
      expect(callsOf(app, "change")).toEqual([[true]]);

      const on = await openRow({ ...params, selected: "1" });
      await on.press("id:cf-row");
      await on.waitUntil(() => callsOf(on, "change").length === 1);
      expect(callsOf(on, "change")).toEqual([[false]]);
    }
  }, 120_000);

  // adapt-sheets/switch.md M-008 (A-002): the press sequence is preserved
  // under touch — down → up → press → change → click — on both press paths
  // (a press on the face's track area and a press on the Label, which the
  // `focusField` path reports through the same root callbacks).
  test("M-008 injected touch: press event sequence preserved on both press paths", async () => {
    const app = await openSwitch("press", { scope: "touch" });

    // A press on the Label inside the face (the `focusField` path).
    await app.press("text:Enable notifications");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(eventKinds(app)).toEqual(["down", "up", "press", "change", "click"]);

    const app2 = await openSwitch("press", { scope: "touch" });
    // A press that lands on the track/face rather than the Label: the
    // role:switch selector resolves to the Content's pressable view.
    await app2.press(CONTROL);
    await app2.waitUntil(() => callsOf(app2, "onChange").length === 1);
    expect(eventKinds(app2)).toEqual(["down", "up", "press", "change", "click"]);
  }, 120_000);

  // adapt-sheets/switch.md M-009 (A-002, A-004): `reducedMotion` under touch
  // pins the scale channel to 1 (the instant path) while the canonical press
  // flag still round-trips and the toggle fires — the seam's animation is
  // gated by the host motion preference, the contract surface is not.
  test("M-009 injected touch + reducedMotion: scale stays 1, press still completes", async () => {
    const app = await open("../../../switch.fixtures.tsx", {
      platform: "windows",
      width: 1024,
      height: 768,
      reducedMotion: true,
      host: { params: { case: "press", scope: "touch", probe: "1" } },
    });

    await app.longPress(CONTROL);
    await app.waitUntil(() => heldSamples(app).length >= 1);
    const held = heldSamples(app).at(-1)!;
    expect(held.seamPressed).toBe(true);
    expect(held.scale).toBe(1);

    // A normal press still toggles — the contract surface is ungated.
    await app.press(CONTROL);
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([[true]]);
  }, 120_000);

  // adapt-sheets/switch.md M-010 (基线): the default environment keeps the
  // desktop contract — one `change` per press, markers flip On/Off, the
  // controlled and readonly cases hold their semantics.
  test("M-010 default environment baseline: toggle, markers, readonly gate", async () => {
    const app = await openSwitch("log");
    expect(app.shows("text:Off")).toBe(true);

    await app.press(CONTROL);
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([[true]]);
    expect(app.shows("text:On")).toBe(true);

    await app.press(CONTROL);
    await app.waitUntil(() => callsOf(app, "onChange").length === 2);
    expect(callsOf(app, "onChange")[1]).toEqual([false]);
    expect(app.shows("text:Off")).toBe(true);

    const readonly = await openSwitch("readonly");
    await readonly.press(CONTROL);
    expect(callsOf(readonly, "onChange")).toHaveLength(0);
    expect(readonly.shows("text:Off")).toBe(true);
  }, 120_000);

  // adapt-sheets/switch.md M-011 (基线对偶): under touch a read-only press
  // does not commit validation — the FieldError stays absent and the value
  // does not toggle (the mobile dual of the preserved readonly/validation
  // semantics).
  test("M-011 injected touch + readonly-validate: no commit, no error, no toggle", async () => {
    const app = await openSwitch("readonly-validate", { scope: "touch", probe: "1" });
    expect(app.shows("text:Selected is not allowed")).toBe(false);

    await app.press(CONTROL);

    // The press ran (seam edges recorded) but nothing committed.
    await app.waitUntil(() => edges(app).length >= 1);
    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(callsOf(app, "onPress")).toHaveLength(0);
    expect(app.shows("text:Selected is not allowed")).toBe(false);
  }, 120_000);

  // The host-derivation half of A-002 (control-field M-009's precedent): an
  // ios host derives `input()==="touch"` without an EnvironmentScope, so the
  // seam gate holds on its own. Headless only — `--target web` rejects a
  // `platform` option.
  test("A-002 ios host derivation: the seam activates without an EnvironmentScope", async () => {
    const app = await openSwitch("press", { probe: "1" }, {
      platform: "ios",
      width: 390,
      height: 844,
    });

    await app.press(CONTROL);
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(edges(app)).toContainEqual({ seam: true, active: true });
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);
  }, 120_000);
});
