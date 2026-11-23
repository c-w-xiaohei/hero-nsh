import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the slider adapt unit, one test per row of
 * adapt-sheets/slider.md §4 that the shared (native + headless + web)
 * targets can observe: M-001, M-002, M-003's claim-direction half, M-005,
 * M-007…M-009 (with M-011's press-channel rest fields folded into
 * M-009's post-drag block) and M-012. The Scroll-arbitration rows
 * (M-004, M-010), M-003's `dragAndHold` mid-drag sampling and M-009's
 * held-drag half live in `slider.mobile.headless.test.tsx`.
 *
 * The fixture is `harness/slider.fixtures.tsx` — `case` picks the surface
 * (`mobile` for the seam/gesture probes, `scroll` unused here, `keyboard` /
 * `controlled` / `disabled` for the M-008 parity half), `scope` mounts an
 * `EnvironmentScope input="touch"|"pointer"` the assertions inject,
 * `probe="1"` mounts the per-part `CtxProbe`s inside each part's own
 * `SliderSeamContext`, and `orientation` / `disabled` / `defaultValue` /
 * `step` / `minValue` / `maxValue` tune the slider. Native hosts fill the
 * device screen, so the `platform:"windows"` / 1024×768 pin is gone: the
 * desktop-parity baseline is the explicit `scope="pointer"` injection
 * instead — without it a phone-derived input of touch would invert every
 * pointer-default assertion. The hover rows (M-006), M-011's hover arm and
 * M-008's `platform:"web"` keyboard half live in
 * `slider.mobile.web.test.tsx`.
 *
 * The observation channel is what `nsh/test` sees: the `@scenario/probe`
 * records in `app.storage()` — `onChange`/`onChangeEnd` counts and payloads,
 * `ctx-env` (per-part `enabled`/`hitSlop`/`bounds`/`isPressed`/`pressOrigin`/
 * `scale`/`panKeys`/`panActive`), the `Dragging`/`Hovered` marker texts, the
 * hover trio, `onFocus`/`onBlur`, `layout` bounds and the `output` text —
 * plus `shows`/`texts`/`count`/`enabled` for the markers and the
 * accessibility tree.
 *
 * Host gaps this file rides (adapt sheet §6): `app.press` resolves only
 * pressable views — the slider's responder parts are not one — so the "tap"
 * halves of M-005/M-008/M-011/M-012 use `app.drag` with zero displacement,
 * the tap the harness can deliver (down+up, no move frame — the
 * color-slider mobile file's proven equivalent of the sheet's
 * `dragAndHold(sel,{x:0})`+`drop()`, which is headless-only); `hitSlop` has
 * no read channel, so M-001/M-002 assert the seam's computed value plus
 * `bounds + slop ≥ 44`; and `isDragging` mid-drag has no dual-target sample
 * (`app.drag` serializes behind `waitUntil`, `dragAndHold` is
 * headless-only), so the true→false roundtrip is sampled in the headless
 * file while this file asserts the settled `Idle` marker.
 */

type CtxEnv = {
  part: "track" | "thumb";
  enabled: boolean | null;
  hitSlop: { top?: number; right?: number; bottom?: number; left?: number } | null;
  bounds: { width: number; height: number } | null;
  isPressed: boolean | null;
  pressOrigin: unknown;
  scale: number | null;
  panKeys: number | null;
  panActive: boolean | null;
};

type LayoutEntry = { name: string; index: number; x: number; y: number; width: number; height: number };

function openSlider(
  caseName: string,
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../slider.fixtures.tsx", {
    host: { params: { case: caseName, ...params } },
  });
}

function ctxEnvAll(app: App, part: "track" | "thumb"): CtxEnv[] {
  return callsOf(app, "ctx-env")
    .map((args) => args[0] as CtxEnv)
    .filter((record) => record.part === part);
}

function lastCtxEnv(app: App, part: "track" | "thumb"): CtxEnv {
  const records = ctxEnvAll(app, part);
  const last = records.at(-1);

  if (!last) throw new Error(`ctx-env reported nothing for ${part}`);

  return last;
}

/**
 * Waits until both parts' `CtxProbe`s have reported at least once with a
 * laid-out bounds — the hitSlop/bounds assertions read the last record,
 * which is only meaningful after `onLayout` fed `feedback.layout`.
 */
async function waitForSeams(app: App): Promise<void> {
  await app.waitUntil(() =>
    (["track", "thumb"] as const).every((part) =>
      ctxEnvAll(app, part).some(
        (record) => record.bounds !== null && record.bounds.width > 0,
      ),
    ),
  );
}

function lastLayout(app: App, name: string, index = 0): LayoutEntry {
  const records = callsOf(app, "layout")
    .map((args) => args[0] as LayoutEntry)
    .filter((record) => record.name === name && record.index === index);
  const last = records.at(-1);

  if (!last) throw new Error(`layout reported nothing for ${name}`);

  return last;
}

function onChangeValues(app: App): number[] {
  return callsOf(app, "onChange").map((args) => Number(args[0]));
}

describe("slider mobile", () => {
  // adapt-sheets/slider.md M-001 (A-001): under the injected touch
  // environment the thumb's `hitSlop` pads the 28 pt knob to the 44 pt
  // minimum on both axes, the seam gate reads open, and the press half of
  // the channel stays at rest — the thumb walks the responder system, so
  // `pressDown`/`pressUp`/`scale`/`isPressed` are never wired (the sheet's
  // "不谎报按压" half).
  test("M-001 touch: thumb hitSlop reaches 44pt both axes while the press channels stay at rest", async () => {
    const app = await openSlider("mobile", { scope: "touch", probe: "1" });
    await waitForSeams(app);

    const thumb = lastCtxEnv(app, "thumb");
    expect(thumb.enabled).toBe(true);
    expect(thumb.hitSlop).not.toBeNull();
    expect(thumb.bounds).not.toBeNull();

    const slop = thumb.hitSlop!;
    const bounds = thumb.bounds!;
    expect(bounds.width + (slop.left ?? 0) + (slop.right ?? 0)).toBeGreaterThanOrEqual(44);
    expect(bounds.height + (slop.top ?? 0) + (slop.bottom ?? 0)).toBeGreaterThanOrEqual(44);

    // A real axial drag, then every reactive report — mount and every later
    // edge — still reads the press flag, origin and scale channel at rest.
    await app.drag("id:thumb", { x: 60, y: 0 });

    const records = ctxEnvAll(app, "thumb");
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) {
      expect(record.isPressed ?? false).toBe(false);
      expect(record.pressOrigin ?? null).toBeNull();
      expect(record.scale ?? 1).toBe(1);
    }
  });

  // adapt-sheets/slider.md M-002 (A-002): under touch the track's `hitSlop`
  // pads only the cross axis — a horizontal track is 20 pt tall (top/bottom
  // slop), a vertical one 20 pt wide (left/right slop) — while the along
  // axis, already past the minimum, gets none.
  test("M-002 touch: track hitSlop pads the cross axis to 44pt in both orientations", async () => {
    const horizontal = await openSlider("mobile", { scope: "touch", probe: "1" });
    await waitForSeams(horizontal);

    const hTrack = lastCtxEnv(horizontal, "track");
    expect(hTrack.enabled).toBe(true);
    expect(hTrack.hitSlop).not.toBeNull();
    expect(hTrack.bounds).not.toBeNull();

    const hSlop = hTrack.hitSlop!;
    expect(hSlop.top ?? 0).toBeGreaterThan(0);
    expect(hSlop.bottom ?? 0).toBeGreaterThan(0);
    expect(hSlop.left ?? 0).toBe(0);
    expect(hSlop.right ?? 0).toBe(0);
    expect(hTrack.bounds!.height + (hSlop.top ?? 0) + (hSlop.bottom ?? 0)).toBeGreaterThanOrEqual(44);

    const vertical = await openSlider("mobile", {
      scope: "touch",
      probe: "1",
      orientation: "vertical",
    });
    await waitForSeams(vertical);

    const vTrack = lastCtxEnv(vertical, "track");
    expect(vTrack.enabled).toBe(true);
    expect(vTrack.hitSlop).not.toBeNull();
    expect(vTrack.bounds).not.toBeNull();

    const vSlop = vTrack.hitSlop!;
    expect(vSlop.left ?? 0).toBeGreaterThan(0);
    expect(vSlop.right ?? 0).toBeGreaterThan(0);
    expect(vSlop.top ?? 0).toBe(0);
    expect(vSlop.bottom ?? 0).toBe(0);
    expect(vTrack.bounds!.width + (vSlop.left ?? 0) + (vSlop.right ?? 0)).toBeGreaterThanOrEqual(44);
  });

  test("track drag can start where the thumb was before a drag", async () => {
    const app = await openSlider("mobile", { scope: "touch", defaultValue: "50" });
    await app.drag("id:thumb", { x: 100, y: 0 });
    expect(onChangeValues(app).at(-1)!).toBeGreaterThan(65);

    const changes = onChangeValues(app).length;
    await app.drag("id:track", { x: -60, y: 0 });
    expect(onChangeValues(app).length).toBeGreaterThan(changes + 1);
    expect(onChangeValues(app).at(-1)!).toBeLessThan(50);
  });

  // adapt-sheets/slider.md M-003 (A-003, A-004), claim-direction half:
  // under touch with no surrounding Scroll, an axial drag on either part is
  // claimed by the pan — `onChange` reports per frame, `onChangeEnd` fires
  // exactly once per interaction, and the `Dragging` marker settles back to
  // `Idle`. The `dragAndHold` mid-drag sampling is the headless file's half
  // of this row. The thumb window [43, 49] is the delta-vs-jump check: a
  // 60 pt drag from 30 on the 376 pt usable track lands at ~46 by delta,
  // while a track-style press-jump off the thumb's centre would read ~50.
  test("M-003 touch: axial drags on thumb and track claim the pan in both orientations", async () => {
    // Horizontal thumb: delta drag — the value moves by the finger's travel.
    const thumb = await openSlider("mobile", { scope: "touch" });
    await thumb.drag("id:thumb", { x: 60, y: 0 });

    expect(callsOf(thumb, "onChange").length).toBeGreaterThan(1);
    expect(callsOf(thumb, "onChangeEnd")).toHaveLength(1);
    const thumbValues = onChangeValues(thumb);
    expect(thumbValues[0]).toBeLessThan(40);
    expect(thumbValues.at(-1)!).toBeGreaterThanOrEqual(43);
    expect(thumbValues.at(-1)!).toBeLessThanOrEqual(49);
    expect(thumb.count("text:Dragging")).toBe(0);

    // Horizontal track: the drag jumps to the touch point first (the finger
    // lands on the track's middle → ~50), then follows the finger — the
    // sequence starts at the jump value.
    const track = await openSlider("mobile", { scope: "touch" });
    await track.drag("id:track", { x: 60, y: 0 });

    expect(callsOf(track, "onChange").length).toBeGreaterThan(1);
    expect(callsOf(track, "onChangeEnd")).toHaveLength(1);
    const trackValues = onChangeValues(track);
    expect(trackValues[0]).toBeGreaterThanOrEqual(40);
    expect(trackValues[0]).toBeLessThanOrEqual(60);
    expect(trackValues.at(-1)!).toBeGreaterThan(trackValues[0]!);
    expect(track.count("text:Dragging")).toBe(0);

    // Vertical orientation: the along axis is y for both parts.
    const vThumb = await openSlider("mobile", {
      scope: "touch",
      orientation: "vertical",
    });
    await vThumb.drag("id:thumb", { x: 0, y: -60 });
    expect(callsOf(vThumb, "onChange").length).toBeGreaterThan(1);
    expect(callsOf(vThumb, "onChangeEnd")).toHaveLength(1);
    // Same delta-vs-jump window as the horizontal thumb: 30 + 60 pt of a
    // 300 pt track lands at ~50; a stolen track claim clamps at 100.
    const vThumbValues = onChangeValues(vThumb);
    expect(vThumbValues[0]).toBeLessThan(45);
    expect(vThumbValues.at(-1)!).toBeGreaterThanOrEqual(45);
    expect(vThumbValues.at(-1)!).toBeLessThanOrEqual(55);
    expect(vThumb.count("text:Dragging")).toBe(0);

    const vTrack = await openSlider("mobile", {
      scope: "touch",
      orientation: "vertical",
    });
    await vTrack.drag("id:track", { x: 0, y: -60 });
    expect(callsOf(vTrack, "onChange").length).toBeGreaterThan(1);
    expect(callsOf(vTrack, "onChangeEnd")).toHaveLength(1);
    expect(vTrack.count("text:Dragging")).toBe(0);
  }, 120_000);

  // adapt-sheets/slider.md M-005 (A-003, A-004): a touch with no move frame
  // never reaches `shouldClaim`, so the parts' `onTouchEnd` commits the tap
  // instead — the track jumps to the touched point once, the thumb ends the
  // interaction once with no value change (the desktop grant+release
  // sequence). `app.press` cannot name the responder parts (host gap), so
  // the tap is `app.drag` with zero displacement.
  test("M-005 touch: a no-move tap commits through onTouchEnd — track jumps once, thumb ends once unchanged", async () => {
    const track = await openSlider("mobile", { scope: "touch" });
    await track.drag("id:track", { x: 0, y: 0 });

    expect(callsOf(track, "onChange")).toHaveLength(1);
    // The finger lands on the track's middle: ~50 % of 0–100.
    const jumped = onChangeValues(track)[0]!;
    expect(jumped).toBeGreaterThan(40);
    expect(jumped).toBeLessThan(60);
    expect(callsOf(track, "onChangeEnd")).toHaveLength(1);

    const thumb = await openSlider("mobile", { scope: "touch" });
    await thumb.drag("id:thumb", { x: 0, y: 0 });

    expect(callsOf(thumb, "onChange")).toHaveLength(0);
    expect(callsOf(thumb, "onChangeEnd")).toHaveLength(1);
    // The value never moved: the output still reads 30.
    expect(thumb.shows("id:output >> text:30")).toBe(true);
  });

  // adapt-sheets/slider.md M-006 (A-005, A-006): the hover-suppression row
  // needs `app.hover`, which a phone has no mouse for — the whole row
  // lives in `slider.mobile.web.test.tsx`.

  // adapt-sheets/slider.md M-007 (A-001…A-004): under touch with
  // `isDisabled` every seam gate closes — `enabled()` false, `hitSlop()`
  // undefined — and no gesture commits: drags on either part and a tap on
  // the track all produce zero `onChange`/`onChangeEnd`.
  test("M-007 touch + disabled: seams gated off and every gesture commits nothing", async () => {
    const app = await openSlider("mobile", {
      scope: "touch",
      disabled: "1",
      probe: "1",
    });
    await waitForSeams(app);

    expect(app.enabled("role:adjustable[Volume]")).toBe(false);

    const thumb = lastCtxEnv(app, "thumb");
    const track = lastCtxEnv(app, "track");
    expect(thumb.enabled).toBe(false);
    expect(thumb.hitSlop).toBeNull();
    expect(track.enabled).toBe(false);
    expect(track.hitSlop).toBeNull();

    await app.drag("id:thumb", { x: 60, y: 0 });
    await app.drag("id:track", { x: 60, y: 0 });
    await app.drag("id:track", { x: 0, y: 0 });
    await app.wait(100);

    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(0);
    // The pan's handlers resolve empty while disabled — no gesture was ever
    // active on either part.
    expect(ctxEnvAll(app, "thumb").every((record) => record.panActive !== true)).toBe(true);
    expect(ctxEnvAll(app, "track").every((record) => record.panActive !== true)).toBe(true);
  });

  // adapt-sheets/slider.md M-008 (基线): the default pointer environment is
  // untouched — a track tap jumps, a thumb drag moves by delta, and the
  // controlled/disabled cases keep their semantics. The keyboard half
  // moved to `slider.mobile.web.test.tsx`: the keymap assertions need
  // `platform:"web"`, where Tab reaches the thumb — a phone host has no
  // Tab-focus path for it and the option itself is illegal on native.
  test("M-008 default pointer environment: tap-jump, delta-drag and parity cases hold", async () => {
    // Track tap → press-jump + one onChangeEnd (zero-drag: `app.press`
    // cannot name the responder parts).
    const tap = await openSlider("mobile", { scope: "pointer" });
    await tap.drag("id:track", { x: 0, y: 0 });
    expect(callsOf(tap, "onChange").length).toBeGreaterThanOrEqual(1);
    const jumped = onChangeValues(tap).at(-1)!;
    expect(jumped).toBeGreaterThan(40);
    expect(jumped).toBeLessThan(60);
    expect(callsOf(tap, "onChangeEnd")).toHaveLength(1);

    // Thumb drag → delta movement, not a jump: `step: 0.5` halves the snap
    // grid so the ~3.7 pt half-thumb offset between a delta end (~46.0) and
    // a press-jump end (~49.5+) lands on different snap values — the window
    // [44.5, 46.25] only the delta sequence fits.
    const drag = await openSlider("mobile", { scope: "pointer", step: 0.5 });
    await drag.drag("id:thumb", { x: 60, y: 0 });
    expect(callsOf(drag, "onChangeEnd")).toHaveLength(1);
    const values = onChangeValues(drag);
    expect(values.length).toBeGreaterThan(1);
    expect(values[0]).toBeLessThan(40);
    expect(values.at(-1)!).toBeGreaterThanOrEqual(44.5);
    expect(values.at(-1)!).toBeLessThanOrEqual(46.25);

    // controlled: the force button still replaces the value.
    const controlled = await openSlider("controlled", { scope: "pointer" });
    await controlled.press("id:force-60");
    expect(controlled.shows("id:output >> text:60")).toBe(true);

    // disabled: the thumb reports disabled and no gesture commits.
    const disabled = await openSlider("disabled", { scope: "pointer" });
    expect(disabled.enabled("role:adjustable[Volume]")).toBe(false);
    await disabled.drag("id:thumb", { x: 60, y: 0 });
    expect(callsOf(disabled, "onChange")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/slider.md M-009 (基线): desktop zero drift — a pointer
  // thumb drag still round-trips `isDragging` (the held half is the
  // headless file's), the seam's `hitSlop()` stays undefined, and the
  // parts keep their upstream geometry (28 pt thumb, 20 pt track cross
  // axis — the `min-*` hit expansion exists only as touch `hitSlop`,
  // never as a class).
  test("M-009 default pointer environment: isDragging settles, hitSlop stays undefined, geometry unchanged", async () => {
    const app = await openSlider("mobile", { scope: "pointer", probe: "1" });
    await waitForSeams(app);

    await app.drag("id:thumb", { x: 60, y: 0 });

    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);
    expect(app.count("text:Dragging")).toBe(0);

    const thumb = lastCtxEnv(app, "thumb");
    const track = lastCtxEnv(app, "track");
    expect(thumb.enabled).toBe(false);
    expect(thumb.hitSlop).toBeNull();
    expect(track.enabled).toBe(false);
    expect(track.hitSlop).toBeNull();

    // Every `ctx-env` record — before, during and after the drag — keeps
    // the press-channel rest fields under pointer (the M-011 negative's
    // native-portable half; the drag itself committed above, so the
    // silence is not a dead seam).
    for (const part of ["thumb", "track"] as const) {
      for (const record of ctxEnvAll(app, part)) {
        expect(record.isPressed ?? false).toBe(false);
        expect(record.pressOrigin ?? null).toBeNull();
        expect(record.scale ?? 1).toBe(1);
      }
    }

    // The layout bounds are the upstream sizes — no min-* class grew them.
    expect(lastLayout(app, "thumb").width).toBe(28);
    expect(lastLayout(app, "track").height).toBe(20);
  });

  // adapt-sheets/slider.md M-011 (A-001, A-002, 负断言): the row's
  // native-compatible half — the press-channel rest fields across every
  // `ctx-env` record — is asserted inside M-009 above; the full row with
  // its hover arm lives in `slider.mobile.web.test.tsx`.

  // adapt-sheets/slider.md M-012 (A-003, A-004, 负断言): under the default
  // pointer environment `panHandlers()` resolves to an empty object —
  // `panKeys` 0 is the proof no gesture listener mounted — while the bare
  // `onResponder*` chain still commits taps and drags with the desktop
  // semantics.
  test("M-012 default pointer environment: panHandlers mount nothing while the bare responder chain commits", async () => {
    const app = await openSlider("mobile", { scope: "pointer", probe: "1" });
    await waitForSeams(app);

    for (const part of ["thumb", "track"] as const) {
      const records = ctxEnvAll(app, part);
      expect(records.length).toBeGreaterThan(0);
      for (const record of records) {
        expect(record.panKeys).toBe(0);
        expect(record.panActive).toBe(false);
      }
    }

    // The bare chain: a track tap jumps once, a thumb drag moves by delta.
    await app.drag("id:track", { x: 0, y: 0 });
    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);

    await app.drag("id:thumb", { x: 60, y: 0 });
    expect(callsOf(app, "onChange").length).toBeGreaterThan(1);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(2);
  });
});
