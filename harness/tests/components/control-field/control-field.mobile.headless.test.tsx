import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the e-parts ControlField mechanism unit,
 * one test per row of adapt-sheets/e-parts.md §4 (M-001…M-011, M-033…M-036),
 * plus the headless-only halves — `open({platform:"ios"})` host derivation
 * (M-009) and `app.drag` press cancellation (M-010).
 *
 * The fixture is `harness/control-field.fixtures.tsx`, opened by
 * `host.params`: `case` (row/fn), `scope` ("" or "touch" through
 * `EnvironmentScope`), `variant`, `selected`, `disabled`, `required`,
 * `invalid`, `anim`, `box`, `short`. Every assertion reads what `nsh/test`
 * can observe — `texts()`, `enabled()`, `shows()` and the `@scenario/probe`
 * calls in `app.storage()` (`events`, `change`, `focus`, `layout`,
 * `ctx-pressed`, `ctx-state`, `ctx-env`, `ctx-channels`).
 *
 * The ctx probes distinguish two press flags the sheet keeps apart (§1):
 * `mirror` is the row's unconditional `isPressed` (upstream `SharedValue`
 * semantics — it round-trips under pointer too), `seam`/`seamPressed` is the
 * `createPressFeedback` factory's gated flag, which only rises under touch.
 * `ctx-state`/`ctx-channels` payloads add the animated channels `pressed` and
 * `scale` (read through `getValue()`, since `viewStyle` cannot resolve
 * AnimatedValue-bound styles — the registered host gap), plus `hitSlop`,
 * `origin`, `bounds`, `enabled` and `allDisabled`.
 */

type Params = Record<string, string>;

function openField(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../control-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type PressedEdge = { mirror: boolean; seam: boolean };

type CtxState = {
  pressed: number;
  scale: number;
  seamPressed: boolean;
  mirror: boolean;
  hitSlop: Edges | null;
  origin: { x: number; y: number } | null;
  bounds: { width: number; height: number };
  enabled: boolean;
  allDisabled: boolean;
  selected: boolean | null;
};

type CtxChannels = Omit<CtxState, "bounds">;

type CtxEnv = {
  enabled: boolean;
  allDisabled: boolean;
  hitSlop: Edges | null;
  selected: boolean | null;
  disabled: boolean;
  invalid: boolean;
  required: boolean;
};

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

/** `ctx-state` samples that ran while the seam's press was held. */
function heldSamples(app: App): CtxState[] {
  return callsOf(app, "ctx-state")
    .map((c) => c[0] as CtxState)
    .filter((s) => s.seamPressed === true);
}

function kinds(app: App): string[] {
  return callsOf(app, "events").map((c) => (c[0] as { kind: string }).kind);
}

describe("control-field mobile (headless)", () => {
  // adapt-sheets/e-parts.md M-001 (A-002, 负断言): under the default pointer
  // environment the touch-gated seam is a zero-cost pass-through — `pressed`
  ///`scale` hold their rest values, `hitSlop` stays null, `pressOrigin`
  // never records — while the row's press contract works unchanged:
  // `onPress` fires, `onSelectedChange` is called exactly once, and the
  // unconditional `isPressed` mirror still round-trips (upstream's
  // `SharedValue` semantics — the desktop half of "零变化").
  test("M-001 default environment: feedback channels stay inert while the press contract holds", async () => {
    const app = await openField("row");

    await app.press("id:cf-row");
    await app.waitUntil(() => callsOf(app, "change").length === 1);
    expect(callsOf(app, "change")).toEqual([[true]]);
    expect(kinds(app)).toContain("press");

    // The row's unconditional mirror round-trips even here; the seam's flag
    // must stay down on every edge.
    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as PressedEdge);
    expect(edges.some((e) => e.mirror)).toBe(true);
    expect(edges.at(-1)).toEqual({ mirror: false, seam: false });
    expect(edges.every((e) => !e.seam)).toBe(true);

    // Every ctx-state sample (fired on the mirror's edges) must show the
    // seam at rest: no pressed value, scale 1, no hit slop, no origin.
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

    // And the on-demand read, for a fresh post-press sample.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.pressed).toBeLessThan(0.5);
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/e-parts.md M-002 (A-002): under an injected touch
  // environment a press engages the seam — `ctx-pressed` records the true→
  // false roundtrip on both flags, the held `ctx-state` samples show the
  // channels activated — and the commit still happens exactly once.
  test("M-002 injected touch: press roundtrips mirror and seam channels and commits once", async () => {
    const app = await openField("row", { scope: "touch" });

    await app.press("id:cf-row");
    await app.waitUntil(() => callsOf(app, "change").length === 1);

    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as PressedEdge);
    expect(edges).toContainEqual({ mirror: true, seam: true });
    expect(edges.at(-1)).toEqual({ mirror: false, seam: false });

    // A held press keeps the seam engaged: the probe's +600 ms / +1500 ms
    // samples land mid-hold (delayLongPress=2500) and read the settled
    // pressed end — canonical flag up, `pressed` at 1, the hit-area
    // expansion computed from the laid-out bounds.
    await app.longPress("id:cf-row");
    await app.waitUntil(() => heldSamples(app).length >= 1);
    const held = heldSamples(app).at(-1)!;
    expect(held.seamPressed).toBe(true);
    expect(held.mirror).toBe(true);
    expect(held.pressed).toBeGreaterThan(0.99);
    expect(held.enabled).toBe(true);
    // A 288 pt wide row is already over the 44 pt target: no expansion.
    expect(held.hitSlop).toBeNull();
    // The press origin is recorded (a real point, not null).
    expect(held.origin).not.toBeNull();
  }, 120_000);

  // adapt-sheets/e-parts.md M-003 (A-001, A-003): the three `variant` default
  // pieces mount under the adapted control contexts — `ctx.isSelected`
  // follows the row's prop and the pieces' visible state changes with it —
  // while a row press still commits exactly once through `onSelectedChange`
  // (the adapted controls can never self-commit: every commit path in the
  // adapters points at the same row prop).
  test("M-003 variants: switch, checkbox and radio default pieces follow isSelected and never double-commit", async () => {
    const trackOf: Record<string, string> = {
      switch: "id:cf-switch-track",
      checkbox: "id:cf-checkbox-control",
      radio: "id:cf-radio-control",
    };
    // The variants whose selected state paints the piece's own
    // `backgroundColor` — the only resolved style `nsh/test` can read. The
    // checkbox's check is canvas-drawn: its adapted-context proof is the
    // `ctx-env.selected` half plus the identical adapter code path (the
    // canvas gap is registered in sheet §5).
    const styleOf: Record<string, string | undefined> = {
      switch: "id:cf-switch-track",
      checkbox: undefined,
      radio: "id:cf-radio-control",
    };

    for (const variant of ["switch", "checkbox", "radio"]) {
      const off = await openField("row", { scope: "touch", variant });
      expect(off.shows(trackOf[variant])).toBe(true);
      expect(lastOf<CtxEnv>(off, "ctx-env").selected).toBe(false);

      await off.press("id:cf-row");
      await off.waitUntil(() => callsOf(off, "change").length === 1);
      // `isSelected` was false → the one commit asks for true, exactly once.
      expect(callsOf(off, "change")).toEqual([[true]]);

      const on = await openField("row", {
        scope: "touch",
        variant,
        selected: "1",
      });
      expect(on.shows(trackOf[variant])).toBe(true);
      expect(lastOf<CtxEnv>(on, "ctx-env").selected).toBe(true);

      // Where the default piece paints its selection on a readable style:
      // the selected piece's `bg-accent` vs the resting `bg-default`/`bg-field`.
      const target = styleOf[variant];
      if (target !== undefined) {
        const offStyle = off.viewStyle(target);
        const onStyle = on.viewStyle(target);
        expect(onStyle?.backgroundColor).toBeDefined();
        expect(onStyle?.backgroundColor).not.toBe(offStyle?.backgroundColor);
      }

      // The commit still happens exactly once — through the row, which is
      // the only pressable path (the pieces are `focusable:false` and the
      // adapter's state channels point at the same onSelectedChange).
      await on.press("id:cf-row");
      await on.waitUntil(() => callsOf(on, "change").length === 1);
      expect(callsOf(on, "change")).toEqual([[false]]);
    }
  }, 120_000);

  // adapt-sheets/e-parts.md M-004 (A-003): the function-child form receives
  // `{isSelected, isDisabled, isInvalid}` accessors — on the row and on
  // `ControlField.Indicator` — and renders their values into visible text.
  test("M-004 function children receive isSelected/isDisabled/isInvalid render props", async () => {
    const app = await openField("fn", { selected: "1", invalid: "1" });

    expect(app.texts()).toContain("fn:sel=1,dis=0,inv=1");
    expect(app.texts()).toContain("ind:sel=1,dis=0,inv=1");

    const disabled = await openField("fn", { disabled: "1" });
    expect(disabled.texts()).toContain("fn:sel=0,dis=1,inv=0");
    expect(disabled.texts()).toContain("ind:sel=0,dis=1,inv=0");
  }, 120_000);

  // adapt-sheets/e-parts.md M-005 (A-002): `isDisabled` closes every path —
  // the view reports disabled, no press fires, no commit — while
  // `isRequired` renders the Label's required asterisk inside the row.
  test("M-005 isDisabled blocks the row and isRequired shows the asterisk", async () => {
    const disabled = await openField("row", {
      scope: "touch",
      disabled: "1",
      selected: "1",
    });
    expect(disabled.enabled("id:cf-row")).toBe(false);
    await expect(disabled.press("id:cf-row")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(disabled, "change")).toHaveLength(0);
    expect(callsOf(disabled, "events")).toHaveLength(0);
    // The seam's gate reports closed too (isDisabled is part of `enabled`).
    expect(lastOf<CtxEnv>(disabled, "ctx-env").enabled).toBe(false);

    const required = await openField("row", { required: "1" });
    // The asterisk is a nested Text — `texts()` joins it onto the label.
    expect(required.texts()).toContain("Notifications*");
  }, 120_000);

  // adapt-sheets/e-parts.md M-006 (A-002): a `Label` press stands in for
  // `<label for>` — `FieldContext.focusField` runs `onPress`, the one
  // toggle, then focuses the row's view (the `focus` probe records the
  // row's own `onFocus`).
  test("M-006 a Label press toggles once and focuses the row", async () => {
    const app = await openField("row");

    await app.press("id:cf-label");
    await app.waitUntil(() => callsOf(app, "change").length === 1);

    expect(callsOf(app, "change")).toEqual([[true]]);
    // focusField ran the row's press path (one `press` event for the label
    // press) and landed the focus on the row's view.
    expect(kinds(app)).toContain("press");
    expect(callsOf(app, "focus").length).toBeGreaterThanOrEqual(1);
    // And it committed once — not twice: the label's own press must not
    // reach the row's onPress a second time.
    expect(kinds(app).filter((k) => k === "press")).toHaveLength(1);
  }, 120_000);

  // adapt-sheets/e-parts.md M-007 (A-002): the row's press lifecycle order —
  // `onPressDown` → `onPressUp` → `onPress` → `onSelectedChange` (the
  // sheet's order wins over upstream's `onSelectedChange`-then-`onPress`).
  test("M-007 press lifecycle order: down, up, press, then the selection change", async () => {
    const app = await openField("row");

    await app.press("id:cf-row");
    await app.waitUntil(() => callsOf(app, "change").length === 1);

    expect(kinds(app)).toEqual(["down", "up", "press", "change"]);
  }, 120_000);

  // adapt-sheets/e-parts.md M-008 (A-004): the `input` axis's `min-h-11`
  // gives a short touch row its 44 pt minimum; under pointer the same
  // one-line row keeps its content height (the pointer unchanged half).
  test("M-008 a short row measures at least 44pt under touch and stays short under pointer", async () => {
    const touch = await openField("row", { scope: "touch", short: "1" });
    await touch.waitUntil(() => callsOf(touch, "layout").length > 0);
    const touchLayout = lastOf<{ height: number }>(touch, "layout");
    expect(touchLayout.height).toBeGreaterThanOrEqual(44);

    const pointer = await openField("row", { short: "1" });
    await pointer.waitUntil(() => callsOf(pointer, "layout").length > 0);
    const pointerLayout = lastOf<{ height: number }>(pointer, "layout");
    expect(pointerLayout.height).toBeLessThan(44);
  }, 120_000);

  // adapt-sheets/e-parts.md M-009 (A-002): with no EnvironmentScope an ios
  // host derives `input()==="touch"`, so the feedback gate holds — the
  // host-derivation half of M-002.
  test("M-009 ios host derivation: the seam activates without an EnvironmentScope", async () => {
    const app = await openField(
      "row",
      {},
      { platform: "ios", width: 390, height: 844 },
    );

    await app.press("id:cf-row");
    await app.waitUntil(() => callsOf(app, "change").length === 1);

    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as PressedEdge);
    expect(edges).toContainEqual({ mirror: true, seam: true });
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);
  }, 120_000);

  // adapt-sheets/e-parts.md M-010 (A-002): a drag cancels the press — the
  // host reports `onPressUp` (cancel and release share the canonical path),
  // both press flags return to false, and no commit and no `onPress` fire.
  test("M-010 a drag cancels the press: flags reset and nothing commits", async () => {
    const app = await openField("row", { scope: "touch" });

    await app.drag("id:cf-row", { x: 40, y: 0 });

    await app.waitUntil(() =>
      kinds(app).some((k) => k === "up"),
    );
    await app.waitUntil(() => {
      const last = callsOf(app, "ctx-pressed").at(-1)?.[0] as
        | PressedEdge
        | undefined;
      return last !== undefined && last.mirror === false && last.seam === false;
    });

    expect(kinds(app)).not.toContain("press");
    expect(callsOf(app, "change")).toHaveLength(0);

    // The cancelled press still engaged the seam on the way down — mirror
    // and seam both rose before the cancel reset them.
    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as PressedEdge);
    expect(edges).toContainEqual({ mirror: true, seam: true });
  }, 120_000);

  // adapt-sheets/e-parts.md M-011 (A-005, A-015): the fixture imports
  // `ControlField`, `ControlField.Indicator`, `ControlFieldContext`, the
  // field parts (`Label`/`Description`/`FieldError`) and their types from
  // `@heroui/react` — it mounts only because the barrel exports them.
  test("M-011 ControlField and its types mount from the public entry", async () => {
    const app = await openField("row");

    expect(app.shows("id:cf-row")).toBe(true);
    expect(app.shows("id:cf-switch-track")).toBe(true);
    expect(app.shows("id:cf-switch-thumb")).toBe(true);
    expect(app.shows("id:cf-label")).toBe(true);
    expect(app.shows("text:Get notified about activity")).toBe(true);
  }, 120_000);

  // adapt-sheets/e-parts.md M-033 (A-016): the fixture itself is the
  // assertion carrier — every case opens and its probes record into
  // `app.storage()`.
  test("M-033 the fixture opens and its probes record", async () => {
    const app = await openField("row", { scope: "touch" });
    await app.press("id:cf-row");
    await app.waitUntil(() => callsOf(app, "change").length === 1);
    expect(callsOf(app, "ctx-pressed").length).toBeGreaterThan(0);
    expect(callsOf(app, "ctx-env").length).toBeGreaterThan(0);

    const fn = await openField("fn");
    expect(fn.shows("id:cf-row")).toBe(true);
    expect(fn.texts()).toContain("fn:sel=0,dis=0,inv=0");
  }, 120_000);

  // adapt-sheets/e-parts.md M-034 (A-017): the dual-environment structure —
  // host default and `EnvironmentScope(touch)` — mounts and answers probes
  // in the same test.
  test("M-034 both environments mount and answer probes", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openField("row", scope ? { scope } : {});
      expect(app.shows("id:cf-row")).toBe(true);
      await app.press("id:cf-row");
      await app.waitUntil(() => callsOf(app, "change").length === 1);
      const env = lastOf<CtxEnv>(app, "ctx-env");
      expect(env.enabled).toBe(scope === "touch");
    }
  }, 120_000);

  // adapt-sheets/e-parts.md M-036 (A-002): `animation="disable-all"` under
  // touch — the cascade flag reaches `isAllAnimationsDisabled` and the scale
  // channel is pinned to 1, while the canonical press still round-trips
  // (`pressed` still runs its 0→1→0, `isPressed` still toggles) and the
  // commit happens exactly once: the contract surface is not gated by
  // animation.
  test("M-036 animation=disable-all: scale pinned at rest while the canonical press still completes", async () => {
    const app = await openField("row", { scope: "touch", anim: "disable-all" });

    expect(lastOf<CtxEnv>(app, "ctx-env").allDisabled).toBe(true);

    // Held press: the canonical `pressed` channel still completes its run
    // (it is not a part animation — the sheet's M-007 precedent), while the
    // row's own scale channel sits pinned at 1.
    await app.longPress("id:cf-row");
    await app.waitUntil(() => heldSamples(app).length >= 1);
    const held = heldSamples(app).at(-1)!;
    expect(held.allDisabled).toBe(true);
    expect(held.seamPressed).toBe(true);
    expect(held.pressed).toBeGreaterThan(0.99);
    expect(held.scale).toBe(1);

    // After release every channel rests again and the commit fired once.
    await app.waitUntil(() => {
      const last = callsOf(app, "ctx-pressed").at(-1)?.[0] as
        | PressedEdge
        | undefined;
      return last !== undefined && !last.mirror && !last.seam;
    });

    await app.press("id:cf-row");
    await app.waitUntil(() => callsOf(app, "change").length === 1);
    expect(callsOf(app, "change")).toEqual([[true]]);
  }, 120_000);
});
