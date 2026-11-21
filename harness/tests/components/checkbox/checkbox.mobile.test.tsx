import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the checkbox adapt unit
 * (adapt-sheets/checkbox.md §4, M-001…M-010). One file for headless+web:
 * every assertion reads what `nsh/test` observes — `shows`, `texts`,
 * `enabled`, `onLayout` probe payloads and `app.storage()` probe calls —
 * and `host.params.scope` picks the environment, so the dual-environment
 * rows run identically on both targets.
 *
 * The probes live in `harness/checkbox.fixtures.tsx`:
 *   `env`    the Content's registered seam channels — `input`, `hitSlop`,
 *            `seamPressed`, `enabled`, the gated `effectHover` and the raw
 *            `rawHover` context signal — sampled on mount and on every
 *            press edge (M-002/M-004/M-005/M-009).
 *   `events` the Content's press lifecycle plus the `toggle` marker the
 *            root's `onChange` fires between `onPress` and `onClick`
 *            (M-003's order).
 *   `layout` the Content row's bounds (M-001).
 *   `onSelectedChange`/`onChange`/`onPress`  the cf-checkbox row's probes
 *            (M-006).
 */

type Params = Record<string, string>;

function openCase(
  name: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../checkbox.fixtures.tsx", {
    // The default half of the sheet's dual environment is `platform.desktop`
    // === true — the same host the desktop contract runs on (a bare `nsh
    // test` headless host reports `desktop: false`). `EnvironmentScope`
    // supplies the injected touch half.
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type Env = {
  input: string;
  hitSlop: Edges | null;
  seamPressed: boolean;
  enabled: boolean;
  effectHover: boolean;
  rawHover: boolean;
  selected: boolean;
};

function envs(app: App): Env[] {
  return callsOf(app, "env").map((c) => c[0] as Env);
}

function lastEnv(app: App): Env {
  return envs(app).at(-1)!;
}

function kinds(app: App): string[] {
  return callsOf(app, "events").map((c) => (c[0] as { kind: string }).kind);
}

describe("checkbox mobile", () => {
  // M-009 (A-005): the fixture's dual-environment channel — `scope` picks
  // `EnvironmentScope input="touch"`, its absence the host default.
  test("M-009 env probe reports pointer by default and touch under the injected scope", async () => {
    const pointer = await openCase("row");
    await pointer.waitUntil(() => callsOf(pointer, "env").length > 0);
    expect(lastEnv(pointer).input).toBe("pointer");
    expect(lastEnv(pointer).enabled).toBe(false);

    const touch = await openCase("row", { scope: "touch" });
    await touch.waitUntil(() => callsOf(touch, "env").length > 0);
    expect(lastEnv(touch).input).toBe("touch");
    expect(lastEnv(touch).enabled).toBe(true);
  }, 120_000);

  // M-001 (A-001): the `input` axis' `min-h-11` lifts the short Content row
  // to the 44 pt hit minimum under touch; the same row keeps its content
  // height under pointer.
  test("M-001 short Content row measures at least 44pt under touch and stays short under pointer", async () => {
    const touch = await openCase("row", { scope: "touch" });
    await touch.waitUntil(() => callsOf(touch, "layout").length > 0);
    const touchLayout = callsOf(touch, "layout").at(-1)![0] as { height: number };
    expect(touchLayout.height).toBeGreaterThanOrEqual(44);

    const pointer = await openCase("row");
    await pointer.waitUntil(() => callsOf(pointer, "layout").length > 0);
    const pointerLayout = callsOf(pointer, "layout").at(-1)![0] as { height: number };
    expect(pointerLayout.height).toBeLessThan(44);
  }, 120_000);

  // M-002 (A-003, 负断言): the default environment leaves the seam inert —
  // `hitSlop` stays null, `seamPressed` never rises — while the press
  // contract round-trips exactly as on desktop.
  test("M-002 default environment: seam stays inert while the press contract holds", async () => {
    const app = await openCase("row");

    await app.press("id:cb-row");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([[true]]);

    const samples = envs(app);
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) {
      expect(s.seamPressed).toBe(false);
      expect(s.hitSlop).toBeNull();
      expect(s.enabled).toBe(false);
    }
  }, 120_000);

  // M-003 (A-003): under touch one press commits exactly once, and the
  // lifecycle keeps its order — start, press-change(true), up, end,
  // press-change(false), press, the toggle's onChange, click — with the
  // seam's own flag rising on the held edge.
  test("M-003 injected touch: one press toggles exactly once with the contract order", async () => {
    const app = await openCase("row", { scope: "touch" });

    await app.press("id:cb-row");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([[true]]);

    expect(kinds(app)).toEqual([
      "start",
      "change:true",
      "up",
      "end",
      "change:false",
      "press",
      "toggle",
      "click",
    ]);

    // The seam's press flag rose during the hold and rests again.
    expect(envs(app).some((s) => s.seamPressed)).toBe(true);
    expect(lastEnv(app).seamPressed).toBe(false);
  }, 120_000);

  // M-004 (A-002): under touch the Control's hover effect cells stay off
  // even while the raw hover signal can still be set; under pointer a press
  // keeps the desktop effect the signal reports.
  test("M-004 injected touch: the gated hover effect stays off; pointer keeps it", async () => {
    const touch = await openCase("row", { scope: "touch" });
    await touch.press("id:cb-row");
    await touch.waitUntil(() => callsOf(touch, "onChange").length === 1);
    for (const s of envs(touch)) {
      expect(s.effectHover).toBe(false);
    }

    const pointer = await openCase("row");
    await pointer.press("id:cb-row");
    await pointer.waitUntil(() => callsOf(pointer, "onChange").length === 1);
    // The raw signal may or may not have been fed a mouse-enter; whatever it
    // reports, the gated effect mirrors it under pointer (no suppression).
    const last = lastEnv(pointer);
    expect(last.effectHover).toBe(last.rawHover);
  }, 120_000);

  // M-005 (A-001, A-003): under touch the seam computes a real `hitSlop`
  // for a row still under the 44 pt target on an axis — `min-h-11` already
  // covers the height, so the tiny box leaves the width — and a press from
  // the row's center still toggles once.
  test("M-005 injected touch: hitSlop is computed and the press still lands", async () => {
    const app = await openCase("row", { scope: "touch", box: "tiny" });
    await app.waitUntil(() =>
      envs(app).some((s) => s.hitSlop !== null),
    );
    const layout = callsOf(app, "layout").at(-1)![0] as {
      width: number;
      height: number;
    };

    const slop = lastEnv(app).hitSlop;
    expect(slop).not.toBeNull();
    // The accessor pads each short side halfway to the 44 pt target.
    expect(slop!.top).toBe(Math.max(0, (44 - layout.height) / 2));
    expect(slop!.left).toBe(Math.max(0, (44 - layout.width) / 2));

    await app.press("id:cb-row");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([[true]]);
  }, 120_000);

  // M-006 (A-004): the ControlField row with the checkbox default piece —
  // one press on the row fires `onSelectedChange` exactly once and nothing
  // else; the default Control and Indicator mount.
  test("M-006 ControlField checkbox default piece: one row press, one commit, no double toggle", async () => {
    const app = await openCase("cf-checkbox", { scope: "touch" });

    expect(app.shows("id:cf-checkbox-control")).toBe(true);
    expect(app.shows("id:cf-checkbox-indicator")).toBe(true);

    await app.press("id:cf-checkbox");
    await app.waitUntil(() => callsOf(app, "onSelectedChange").length === 1);
    expect(callsOf(app, "onSelectedChange")).toEqual([[true]]);
    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(callsOf(app, "onPress").length).toBeGreaterThanOrEqual(1);
  }, 120_000);

  // M-007 (基线): under the default environment the existing cases behave
  // exactly as the desktop contract — selection markers, indeterminate,
  // disabled, read-only, invalid and validation, through the same probes.
  test("M-007 baseline: default environment keeps the desktop contract", async () => {
    const log = await openCase("log");
    expect(log.shows("text:Unchecked")).toBe(true);
    await log.press("role:checkbox[Accept terms]");
    expect(log.shows("text:Checked")).toBe(true);
    expect(callsOf(log, "onChange")).toEqual([[true]]);

    const indeterminate = await openCase("indeterminate-toggle");
    expect(indeterminate.shows("text:Mixed")).toBe(true);
    await indeterminate.press("id:clear-indeterminate");
    expect(indeterminate.shows("text:NoMixed")).toBe(true);

    const disabled = await openCase("disabled");
    expect(disabled.enabled("role:checkbox[Accept terms]")).toBe(false);
    await expect(disabled.press("role:checkbox[Accept terms]")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(disabled, "onChange")).toHaveLength(0);

    const readonly = await openCase("readonly");
    await readonly.press("role:checkbox[Accept terms]");
    expect(readonly.shows("text:Checked")).toBe(true);
    expect(callsOf(readonly, "onChange")).toHaveLength(0);

    const invalid = await openCase("invalid");
    expect(invalid.shows("text:ErrorMessage")).toBe(true);

    const aria = await openCase("validation-aria");
    expect(aria.shows("text:Subscribe to continue")).toBe(true);
  }, 120_000);

  // M-008 (基线): the group path on both sides — one item press fires the
  // group's `onChange` exactly once with the value's addition.
  test("M-008 baseline: group items commit once per press in both environments", async () => {
    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const app = await openCase("group-log", params);
      await app.press("role:checkbox[Coding]");
      await app.waitUntil(() => callsOf(app, "groupChange").length === 1);
      expect(callsOf(app, "groupChange")).toEqual([[["coding"]]]);
      expect(callsOf(app, "codingChange")).toEqual([[true]]);
      expect(callsOf(app, "designChange")).toHaveLength(0);
    }
  }, 120_000);
});
