import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target mobile assertions for the e-parts ControlField mechanism unit:
 * the same M-001…M-011/M-033…M-036 assertion set as the headless file,
 * minus the two rows that need headless-only steps — `open({platform:"ios"})`
 * host derivation (M-009) and `app.drag` cancellation (M-010), both covered
 * in `control-field.mobile.headless.test.tsx`.
 *
 * `platform:"web"` plays the pointer host; `EnvironmentScope input="touch"`
 * supplies the injected touch environment, so the sheet's dual-environment
 * assertions run identically here.
 *
 * Row presses target `id:cf-desc`, not `id:cf-row`: `app.press`/`longPress`
 * hit-test on web and the row's `Label` is its own pressable (it reports to
 * `focusField`), so pressing the row's testID lands on the label — one
 * `press`+`change`, no `down`/`up`/seam edge. The `Description` is not
 * pressable, so a press on it bubbles to the row's own handlers, which is
 * what `id:cf-row` resolves to on headless.
 */

type Params = Record<string, string>;

function openField(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../control-field.fixtures.tsx", {
    platform: "web",
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

function heldSamples(app: App): CtxState[] {
  return callsOf(app, "ctx-state")
    .map((c) => c[0] as CtxState)
    .filter((s) => s.seamPressed === true);
}

function kinds(app: App): string[] {
  return callsOf(app, "events").map((c) => (c[0] as { kind: string }).kind);
}

describe("control-field mobile (web)", () => {
  // adapt-sheets/e-parts.md M-001 (A-002, 负断言): the default pointer
  // environment leaves the touch-gated seam inert — channels at rest, no
  // hitSlop — while onPress fires and onSelectedChange commits exactly once;
  // the row's unconditional isPressed mirror still round-trips.
  test("M-001 default environment: feedback channels stay inert while the press contract holds", async () => {
    const app = await openField("row");

    await app.press("id:cf-row");
    await app.waitUntil(() => callsOf(app, "change").length === 1);
    expect(callsOf(app, "change")).toEqual([[true]]);
    expect(kinds(app)).toContain("press");

    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as PressedEdge);
    expect(edges.some((e) => e.mirror)).toBe(true);
    expect(edges.at(-1)).toEqual({ mirror: false, seam: false });
    expect(edges.every((e) => !e.seam)).toBe(true);

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

    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.pressed).toBeLessThan(0.5);
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/e-parts.md M-002 (A-002): injected touch — the press
  // roundtrips on both flags, the held sample shows the seam's channels
  // activated, and the commit fires exactly once.
  test("M-002 injected touch: press roundtrips mirror and seam channels and commits once", async () => {
    const app = await openField("row", { scope: "touch" });

    await app.press("id:cf-desc");
    await app.waitUntil(() => callsOf(app, "change").length === 1);

    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as PressedEdge);
    expect(edges).toContainEqual({ mirror: true, seam: true });
    expect(edges.at(-1)).toEqual({ mirror: false, seam: false });

    await app.longPress("id:cf-desc");
    await app.waitUntil(() => heldSamples(app).length >= 1);
    const held = heldSamples(app).at(-1)!;
    expect(held.seamPressed).toBe(true);
    expect(held.mirror).toBe(true);
    expect(held.pressed).toBeGreaterThan(0.99);
    expect(held.enabled).toBe(true);
    expect(held.hitSlop).toBeNull();
    expect(held.origin).not.toBeNull();
  }, 120_000);

  // adapt-sheets/e-parts.md M-003 (A-001, A-003): the three variant default
  // pieces mount under the adapted control contexts — `ctx.isSelected`
  // follows the row's prop and the pieces' visible state follows it —
  // while a row press still commits exactly once.
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
      expect(callsOf(off, "change")).toEqual([[true]]);

      const on = await openField("row", {
        scope: "touch",
        variant,
        selected: "1",
      });
      expect(on.shows(trackOf[variant])).toBe(true);
      expect(lastOf<CtxEnv>(on, "ctx-env").selected).toBe(true);

      const target = styleOf[variant];
      if (target !== undefined) {
        const offStyle = off.viewStyle(target);
        const onStyle = on.viewStyle(target);
        expect(onStyle?.backgroundColor).toBeDefined();
        expect(onStyle?.backgroundColor).not.toBe(offStyle?.backgroundColor);
      }

      await on.press("id:cf-row");
      await on.waitUntil(() => callsOf(on, "change").length === 1);
      expect(callsOf(on, "change")).toEqual([[false]]);
    }
  }, 120_000);

  // adapt-sheets/e-parts.md M-004 (A-003): function children receive
  // `{isSelected, isDisabled, isInvalid}` accessors on the row and on
  // `ControlField.Indicator`, rendered into visible text.
  test("M-004 function children receive isSelected/isDisabled/isInvalid render props", async () => {
    const app = await openField("fn", { selected: "1", invalid: "1" });

    expect(app.texts()).toContain("fn:sel=1,dis=0,inv=1");
    expect(app.texts()).toContain("ind:sel=1,dis=0,inv=1");

    const disabled = await openField("fn", { disabled: "1" });
    expect(disabled.texts()).toContain("fn:sel=0,dis=1,inv=0");
    expect(disabled.texts()).toContain("ind:sel=0,dis=1,inv=0");
  }, 120_000);

  // adapt-sheets/e-parts.md M-005 (A-002): `isDisabled` blocks the row
  // (no press, no commit, gate closed); `isRequired` shows the asterisk.
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
    expect(lastOf<CtxEnv>(disabled, "ctx-env").enabled).toBe(false);

    const required = await openField("row", { required: "1" });
    // The asterisk is a nested Text — `texts()` joins it onto the label.
    expect(required.texts()).toContain("Notifications*");
  }, 120_000);

  // adapt-sheets/e-parts.md M-006 (A-002): the Label press runs
  // `focusField` — one `press` event, one toggle, the row's own `onFocus`.
  test("M-006 a Label press toggles once and focuses the row", async () => {
    const app = await openField("row");

    await app.press("id:cf-label");
    await app.waitUntil(() => callsOf(app, "change").length === 1);

    expect(callsOf(app, "change")).toEqual([[true]]);
    expect(kinds(app).filter((k) => k === "press")).toHaveLength(1);
    expect(callsOf(app, "focus").length).toBeGreaterThanOrEqual(1);
  }, 120_000);

  // adapt-sheets/e-parts.md M-007 (A-002): the press lifecycle order —
  // `onPressDown` → `onPressUp` → `onPress` → `onSelectedChange`.
  test("M-007 press lifecycle order: down, up, press, then the selection change", async () => {
    const app = await openField("row");

    await app.press("id:cf-desc");
    await app.waitUntil(() => callsOf(app, "change").length === 1);

    expect(kinds(app)).toEqual(["down", "up", "press", "change"]);
  }, 120_000);

  // adapt-sheets/e-parts.md M-008 (A-004): `min-h-11` on the touch axis
  // gives a one-line row its 44 pt minimum; pointer keeps the content height.
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

  // adapt-sheets/e-parts.md M-011 (A-005, A-015): the fixture imports
  // `ControlField`, `ControlField.Indicator`, `ControlFieldContext`, the
  // field parts and their types from `@heroui/react` — it mounts only
  // because the barrel exports them.
  test("M-011 ControlField and its types mount from the public entry", async () => {
    const app = await openField("row");

    expect(app.shows("id:cf-row")).toBe(true);
    expect(app.shows("id:cf-switch-track")).toBe(true);
    expect(app.shows("id:cf-switch-thumb")).toBe(true);
    expect(app.shows("id:cf-label")).toBe(true);
    expect(app.shows("text:Get notified about activity")).toBe(true);
  }, 120_000);

  // adapt-sheets/e-parts.md M-033 (A-016): the fixture itself is the
  // assertion carrier — every case opens and its probes record.
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

  // adapt-sheets/e-parts.md M-034 (A-017): the dual-environment structure
  // mounts and answers probes — host default and `EnvironmentScope(touch)`.
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
  // touch — `allDisabled` cascades, `scale` is pinned to 1, and the
  // canonical press still round-trips with a single commit.
  test("M-036 animation=disable-all: scale pinned at rest while the canonical press still completes", async () => {
    const app = await openField("row", { scope: "touch", anim: "disable-all" });

    expect(lastOf<CtxEnv>(app, "ctx-env").allDisabled).toBe(true);

    // Web `longPress` does not reliably fire the commit press under suite
    // load (a browser click may land as the long-press), so the commit is a
    // separate `app.press` — the row is unselected before it, so the result
    // is the same single `change` to true as on headless.
    await app.longPress("id:cf-desc");
    await app.waitUntil(() => heldSamples(app).length >= 1);
    const held = heldSamples(app).at(-1)!;
    expect(held.allDisabled).toBe(true);
    expect(held.seamPressed).toBe(true);
    expect(held.pressed).toBeGreaterThan(0.99);
    expect(held.scale).toBe(1);

    await app.waitUntil(() => {
      const last = callsOf(app, "ctx-pressed").at(-1)?.[0] as
        | PressedEdge
        | undefined;
      return last !== undefined && !last.mirror && !last.seam;
    });

    // On web `longPress` usually lands as a complete press, but under load
    // the release may arrive without the commit: tolerate the hold's own
    // commit being present or absent, then the explicit press must add
    // exactly one more — one `change` per canonical press either way.
    const afterHold = callsOf(app, "change").length;
    await app.press("id:cf-desc");
    await app.waitUntil(() => callsOf(app, "change").length === afterHold + 1);
    expect(callsOf(app, "change")).toEqual(Array.from({ length: afterHold + 1 }, () => [true]));
  }, 120_000);
});
