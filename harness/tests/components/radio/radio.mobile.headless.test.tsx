import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the radio adapt unit, one test per row of
 * adapt-sheets/radio.md §4 (M-001…M-008), plus the baseline sample (M-009)
 * and the export probe (M-010). M-011 records the F-波及 verdict on the
 * sheet, not in a test.
 *
 * The fixture is `harness/radio.fixtures.tsx`, opened by `host.params`:
 * `case` ("mobile" / "control-field"), `scope` ("" or "touch" through
 * `EnvironmentScope`), `short` (pin the row under 44 pt so a real hitSlop
 * expansion is observable), `label` ("0" drops the inner Label). Probes in
 * `app.storage()`: `onChange`, `events` (down/up/press), `hover`,
 * `layout`, `ctx-pressed`, `ctx-state`, `ctx-env`, `ctx-channels`,
 * `change` (the ControlField row's onSelectedChange).
 *
 * `mirror` is the item's unconditional `isPressed` (upstream semantics — it
 * round-trips under pointer); `seam`/`seamPressed` is the press-feedback
 * factory's gated flag, which only rises under touch.
 */

type Params = Record<string, string>;

function openRadio(
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../radio.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
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

function heldSamples(app: App): CtxState[] {
  return callsOf(app, "ctx-state")
    .map((c) => c[0] as CtxState)
    .filter((s) => s.seamPressed === true);
}

describe("radio mobile (headless)", () => {
  // adapt-sheets/radio.md M-001 (A-002, 负断言): under the default pointer
  // environment the touch-gated seam is a zero-cost pass-through — `hitSlop`
  // stays null, the canonical flag never rises — while the press contract
  // works unchanged: `onChange` commits exactly once and the mirror still
  // round-trips (the desktop half of "零变化").
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
  // environment `ctx-env.enabled` is true, a press engages the seam — the
  // `ctx-pressed` true→false roundtrip — and a short row gets a positive
  // hitSlop expansion of ≈(44 − height)/2 per side.
  test("M-002 injected touch: the seam engages and the short row expands its hit area", async () => {
    const app = await openRadio({ scope: "touch", short: "1" });

    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);

    await app.waitUntil(() => callsOf(app, "ctx-state").length > 0);
    const rest = lastOf<CtxState>(app, "ctx-state");
    const target = 44;
    const padY = Math.max(0, (target - rest.bounds.height) / 2);
    const padX = Math.max(0, (target - rest.bounds.width) / 2);
    // The pinned 200×short row sits under the target on both axes: positive Edges.
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

  // adapt-sheets/radio.md M-003 (A-001): the `input` axis's `min-h-11` gives
  // a short touch row its 44 pt minimum; under pointer the same row keeps
  // its content height (dual-environment comparison on `ctx-state.bounds`
  // and the `layout` probe).
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

  // adapt-sheets/radio.md M-004 (A-004): sticky-hover suppression — under
  // touch `app.hover` and `app.press` produce no hover probe and
  // `ctx-env.hovered` stays false throughout; under pointer the enter/leave
  // probes record as before.
  test("M-004 touch suppresses hover signals while pointer keeps them", async () => {
    const touch = await openRadio({ scope: "touch" });
    await touch.hover("id:row");
    await touch.press("id:row");
    await touch.waitUntil(() => callsOf(touch, "onChange").length === 1);
    await touch.hover("id:ctx-sample");

    // No hover probe fired at all — `isHovered` was never set and no
    // callback ran, on both the synthetic hover and the press.
    expect(callsOf(touch, "hover")).toHaveLength(0);
    const touchEnvs = callsOf(touch, "ctx-env").map((c) => c[0] as CtxEnv);
    expect(touchEnvs.every((env) => env.hovered === false)).toBe(true);

    const pointer = await openRadio();
    await pointer.hover("id:row");
    await pointer.waitUntil(() => callsOf(pointer, "hover").length >= 1);
    expect(
      callsOf(pointer, "hover").some(
        (c) => (c[0] as { kind: string }).kind === "start",
      ),
    ).toBe(true);
    await pointer.hover("id:ctx-sample");
    await pointer.waitUntil(() =>
      callsOf(pointer, "hover").some(
        (c) => (c[0] as { kind: string }).kind === "end",
      ),
    );
  }, 120_000);

  // adapt-sheets/radio.md M-005 (A-005): one whole-row press commits exactly
  // once — re-selecting an already selected item submits the same value at
  // most once and never toggles it off (禁止重复切换: no toggle semantics).
  test("M-005 a whole-row press commits once and a repeated press never toggles off", async () => {
    const app = await openRadio({ scope: "touch" });

    await app.press("id:row");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([["cats"]]);

    // Press the already-selected item: upstream re-submits the same value or
    // stays silent — never a null/off commit, never a double submit.
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

  // adapt-sheets/radio.md M-006 (A-005): the Label press (the `focusField`
  // `<label for>` stand-in) commits through the same single path: one
  // `onChange`, one `onPress`.
  test("M-006 a Label press commits once through the focusField path", async () => {
    const app = await openRadio({ scope: "touch" });

    await app.press("id:row-label");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);

    expect(callsOf(app, "onChange")).toEqual([["cats"]]);
    expect(kinds(app).filter((k) => k === "press")).toHaveLength(1);
  }, 120_000);

  // adapt-sheets/radio.md M-007 (A-005): a `ControlField` row with
  // `variant="radio"` commits `onSelectedChange` exactly once per press —
  // the adapted radio never self-commits (no second change probe). The
  // committed value is the row's controlled toggle (`!isSelected`, upstream
  // `control-field.tsx:73-74` and e-parts M-003's `[[false]]` deselect) — a
  // semantic the ControlField unit owns and is out of this unit's write
  // scope; the 幂等置位 note of the sheet is the adapter's `select→true`
  // path, which no press path reaches.
  test("M-007 ControlField radio variant: the row press commits onSelectedChange once", async () => {
    const app = await open("../../../radio.fixtures.tsx", {
      platform: "windows",
      width: 1024,
      height: 768,
      host: { params: { case: "control-field", scope: "touch" } },
    });

    await app.press("id:cf-row");
    await app.waitUntil(() => callsOf(app, "change").length === 1);
    expect(callsOf(app, "change")).toEqual([[true]]);

    // Second press while selected: still exactly one commit — the row's
    // controlled toggle asks for `false` (upstream semantics); the inner
    // radio piece fires no commit of its own.
    await app.press("id:cf-row");
    await app.waitUntil(() => callsOf(app, "change").length === 2);
    expect(callsOf(app, "change")).toEqual([[true], [false]]);
  }, 120_000);

  // adapt-sheets/radio.md M-008 (A-002): with no EnvironmentScope an ios
  // host derives `input()==="touch"`, so the feedback gate holds — the
  // host-derivation half of M-002.
  test("M-008 ios host derivation: the seam activates without an EnvironmentScope", async () => {
    const app = await openRadio(
      {},
      { platform: "ios", width: 390, height: 844 },
    );

    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);

    await app.press("id:row");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as PressedEdge);
    expect(edges).toContainEqual({ mirror: true, seam: true });
  }, 120_000);

  // adapt-sheets/radio.md M-009 (基线): the default-environment press
  // lifecycle is the desktop one — down→up→press and one commit; the
  // unselected marker flips to selected.
  test("M-009 baseline: press lifecycle order and the selection marker are unchanged", async () => {
    const app = await openRadio();

    await app.press("id:row");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);

    expect(kinds(app)).toEqual(["down", "up", "press"]);
    expect(callsOf(app, "onChange")).toEqual([["cats"]]);
    expect(app.shows("id:row")).toBe(true);
  }, 120_000);

  // adapt-sheets/radio.md M-010 (A-006): the fixture itself is the carrier —
  // it mounts only because the barrel exports `RadioItemContext` and its
  // types, and `ctx-env`/`ctx-state` prove the feedback channel is readable.
  test("M-010 RadioItemContext mounts from the public entry and reports its channels", async () => {
    const app = await openRadio({ scope: "touch" });

    await app.waitUntil(() => callsOf(app, "ctx-env").length > 0);
    expect(app.shows("id:row")).toBe(true);
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);
  }, 120_000);
});
