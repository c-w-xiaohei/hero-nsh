import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the color-area adapt unit, one test per row
 * of adapt-sheets/color-area.md §4 (M-001…M-011). The rows that need a held
 * finger (`dragAndHold`/`drop`) or the `platform:"ios"` host derivation live
 * here — both are headless-only (sheet §6); `color-area.mobile.web.test.tsx`
 * carries the same settle-state assertions through `app.press`/`app.drag`.
 *
 * The fixture is `harness/color-area.fixtures.tsx`, opened by `host.params`:
 * `case` ("mobile" / "mobile-scroll" / "disabled" / "controlled"), `scope` ("" = host
 * default, "touch"/"pointer" through `EnvironmentScope`), `callerSlop` ("1"
 * gives the Thumb an explicit `hitSlop={2}`). Probes in `app.storage()`:
 * `onChange`/`onChangeEnd` ({hue,saturation,lightness,hsl}), `hover`
 * ({kind}), `ctx-env`, `ctx-layout` (thumb layout + the seam's hitSlop at that
 * instant), `ctx-thumb` (on-demand channel sample), `layout`
 * (area bounds), `scroll`/`scroll-drag`.
 *
 * The area is 200pt wide on `hsl(0, 0%, 50%)`: the thumb sits at the left
 * edge, mid-height, so the panel's centre is a genuine panel hit even after
 * the touch hitSlop expansion (±22pt around x≈0,y≈100).
 */

type Params = Record<string, string>;

function openArea(
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
  caseName = "mobile",
): Promise<App> {
  return open("../../../color-area.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type RecordedColor = {
  hue: number;
  saturation: number;
  lightness: number;
  hsl: string;
};

type CtxEnv = {
  enabled: boolean;
  hitSlop: Edges | number | null;
  seamPressed: boolean;
  bounds: { width: number; height: number };
};

type CtxThumb = {
  enabled: boolean;
  hitSlop: Edges | number | null;
  seamPressed: boolean;
  pressOrigin: { x: number; y: number } | null;
  bounds: { width: number; height: number };
};

type ThumbLayout = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hitSlop: Edges | number | null;
};

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

function thumbLayouts(app: App): ThumbLayout[] {
  return callsOf(app, "ctx-layout").map((c) => c[0] as ThumbLayout);
}

function slopOf(edges: Edges | number | null): number | null {
  if (edges === null) {
    return null;
  }
  return typeof edges === "number" ? edges : edges.top;
}

describe("color-area mobile (headless)", () => {
  // adapt-sheets/color-area.md M-001 (A-001, 负断言): under the default
  // pointer environment the invisible hit-area path does not exist — the
  // gate is off, `hitSlop()` answers undefined at every layout, the press
  // channels stay at rest — while the panel press contract (one onChange,
  // one onChangeEnd) holds unchanged.
  test("M-001 default environment: the thumb seam is absent while the press contract holds", async () => {
    const app = await openArea();

    await app.waitUntil(() => callsOf(app, "ctx-env").length > 0);
    const env = lastOf<CtxEnv>(app, "ctx-env");
    expect(env.enabled).toBe(false);
    expect(env.hitSlop).toBeNull();
    expect(env.seamPressed).toBe(false);

    // `app.press` delivers a synthetic responder grant without coordinates;
    // a real panel tap is a zero-delta dragAndHold + drop.
    await app.dragAndHold("id:area", { x: 0, y: 0 });
    await app.drop();
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);

    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-thumb").length > 0);
    const sample = lastOf<CtxThumb>(app, "ctx-thumb");
    expect(sample.enabled).toBe(false);
    expect(sample.hitSlop).toBeNull();
    expect(sample.seamPressed).toBe(false);
    expect(sample.pressOrigin).toBeNull();

    for (const layout of thumbLayouts(app)) {
      expect(layout.hitSlop).toBeNull();
    }
  }, 120_000);

  // M-002 (A-001): injected touch expands the thumb's hit area to the 44pt
  // target — ≈14pt of slop per side at 16pt, ≈12pt while the drag grows the
  // thumb to 20pt — a caller's own hitSlop wins, and `isDisabled` closes the
  // seam.
  test("M-002 injected touch: hitSlop tracks the thumb's 16/20pt size, caller value wins, disabled closes", async () => {
    const app = await openArea({ scope: "touch" });

    await app.waitUntil(() => thumbLayouts(app).length > 0);
    const rest = thumbLayouts(app).at(-1)!;
    expect(rest.width).toBe(16);
    expect(slopOf(rest.hitSlop)).toBeGreaterThan(13);
    expect(slopOf(rest.hitSlop)).toBeLessThan(15);

    const env = lastOf<CtxEnv>(app, "ctx-env");
    expect(env.enabled).toBe(true);

    // Mid-drag the thumb is 20pt: (44 − 20) / 2 = 12pt of slop.
    await app.dragAndHold("id:area", { x: 60, y: 0 });
    await app.waitUntil(() => thumbLayouts(app).at(-1)!.width === 20);
    const held = thumbLayouts(app).at(-1)!;
    expect(slopOf(held.hitSlop)).toBeGreaterThan(11);
    expect(slopOf(held.hitSlop)).toBeLessThan(13);
    await app.drop();

    // A caller's explicit `hitSlop` does not feed back into the seam: the
    // gate and the 44 pt computation report the same Edges. The effective
    // bound value is a view prop `nsh/test` cannot read (sheet §6), so
    // caller priority degrades to this channel check — the same registered
    // gap radio and pressable-feedback carry.
    const caller = await openArea({ scope: "touch", callerSlop: "1" });
    await caller.waitUntil(() => {
      const last = callsOf(caller, "ctx-env").at(-1)?.[0] as CtxEnv | undefined;
      return last !== undefined && last.hitSlop !== null;
    });
    const callerEnv = lastOf<CtxEnv>(caller, "ctx-env");
    expect(callerEnv.enabled).toBe(true);
    expect(slopOf(callerEnv.hitSlop)).toBeGreaterThan(13);
    expect(slopOf(callerEnv.hitSlop)).toBeLessThan(15);

    // `isDisabled` closes the gate: enabled false, hitSlop undefined.
    const disabled = await openArea({ scope: "touch" }, {}, "disabled");
    await disabled.waitUntil(() => callsOf(disabled, "ctx-env").length > 0);
    const disabledEnv = lastOf<CtxEnv>(disabled, "ctx-env");
    expect(disabledEnv.enabled).toBe(false);
    expect(disabledEnv.hitSlop).toBeNull();
  }, 120_000);

  // M-003 (A-002): injected touch — a panel tap keeps tap-to-jump through the
  // deferred press (one onChange, one onChangeEnd); a real drag writes per
  // frame from dragOrigin and releases without a second commit.
  test("M-003 injected touch: tap commits once from the deferred press, drags stream frames and end once", async () => {
    const app = await openArea({ scope: "touch" });

    // A real touch-tap: down, no move, up. The deferred press commits once.
    await app.dragAndHold("id:area", { x: 0, y: 0 });
    await app.drop();
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    const tapChange = lastOf<RecordedColor>(app, "onChange");
    // The panel centre is saturation 50 / lightness 50 in this fixture.
    expect(Math.abs(tapChange.saturation - 50)).toBeLessThanOrEqual(6);
    expect(Math.abs(tapChange.lightness - 50)).toBeLessThanOrEqual(6);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);

    const before = callsOf(app, "onChangeEnd").length;
    await app.drag("id:area", { x: 60, y: 0 });
    const changes = callsOf(app, "onChange");
    expect(changes.length).toBeGreaterThan(1);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(before + 1);
    expect(lastOf<RecordedColor>(app, "onChangeEnd").hsl).toBe(
      (changes.at(-1)![0] as RecordedColor).hsl,
    );
  }, 120_000);

  // M-004 (A-002): injected touch — the grant does not write: a finger held
  // without moving leaves `isDragging` set (the thumb grows) while onChange
  // stays silent; the release commits the deferred landing point once.
  test("M-004 injected touch: a held finger writes nothing until release commits the tap once", async () => {
    const app = await openArea({ scope: "touch" });

    await app.dragAndHold("id:area", { x: 0, y: 0 });

    expect(app.shows("text:Dragging")).toBe(true);
    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(0);

    await app.drop();

    expect(callsOf(app, "onChange")).toHaveLength(1);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);
    expect(app.shows("text:Idle")).toBe(true);
  }, 120_000);

  // M-005 (A-002): injected touch — a vertical drag inside a Scroll: if the
  // host hands the touches to the scroller (offset moves / scroll events
  // arrive), the deferred press is dropped — at most the pre-handover frames
  // wrote, the interaction still ends exactly once, and nothing new lands
  // after the handover. If the JS responder keeps the gesture it simply
  // writes per frame; either branch ends once (the frame-level race is the
  // registered host gap, sheet §6).
  test("M-005 injected touch: a scroll handover drops the pending press without a late commit", async () => {
    const app = await openArea({ scope: "touch" }, {}, "mobile-scroll");

    // Upward drag: the Scroll can actually take the gesture (a downward
    // drag at the top edge can never move the offset, so it would only
    // ever exercise the non-handover branch).
    await app.drag("id:area", { x: 0, y: -80 });
    await app.wait(300);

    const scrolls = callsOf(app, "scroll").map((c) => c[0] as { x: number; y: number });
    const handed = scrolls.some((s) => Math.abs(s.y) > 0);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);

    const changesAfterEnd = callsOf(app, "onChange").length;
    await app.wait(300);
    expect(callsOf(app, "onChange").length).toBe(changesAfterEnd);

    if (handed) {
      // Handover observed: the deferred press must have been dropped. The
      // only way a lone press-point commit ({hue 180, sat 50} — panel
      // centre, zero moves) can appear is the pendingPress committing
      // after the steal; real moves write saturation ≠ 50.
      const last = callsOf(app, "onChange").at(-1)?.[0] as
        | RecordedColor
        | undefined;
      const pendingSignature =
        changesAfterEnd === 1 &&
        last !== undefined &&
        Math.abs(last.hue - 180) <= 3 &&
        Math.abs(last.saturation - 50) <= 2;
      expect(pendingSignature).toBe(false);
    } else {
      // The JS responder kept the gesture: it wrote per frame — and still
      // ended exactly once above.
      expect(changesAfterEnd).toBeGreaterThan(0);
    }
  }, 120_000);

  // M-006 (A-003): injected touch — neither a synthetic hover nor a press or
  // drag on the thumb sets isHovered or fires a hover callback; under
  // pointer the enter/leave round-trip still reports start/change/end.
  test("M-006 touch suppresses the thumb's hover signals while pointer keeps them", async () => {
    const touch = await openArea({ scope: "touch" });
    await touch.hover("id:thumb");
    await touch.press("id:thumb");
    await touch.waitUntil(() => callsOf(touch, "onChangeEnd").length >= 1);

    expect(callsOf(touch, "hover")).toHaveLength(0);
    expect(touch.shows("text:Hover")).toBe(false);

    const pointer = await openArea();
    await pointer.hover("id:thumb");
    await pointer.waitUntil(() => callsOf(pointer, "hover").length > 0);
    const kinds = callsOf(pointer, "hover").map((c) => (c[0] as { kind: string }).kind);
    expect(kinds).toContain("start");
    expect(pointer.shows("text:Hover")).toBe(true);

    await pointer.hover("id:ctx-sample");
    await pointer.waitUntil(() =>
      callsOf(pointer, "hover").some((c) => (c[0] as { kind: string }).kind === "end"),
    );
  }, 120_000);

  // M-007 (A-004): injected touch — the thumb's own responder survives the
  // hitSlop expansion intact: grant → move → release drives both channels
  // and ends exactly once, order unbroken.
  test("M-007 injected touch: a thumb drag writes both channels and ends once", async () => {
    const app = await openArea({ scope: "touch" });

    await app.dragAndHold("id:thumb", { x: 60, y: -40 });
    expect(app.shows("text:Dragging")).toBe(true);
    expect(callsOf(app, "onChange").length).toBeGreaterThanOrEqual(1);

    await app.drop();
    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);
    const end = lastOf<RecordedColor>(app, "onChangeEnd");
    const last = lastOf<RecordedColor>(app, "onChange");
    expect(end.hsl).toBe(last.hsl);
    expect(app.shows("text:Idle")).toBe(true);
  }, 120_000);

  // M-008 (A-005): the panel's geometry has no environment axis — both
  // environments measure the same ≤224pt square, and the thumb's visible
  // size is 16pt either way.
  test("M-008 both environments measure the same square panel and 16pt thumb", async () => {
    const pointer = await openArea();
    await pointer.waitUntil(() => callsOf(pointer, "layout").length > 0);
    const pArea = lastOf<{ width: number; height: number }>(pointer, "layout");
    const pThumb = thumbLayouts(pointer).at(-1)!;

    const touch = await openArea({ scope: "touch" });
    await touch.waitUntil(() => callsOf(touch, "layout").length > 0);
    const tArea = lastOf<{ width: number; height: number }>(touch, "layout");
    const tThumb = thumbLayouts(touch).at(-1)!;

    expect(pArea.width).toBeLessThanOrEqual(224);
    expect(Math.abs(pArea.width - pArea.height)).toBeLessThanOrEqual(1);
    expect(tArea.width).toBe(pArea.width);
    expect(tArea.height).toBe(pArea.height);
    expect(pThumb.width).toBe(16);
    expect(tThumb.width).toBe(16);
  }, 120_000);

  // M-009 (A-002 + isDisabled): injected touch — a disabled area takes no
  // input at all: no change, no end, no dragging flag.
  test("M-009 injected touch + isDisabled: the area stays silent", async () => {
    const app = await openArea({ scope: "touch" }, {}, "disabled");

    expect(app.enabled("id:area")).toBe(false);
    await expect(app.press("id:area")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    await expect(app.press("role:adjustable")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });

    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(0);
  }, 120_000);

  // M-010 (基线, pointer half): under the default environment the grant
  // writes immediately — M-004's counterpart: a held finger has already
  // produced onChange before the release, the drag streams and ends once;
  // on the ios host the untouched host derivation feeds the same touch gate
  // (the second half of M-002's environment check).
  test("M-010 baseline: pointer grant writes at once; the ios host derives touch", async () => {
    const app = await openArea();

    await app.dragAndHold("id:area", { x: 60, y: 0 });
    expect(app.shows("text:Dragging")).toBe(true);
    // The grant wrote: at least one change exists before the finger lifts.
    expect(callsOf(app, "onChange").length).toBeGreaterThanOrEqual(1);
    await app.drop();
    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);

    const ios = await openArea({}, { platform: "ios", width: 390, height: 844 });
    await ios.waitUntil(() => callsOf(ios, "ctx-env").length > 0);
    expect(lastOf<CtxEnv>(ios, "ctx-env").enabled).toBe(true);

    // 抽样对照 (sheet M-010): RTL mirroring is unchanged — the same panel
    // drag under `ar-EG` lands near hue 90, X-007's contract.
    const rtl = await open("../../../color-area.fixtures.tsx", {
      platform: "windows",
      width: 1024,
      height: 768,
      locale: "ar-EG",
      host: { params: { case: "rtl-drag" } },
    });
    await rtl.drag("id:area", { x: 50, y: 0 });
    const rtlLast = callsOf(rtl, "onChange")
      .map((c) => c[0] as RecordedColor)
      .at(-1)!;
    expect(Math.abs(rtlLast.hue - 90)).toBeLessThanOrEqual(10);
  }, 120_000);

  // M-011 (基线移动对偶): injected touch — the keyboard contract is
  // unchanged: a thumb press focuses it (onChangeEnd reports the tap), one
  // arrow key steps once without isDragging, one Page key wraps its change
  // in a single onChangeEnd. macOS headless is used because windows
  // headless has a registered keyboard-focus gap (loop _common).
  test("M-011 injected touch: keyboard steps and Page wrapping are unchanged", async () => {
    const app = await openArea(
      { scope: "touch" },
      { platform: "macos", width: 1024, height: 768 },
    );

    await app.press("id:thumb");
    await app.waitUntil(() => callsOf(app, "onChangeEnd").length === 1);

    await app.keyboard.press("right");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(app.shows("text:Dragging")).toBe(false);

    await app.keyboard.press("pageup");
    await app.waitUntil(() => callsOf(app, "onChangeEnd").length === 2);
    expect(callsOf(app, "onChange").length).toBe(2);

    // 受控 value/onChangeEnd 单发 (sheet M-011): a controlled area reports
    // every proposal but never adopts it — the displayed-color probe stays
    // on the held value and the drag still ends exactly once.
    const controlled = await openArea({ scope: "touch" }, {}, "controlled");
    await controlled.drag("id:area", { x: 60, y: 0 });
    await controlled.waitUntil(
      () => callsOf(controlled, "onChangeEnd").length === 1,
    );
    expect(callsOf(controlled, "onChange").length).toBeGreaterThanOrEqual(1);
    const displayed = callsOf(controlled, "value").map(
      (c) => (c[0] as { hsl: string }).hsl,
    );
    expect(displayed.length).toBeGreaterThan(0);
    expect(new Set(displayed).size).toBe(1);
  }, 120_000);
});
