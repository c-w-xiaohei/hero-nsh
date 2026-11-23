import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the checkbox adapt unit
 * (adapt-sheets/checkbox.md §4, M-001…M-010) on every target, native
 * ios/android included: every assertion reads what `nsh/test` observes —
 * `shows`, `texts`, `enabled`, `onLayout` probe payloads and
 * `app.storage()` probe calls — and `host.params.testInput` picks the
 * environment explicitly ("pointer" is the desktop-parity baseline, "touch"
 * the injected side), so the dual-environment rows run identically
 * everywhere. M-004 and M-007's hover tail use `app.hover`, which needs a
 * mouse — they live in `checkbox.mobile.headless.test.tsx`.
 *
 * The probes live in `harness/checkbox.fixtures.tsx`:
 *   `env`    the Content's registered seam channels — `input`, `hitSlop`,
 *            `seamPressed`, `enabled`, the gated `effectHover` and the raw
 *            `rawHover` context signal — sampled on mount and on every
 *            press/hover/selection edge (M-002/M-004/M-005/M-009).
 *   `events` the Content's press lifecycle plus the `toggle` marker the
 *            root's `onChange` fires between `onPress` and `onClick`
 *            (M-003's order).
 *   `layout` the Content row's bounds (M-001).
 *   `onSelectedChange`/`onChange`/`onPress`  the cf-checkbox row's probes
 *            (M-006).
 */

type Params = Record<string, string>;

function openCase(name: string, params: Params = {}): Promise<App> {
  return open("../../../checkbox.fixtures.tsx", {
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
  // M-009 (A-005): the fixture's dual-environment channel — `testInput`
  // picks the outer `EnvironmentScope` input on both halves.
  test("M-009 env probe reports pointer and touch under the injected inputs", async () => {
    const pointer = await openCase("row", { testInput: "pointer" });
    await pointer.waitUntil(() => callsOf(pointer, "env").length > 0);
    expect(lastEnv(pointer).input).toBe("pointer");
    expect(lastEnv(pointer).enabled).toBe(false);

    const touch = await openCase("row", { testInput: "touch" });
    await touch.waitUntil(() => callsOf(touch, "env").length > 0);
    expect(lastEnv(touch).input).toBe("touch");
    expect(lastEnv(touch).enabled).toBe(true);
  }, 120_000);

  // M-001 (A-001): the `input` axis' `min-h-11` lifts the short Content row
  // to the 44 pt hit minimum under touch; the same row keeps its content
  // height under pointer, and a row already taller than 44 pt is not
  // clamped or shrunk by the floor.
  test("M-001 short Content row measures at least 44pt under touch and stays short under pointer", async () => {
    const touch = await openCase("row", { testInput: "touch" });
    await touch.waitUntil(() => callsOf(touch, "layout").length > 0);
    const touchLayout = callsOf(touch, "layout").at(-1)![0] as { height: number };
    expect(touchLayout.height).toBeGreaterThanOrEqual(44);

    const pointer = await openCase("row", { testInput: "pointer" });
    await pointer.waitUntil(() => callsOf(pointer, "layout").length > 0);
    const pointerLayout = callsOf(pointer, "layout").at(-1)![0] as { height: number };
    expect(pointerLayout.height).toBeLessThan(44);

    // The "taller content is not forced" half: `tall=1` stacks four text
    // lines inside the same Content — over 44 pt on its own — and `min-h-11`
    // must leave that height alone in both environments.
    const tallTouch = await openCase("row", { testInput: "touch", tall: "1" });
    await tallTouch.waitUntil(() => callsOf(tallTouch, "layout").length > 0);
    const tallTouchLayout = callsOf(tallTouch, "layout").at(-1)![0] as {
      height: number;
    };
    expect(tallTouchLayout.height).toBeGreaterThan(44);

    const tallPointer = await openCase("row", { testInput: "pointer", tall: "1" });
    await tallPointer.waitUntil(() => callsOf(tallPointer, "layout").length > 0);
    const tallPointerLayout = callsOf(tallPointer, "layout").at(-1)![0] as {
      height: number;
    };
    expect(tallPointerLayout.height).toBe(tallTouchLayout.height);
  }, 120_000);

  // M-002 (A-003, 负断言): the injected pointer baseline leaves the seam
  // inert —
  // `hitSlop` stays null, `seamPressed` never rises — while the press
  // contract round-trips exactly as on desktop: same lifecycle order, same
  // single toggle, same click tail (the seam is a physical no-op).
  test("M-002 pointer baseline: seam stays inert while the press contract holds", async () => {
    const app = await openCase("row", { testInput: "pointer" });

    await app.press("id:cb-row");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([[true]]);

    // The callback sequence is the desktop one, item for item — identical
    // to what M-003 pins under the injected touch environment.
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
    const app = await openCase("row", { testInput: "touch" });

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

  // M-004 (A-002) lives in `checkbox.mobile.headless.test.tsx` —
  // `app.hover` needs a mouse, so the row moved there whole rather than
  // split.

  // M-005 (A-001, A-003): under touch the seam computes a real `hitSlop`
  // for a row still under the 44 pt target on an axis — `min-h-11` already
  // covers the height, so the tiny box leaves the width — and a press from
  // the row's center still toggles once.
  test("M-005 injected touch: hitSlop is computed and the press still lands", async () => {
    const app = await openCase("row", { testInput: "touch", box: "tiny" });
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
  // else; the default Control and Indicator mount, and the row's `isSelected`
  // prop drives the commit value in both directions (the piece's own selected
  // paint is canvas-drawn — sheet §6's registered gap — so the commit value
  // is the observable half of "选中态随行 prop").
  test("M-006 ControlField checkbox default piece: one row press, one commit, no double toggle", async () => {
    const app = await openCase("cf-checkbox", { testInput: "touch" });

    expect(app.shows("id:cf-checkbox-control")).toBe(true);
    expect(app.shows("id:cf-checkbox-indicator")).toBe(true);

    await app.press("id:cf-checkbox");
    await app.waitUntil(() => callsOf(app, "onSelectedChange").length === 1);
    expect(callsOf(app, "onSelectedChange")).toEqual([[true]]);
    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(callsOf(app, "onPress").length).toBeGreaterThanOrEqual(1);

    // The same row driven selected: the commit reports the flip to false —
    // proof the row's `isSelected` prop reaches the single commit point.
    const selected = await openCase("cf-checkbox", {
      testInput: "touch",
      selected: "1",
    });
    expect(selected.shows("id:cf-checkbox-control")).toBe(true);
    expect(selected.shows("id:cf-checkbox-indicator")).toBe(true);

    await selected.press("id:cf-checkbox");
    await selected.waitUntil(() => callsOf(selected, "onSelectedChange").length === 1);
    expect(callsOf(selected, "onSelectedChange")).toEqual([[false]]);
    expect(callsOf(selected, "onChange")).toHaveLength(0);
  }, 120_000);

  // M-007 (基线): under the default environment the existing cases behave
  // exactly as the desktop contract — selection markers, indeterminate,
  // disabled, read-only, invalid and validation, through the same probes the
  // desktop suite pins (the remaining cases — readonly-uncontrolled,
  // valid-error, required, group-disabled/invalid — regress through the
  // existing heroui suite this row samples). The Content row keeps its
  // content height (no layout floor assertion) and the hover path is
  // unchanged. Kept to one open per listed case: a dozen sequential web
  // hosts in one test exhausts the target.
  test("M-007 baseline: default environment keeps the desktop contract", async () => {
    const log = await openCase("log", { testInput: "pointer" });
    expect(log.shows("text:Unchecked")).toBe(true);
    await log.press("role:checkbox[Accept terms]");
    expect(log.shows("text:Checked")).toBe(true);
    expect(callsOf(log, "onChange")).toEqual([[true]]);

    const defaultSelected = await openCase("default-selected", { testInput: "pointer" });
    expect(defaultSelected.shows("text:Checked")).toBe(true);

    const indeterminate = await openCase("indeterminate-toggle", { testInput: "pointer" });
    expect(indeterminate.shows("text:Mixed")).toBe(true);
    await indeterminate.press("id:clear-indeterminate");
    expect(indeterminate.shows("text:NoMixed")).toBe(true);

    const disabled = await openCase("disabled", { testInput: "pointer" });
    expect(disabled.enabled("role:checkbox[Accept terms]")).toBe(false);
    await expect(disabled.press("role:checkbox[Accept terms]")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(disabled, "onChange")).toHaveLength(0);

    const readonly = await openCase("readonly", { testInput: "pointer" });
    await readonly.press("role:checkbox[Accept terms]");
    expect(readonly.shows("text:Checked")).toBe(true);
    expect(callsOf(readonly, "onChange")).toHaveLength(0);

    const invalid = await openCase("invalid", { testInput: "pointer" });
    expect(invalid.shows("text:ErrorMessage")).toBe(true);

    const aria = await openCase("validation-aria", { testInput: "pointer" });
    expect(aria.shows("text:Subscribe to continue")).toBe(true);

    const native = await openCase("validation-native", { testInput: "pointer" });
    expect(native.shows("text:Subscribe to continue")).toBe(false);
    await native.press("role:checkbox[Accept terms]");
    expect(native.shows("text:Subscribe to continue")).toBe(false);
    await native.press("role:checkbox[Accept terms]");
    expect(native.shows("text:Subscribe to continue")).toBe(true);

    // The hover tail (the desktop half still raises rawHover and the gated
    // effect) lives in `checkbox.mobile.headless.test.tsx` — `app.hover`
    // needs a mouse.
  }, 120_000);

  // M-008 (基线): the group path on both sides — one item press fires the
  // group's `onChange` exactly once with the value's addition, and pressing
  // a selected item removes it; the per-item `onChange` still reports the
  // item's own next value. (`slot="selection"` table checkboxes regress
  // through the existing table assertion files — sheet §4's note.)
  test("M-008 baseline: group items commit once per press in both environments", async () => {
    for (const params of [{ testInput: "pointer" }, { testInput: "touch" }] as Params[]) {
      const app = await openCase("group-log", params);
      await app.press("role:checkbox[Coding]");
      await app.waitUntil(() => callsOf(app, "groupChange").length === 1);
      expect(callsOf(app, "groupChange")).toEqual([[["coding"]]]);
      expect(callsOf(app, "codingChange")).toEqual([[true]]);
      expect(callsOf(app, "designChange")).toHaveLength(0);

      // The removal half: a second item adds, then re-pressing the first
      // takes its value back out — one `groupChange` per press, payload is
      // the whole next selection each time.
      await app.press("role:checkbox[Design]");
      await app.waitUntil(() => callsOf(app, "groupChange").length === 2);
      expect(callsOf(app, "groupChange")).toEqual([
        [["coding"]],
        [["coding", "design"]],
      ]);

      await app.press("role:checkbox[Coding]");
      await app.waitUntil(() => callsOf(app, "groupChange").length === 3);
      expect(callsOf(app, "groupChange")).toEqual([
        [["coding"]],
        [["coding", "design"]],
        [["design"]],
      ]);
      expect(callsOf(app, "codingChange")).toEqual([[true], [false]]);
    }
  }, 120_000);

  // M-010 (A-006): this file is the assertion carrier — it collects under
  // the `.mobile.test.tsx` naming layer and every row above drives the
  // fixture through `open("../../../checkbox.fixtures.tsx")` +
  // `host.params` (`case`/`scope`/`box`/`tall`/`selected`), never class
  // names or computed style. This smoke row proves the whole probe surface
  // — `env`, `events`, `layout`, `onChange` — records on both scopes, so a
  // silent fixture regression cannot pass the other rows vacuously.
  test("M-010 fixture entry: every probe records through open + host.params on both scopes", async () => {
    for (const params of [{ testInput: "pointer" }, { testInput: "touch" }] as Params[]) {
      const app = await openCase("row", params);

      expect(app.shows("id:cb-row")).toBe(true);

      await app.press("id:cb-row");
      await app.waitUntil(() => callsOf(app, "onChange").length === 1);

      expect(kinds(app)).toContain("press");
      expect(kinds(app)).toContain("toggle");
      expect(kinds(app)).toContain("click");
      expect(callsOf(app, "layout").length).toBeGreaterThan(0);
      expect(envs(app).length).toBeGreaterThan(0);
      expect(lastEnv(app).input).toBe(params.testInput === "touch" ? "touch" : "pointer");
    }
  }, 120_000);
});
