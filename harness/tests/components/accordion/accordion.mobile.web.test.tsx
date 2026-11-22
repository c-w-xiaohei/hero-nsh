import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";
import { expandedCalls, panelText, trigger } from "../../testers/accordion";

/*
 * Web-target mobile assertions for Accordion (adapt unit, action B): the
 * same M-001…M-008/M-010 assertion set as the headless file, minus the rows
 * that need headless-only steps — `open({platform:"ios"})` host derivation
 * and `app.drag` cancellation (M-009, covered in
 * `accordion.mobile.headless.test.tsx`), and the held-press `ctx-state`
 * samples inside M-002, which need `dragAndHold`/`drop` (headless only).
 * `platform:"web"` plays the pointer host; `EnvironmentScope input="touch"`
 * supplies the injected touch environment, so the dual-environment
 * assertions run identically here.
 *
 * The held half of M-002 degrades to what the web host can observe: the
 * seam's `ctx-pressed` edge records still prove the true→false roundtrip,
 * and the post-press `ctx-state`/`ctx-channels` reads prove the channels
 * settled — a mid-hold `pressed`/`origin` read has no web step that keeps a
 * press down (`Accordion.Trigger` does not forward `delayLongPress`).
 * Registered here rather than faked.
 *
 * Probe payloads match the headless file: `events`, `expandedChange`,
 * `itemExpanded`, `layout`, `ctx-pressed` ({seam}), `ctx-state`, `ctx-env`,
 * `ctx-channels`.
 */

type Params = Record<string, string>;

function openAccordion(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../accordion.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

const TRIGGER_ONE = "How do I place an order?";
const TRIGGER_TWO = "Can I modify my order?";
const TRIGGER_DISABLED = "Disabled question";

const PANEL_ONE = "Browse our products and proceed to checkout.";
const PANEL_TWO = "Yes, before it ships.";
const PANEL_DISABLED = "Never shown.";

const KOBALTE_TRIGGER_ONE = "Trigger one";
const KOBALTE_TRIGGER_TWO = "Trigger two";
const KOBALTE_CONTENT_ONE = "Content one";
const KOBALTE_CONTENT_TWO = "Content two";

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

/** Every recorded `ctx-state` sample's hitSlop sits at the rest value. */
function expectHitSlopAtRest(app: App): void {
  for (const call of callsOf(app, "ctx-state")) {
    expect((call[0] as CtxState).hitSlop).toBeNull();
  }
}

/**
 * The contract stream with only the activation calls left: `item.toggle()`
 * reports both expansion callbacks before the caller's `onPress` runs
 * (sheet §1), so a clean press reads down, up, expanded, expanded, press —
 * the two expansion probes collapse to one marker because their mutual
 * order inside `toggle()` is not part of the contract.
 */
function contractSequence(app: App): string[] {
  return calls(app)
    .filter(
      (c) =>
        c.name === "events" ||
        c.name === "expandedChange" ||
        c.name === "itemExpanded",
    )
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

describe("accordion mobile (web)", () => {
  // adapt-sheets/accordion.md M-001 (A-002, A-003, A-004, 负断言): under the
  // default pointer environment the touch-gated seam is a physical no-op —
  // `ctx-pressed` only ever records the mount edge, every `ctx-state` sample
  // and the on-demand `ctx-channels` read show the channels at rest — while
  // the press contract works unchanged: down/up/press, one expand at the
  // group and at the item, the panel flips once.
  test("M-001 default environment: seam channels stay inert while the press contract holds", async () => {
    const app = await openAccordion("mobile");

    expect(app.shows(`text:${PANEL_ONE}`)).toBe(false);
    await app.press("id:trigger");
    await app.waitUntil(
      () =>
        callsOf(app, "expandedChange").length === 1 &&
        callsOf(app, "itemExpanded").length === 1 &&
        callsOf(app, "events").length === 3,
    );

    expect(eventArgs(app)).toEqual(["down", "up", "press"]);
    expect(callsOf(app, "expandedChange").map((c) => c[0])).toEqual([
      ["faq-1"],
    ]);
    expect(callsOf(app, "itemExpanded")).toEqual([[true]]);
    expect(app.shows(`text:${PANEL_ONE}`)).toBe(true);
    expect(contractSequence(app)).toEqual([
      "events:down",
      "events:up",
      "expanded",
      "expanded",
      "events:press",
    ]);

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

  // adapt-sheets/accordion.md M-002 (A-002): under an injected touch
  // environment a press engages the seam — `ctx-pressed` records the
  // true→false roundtrip — and the commit still happens exactly once, in
  // contract order. The held `ctx-state` samples that prove the settled
  // channels mid-hold need `dragAndHold`, which only the headless engine
  // runs; on web the post-press samples and the on-demand `ctx-channels`
  // read carry the settle half (see file header).
  test("M-002 injected touch: press roundtrips the seam and expands exactly once", async () => {
    const app = await openAccordion("mobile", { scope: "touch" });

    expect(app.shows(`text:${PANEL_ONE}`)).toBe(false);
    await app.press("id:trigger");
    await app.waitUntil(
      () =>
        callsOf(app, "expandedChange").length === 1 &&
        callsOf(app, "itemExpanded").length === 1 &&
        callsOf(app, "events").length === 3,
    );

    // The panel flips once: expand reported exactly once at each level.
    expect(app.shows(`text:${PANEL_ONE}`)).toBe(true);
    expect(callsOf(app, "expandedChange").map((c) => c[0])).toEqual([
      ["faq-1"],
    ]);
    expect(callsOf(app, "itemExpanded")).toEqual([[true]]);
    expect(eventArgs(app)).toEqual(["down", "up", "press"]);
    // `item.toggle()` reports both expansion callbacks before `onPress`.
    expect(contractSequence(app)).toEqual([
      "events:down",
      "events:up",
      "expanded",
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

  // adapt-sheets/accordion.md M-003 (A-001): the `input` axis's `min-h-11`
  // gives the touch trigger its 44 pt minimum; under pointer the same case
  // keeps its content height (no lower bound asserted — desktop zero drift).
  test("M-003 injected touch: trigger measures at least 44pt; pointer keeps content height", async () => {
    const touch = await openAccordion("mobile", { scope: "touch" });
    await touch.waitUntil(() => callsOf(touch, "layout").length > 0);
    const touchLayout = lastOf<LayoutProbe>(touch, "layout");
    expect(touchLayout.name).toBe("trigger");
    expect(touchLayout.height).toBeGreaterThanOrEqual(44);

    const pointer = await openAccordion("mobile");
    await pointer.waitUntil(() => callsOf(pointer, "layout").length > 0);
    const pointerLayout = lastOf<LayoutProbe>(pointer, "layout");
    expect(pointerLayout.height).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/accordion.md M-004 (A-003): on a 24×24 trigger the seam's
  // hitSlop pads the under-target sides toward 44 pt; a default-size trigger
  // already reaches the target, so the accessor stays undefined (null in the
  // probe payload).
  test("M-004 compact trigger reports computed hitSlop; default size reports none", async () => {
    const compact = await openAccordion("mobile", {
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

    const plain = await openAccordion("mobile", { scope: "touch" });
    // The timed samples are the post-layout read: a full-size trigger never
    // computes a slop, so every sample's hitSlop stays null. (ctx-env only
    // re-reports when the computed value changes — undefined→undefined is
    // not a change — so the sample stream is the reliable carrier here.)
    await plain.waitUntil(() => callsOf(plain, "ctx-state").length >= 2);
    expectHitSlopAtRest(plain);
  }, 120_000);

  // adapt-sheets/accordion.md M-005 (A-002): `isDisabled` reports
  // `accessibilityState.disabled`, so the harness refuses the press; the
  // seam's inline `isBlocked()` gate reports closed regardless. `isPending`
  // does not report disabled — the press lands but every handler early-outs
  // on the same `isBlocked()`, so nothing records either way. The pointer
  // half asserts the same rest.
  test("M-005 isDisabled and isPending block the seam and the toggle in both environments", async () => {
    for (const scope of ["", "touch"] as const) {
      for (const flag of ["disabled", "pending"] as const) {
        const app = await openAccordion(
          "mobile",
          scope ? { scope, [flag]: "1" } : { [flag]: "1" },
        );

        if (flag === "disabled") {
          expect(app.enabled("id:trigger")).toBe(false);
          await expect(app.press("id:trigger")).rejects.toMatchObject({
            code: "ERR_NSH_TEST_DISABLED",
          });
        } else {
          // Pending keeps the view pressable; `isBlocked()` silences the
          // whole chain instead.
          expect(app.enabled("id:trigger")).toBe(true);
          await app.press("id:trigger");
        }

        expect(eventArgs(app)).toHaveLength(0);
        expect(callsOf(app, "expandedChange")).toHaveLength(0);
        expect(callsOf(app, "itemExpanded")).toHaveLength(0);
        expect(app.shows(`text:${PANEL_ONE}`)).toBe(false);
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

  // adapt-sheets/accordion.md M-006 (A-004): the trigger's children resolve
  // inside `PressableFeedbackContext.Provider` — `ctx-env.enabled` follows
  // the scope, the `bounds`/`hitSlop` accessors report real layout values,
  // and a caller-composed `<PressableFeedback.Highlight/>` mounts while the
  // default case mounts none.
  test("M-006 PressableFeedbackContext provider chain: gate follows scope, accessors read, overlay composes", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openAccordion("mobile", scope ? { scope } : {});
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

    const overlaid = await openAccordion("mobile", {
      scope: "touch",
      overlay: "highlight",
    });
    expect(overlaid.shows("id:overlay")).toBe(true);

    const plain = await openAccordion("mobile", { scope: "touch" });
    expect(plain.count("id:overlay")).toBe(0);
  }, 120_000);

  // adapt-sheets/accordion.md M-007 (A-005): the expansion strategy is
  // unchanged — under `scope="touch"` the existing cases answer exactly what
  // the desktop assertions pin: uncontrolled single/multiple sets, the
  // controlled lock, the `Array.from(keys)` report shape.
  test("M-007 expansion strategy identical under touch: default, multiple, kobalte controlled and multiple-default", async () => {
    // `default`: single mode — the second press replaces the first key.
    const app = await openAccordion("default", { scope: "touch" });
    await trigger(app, TRIGGER_ONE);
    await app.waitUntil(() => expandedCalls(app).length === 1);
    expect(expandedCalls(app)[0][0]).toEqual(["faq-1"]);
    expect(panelText(app, PANEL_ONE)).toBe(true);

    await trigger(app, TRIGGER_TWO);
    await app.waitUntil(() => expandedCalls(app).length === 2);
    expect(expandedCalls(app)[1][0]).toEqual(["faq-2"]);
    expect(panelText(app, PANEL_ONE)).toBe(false);
    expect(panelText(app, PANEL_TWO)).toBe(true);

    // `multiple`: both items stay open and the set accumulates in order.
    const multiple = await openAccordion("multiple", { scope: "touch" });
    await trigger(multiple, TRIGGER_ONE);
    await trigger(multiple, TRIGGER_TWO);
    await multiple.waitUntil(() => expandedCalls(multiple).length === 2);
    expect(panelText(multiple, PANEL_ONE)).toBe(true);
    expect(panelText(multiple, PANEL_TWO)).toBe(true);
    expect(expandedCalls(multiple)[1][0]).toEqual(["faq-1", "faq-2"]);

    // `kobalte-controlled`: expandedKeys is held from outside — the press
    // reports the request, the rendering stays as the prop says.
    const controlled = await openAccordion("kobalte-controlled", {
      scope: "touch",
    });
    expect(panelText(controlled, KOBALTE_CONTENT_ONE)).toBe(true);
    expect(panelText(controlled, KOBALTE_CONTENT_TWO)).toBe(false);
    await trigger(controlled, KOBALTE_TRIGGER_TWO);
    await controlled.waitUntil(() => expandedCalls(controlled).length === 1);
    expect(expandedCalls(controlled)[0][0]).toEqual(["two"]);
    expect(panelText(controlled, KOBALTE_CONTENT_ONE)).toBe(true);
    expect(panelText(controlled, KOBALTE_CONTENT_TWO)).toBe(false);
    expect(expandedCalls(controlled)).toHaveLength(1);

    // `kobalte-multiple-default`: multiple with default {one} — the same
    // press twice collapses and reopens it (T-029 semantics under touch).
    const collapse = await openAccordion("kobalte-multiple-default", {
      scope: "touch",
    });
    expect(panelText(collapse, KOBALTE_CONTENT_ONE)).toBe(true);
    await trigger(collapse, KOBALTE_TRIGGER_ONE);
    await collapse.waitUntil(() => expandedCalls(collapse).length === 1);
    expect(expandedCalls(collapse)[0][0]).toEqual([]);
    expect(panelText(collapse, KOBALTE_CONTENT_ONE)).toBe(false);

    await trigger(collapse, KOBALTE_TRIGGER_ONE);
    await collapse.waitUntil(() => expandedCalls(collapse).length === 2);
    expect(expandedCalls(collapse)[1][0]).toEqual(["one"]);
    expect(panelText(collapse, KOBALTE_CONTENT_ONE)).toBe(true);
  }, 120_000);

  // adapt-sheets/accordion.md M-008 (基线): the default environment is the
  // desktop-parity half — the existing cases' probes answer exactly what
  // accordion.heroui.test.tsx / accordion.kobalte.test.tsx pin
  // (expandedChange/itemExpanded/panel texts/focus silence), the disabled
  // item stays refused, and the seam stays inert (M-001). The render-prop
  // isPressed/isHovered edges, the focus-visible ring and the indicator
  // rotation have no probe in the fixture — the same channel limit the
  // heroui suite records.
  test("M-008 default environment: existing cases match the heroui/kobalte-suite semantics", async () => {
    // `default` case: two presses replace the open key (single mode), the
    // group and item probes report each toggle, and a pointer press never
    // focuses the view so the focus trail stays silent.
    const app = await openAccordion("default");
    await trigger(app, TRIGGER_ONE);
    await app.waitUntil(
      () =>
        expandedCalls(app).length === 1 &&
        callsOf(app, "itemExpanded").length === 1,
    );
    expect(expandedCalls(app)[0][0]).toEqual(["faq-1"]);
    expect(panelText(app, PANEL_ONE)).toBe(true);

    await trigger(app, TRIGGER_TWO);
    await app.waitUntil(() => expandedCalls(app).length === 2);
    expect(expandedCalls(app)[1][0]).toEqual(["faq-2"]);
    expect(panelText(app, PANEL_ONE)).toBe(false);
    expect(panelText(app, PANEL_TWO)).toBe(true);
    expect(callsOf(app, "focus")).toHaveLength(0);

    // The disabled item: refused at the harness, nothing recorded (T-008).
    const disabledTrigger = `role:button[${TRIGGER_DISABLED}]`;
    expect(app.enabled(disabledTrigger)).toBe(false);
    await expect(app.press(disabledTrigger)).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(panelText(app, PANEL_DISABLED)).toBe(false);
    expect(expandedCalls(app)).toHaveLength(2);
    expect(callsOf(app, "itemExpanded")).toHaveLength(2);

    // `multiple` case: both items open, the reported set accumulates (T-006).
    const multiple = await openAccordion("multiple");
    await trigger(multiple, TRIGGER_ONE);
    await trigger(multiple, TRIGGER_TWO);
    await multiple.waitUntil(() => expandedCalls(multiple).length === 2);
    expect(panelText(multiple, PANEL_ONE)).toBe(true);
    expect(panelText(multiple, PANEL_TWO)).toBe(true);
    expect(expandedCalls(multiple)[1][0]).toEqual(["faq-1", "faq-2"]);

    // `kobalte-controlled` case: the held set wins, the press only reports
    // (T-018).
    const controlled = await openAccordion("kobalte-controlled");
    expect(panelText(controlled, KOBALTE_CONTENT_ONE)).toBe(true);
    await trigger(controlled, KOBALTE_TRIGGER_TWO);
    await controlled.waitUntil(() => expandedCalls(controlled).length === 1);
    expect(expandedCalls(controlled)[0][0]).toEqual(["two"]);
    expect(panelText(controlled, KOBALTE_CONTENT_ONE)).toBe(true);
    expect(panelText(controlled, KOBALTE_CONTENT_TWO)).toBe(false);

    // The mobile case under pointer: identical contract sequence as touch —
    // down, up, both expansion reports, then the caller's press.
    const mobile = await openAccordion("mobile");
    await mobile.press("id:trigger");
    await mobile.waitUntil(
      () =>
        callsOf(mobile, "expandedChange").length === 1 &&
        callsOf(mobile, "events").length === 3,
    );
    expect(contractSequence(mobile)).toEqual([
      "events:down",
      "events:up",
      "expanded",
      "expanded",
      "events:press",
    ]);
    expect(eventArgs(mobile)).toEqual(["down", "up", "press"]);
  }, 120_000);

  // adapt-sheets/accordion.md M-010 (A-008, A-009): the fixture itself is
  // the assertion carrier — the `mobile` case mounts in both environments,
  // the contract probes record, and every seam probe answers.
  test("M-010 the fixture opens in both environments and every probe records", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openAccordion("mobile", scope ? { scope } : {});
      expect(app.shows("id:accordion")).toBe(true);
      expect(app.shows("id:trigger")).toBe(true);

      await app.press("id:trigger");
      await app.waitUntil(
        () =>
          callsOf(app, "expandedChange").length === 1 &&
          callsOf(app, "itemExpanded").length === 1 &&
          callsOf(app, "events").length === 3,
      );
      expect(callsOf(app, "events")).toEqual([["down"], ["up"], ["press"]]);
      expect(callsOf(app, "layout").length).toBeGreaterThan(0);
      expect(callsOf(app, "ctx-env").length).toBeGreaterThan(0);
      expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(scope === "touch");

      // ctx-state samples are scheduled on mount and on every seam edge;
      // under touch a slow web press can leave a mid-hold sample reading
      // true — the row only needs the probes readable and the seam settled
      // after (same degradation the disclosure web file records).
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
