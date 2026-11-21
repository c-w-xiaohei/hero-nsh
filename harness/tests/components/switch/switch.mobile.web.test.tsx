import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web mobile assertions for the switch adapt unit — the `.web.` half of
 * adapt-sheets/switch.md §4 (M-001…M-011). `app.drag`/`dragAndHold` are
 * headless-only and `open({platform})` rejects on `--target web`, so the
 * held-sample and ios-derivation assertions live in
 * `switch.mobile.headless.test.tsx`; this file asserts the same rows through
 * edge probes (`ctx-pressed`), settle reads (`ctx-state` / `ctx-channels`)
 * and `app.press`/`app.longPress`.
 *
 * Fixture: `harness/switch.fixtures.tsx` — `case`, `scope` ("touch" injects
 * the `EnvironmentScope`; the default is the pointer environment, the
 * desktop-parity half), `probe` ("1" mounts the CtxProbe + `ctx-sample`).
 * `active` is the root's unconditional pressed signal; `seam` is the
 * feedback factory's gated flag.
 */

type Params = Record<string, string>;

function openSwitch(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../switch.fixtures.tsx", {
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

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

function eventKinds(app: App): string[] {
  return callsOf(app, "events").map((c) => String(c[0]));
}

describe("switch mobile (web)", () => {
  // adapt-sheets/switch.md M-001 (A-002, 负断言): under the default pointer
  // environment the seam stays inert — scale/pressed at rest, hitSlop and
  // origin empty, enabled false — while the toggle contract works.
  test("M-001 default environment: feedback channels stay inert while toggle works", async () => {
    const app = await openSwitch("log", { probe: "1" });

    await app.press(CONTROL);
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([[true]]);

    const list = edges(app);
    expect(list.every((e) => !e.seam)).toBe(true);
    expect(list.at(-1)).toEqual({ seam: false, active: false });

    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.pressed).toBeLessThan(0.5);
    expect(channels.scale).toBe(1);
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/switch.md M-002 (A-002): injected touch — the seam flag
  // round-trips on `app.press`, and a completed `longPress` leaves a pressed
  // run in the sampled channels (`pressed` reached 1, `scale` the ≈0.96
  // end — web cannot sample mid-hold, so the deferred `ctx-state` samples
  // around the longPress carry the mid-run values; the post-hold settle read
  // comes from `ctx-channels`).
  test("M-002 injected touch: seam engages on hold and settles back", async () => {
    const app = await openSwitch("press", { scope: "touch", probe: "1" });

    // `id:sw-track` presses the face through Content's own handlers — on web
    // `role:switch`'s center lands on the pressable Label, which toggles
    // through `focusField` and never runs the seam's `pressDown`.
    await app.press("id:sw-track");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    // On web the seam's pressDown/pressUp land inside one press tick, so the
    // batched `ctx-pressed` effect only reports the settled flag — the seam
    // edge itself is the headless file's half. What web can observe is the
    // unconditional `active` edge and the polled mid-hold sample below.
    expect(edges(app).some((e) => e.active)).toBe(true);
    expect(edges(app).at(-1)).toEqual({ seam: false, active: false });

    // A hold: the probe's interval sampler catches the flag mid-press and
    // reports the engaged channels — pressed at 1, scale at its ≈0.96 end.
    await app.longPress("id:sw-track");
    await app.waitUntil(() =>
      callsOf(app, "ctx-state").some((c) => (c[0] as CtxState).seamPressed),
    );
    const states = callsOf(app, "ctx-state").map((c) => c[0] as CtxState);
    // The interval sampler fires through the whole hold: the first engaged
    // sample can land mid-animation (`pressed` still running to 1), so read
    // the last one — the settled end just before release.
    const engaged = states.filter((s) => s.seamPressed).at(-1)!;
    expect(engaged.pressed).toBeGreaterThan(0.9);
    expect(engaged.scale).toBeLessThan(1);
    expect(engaged.scale).toBeGreaterThan(0.9);
    expect(engaged.origin).not.toBeNull();

    // Post-press settle: channels back to rest.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.origin).toBeNull();

    // The label-less face's hitSlop (post-layout ctx-state sample).
    const bare = await openSwitch("without-label", { scope: "touch", probe: "1" });
    expect(lastOf<CtxEnv>(bare, "ctx-env").enabled).toBe(true);
    await bare.waitUntil(() =>
      callsOf(bare, "ctx-state").some(
        (c) => (c[0] as CtxState).hitSlop !== null,
      ),
    );
    const slop = lastOf<CtxState>(bare, "ctx-state").hitSlop!;
    expect(Math.max(slop.left, slop.right)).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/switch.md M-003 (A-001): `min-h-11` under touch vs the
  // content-sized face under pointer, measured by the Content's `onLayout`.
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

  // adapt-sheets/switch.md M-004 (A-003): under touch `app.hover` and a press
  // leave `isHovered` at Idle and no hover callbacks fire — the sticky-hover
  // suppression; the default environment's hover round-trips.
  test("M-004 injected touch suppresses hover, default environment keeps it", async () => {
    const touch = await openSwitch("log", { scope: "touch", probe: "1" });
    await touch.hover(CONTROL);
    expect(touch.shows("text:Hovered")).toBe(false);
    await touch.press(CONTROL);
    await touch.waitUntil(() => callsOf(touch, "onChange").length === 1);
    // The web sticky hover must not pin the marker.
    expect(touch.shows("text:Idle")).toBe(true);
    expect(callsOf(touch, "onHoverStart")).toHaveLength(0);

    const pointer = await openSwitch("log");
    await pointer.hover(CONTROL);
    expect(pointer.shows("text:Hovered")).toBe(true);
    await pointer.hover("id:away");
    await pointer.waitFor("text:Idle");
  }, 120_000);

  // adapt-sheets/switch.md M-005 (A-001, A-002): touch + isDisabled — the
  // gate reports closed and a press does nothing.
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

  // adapt-sheets/switch.md M-006 (A-002): touch + isReadOnly — the seam
  // round-trips while no callback and no toggle fires.
  test("M-006 injected touch + isReadOnly: seam roundtrips, no callbacks, no toggle", async () => {
    const app = await openSwitch("readonly", { scope: "touch", probe: "1" });

    await app.press(CONTROL);
    await app.waitUntil(() => edges(app).length >= 2);
    expect(edges(app)).toContainEqual({ seam: true, active: true });
    expect(edges(app).at(-1)).toEqual({ seam: false, active: false });
    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(callsOf(app, "onPress")).toHaveLength(0);
    expect(app.shows("text:Off")).toBe(true);
  }, 120_000);

  // adapt-sheets/switch.md M-007 (A-005): the ControlField switch variant —
  // one commit per row press, default piece renders and follows, both
  // environments.
  test("M-007 ControlField switch piece: one commit per row press, state follows", async () => {
    const openRow = (params: Params) =>
      open("../../../control-field.fixtures.tsx", {
        host: { params: { case: "row", variant: "switch", ...params } },
      });

    for (const params of [{} as Params, { scope: "touch" }]) {
      const app = await openRow(params);
      expect(app.shows("id:cf-switch-track")).toBe(true);
      expect(app.shows("id:cf-switch-thumb")).toBe(true);

      // The row's label is pressable on web; press the description, whose
      // press bubbles to the row's own handlers (the fixture's convention).
      await app.press("id:cf-desc");
      await app.waitUntil(() => callsOf(app, "change").length === 1);
      expect(callsOf(app, "change")).toEqual([[true]]);

      const on = await openRow({ ...params, selected: "1" });
      await on.press("id:cf-desc");
      await on.waitUntil(() => callsOf(on, "change").length === 1);
      expect(callsOf(on, "change")).toEqual([[false]]);
    }
  }, 120_000);

  // adapt-sheets/switch.md M-008 (A-002): the press sequence down → up →
  // press → change → click holds under touch, on the face press (web
  // hit-tests `role:switch` onto the track, not the label — the Label
  // press-path half runs headless).
  test("M-008 injected touch: press event sequence preserved", async () => {
    const app = await openSwitch("press", { scope: "touch" });

    await app.press(CONTROL);
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(eventKinds(app)).toEqual(["down", "up", "press", "change", "click"]);
  }, 120_000);

  // adapt-sheets/switch.md M-009 (A-002): `reducedMotion` under touch — the
  // scale channel reads 1 in every sampled state while the press still
  // completes.
  test("M-009 injected touch + reducedMotion: scale stays 1, press still completes", async () => {
    const app = await open("../../../switch.fixtures.tsx", {
      reducedMotion: true,
      host: { params: { case: "press", scope: "touch", probe: "1" } },
    });

    await app.press(CONTROL);
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);

    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    expect(lastOf<CtxChannels>(app, "ctx-channels").scale).toBe(1);
    for (const call of callsOf(app, "ctx-state")) {
      expect((call[0] as CtxState).scale).toBe(1);
    }
  }, 120_000);

  // adapt-sheets/switch.md M-010 (基线): desktop zero-drift under the
  // default environment — toggle both ways, readonly stays gated.
  test("M-010 default environment baseline: toggle, markers, readonly gate", async () => {
    const app = await openSwitch("log");
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
  }, 120_000);

  // adapt-sheets/switch.md M-011 (基线对偶): touch + readonly-validate — no
  // commit, no error text, no toggle.
  test("M-011 injected touch + readonly-validate: no commit, no error, no toggle", async () => {
    const app = await openSwitch("readonly-validate", { scope: "touch", probe: "1" });
    expect(app.shows("text:Selected is not allowed")).toBe(false);

    await app.press(CONTROL);
    await app.waitUntil(() => edges(app).length >= 1);
    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(callsOf(app, "onPress")).toHaveLength(0);
    expect(app.shows("text:Selected is not allowed")).toBe(false);
  }, 120_000);
});
