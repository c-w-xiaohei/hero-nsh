import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the ListBox adapt unit (B(项) + F), one test per
 * row of adapt-sheets/list-box.md §4 that the shared targets (headless +
 * web) can observe: M-001 … M-009 and M-011. The host-derivation half
 * (`open({platform:"ios"})`) and the `app.drag` press-cancel (M-010) live
 * in `list-box.mobile.headless.test.tsx` — web has neither capability.
 *
 * The fixture is `harness/list-box.fixtures.tsx`, opened by `host.params`:
 * `case` (`b-item` carries every seam probe, `b-action` the
 * `selectionMode="none"` baseline, the existing cases the parity rows),
 * `scope` ("" = the host default pointer environment — desktop parity — or
 * "touch" through `EnvironmentScope`), `density` ("compact"), `narrow`,
 * `disabled`, `hover`, `overlay`.
 *
 * The `platform: "windows"` pin is load-bearing: without it `pnpm test`
 * lands the app on the phone-sized engine where `input` defaults to touch
 * and every pointer-default assertion inverts under the suite (the
 * _common.md convention, switch M-001/3/4's precedent).
 *
 * Every assertion reads what `nsh/test` can observe — `shows`, `enabled`,
 * `count`, `texts`, `onLayout` bounds and the `@scenario/probe` calls in
 * `app.storage()`: `events`, `selectionChange`, `onAction`, `hover`,
 * `layout`, `ctx-pressed` ({seam}), `ctx-state`, `ctx-env`, `ctx-channels`.
 * `hitSlop` the view prop has no read channel: M-003 asserts the seam's
 * computed `hitSlop` accessor (sheet §6, the registered degradation).
 */

function openListBox(
  caseName: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../list-box.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

const ROW_ALPHA = "role:option[Alpha]";
const ROW_BRAVO = "role:option[Bravo]";

type Edges = { top: number; right: number; bottom: number; left: number };
type Point = { x: number; y: number };

type CtxState = {
  seamPressed: boolean;
  pressed: number;
  scale: number;
  origin: Point | null;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  enabled: boolean;
  allDisabled: boolean;
};

type CtxChannels = {
  seamPressed: boolean;
  pressed: number;
  scale: number;
  origin: Point | null;
  hitSlop: Edges | null;
  enabled: boolean;
};

type CtxEnv = { enabled: boolean; hitSlop: Edges | null };
type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function lastOf<T>(app: App, name: string): T {
  const recorded = callsOf(app, name);
  return recorded[recorded.length - 1][0] as T;
}

/** The `events` probe's string payloads, in order: "down"/"up"/"press". */
function eventArgs(app: App): string[] {
  return callsOf(app, "events").map((c) => c[0] as string);
}

/** The seam's `isPressed` edges as the `ctx-pressed` probe recorded them. */
function seamEdges(app: App): boolean[] {
  return callsOf(app, "ctx-pressed").map(
    (c) => (c[0] as { seam: boolean }).seam,
  );
}

function layouts(app: App, name: string): LayoutEntry[] {
  return callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((l) => l.name === name);
}

function lastLayout(app: App, name: string): LayoutEntry {
  const list = layouts(app, name);
  return list[list.length - 1];
}

/** Every recorded `ctx-state` sample sits at the seam's rest values. */
function expectStatesAtRest(app: App): void {
  for (const call of callsOf(app, "ctx-state")) {
    const s = call[0] as CtxState;
    expect(s.seamPressed).toBe(false);
    expect(s.pressed).toBeLessThan(0.5);
    expect(s.scale).toBe(1);
    expect(s.origin).toBeNull();
    expect(s.hitSlop).toBeNull();
  }
}

describe("list-box mobile", () => {
  // adapt-sheets/list-box.md M-001 (A-002, A-003, A-004, 负断言): under the
  // default pointer environment the touch-gated seam is a physical no-op —
  // `ctx-pressed` only ever records the mount edges, every `ctx-state`
  // sample and the on-demand `ctx-channels` read show the channels at rest,
  // `enabled` stays false — while the press contract works unchanged:
  // down/up/press and one `selectionChange`.
  test("M-001 default environment: seam channels stay inert while selection works", async () => {
    const app = await openListBox("b-item");

    await app.press(ROW_ALPHA);
    await app.waitUntil(() => callsOf(app, "selectionChange").length === 1);
    expect(callsOf(app, "selectionChange")).toEqual([[["1"]]]);
    expect(eventArgs(app)).toEqual(["down", "up", "press"]);

    // The seam's flag never rose: the only edges are the mount-time falses.
    expect(seamEdges(app).every((e) => e === false)).toBe(true);

    // The mount-edge samples (+600 ms / +1500 ms) are the only ctx-state
    // reads a gated press ever schedules — all at rest, gate closed.
    await app.waitUntil(() => callsOf(app, "ctx-state").length >= 2);
    expectStatesAtRest(app);
    for (const call of callsOf(app, "ctx-state")) {
      expect((call[0] as CtxState).enabled).toBe(false);
    }

    // The on-demand read, for a fresh post-press sample.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.pressed).toBeLessThan(0.5);
    expect(channels.scale).toBe(1);
    expect(channels.origin).toBeNull();
    expect(channels.hitSlop).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/list-box.md M-002 (A-001): the `input` axis's `min-h-11`
  // gives the touch row its 44 pt minimum; the pointer row keeps its
  // content height (only a positive measure is asserted — desktop zero
  // drift is the `min-h-9` baseline, no new bound).
  test("M-002 injected touch: row measures at least 44pt; pointer keeps content height", async () => {
    const touch = await openListBox("b-item", { scope: "touch" });
    await touch.waitUntil(() => layouts(touch, "row-1").length > 0);
    expect(lastLayout(touch, "row-1").height).toBeGreaterThanOrEqual(44);

    const pointer = await openListBox("b-item");
    await pointer.waitUntil(() => layouts(pointer, "row-1").length > 0);
    expect(lastLayout(pointer, "row-1").height).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/list-box.md M-003 (A-002, A-003): under injected touch a
  // press selects exactly once in contract order (down → up → press, one
  // `selectionChange`) while the seam's `isPressed` completes the
  // true → false roundtrip. The 24 pt `narrow` row is under the 44 pt
  // floor, so the seam computes a non-empty hitSlop on every side; the
  // full-width row already meets the target and reports none.
  test("M-003 injected touch: seam roundtrips once per selection; narrow row reports hitSlop", async () => {
    const app = await openListBox("b-item", { scope: "touch" });

    await app.press(ROW_ALPHA);
    await app.waitUntil(() => callsOf(app, "selectionChange").length === 1);
    expect(callsOf(app, "selectionChange")).toEqual([[["1"]]]);
    expect(eventArgs(app)).toEqual(["down", "up", "press"]);

    // The seam edge roundtrip: engaged on the way down, reset on release.
    await app.waitUntil(() => seamEdges(app).at(-1) === false);
    const edges = seamEdges(app);
    expect(edges).toContain(true);
    expect(edges.at(-1)).toBe(false);

    // The default-width row meets the 44 pt target: every computed
    // hitSlop stays at rest (undefined → null in the payload).
    await app.waitUntil(() => callsOf(app, "ctx-state").length >= 2);
    for (const call of callsOf(app, "ctx-state")) {
      expect((call[0] as CtxState).hitSlop).toBeNull();
    }

    const narrow = await openListBox("b-item", {
      scope: "touch",
      narrow: "1",
    });
    // The first ctx-env report can precede layout (bounds 0×0 → no slop);
    // wait for the report the row's onLayout retriggers.
    await narrow.waitUntil(() => {
      const env = callsOf(narrow, "ctx-env").at(-1)?.[0] as
        | CtxEnv
        | undefined;
      return env !== undefined && env.hitSlop !== null;
    });
    const env = lastOf<CtxEnv>(narrow, "ctx-env");
    expect(env.enabled).toBe(true);
    const slop = env.hitSlop!;
    for (const side of [slop.top, slop.right, slop.bottom, slop.left]) {
      expect(side).toBeGreaterThanOrEqual(0);
    }
    // A 24 pt wide row is under the target: the horizontal sides pad.
    expect(Math.max(slop.left, slop.right)).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/list-box.md M-004 (A-002): `isDisabled` reports
  // `accessibilityState.disabled`, so the harness refuses the press and the
  // seam's inline `isDisabled` gate reports closed — no `selectionChange`,
  // no `onAction`, every channel at rest, in both environments.
  test("M-004 injected touch + isDisabled: gate closed, press refused; pointer half the same", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openListBox(
        "b-item",
        scope ? { scope, disabled: "1" } : { disabled: "1" },
      );

      expect(app.enabled(ROW_ALPHA)).toBe(false);
      await expect(app.press(ROW_ALPHA)).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(app, "selectionChange")).toHaveLength(0);
      expect(callsOf(app, "onAction")).toHaveLength(0);
      expect(eventArgs(app)).toHaveLength(0);
      expect(seamEdges(app).every((e) => e === false)).toBe(true);

      await app.waitUntil(() => callsOf(app, "ctx-state").length >= 2);
      expectStatesAtRest(app);
      for (const call of callsOf(app, "ctx-state")) {
        expect((call[0] as CtxState).enabled).toBe(false);
      }
      expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(false);
    }
  }, 120_000);

  // adapt-sheets/list-box.md M-005 (A-005): under injected touch the hover
  // writes stay off — `app.hover` records neither `onHoverStart`/
  // `onHoverEnd`/`onHoverChange` nor the render-prop `hov` marker (web's
  // sticky hover cannot pin it), and a following press still selects. The
  // host's `onMouseEnter`/`onMouseLeave` callbacks pass through in both
  // environments; the pointer half keeps the full hover roundtrip.
  test("M-005 injected touch suppresses hover state; pointer keeps the roundtrip", async () => {
    const touch = await openListBox("b-item", {
      scope: "touch",
      hover: "1",
    });
    await touch.hover(ROW_ALPHA);
    await touch.wait(300);
    expect(callsOf(touch, "hover").some((c) => c[0] === "start")).toBe(false);
    expect(
      callsOf(touch, "hover").some(
        (c) => (c[0] as { kind?: string }).kind === "change",
      ),
    ).toBe(false);
    expect(touch.texts().some((t) => t.includes("hov"))).toBe(false);
    // The host callbacks themselves are not gated.
    expect(callsOf(touch, "hover").some((c) => c[0] === "enter")).toBe(true);

    // A press after the synthetic hover still selects — no sticky state.
    await touch.press(ROW_ALPHA);
    await touch.waitUntil(() => callsOf(touch, "selectionChange").length === 1);
    expect(touch.texts().some((t) => t.includes("hov"))).toBe(false);

    const pointer = await openListBox("b-item", { hover: "1" });
    await pointer.hover(ROW_ALPHA);
    await pointer.waitUntil(() =>
      callsOf(pointer, "hover").some((c) => c[0] === "start"),
    );
    expect(callsOf(pointer, "hover")).toContainEqual(["enter"]);
    expect(
      callsOf(pointer, "hover").some(
        (c) =>
          (c[0] as { kind?: string; value?: boolean }).kind === "change" &&
          (c[0] as { value?: boolean }).value === true,
      ),
    ).toBe(true);
    await pointer.waitUntil(() =>
      pointer.texts().some((t) => t.includes("hov")),
    );

    // Leaving restores the rest state.
    await pointer.hover("id:ctx-sample");
    await pointer.waitUntil(() =>
      callsOf(pointer, "hover").some((c) => c[0] === "end"),
    );
    expect(callsOf(pointer, "hover")).toContainEqual(["leave"]);
    expect(
      callsOf(pointer, "hover").some(
        (c) =>
          (c[0] as { kind?: string; value?: boolean }).kind === "change" &&
          (c[0] as { value?: boolean }).value === false,
      ),
    ).toBe(true);
    await pointer.waitUntil(
      () => !pointer.texts().some((t) => t.includes("hov")),
    );
  }, 120_000);

  // adapt-sheets/list-box.md M-006 (A-004): the row's children resolve
  // inside `PressableFeedbackContext.Provider` — `ctx-env.enabled` follows
  // the scope, `hitSlop`/`bounds` accessors read real values, and a
  // caller-composed `<PressableFeedback.Highlight/>` mounts while the
  // default case mounts none.
  test("M-006 PressableFeedbackContext provider chain: gate follows scope, accessors read, overlay composes", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openListBox("b-item", scope ? { scope } : {});
      await app.waitUntil(() => callsOf(app, "ctx-env").length > 0);
      expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(scope === "touch");

      // Post-layout samples carry the seam's measured bounds; hitSlop is
      // readable (null at full size — M-003 owns its values).
      await app.waitUntil(() => callsOf(app, "ctx-state").length >= 2);
      const s = lastOf<CtxState>(app, "ctx-state");
      expect(s.bounds.width).toBeGreaterThan(0);
      expect(s.bounds.height).toBeGreaterThan(0);
      expect(s.hitSlop === null || typeof s.hitSlop === "object").toBe(true);
    }

    const overlaid = await openListBox("b-item", {
      scope: "touch",
      overlay: "highlight",
    });
    expect(overlaid.count("id:overlay")).toBe(3);

    const plain = await openListBox("b-item", { scope: "touch" });
    expect(plain.count("id:overlay")).toBe(0);
  }, 120_000);

  // adapt-sheets/list-box.md M-007 (A-001): `density="compact"` tightens
  // the container and row literals one step — the root's `p`/`space-y`
  // (read through the root's height and the second row's y) and the row's
  // `px` (read through the padprobe child's origin). The uninjected
  // environment resolves `default`, identical to the explicit preset.
  test("M-007 density compact tightens root padding/spacing and row padding", async () => {
    const compact = await openListBox("b-item", { density: "compact" });
    const bare = await openListBox("b-item");

    await compact.waitUntil(() => layouts(compact, "row-2").length > 0);
    await bare.waitUntil(() => layouts(bare, "row-2").length > 0);

    // `p-1 space-y-1` → `p-0.5 space-y-0.5`: the list is shorter and the
    // second row starts higher.
    expect(lastLayout(compact, "root").height).toBeLessThan(
      lastLayout(bare, "root").height,
    );
    expect(lastLayout(compact, "row-2").y).toBeLessThan(
      lastLayout(bare, "row-2").y,
    );

    // `px-2` → `px-1.5` on the row: its content child starts at 6 pt, not 8.
    await compact.waitUntil(() => layouts(compact, "pad-1").length > 0);
    await bare.waitUntil(() => layouts(bare, "pad-1").length > 0);
    const compactPad = lastLayout(compact, "pad-1");
    const barePad = lastLayout(bare, "pad-1");
    expect(compactPad.x).toBeLessThan(barePad.x);
    expect(compactPad.x).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/list-box.md M-008 (基线): the default environment is the
  // desktop-parity half — the `log` case's selection payload, the
  // `disabled` case's refusal and `section-action`'s `none`+`onAction`
  // contract answer exactly what `list-box.heroui.test.tsx` pins.
  test("M-008 default environment: selection, disabled refusal and none-mode onAction baselines", async () => {
    const log = await openListBox("log");
    await log.press("role:option[One]");
    await log.waitUntil(() => callsOf(log, "selectionChange").length === 1);
    expect(callsOf(log, "selectionChange")).toEqual([[["1"]]]);

    await log.press("role:option[Two]");
    await log.waitUntil(() => callsOf(log, "selectionChange").length === 2);
    expect(callsOf(log, "selectionChange")[1]).toEqual([["2"]]);

    const disabled = await openListBox("disabled");
    expect(disabled.enabled("role:option[Two]")).toBe(false);
    await expect(disabled.press("role:option[Two]")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(disabled, "selectionChange")).toHaveLength(0);

    // `selectionMode="none"`: activation reports `onAction`, never a
    // selection (the `section-action` case the heroui suite pins).
    const action = await openListBox("b-action");
    await action.press(ROW_ALPHA);
    await action.waitUntil(() => callsOf(action, "onAction").length === 1);
    expect(callsOf(action, "onAction")).toEqual([["1"]]);
    expect(callsOf(action, "selectionChange")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/list-box.md M-009 (基线对偶): under `scope="touch"` the
  // same baseline cases read identically — selection, disabled refusal,
  // typeahead-free section activation and the `none`-mode action are
  // environment-independent semantics.
  test("M-009 injected touch: baseline cases read identically", async () => {
    const log = await openListBox("log", { scope: "touch" });
    await log.press("role:option[One]");
    await log.waitUntil(() => callsOf(log, "selectionChange").length === 1);
    expect(callsOf(log, "selectionChange")).toEqual([[["1"]]]);

    await log.press("role:option[Two]");
    await log.waitUntil(() => callsOf(log, "selectionChange").length === 2);
    expect(callsOf(log, "selectionChange")[1]).toEqual([["2"]]);

    const disabled = await openListBox("disabled", { scope: "touch" });
    expect(disabled.enabled("role:option[Two]")).toBe(false);
    await expect(disabled.press("role:option[Two]")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(disabled, "selectionChange")).toHaveLength(0);

    // The `none` mode under touch still acts, never selects.
    const action = await openListBox("b-action", { scope: "touch" });
    await action.press(ROW_ALPHA);
    await action.waitUntil(() => callsOf(action, "onAction").length === 1);
    expect(callsOf(action, "onAction")).toEqual([["1"]]);
    expect(callsOf(action, "selectionChange")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/list-box.md M-011 (A-008, A-009): the fixture itself is
  // the assertion carrier — `b-item` mounts in both environments plus the
  // density preset, and every probe records.
  test("M-011 the fixture mounts in every environment and every probe records", async () => {
    for (const params of [
      {},
      { scope: "touch" },
      { density: "compact" },
    ] as Record<string, string>[]) {
      const app = await openListBox("b-item", params);
      expect(app.shows(ROW_ALPHA)).toBe(true);
      expect(app.shows("id:ctx-sample")).toBe(true);

      await app.waitUntil(() => callsOf(app, "ctx-env").length > 0);
      expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(
        params.scope === "touch",
      );

      await app.press(ROW_ALPHA);
      await app.waitUntil(() => callsOf(app, "selectionChange").length === 1);
      expect(eventArgs(app)).toEqual(["down", "up", "press"]);

      await app.waitUntil(() => callsOf(app, "ctx-state").length >= 2);
      expect(layouts(app, "row-1").length).toBeGreaterThan(0);
      expect(layouts(app, "pad-1").length).toBeGreaterThan(0);

      await app.press("id:ctx-sample");
      await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    }
  }, 120_000);
});
