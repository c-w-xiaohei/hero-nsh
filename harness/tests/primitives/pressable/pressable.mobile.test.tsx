import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the pressable-feedback mechanism unit, one test per
 * row of adapt-sheets/pressable-feedback.md §4 (M-001…M-017 minus the
 * hold-state rows that need `dragAndHold`, which lives in
 * `pressable.mobile.headless.test.tsx`).
 *
 * The fixture is `harness/pressable.fixtures.tsx`, opened by `host.params`:
 * `case` (factory/component/consume), `scope` ("" or "touch" through
 * `EnvironmentScope`), `fanim`/`anim` (animation prop tiers), `disabled`,
 * `enabled`, `box`. Every assertion reads what `nsh/test` can observe —
 * `texts()`, `enabled()`, `shows()` and the `@scenario/probe` calls in
 * `app.storage()` (`change`, `sample`, `origin`, `events`, `ctx-pressed`,
 * `ctx-state`, `ctx-origin`, `ctx-env`, `ctx-channels`, `consume-press`).
 *
 * `viewStyle` cannot resolve `AnimatedValue`-bound `opacity` (measured: it
 * reports the static value, 1, for an animated 0) — the parts' animated
 * channels are therefore asserted through the canonical `pressed`/
 * `isPressed`/`enabled` state they derive from, and the highlight's pressed
 * end value degrades to mount + engaged-press evidence (sheet §5 already
 * sends the visual check to real devices).
 *
 * Both environments are covered in the same file: the default (pointer,
 * which is also the desktop-parity baseline) and the injected touch one.
 */

type Params = Record<string, string>;

// `open` resolves its entry against the test file; this file sits three
// levels below harness/, same as every other primitives test.
function openPressable(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height" | "reducedMotion"> = {},
): Promise<App> {
  return open("../../../pressable.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type Sample = {
  pressed: number;
  scale: number;
  isPressed: boolean;
  hitSlop: Edges | null;
  origin: { x: number; y: number } | null;
  bounds: { width: number; height: number };
};

/* The `ctx-state` probe payload: the canonical `pressed` channel plus the
 * part channels the root owns (`highlightOpacity`/`rippleProgress`, read via
 * `getValue()`), the press origin, bounds, the effective gate and the
 * cascade flag. */
type CtxState = {
  pressed: number;
  highlight: number;
  ripple: number;
  isPressed: boolean;
  hitSlop: Edges | null;
  origin: { x: number; y: number } | null;
  bounds: { width: number; height: number };
  enabled: boolean;
  allDisabled: boolean;
};

/* The `ctx-channels` probe payload: the same channel read on demand (the
 * `ctx-sample` button), for presses that never raise `isPressed` and so
 * never schedule a `ctx-state` sample. */
type CtxChannels = Omit<CtxState, "hitSlop" | "bounds">;

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

/*
 * Web runs are several times slower than headless (measured: single opens
 * take 8–20 s and multi-open tests exceed the 30 s default), so every test
 * in this file passes an explicit 120 s cap. The cap is a ceiling, not a
 * delay — and the call must be a literal `test(...)`: the M4 gate scans the
 * source for test/it/describe call sites and cannot see a local wrapper.
 * Titles must also carry no backslash escapes: M4 regexes the raw literal
 * content, so a \" would demand a literal backslash the runner never prints.
 */

/** Presses the fixture's `sample` button and returns the probe it recorded. */
async function sample(app: App): Promise<Sample> {
  const before = callsOf(app, "sample").length;
  await app.press("id:sample");
  await app.waitUntil(() => callsOf(app, "sample").length > before);
  return lastOf<Sample>(app, "sample");
}

/** Presses `hold` (pressDown + a 600 ms delayed sample) and returns it. */
async function holdSample(app: App): Promise<Sample> {
  const before = callsOf(app, "sample").length;
  await app.press("id:hold");
  await app.waitUntil(() => callsOf(app, "sample").length > before);
  return lastOf<Sample>(app, "sample");
}

describe("pressable-feedback", () => {
  // adapt-sheets/pressable-feedback.md M-001 (A-001, A-003, 负断言): under
  // the default pointer environment the seam is a zero-cost pass-through —
  // no isPressed, no hitSlop, scale pinned at 1 — while press events still
  // reach the view (desktop zero change).
  test("M-001 default environment: feedback is inert — no isPressed, no hitSlop, scale 1, presses still fire", async () => {
    const app = await openPressable("factory");

    await app.press("id:down");
    await app.waitUntil(() => callsOf(app, "change").length > 0);

    const s = await sample(app);
    expect(s.isPressed).toBe(false);
    expect(s.pressed).toBe(0);
    expect(s.scale).toBe(1);
    expect(s.hitSlop).toBeNull();
    // onPressChange only ever reports false — the canonical flag never rose.
    for (const call of callsOf(app, "change")) {
      expect(call[0]).toBe(false);
    }
    expect(app.texts()).toContain("isPressed=false");
    expect(app.texts()).toContain("hitSlop=null");

    // The consume shape proves the desktop half: a real view press still
    // fires onPress and the factory forwards the (disabled) change signal.
    const consumer = await openPressable("consume");
    await consumer.press("id:consume-root");
    await consumer.waitUntil(
      () => callsOf(consumer, "consume-press").length > 0,
    );
    expect(callsOf(consumer, "consume-press")).toEqual([["press"]]);
    for (const call of callsOf(consumer, "change")) {
      expect(call[0]).toBe(false);
    }
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-002 (A-001): under an injected
  // touch environment pressDown sets the canonical flag and pressUp clears
  // it; onPressChange reports down→up in order.
  test("M-002 injected touch: isPressed and onPressChange roundtrip down then up", async () => {
    const app = await openPressable("factory", { scope: "touch" });

    await app.press("id:down");
    await app.waitUntil(() => callsOf(app, "change").length === 1);
    expect(callsOf(app, "change")).toEqual([[true]]);
    expect(app.texts()).toContain("isPressed=true");

    await app.press("id:up");
    await app.waitUntil(() => callsOf(app, "change").length === 2);
    expect(callsOf(app, "change")).toEqual([
      [true],
      [false],
    ]);
    expect(app.texts()).toContain("isPressed=false");
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-003 (A-001): the computed hitSlop
  // pads each side by (44 − side) / 2 while a side is under the 44 pt minimum
  // target, and answers undefined once both sides reach it.
  test("M-003 injected touch: hitSlop pads a 24pt box by 10 per side and stays empty at 320pt and up", async () => {
    const app = await openPressable("factory", { scope: "touch" });

    await app.press("id:layout-small"); // 24×24 → (44−24)/2 = 10 per side
    let s = await sample(app);
    expect(s.hitSlop).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });

    await app.press("id:layout-mid"); // 150×80 → both sides ≥ 44
    s = await sample(app);
    expect(s.hitSlop).toBeNull();

    await app.press("id:layout-wide"); // 320×80, width ≥ 300
    s = await sample(app);
    expect(s.hitSlop).toBeNull();

    await app.press("id:layout-huge"); // 600×80
    s = await sample(app);
    expect(s.hitSlop).toBeNull();

    // The same computed value reaches the component seam through the
    // context: a 24×24 PressableFeedback reports the same edges.
    const component = await openPressable("component", {
      scope: "touch",
      box: "tiny",
    });
    await component.longPress("id:root");
    await component.waitUntil(() => callsOf(component, "ctx-state").length > 0);
    expect(lastOf<CtxState>(component, "ctx-state").hitSlop).toEqual({
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    });
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-004 (A-003): the scale channel's
  // pressed end is `1 − (1 − 0.985) · (300 / width)` with no clamping —
  // narrower than 300 pt presses deeper, wider presses shallower — and
  // `ignoreScaleCoefficient` uses the raw 0.985. The component's built-in
  // scale binds this same factory channel, so the factory's getValue()
  // probe is the observable half.
  test("M-004 injected touch: scale end follows the width coefficient — 0.97 at 150pt, 0.9925 at 600pt, 0.985 when ignored", async () => {
    // width 150 → coefficient 2 → 1 − 0.015·2 = 0.97
    let app = await openPressable("factory", { scope: "touch" });
    await app.press("id:layout-mid");
    let s = await holdSample(app);
    expect(s.pressed).toBeGreaterThan(0.99);
    expect(s.scale).toBeGreaterThan(0.965);
    expect(s.scale).toBeLessThan(0.975);
    await app.press("id:up");

    // width 600 → coefficient 0.5 → 1 − 0.015·0.5 = 0.9925
    await app.press("id:layout-huge");
    s = await holdSample(app);
    expect(s.scale).toBeGreaterThan(0.991);
    expect(s.scale).toBeLessThan(0.994);
    await app.press("id:up");

    // ignoreScaleCoefficient → coefficient 1 → the raw 0.985 value
    app = await openPressable("factory", {
      scope: "touch",
      fanim: "ignore-scale",
    });
    await app.press("id:layout-mid");
    s = await holdSample(app);
    expect(s.scale).toBeGreaterThan(0.983);
    expect(s.scale).toBeLessThan(0.987);
    await app.press("id:up");
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-006 (A-004): the ripple's origin is
  // `PressEvent.position` — the context's `pressOrigin` must report the press
  // point, and clearing it on release is what arms the progress 1→2 segment
  // (the part's own contract: "back-to-null completes a press"). The raw
  // `progress` channel is internal to `PressableFeedback.Ripple`; its
  // 0→1→2 run is covered by the held-press assertions in the headless file.
  test("M-006 injected touch: pressOrigin records the press point and clears on release; ripple mounts", async () => {
    const app = await openPressable("component", { scope: "touch" });

    expect(app.shows("id:ripple")).toBe(true);

    await app.longPress("id:root");
    await app.waitUntil(
      () => callsOf(app, "ctx-pressed").filter((c) => c[0] === true).length > 0,
    );
    await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);

    const origins = callsOf(app, "ctx-origin").filter((c) => c[0] !== null);
    expect(origins.length).toBeGreaterThan(0);
    const origin = origins[origins.length - 1][0] as { x: number; y: number };
    // longPress lands on the middle of the 120×64 root: the position is the
    // press point inside the view, not a page coordinate and not 0,0.
    expect(origin.x).toBeGreaterThan(40);
    expect(origin.x).toBeLessThan(80);
    expect(origin.y).toBeGreaterThan(20);
    expect(origin.y).toBeLessThan(44);

    // Release must hand the ripple its completion edge: pressOrigin returns
    // to null so the part's effect can run progress → 2.
    expect(callsOf(app, "ctx-origin").at(-1)?.[0]).toBeNull();

    // Sheet M-006's ripple half: `progress` runs the 0→1 segment while the
    // press is held and the →2 segment after release. The `ctx-state` probe
    // reads `ctx.rippleProgress.getValue()` 600 ms and 1500 ms after each
    // press edge; the late held sample is the stable "趋 1" read — by then
    // the diagonal-timed segment (≈750 ms, restarted once if a late layout
    // retriggers the part) has settled at its held end. The released sample
    // past the 1 mark proves the →2 segment ran — progress > 1 is only
    // reachable through it.
    const held = callsOf(app, "ctx-state")
      .filter((c) => (c[0] as CtxState).isPressed === true)
      .at(-1)?.[0] as CtxState | undefined;
    expect(held?.isPressed).toBe(true);
    expect(held?.ripple).toBeGreaterThan(0.9);
    expect(held?.ripple).toBeLessThanOrEqual(1);

    await app.waitUntil(() => {
      const last = callsOf(app, "ctx-state").at(-1)?.[0] as
        | CtxState
        | undefined;
      return last !== undefined && !last.isPressed && last.ripple > 1;
    });
    const released = callsOf(app, "ctx-state").at(-1)?.[0] as
      | CtxState
      | undefined;
    expect(released?.ripple).toBeGreaterThan(1);
    expect(released?.ripple).toBeLessThanOrEqual(2);
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-007 (A-003): `animation="disable-all"`
  // cascades through the context (`isAllAnimationsDisabled`) while the
  // canonical press channel still roundtrips — the flag gates the parts, not
  // the press state. The held-press proof that Highlight/Ripple hold their
  // rest values lives in the headless file's hold-state test.
  test("M-007 animation='disable-all': cascade flag reaches the context and the canonical press still completes", async () => {
    const app = await openPressable("component", {
      scope: "touch",
      anim: "disable-all",
    });

    await app.longPress("id:root");
    await app.waitUntil(() => callsOf(app, "ctx-state").length > 0);

    // Read the LATE held sample (the probe fires at +600 ms and +1500 ms
    // per press edge; web's slower steps can let the release-edge samples
    // land before `longPress` resolves, so `lastOf` is not the held read).
    // Under "disable-all" the canonical `pressed` channel still completes
    // its run to 1 — it is not a part animation — while the cascaded part
    // channels (`highlightOpacity`/`rippleProgress` via `getValue()`) hold
    // their rest values 0, the sheet's "端值恒 0/1".
    const s = callsOf(app, "ctx-state")
      .filter((c) => (c[0] as CtxState).isPressed === true)
      .at(-1)?.[0] as CtxState | undefined;
    expect(s?.allDisabled).toBe(true);
    expect(s?.isPressed).toBe(true);
    expect(s?.pressed).toBeGreaterThan(0.99);
    expect(s?.highlight).toBe(0);
    expect(s?.ripple).toBe(0);

    await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);
    // The cascade flag is also the mount-time environment the parts read.
    expect(lastOf<{ allDisabled: boolean }>(app, "ctx-env").allDisabled).toBe(
      true,
    );
    expect(app.shows("id:highlight")).toBe(true);
    expect(app.shows("id:ripple")).toBe(true);
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-008 (A-003): `isDisabled` closes the
  // gate — the view reports disabled, no press events fire and the context's
  // `enabled()` stays false. `enabled={false}` keeps the view pressable but
  // the feedback seam inert.
  test("M-008 isDisabled and enabled=false: no feedback path, press events follow the view's own disabled state", async () => {
    const disabled = await openPressable("component", {
      scope: "touch",
      disabled: "1",
    });
    expect(disabled.enabled("id:root")).toBe(false);
    await expect(disabled.press("id:root")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(disabled, "events")).toHaveLength(0);
    expect(
      callsOf(disabled, "ctx-pressed").filter((c) => c[0] === true),
    ).toHaveLength(0);

    const gated = await openPressable("component", {
      scope: "touch",
      enabled: "off",
    });
    // The view itself is not disabled: onPress still fires (desktop parity),
    // but the seam never engages — the context's effective gate reports
    // false and isPressed never rises.
    await gated.press("id:root");
    await gated.waitUntil(() => callsOf(gated, "events").length > 0);
    expect(
      callsOf(gated, "events").some((c) => (c[0] as { kind: string }).kind === "press"),
    ).toBe(true);
    expect(lastOf<{ enabled: boolean }>(gated, "ctx-env").enabled).toBe(false);
    expect(
      callsOf(gated, "ctx-pressed").filter((c) => c[0] === true),
    ).toHaveLength(0);
    expect(gated.shows("id:highlight")).toBe(true);

    // The seam stays fully inert under the closed gate, not just the
    // canonical flag: no press origin may be recorded (it is the ripple's
    // only trigger) and the part channels must hold their rest values. The
    // on-demand `ctx-channels` probe reads them because `ctx-state` only
    // samples on `isPressed` edges, which a gated press never raises.
    expect(callsOf(gated, "ctx-origin").every((c) => c[0] === null)).toBe(true);
    await gated.press("id:ctx-sample");
    await gated.waitUntil(() => callsOf(gated, "ctx-channels").length > 0);
    const gatedChannels = lastOf<CtxChannels>(gated, "ctx-channels");
    expect(gatedChannels.origin).toBeNull();
    expect(gatedChannels.ripple).toBe(0);
    expect(gatedChannels.highlight).toBe(0);
    expect(gatedChannels.isPressed).toBe(false);
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-009 (A-001): under reducedMotion the
  // scale channel is pinned to 1 (instant path, no timing) while `pressed`
  // still completes its 0→1→0 run and press events stay intact.
  test("M-009 reducedMotion: scale stays 1 while pressed still roundtrips", async () => {
    const app = await openPressable(
      "factory",
      { scope: "touch" },
      { reducedMotion: true },
    );

    await app.press("id:layout-mid");
    const s = await holdSample(app);
    expect(s.isPressed).toBe(true);
    expect(s.pressed).toBeGreaterThan(0.99);
    expect(s.scale).toBe(1);

    await app.press("id:up");
    await app.waitUntil(() => callsOf(app, "change").length === 2);
    expect(callsOf(app, "change")).toEqual([
      [true],
      [false],
    ]);
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-010 (A-006): the fixture mounts
  // `PressableFeedback` imported through the public `hero-nsh` entry — the
  // primitives barrel and the component lines of src/index.ts make it
  // reachable.
  test("M-010 PressableFeedback mounts from the public entry", async () => {
    const app = await openPressable("component", { scope: "touch" });

    expect(app.shows("id:root")).toBe(true);
    expect(app.shows("text:pressable")).toBe(true);
    expect(app.shows("id:highlight")).toBe(true);
    expect(app.shows("id:ripple")).toBe(true);
    expect(app.shows("id:scale-part")).toBe(true);
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-013 (A-002): every tier of the
  // `animation` control flow mounts and renders — true, "disabled", false,
  // a config object and a config carrying `state`.
  test("M-013 animation tiers mount: true, 'disabled', false, object and state-carrying configs", async () => {
    for (const anim of [
      "true",
      "disabled",
      "false",
      "object",
      "state-off",
      "state-all",
      "ignore-scale",
    ]) {
      const app = await openPressable("component", {
        scope: "touch",
        anim,
      });
      expect(app.shows("id:root")).toBe(true);
      expect(app.shows("text:pressable")).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-014 (A-005, A-006): the whole export
  // chain — `createPressFeedback`, `PressableFeedback`,
  // `PressableFeedbackContext` and the animation types — is importable from
  // `@heroui/react`; the fixture uses every one of them and the context
  // probe records canonical state through it.
  test("M-014 export chain: factory, component and context all work through the public entry", async () => {
    const app = await openPressable("component", { scope: "touch" });
    await app.longPress("id:root");
    await app.waitUntil(() => callsOf(app, "ctx-pressed").length > 0);
    // The context probe only exists because PressableFeedbackContext was
    // importable and provided — its reports prove the chain end to end.
    expect(callsOf(app, "ctx-pressed")).toContainEqual([true]);

    const factory = await openPressable("factory", { scope: "touch" });
    // Second app in one test: on web the first open's teardown can race the
    // second mount, so wait for the fixture's own views before pressing.
    await factory.waitFor("id:down");
    await factory.press("id:down");
    await factory.waitUntil(() => callsOf(factory, "change").length === 1);
    expect(callsOf(factory, "change")).toEqual([[true]]);
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-015 (A-008): the fixture's probe
  // surface itself is asserted — pressDown/pressUp drive `change`, `sample`
  // carries isPressed/pressed/scale/hitSlop/origin/bounds, and `origin`
  // carries pressOrigin.
  test("M-015 fixture probes record the canonical channels for every case", async () => {
    const app = await openPressable("factory", { scope: "touch" });

    await app.press("id:layout-small");
    await app.press("id:hold");
    await app.waitUntil(() => callsOf(app, "sample").length > 0);

    const s = lastOf<Sample>(app, "sample");
    expect(typeof s.pressed).toBe("number");
    expect(typeof s.scale).toBe("number");
    expect(typeof s.isPressed).toBe("boolean");
    expect(s.hitSlop).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });
    expect(s.origin).toEqual({ x: 10, y: 20 });
    expect(s.bounds).toEqual({ width: 24, height: 24 });

    await app.press("id:up");
    await app.waitUntil(() => callsOf(app, "change").length === 2);
    expect(callsOf(app, "change")).toEqual([
      [true],
      [false],
    ]);
    expect(callsOf(app, "origin").length).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-016 (A-009, A-010): the dual
  // environment structure — default and EnvironmentScope(touch) — mounts and
  // answers probes in the same file; the rows above are its content.
  test("M-016 both environments mount and answer probes", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openPressable("factory", scope ? { scope } : {});
      await app.press("id:down");
      await app.waitUntil(() => callsOf(app, "change").length > 0);
      const s = await sample(app);
      expect(typeof s.pressed).toBe("number");
      expect(typeof s.scale).toBe("number");
    }
  }, 120_000);

  // adapt-sheets/pressable-feedback.md M-017 (A-004, 负断言): under the
  // default environment the touch-feedback path does not exist — the
  // context's effective gate reports false, isPressed never rises through a
  // real press, and the parts stay mounted but inert. (`viewStyle` cannot
  // read the parts' AnimatedValue-bound opacity — a registered host gap —
  // so the negative assertion rides the canonical channel and the gate.)
  test("M-017 default environment: the feedback gate stays closed through a real press", async () => {
    const app = await openPressable("component");

    expect(app.shows("id:highlight")).toBe(true);
    expect(app.shows("id:ripple")).toBe(true);
    expect(lastOf<{ enabled: boolean }>(app, "ctx-env").enabled).toBe(false);

    await app.press("id:root");
    await app.waitUntil(() => callsOf(app, "events").length > 0);
    await app.waitUntil(() => callsOf(app, "ctx-pressed").length > 0);

    // Press events fired (desktop parity) but the seam never engaged.
    expect(
      callsOf(app, "events").some((c) => (c[0] as { kind: string }).kind === "press"),
    ).toBe(true);
    expect(callsOf(app, "ctx-pressed").every((c) => c[0] === false)).toBe(true);
    expect(lastOf<{ enabled: boolean }>(app, "ctx-env").enabled).toBe(false);

    // The parts must be inert, not just the canonical flag: no press origin
    // may be recorded (it is the ripple's only trigger — a leaked point
    // starts the 0→1 segment even with `isPressed` false) and the highlight /
    // ripple channels must hold 0. `ctx-state` only samples on `isPressed`
    // edges, so the on-demand `ctx-channels` probe reads them after the
    // press — this is the sheet's "ripple progress.getValue() 恒 0" half.
    expect(callsOf(app, "ctx-origin").every((c) => c[0] === null)).toBe(true);
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.origin).toBeNull();
    expect(channels.ripple).toBe(0);
    expect(channels.highlight).toBe(0);
    expect(channels.isPressed).toBe(false);
  }, 120_000);

  // Regression pin for the round-2 blocking review finding:
  // src/primitives/pressable/press-feedback.ts:256-277 +
  // src/primitives/pressable/pressable-feedback-parts.tsx:344-371 —
  // pressDown() records pressOrigin before the enabled() early-return and
  // the disabled pressUp() branch returns without clearing it, so under the
  // default pointer environment a real press leaves pressOrigin non-null;
  // the Ripple part keys on ctx.pressOrigin() and never reads ctx.enabled(),
  // driving rippleProgress 0→1 — a radial-gradient overlay on desktop,
  // stuck at 1 because the origin never returns to null. Required behavior
  // (sheet A-004 "pointer 下全部静止", the M-017/M-008 gate intent): the seam
  // is inert — pressOrigin stays null and the part channels hold 0.
  test("M-901 default environment: a real press leaves pressOrigin null and the part channels at rest", async () => {
    const app = await openPressable("component");

    await app.press("id:root");
    await app.waitUntil(() => callsOf(app, "events").length > 0);

    // pressOrigin is the ripple's only trigger: under the closed gate it
    // must never leave null — a recorded point is what starts the 0→1 run.
    expect(callsOf(app, "ctx-origin").every((c) => c[0] === null)).toBe(true);

    // On-demand channel read after the press: viewStyle cannot resolve the
    // parts' AnimatedValue-bound styles, so the getValue() probes carry the
    // assertion — every channel must still sit at its rest value.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const s = lastOf<CtxChannels>(app, "ctx-channels");
    expect(s.origin).toBeNull();
    expect(s.ripple).toBe(0);
    expect(s.highlight).toBe(0);
    expect(s.isPressed).toBe(false);
    expect(s.enabled).toBe(false);
  }, 120_000);
});
