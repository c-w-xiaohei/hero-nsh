import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target mobile assertions for the radio adapt unit: the same M-001…
 * M-007 / M-009 / M-010 / M-011 assertion set as the headless file, minus M-008 —
 * `open({platform:"ios"})` host derivation is headless-only (`ERR_NSH_TEST_
 * UNSUPPORTED` on web).
 *
 * `platform:"web"` plays the pointer host; `EnvironmentScope input="touch"`
 * supplies the injected touch environment. On web this file also exercises
 * the real sticky hover M-004 is about: a press leaves `hover:` on under a
 * mobile environment, which A-004's `input()` short-circuit suppresses.
 *
 * `app.press` hit-tests on web: the "cats" Content is the row's own
 * pressable, so `id:row` resolves to the Content's handlers — the same
 * target headless gives.
 */

type Params = Record<string, string>;

function openRadio(params: Params = {}): Promise<App> {
  return open("../../../radio.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: "mobile", ...params } },
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
};

type CtxEnv = {
  enabled: boolean;
  hitSlop: Edges | null;
  hovered: boolean;
  selected: boolean;
  disabled: boolean;
  readonly: boolean;
};

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

function kinds(app: App): string[] {
  return callsOf(app, "events").map((c) => (c[0] as { kind: string }).kind);
}

describe("radio mobile (web)", () => {
  // adapt-sheets/radio.md M-001 (A-002, 负断言): the default pointer
  // environment leaves the touch-gated seam inert — channels at rest, no
  // hitSlop — while the press contract commits exactly once.
  test("M-001 default environment: feedback channels stay inert while the press contract holds", async () => {
    const app = await openRadio();

    await app.press("id:row");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([["cats"]]);
    expect(kinds(app)).toContain("press");

    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as PressedEdge);
    expect(edges.some((e) => e.mirror)).toBe(true);
    expect(edges.at(-1)).toEqual({ mirror: false, seam: false });
    expect(edges.every((e) => !e.seam)).toBe(true);

    await app.waitUntil(() => callsOf(app, "ctx-state").length > 0);
    for (const call of callsOf(app, "ctx-state")) {
      const s = call[0] as CtxState;
      expect(s.seamPressed).toBe(false);
      expect(s.hitSlop).toBeNull();
      expect(s.origin).toBeNull();
      expect(s.enabled).toBe(false);
    }

    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxState>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/radio.md M-002 (A-002, A-003): under an injected touch
  // environment the seam engages on press and the pinned-short row reports a
  // positive hitSlop expansion of ≈(44 − height)/2 per side.
  test("M-002 injected touch: the seam engages and the short row expands its hit area", async () => {
    const app = await openRadio({ scope: "touch", short: "1" });

    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);

    await app.waitUntil(() => callsOf(app, "ctx-state").length > 0);
    const rest = lastOf<CtxState>(app, "ctx-state");
    const padY = Math.max(0, (44 - rest.bounds.height) / 2);
    const padX = Math.max(0, (44 - rest.bounds.width) / 2);
    if (padY > 0 || padX > 0) {
      const slop = rest.hitSlop;
      expect(slop).not.toBeNull();
      expect(Math.abs(slop!.top - padY)).toBeLessThan(1);
      expect(Math.abs(slop!.bottom - padY)).toBeLessThan(1);
      expect(Math.abs(slop!.left - padX)).toBeLessThan(1);
      expect(Math.abs(slop!.right - padX)).toBeLessThan(1);
    }

    await app.press("id:row");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([["cats"]]);

    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as PressedEdge);
    expect(edges).toContainEqual({ mirror: true, seam: true });
    expect(edges.at(-1)).toEqual({ mirror: false, seam: false });
  }, 120_000);

  // adapt-sheets/radio.md M-003 (A-001): `min-h-11` gives a short touch row
  // its 44 pt minimum; the same row stays at content height under pointer.
  test("M-003 a short row measures at least 44pt under touch and stays short under pointer", async () => {
    const touch = await openRadio({ scope: "touch" });
    await touch.waitUntil(() => callsOf(touch, "layout").length > 0);
    const touchLayout = lastOf<{ height: number }>(touch, "layout");
    expect(touchLayout.height).toBeGreaterThanOrEqual(44);

    const pointer = await openRadio();
    await pointer.waitUntil(() => callsOf(pointer, "layout").length > 0);
    const pointerLayout = lastOf<{ height: number }>(pointer, "layout");
    expect(pointerLayout.height).toBeLessThan(44);
  }, 120_000);

  // adapt-sheets/radio.md M-004 (A-004): web's real sticky hover — under
  // touch neither a synthetic hover nor a press sets `isHovered` or fires a
  // hover callback; under pointer the enter/leave probes record as before.
  test("M-004 touch suppresses hover signals while pointer keeps them", async () => {
    const touch = await openRadio({ scope: "touch" });
    await touch.hover("id:row");
    await touch.press("id:row");
    await touch.waitUntil(() => callsOf(touch, "onChange").length === 1);
    await touch.hover("id:ctx-sample");

    expect(callsOf(touch, "hover")).toHaveLength(0);
    const touchEnvs = callsOf(touch, "ctx-env").map((c) => c[0] as CtxEnv);
    expect(touchEnvs.every((env) => env.hovered === false)).toBe(true);

    const pointer = await openRadio();
    await pointer.hover("id:row");
    await pointer.waitUntil(() =>
      callsOf(pointer, "hover").some(
        (c) => (c[0] as { kind: string }).kind === "start",
      ),
    );
    await pointer.hover("id:ctx-sample");
    await pointer.waitUntil(() =>
      callsOf(pointer, "hover").some(
        (c) => (c[0] as { kind: string }).kind === "end",
      ),
    );
  }, 120_000);

  // adapt-sheets/radio.md M-005 (A-005): one whole-row press commits exactly
  // once; a repeated press on the selected item submits the same value at
  // most once and never toggles it off.
  test("M-005 a whole-row press commits once and a repeated press never toggles off", async () => {
    const app = await openRadio({ scope: "touch" });

    await app.press("id:row");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([["cats"]]);

    await app.press("id:row");
    await app.waitUntil(
      () =>
        callsOf(app, "onChange").length >= 2 ||
        callsOf(app, "events").filter(
          (c) => (c[0] as { kind: string }).kind === "press",
        ).length === 2,
    );
    const changes = callsOf(app, "onChange").map((c) => c[0] as string);
    expect(changes.length).toBeLessThanOrEqual(2);
    for (const value of changes) {
      expect(value).toBe("cats");
    }
  }, 120_000);

  // adapt-sheets/radio.md M-006 (A-005): the Label press (`focusField`)
  // commits through the same single path: one `onChange`, one `onPress`.
  test("M-006 a Label press commits once through the focusField path", async () => {
    const app = await openRadio({ scope: "touch" });

    await app.press("id:row-label");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);

    expect(callsOf(app, "onChange")).toEqual([["cats"]]);
    expect(kinds(app).filter((k) => k === "press")).toHaveLength(1);
  }, 120_000);

  // adapt-sheets/radio.md M-007 (A-005): `ControlField` + `variant="radio"`
  // commits `onSelectedChange` exactly once per press — the adapted radio
  // never self-commits. The committed value is the row's controlled toggle
  // (`!isSelected`, upstream `control-field.tsx:73-74`); the 幂等置位 note
  // is the adapter's `select→true` path, which no press path reaches.
  test("M-007 ControlField radio variant: the row press commits onSelectedChange once", async () => {
    const app = await open("../../../radio.fixtures.tsx", {
      platform: "web",
      width: 1024,
      height: 768,
      host: { params: { case: "control-field", scope: "touch" } },
    });

    await app.press("id:cf-row");
    await app.waitUntil(() => callsOf(app, "change").length === 1);
    expect(callsOf(app, "change")).toEqual([[true]]);

    await app.press("id:cf-row");
    await app.waitUntil(() => callsOf(app, "change").length === 2);
    expect(callsOf(app, "change")).toEqual([[true], [false]]);
  }, 120_000);

  // adapt-sheets/radio.md M-009 (基线): the default-environment press
  // lifecycle and the single commit are the desktop contract.
  test("M-009 baseline: press lifecycle order and the commit are unchanged", async () => {
    const app = await openRadio();

    await app.press("id:row");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);

    expect(kinds(app)).toEqual(["down", "up", "press"]);
    expect(callsOf(app, "onChange")).toEqual([["cats"]]);
    expect(app.shows("id:row")).toBe(true);
  }, 120_000);

  // adapt-sheets/radio.md M-010 (A-006): the fixture mounts only because the
  // barrel exports `RadioItemContext` and its types; the probes prove the
  // feedback channel is readable.
  test("M-010 RadioItemContext mounts from the public entry and reports its channels", async () => {
    const app = await openRadio({ scope: "touch" });

    await app.waitUntil(() => callsOf(app, "ctx-env").length > 0);
    expect(app.shows("id:row")).toBe(true);
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);
  }, 120_000);

  // adapt-sheets/radio.md M-011 (A-007): the F波及 verdict recorded as a
  // test — an item registers exactly once through the unchanged
  // `RadioGroupContext.registerItem` path (no collection data, no second
  // owner): two different items commit one `onChange` apiece and the
  // selection marker migrates.
  test("M-011 the F verdict holds: items share the unchanged group collection", async () => {
    const app = await open("../../../radio.fixtures.tsx", {
      platform: "web",
      width: 1024,
      height: 768,
      host: { params: { case: "pets" } },
    });

    await app.press("role:radio[Cats]");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(app.shows("Cats:selected")).toBe(true);

    await app.press("role:radio[Dragons]");
    await app.waitUntil(() => callsOf(app, "onChange").length === 2);
    expect(callsOf(app, "onChange")).toEqual([["cats"], ["dragons"]]);
    expect(app.shows("Dragons:selected")).toBe(true);
    expect(app.shows("Cats:selected")).toBe(false);
  }, 120_000);
});
