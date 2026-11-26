import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Web-target mobile assertions for Disclosure (adapt unit, action B): the
 * same M-001…M-008/M-010 assertion set as the headless file, minus the rows
 * that need headless-only steps — `open({platform:"ios"})` host derivation
 * and `app.drag` cancellation (M-009, covered in
 * `disclosure.mobile.headless.test.tsx`), and the held-press `ctx-state`
 * samples inside M-002, which need `dragAndHold`/`drop` (headless only).
 * `platform:"web"` plays the pointer host; `EnvironmentScope input="touch"`
 * supplies the injected touch environment, so the dual-environment
 * assertions run identically here.
 *
 * The held half of M-002 degrades to what the web host can observe: the
 * seam's `ctx-pressed` edge records still prove the true→false roundtrip,
 * and the post-press `ctx-state`/`ctx-channels` reads prove the channels
 * settled — a mid-hold `pressed`/`origin` read has no web step that keeps a
 * press down (`app.longPress` holds the 500 ms default, shorter than the
 * probe's +600 ms sample; `Disclosure.Trigger` does not forward
 * `delayLongPress`). Registered here rather than faked.
 *
 * Probe payloads match the headless file: `events`, `onExpandedChange`,
 * `layout`, `ctx-pressed` ({seam}), `ctx-state`, `ctx-env`, `ctx-channels`.
 */

type Params = Record<string, string>;

function openDisclosure(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../disclosure.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

const BODY = "Hidden content revealed on expand.";
const TRIGGER = "role:button[Toggle content]";
const TRIGGER_PREVIEW = "role:button[Preview]";
const TRIGGER_DOWNLOAD = "role:button[Download]";
const PREVIEW_CONTENT = "text:Preview content";
const DOWNLOAD_CONTENT = "text:Download content";

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
type LayoutProbe = { name: string; width: number; height: number };

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

/**
 * The contract stream with only the toggle/report calls left: `ctx.toggle()`
 * reports `onExpandedChange` before the caller's `onPress` runs (sheet §1),
 * so a clean press reads down, up, expanded, press.
 */
function contractSequence(app: App): string[] {
  return calls(app)
    .filter((c) => c.name === "events" || c.name === "onExpandedChange")
    .map((c) =>
      c.name === "events" ? `events:${c.args[0] as string}` : "expanded",
    );
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

/** Every recorded `ctx-state` sample's hitSlop sits at the rest value. */
function expectHitSlopAtRest(app: App): void {
  for (const call of callsOf(app, "ctx-state")) {
    expect((call[0] as CtxState).hitSlop).toBeNull();
  }
}

describe("disclosure mobile (web)", () => {
  // adapt-sheets/disclosure.md M-001 (A-002, A-003, A-004, 负断言): under the
  // default pointer environment the touch-gated seam is a physical no-op —
  // `ctx-pressed` only ever records the mount edge, every `ctx-state` sample
  // and the on-demand `ctx-channels` read show the channels at rest — while
  // the press contract works unchanged: down/up/press, one expand, one
  // `onExpandedChange`.
  test("M-001 default environment: seam channels stay inert while the press contract holds", async () => {
    const app = await openDisclosure("mobile");

    await app.press("id:trigger");
    await app.waitUntil(() => callsOf(app, "onExpandedChange").length === 1);

    expect(eventArgs(app)).toEqual(["down", "up", "press"]);
    expect(callsOf(app, "onExpandedChange")).toEqual([[true]]);
    expect(app.shows(`text:${BODY}`)).toBe(true);

    // The seam's flag never rose: the only edge is the mount-time false.
    expect(seamEdges(app).every((e) => e === false)).toBe(true);

    // The mount-edge samples (+600 ms / +1500 ms) are the only ctx-state
    // reads a gated press ever schedules — all must sit at rest, gate closed.
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
    expect(channels.origin).toBeNull();
    expect(channels.hitSlop).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/disclosure.md M-002 (A-002): under an injected touch
  // environment a press engages the seam — `ctx-pressed` records the
  // true→false roundtrip — and the commit still happens exactly once, in
  // contract order. The held `ctx-state` samples that prove the settled
  // channels mid-hold need `dragAndHold`, which only the headless engine
  // runs; on web the post-press samples and the on-demand `ctx-channels`
  // read carry the settle half (see file header).
  test("M-002 injected touch: press roundtrips the seam and expands exactly once", async () => {
    const app = await openDisclosure("mobile", { scope: "touch" });

    await app.press("id:trigger");
    await app.waitUntil(() => callsOf(app, "onExpandedChange").length === 1);

    // The panel flips once: expand reported exactly once, body shows.
    expect(app.shows(`text:${BODY}`)).toBe(true);
    expect(callsOf(app, "onExpandedChange")).toEqual([[true]]);
    expect(eventArgs(app)).toEqual(["down", "up", "press"]);
    // `ctx.toggle()` reports before the caller's `onPress` (sheet §1).
    expect(contractSequence(app)).toEqual([
      "events:down",
      "events:up",
      "expanded",
      "events:press",
    ]);

    // The seam's edge roundtrip: engaged on the way down, reset on release.
    await app.waitUntil(() => seamEdges(app).at(-1) === false);
    const edges = seamEdges(app);
    expect(edges).toContain(true);
    expect(edges.at(-1)).toBe(false);

    // Every ctx-state sample after the press reads the settled seam: the
    // edge-scheduled reads (+600/+1500 ms) all land after the release, so
    // the flag is down and the channels are back at rest — with the gate
    // still reporting open under touch.
    await app.waitUntil(() => callsOf(app, "ctx-state").length >= 4);
    const settled = lastOf<CtxState>(app, "ctx-state");
    expect(settled.seamPressed).toBe(false);
    expect(settled.pressed).toBeLessThan(0.5);
    expect(settled.origin).toBeNull();
    expect(settled.enabled).toBe(true);

    // The on-demand read confirms the same post-press rest.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.pressed).toBeLessThan(0.5);
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(true);
  }, 120_000);

  // adapt-sheets/disclosure.md M-003 (A-001): the `input` axis's `min-h-11`
  // gives the touch trigger its 44 pt minimum; under pointer the same case
  // keeps its content height (no lower bound asserted — desktop zero drift).
  test("M-003 injected touch: trigger measures at least 44pt; pointer keeps content height", async () => {
    const touch = await openDisclosure("mobile", { scope: "touch" });
    await touch.waitUntil(() => callsOf(touch, "layout").length > 0);
    const touchLayout = lastOf<LayoutProbe>(touch, "layout");
    expect(touchLayout.name).toBe("trigger");
    expect(touchLayout.height).toBeGreaterThanOrEqual(44);

    const pointer = await openDisclosure("mobile");
    await pointer.waitUntil(() => callsOf(pointer, "layout").length > 0);
    const pointerLayout = lastOf<LayoutProbe>(pointer, "layout");
    expect(pointerLayout.height).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/disclosure.md M-004 (A-003): on a 24×24 trigger the seam's
  // hitSlop pads the under-target sides toward 44 pt; a default-size trigger
  // already reaches the target, so the accessor stays undefined (null in the
  // probe payload).
  test("M-004 compact trigger reports computed hitSlop; default size reports none", async () => {
    const compact = await openDisclosure("mobile", {
      scope: "touch",
      compact: "1",
    });
    // The first ctx-env report precedes layout (bounds 0×0 → no slop); wait
    // for the report the trigger's onLayout retriggers.
    await compact.waitUntil(() => {
      const env = callsOf(compact, "ctx-env").at(-1)?.[0] as
        | CtxEnv
        | undefined;
      return env !== undefined && env.hitSlop !== null;
    });
    const env = lastOf<CtxEnv>(compact, "ctx-env");
    expect(env.enabled).toBe(true);
    const slop = env.hitSlop!;
    for (const side of [slop.top, slop.right, slop.bottom, slop.left]) {
      expect(side).toBeGreaterThanOrEqual(0);
    }
    // A 24 pt wide trigger is under the target: at least one side pads.
    expect(
      Math.max(slop.top, slop.right, slop.bottom, slop.left),
    ).toBeGreaterThan(0);

    // The same value reaches the timed ctx-state samples.
    await compact.waitUntil(() =>
      callsOf(compact, "ctx-state").some(
        (c) => (c[0] as CtxState).hitSlop !== null,
      ),
    );
    for (const call of callsOf(compact, "ctx-state")) {
      const s = call[0] as CtxState;
      if (s.hitSlop !== null) {
        expect(s.hitSlop.top).toBeGreaterThanOrEqual(0);
        expect(s.hitSlop.right).toBeGreaterThanOrEqual(0);
        expect(s.hitSlop.bottom).toBeGreaterThanOrEqual(0);
        expect(s.hitSlop.left).toBeGreaterThanOrEqual(0);
      }
    }

    const plain = await openDisclosure("mobile", { scope: "touch" });
    // The timed samples are the post-layout read: a full-size trigger never
    // computes a slop, so every sample's hitSlop stays null. (ctx-env only
    // re-reports when the computed value changes — undefined→undefined is
    // not a change — so the sample stream is the reliable carrier here.)
    await plain.waitUntil(() => callsOf(plain, "ctx-state").length >= 2);
    expectHitSlopAtRest(plain);
  }, 120_000);

  // adapt-sheets/disclosure.md M-005 (A-002): `isDisabled` and `isPending`
  // both report `accessibilityState.disabled`, so the harness refuses the
  // press for each — and the seam's inline `isBlocked()` gate reports closed
  // under touch regardless: no events, no toggle, every channel at rest. The
  // pointer half asserts the same rest.
  test("M-005 isDisabled and isPending block the seam and the toggle in both environments", async () => {
    for (const scope of ["", "touch"] as const) {
      for (const flag of ["disabled", "pending"] as const) {
        const app = await openDisclosure(
          "mobile",
          scope ? { scope, [flag]: "1" } : { [flag]: "1" },
        );

        // Both flags report `accessibilityState.disabled` (pending included,
        // disclosure-trigger.tsx:450), so the harness refuses the press the
        // same way for each — the isBlocked() early-outs are the second wall.
        expect(app.enabled("id:trigger")).toBe(false);
        await expect(app.press("id:trigger")).rejects.toMatchObject({
          code: "ERR_NSH_TEST_DISABLED",
        });

        expect(eventArgs(app)).toHaveLength(0);
        expect(callsOf(app, "onExpandedChange")).toHaveLength(0);
        expect(app.shows(`text:${BODY}`)).toBe(false);
        expect(seamEdges(app).every((e) => e === false)).toBe(true);
        expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(false);

        await app.waitUntil(() => callsOf(app, "ctx-state").length >= 2);
        expectStatesAtRest(app);
        for (const call of callsOf(app, "ctx-state")) {
          expect((call[0] as CtxState).enabled).toBe(false);
        }
      }
    }
  }, 120_000);

  // adapt-sheets/disclosure.md M-006 (A-004): the trigger's children resolve
  // inside `PressableFeedbackContext.Provider` — `ctx-env.enabled` follows
  // the scope, the `bounds`/`hitSlop` accessors report real layout values,
  // and a caller-composed `<PressableFeedback.Highlight/>` mounts while the
  // default case mounts none.
  test("M-006 PressableFeedbackContext provider chain: gate follows scope, accessors read, overlay composes", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openDisclosure("mobile", scope ? { scope } : {});
      expect(app.shows("id:trigger")).toBe(true);
      await app.waitUntil(() => callsOf(app, "ctx-env").length > 0);
      expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(scope === "touch");

      // Post-layout samples carry the seam's measured bounds; hitSlop is
      // readable (null at full size — M-004 owns its values).
      await app.waitUntil(() => callsOf(app, "ctx-state").length >= 2);
      const s = lastOf<CtxState>(app, "ctx-state");
      expect(s.bounds.width).toBeGreaterThan(0);
      expect(s.bounds.height).toBeGreaterThan(0);
      expect(s.hitSlop === null || typeof s.hitSlop === "object").toBe(true);
    }

    const overlaid = await openDisclosure("mobile", {
      scope: "touch",
      overlay: "highlight",
    });
    expect(overlaid.shows("id:overlay")).toBe(true);

    const plain = await openDisclosure("mobile", { scope: "touch" });
    expect(plain.count("id:overlay")).toBe(0);
  }, 120_000);

  // adapt-sheets/disclosure.md M-007 (A-005): the expansion strategy is
  // unchanged — under `scope="touch"` the existing cases answer exactly what
  // the desktop assertions pin: controlled lock, uncontrolled flip, group
  // single/multiple sets, controlled group reporting, single-mode collapse.
  test("M-007 expansion strategy identical under touch: controlled, default, group single/multiple/controlled", async () => {
    // Controlled lock: the press reports the request, the panel stays shut.
    const controlled = await openDisclosure("controlled", { scope: "touch" });
    await controlled.press(TRIGGER);
    await controlled.waitUntil(
      () => callsOf(controlled, "onExpandedChange").length === 1,
    );
    expect(callsOf(controlled, "onExpandedChange")).toEqual([[true]]);
    expect(callsOf(controlled, "press")).toEqual([["trigger"]]);
    expect(controlled.shows(`text:${BODY}`)).toBe(false);

    // Uncontrolled defaultExpanded: the press closes and reports false.
    const expanded = await openDisclosure("default-expanded", {
      scope: "touch",
    });
    expect(expanded.shows(`text:${BODY}`)).toBe(true);
    await expanded.press(TRIGGER);
    await expanded.waitUntil(
      () => callsOf(expanded, "onExpandedChange").length === 1,
    );
    expect(callsOf(expanded, "onExpandedChange")).toEqual([[false]]);
    expect(expanded.shows(`text:${BODY}`)).toBe(false);

    // Group single mode: Preview opens, Download replaces it.
    const group = await openDisclosure("group", { scope: "touch" });
    await group.press(TRIGGER_PREVIEW);
    expect(group.shows(PREVIEW_CONTENT)).toBe(true);
    await group.press(TRIGGER_DOWNLOAD);
    expect(group.shows(DOWNLOAD_CONTENT)).toBe(true);
    expect(group.shows(PREVIEW_CONTENT)).toBe(false);
    expect(callsOf(group, "onExpandedChange")).toEqual([
      ["preview"],
      ["download"],
    ]);

    // Group multiple: both stay open and the set accumulates in order.
    const multiple = await openDisclosure("group-multiple", { scope: "touch" });
    await multiple.press(TRIGGER_PREVIEW);
    await multiple.press(TRIGGER_DOWNLOAD);
    expect(multiple.shows(PREVIEW_CONTENT)).toBe(true);
    expect(multiple.shows(DOWNLOAD_CONTENT)).toBe(true);
    expect(callsOf(multiple, "onExpandedChange")).toEqual([
      ["preview"],
      ["preview", "download"],
    ]);

    // Controlled group: the requested set is reported, the held set stays.
    const groupControlled = await openDisclosure("group-controlled", {
      scope: "touch",
    });
    expect(groupControlled.shows(PREVIEW_CONTENT)).toBe(true);
    await groupControlled.press(TRIGGER_DOWNLOAD);
    await groupControlled.waitUntil(
      () => callsOf(groupControlled, "onExpandedChange").length === 1,
    );
    expect(callsOf(groupControlled, "onExpandedChange")).toEqual([["download"]]);
    expect(groupControlled.shows(PREVIEW_CONTENT)).toBe(true);
    expect(groupControlled.shows(DOWNLOAD_CONTENT)).toBe(false);

    // Single mode collapses two defaults to the first key (X-002 semantics).
    const collapse = await openDisclosure("group-single-two-defaults", {
      scope: "touch",
    });
    await collapse.wait(20);
    expect(collapse.shows(PREVIEW_CONTENT)).toBe(true);
    expect(collapse.shows(DOWNLOAD_CONTENT)).toBe(false);
    expect(callsOf(collapse, "onExpandedChange")).toEqual([["preview"]]);
  }, 120_000);

  // adapt-sheets/disclosure.md M-008 (基线): the default environment is the
  // desktop-parity half — the existing cases' probes answer exactly what
  // disclosure.heroui.test.tsx pins (press/focus/onExpandedChange/texts),
  // the callback order is unchanged, and the seam stays inert (M-001). The
  // render-prop isPressed/isHovered edges and the focus-visible ring have no
  // probe in the fixture — the same channel limit the heroui suite records.
  test("M-008 default environment: existing cases match the heroui-suite semantics", async () => {
    // `default` case: two presses toggle open then closed, one report each;
    // a pointer press never focuses the view, so focus/blur stay silent.
    const app = await openDisclosure("default");
    await app.press(TRIGGER);
    await app.waitUntil(() => callsOf(app, "onExpandedChange").length === 1);
    expect(callsOf(app, "press")).toEqual([["trigger"]]);
    expect(callsOf(app, "onExpandedChange")).toEqual([[true]]);
    expect(app.shows(`text:${BODY}`)).toBe(true);

    await app.press(TRIGGER);
    await app.waitUntil(() => callsOf(app, "onExpandedChange").length === 2);
    expect(callsOf(app, "onExpandedChange")).toEqual([[true], [false]]);
    expect(callsOf(app, "press")).toEqual([["trigger"], ["trigger"]]);
    expect(app.shows(`text:${BODY}`)).toBe(false);
    expect(callsOf(app, "focus")).toHaveLength(0);
    expect(callsOf(app, "blur")).toHaveLength(0);

    // `disabled` case: refused at the harness, nothing recorded (T-006).
    const disabled = await openDisclosure("disabled");
    expect(disabled.enabled(TRIGGER)).toBe(false);
    await expect(disabled.press(TRIGGER)).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(disabled.shows(`text:${BODY}`)).toBe(false);

    // `group` case: single-mode replacement under the default environment.
    const group = await openDisclosure("group");
    await group.press(TRIGGER_PREVIEW);
    expect(group.shows(PREVIEW_CONTENT)).toBe(true);
    await group.press(TRIGGER_DOWNLOAD);
    expect(group.shows(DOWNLOAD_CONTENT)).toBe(true);
    expect(group.shows(PREVIEW_CONTENT)).toBe(false);
    expect(callsOf(group, "onExpandedChange")).toEqual([
      ["preview"],
      ["download"],
    ]);

    // The mobile case under pointer: identical contract sequence as touch —
    // down, up, the expand report, then the caller's press.
    const mobile = await openDisclosure("mobile");
    await mobile.press("id:trigger");
    await mobile.waitUntil(
      () => callsOf(mobile, "onExpandedChange").length === 1,
    );
    expect(contractSequence(mobile)).toEqual([
      "events:down",
      "events:up",
      "expanded",
      "events:press",
    ]);
    expect(eventArgs(mobile)).toEqual(["down", "up", "press"]);
  }, 120_000);

  // adapt-sheets/disclosure.md M-010 (A-009, A-010): the fixture itself is
  // the assertion carrier — the `mobile` case mounts in both environments,
  // the contract probes record, and every seam probe answers.
  test("M-010 the fixture opens in both environments and every probe records", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openDisclosure("mobile", scope ? { scope } : {});
      expect(app.shows("id:disclosure")).toBe(true);
      expect(app.shows("id:trigger")).toBe(true);

      await app.press("id:trigger");
      await app.waitUntil(
        () => callsOf(app, "onExpandedChange").length === 1,
      );
      expect(callsOf(app, "events")).toEqual([["down"], ["up"], ["press"]]);
      expect(callsOf(app, "layout").length).toBeGreaterThan(0);
      expect(callsOf(app, "ctx-env").length).toBeGreaterThan(0);
      expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(scope === "touch");

      // ctx-state samples are scheduled on mount and on every seam edge.
      // Under pointer the seam never engages, so every sample rests; under
      // touch a slow web press can leave a mid-hold sample reading true —
      // the row only needs the probes readable and the seam settled after.
      await app.waitUntil(() => callsOf(app, "ctx-state").length > 0);
      if (scope === "") {
        expectStatesAtRest(app);
      } else {
        await app.waitUntil(() => {
          const last = callsOf(app, "ctx-state").at(-1)?.[0] as
            | CtxState
            | undefined;
          return last !== undefined && last.seamPressed === false;
        });
        for (const call of callsOf(app, "ctx-state")) {
          const s = call[0] as CtxState;
          expect(typeof s.seamPressed).toBe("boolean");
          expect(typeof s.pressed).toBe("number");
          expect(typeof s.enabled).toBe("boolean");
        }
      }
    }
  }, 120_000);
});
