import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the color-slider adapt unit, one test per row of
 * adapt-sheets/color-slider.md §4 that the shared (headless + web) targets
 * can observe: M-001, M-002, M-003's claim-direction half, M-005…M-009 and
 * M-011/M-012. The Scroll-arbitration rows (M-004, M-010) and M-003's
 * `dragAndHold` mid-drag sampling live in `color-slider.mobile.headless.test.tsx`.
 *
 * The fixture is `harness/color-slider.fixtures.tsx` — `case` picks the
 * surface (`mobile` for the seam/gesture probes, `scroll` unused here,
 * `keyboard`/`controlled`/`disabled`/`alpha` for the M-008 parity half),
 * `scope="touch"` mounts the `EnvironmentScope input="touch"` the touch
 * assertions inject, `probe="1"` mounts the `SeamProbe`s and the
 * `sample-seams` button, `orientation`/`disabled`/`channel`/`value` tune the
 * slider. Every open pins `platform:"windows", width:1024, height:768` —
 * the desktop-parity baseline; `scope` is the only environment switch.
 *
 * The observation channel is what `nsh/test` sees: the `@scenario/probe`
 * records in `app.storage()` — `onChange`/`onChangeEnd` counts and payloads,
 * `ctx-env` (per-part `enabled`/`hitSlop`/`bounds`/`isPressed`/`pressOrigin`/
 * `panKeys`/`panActive`), `ctx-seams` (the animated channels resolved on
 * demand), `drag-state` (`isDragging` edges), `layout` bounds, the hover
 * trio and `onFocus`/`onBlur` — plus `shows`/`texts`/`enabled` for the
 * markers and the accessibility tree.
 *
 * Host gaps this file rides (adapt sheet §6): `app.press` resolves only
 * pressable views — the slider's responder parts are not one — so the
 * "tap" halves of M-005/M-008/M-011/M-012 use `app.drag` with zero
 * displacement, the tap the harness can deliver (down+up, no move frame);
 * `hitSlop` has no read channel, so M-001/M-002 assert the seam's computed
 * value plus `bounds + slop ≥ 44`; and `isDragging` mid-drag has no
 * dual-target sample (`app.drag` serializes behind `waitUntil`,
 * `dragAndHold` is headless-only), so the true→false roundtrip is read
 * from the `drag-state` edge records the fixture's effect writes.
 */

type CtxEnv = {
  id: string;
  enabled: boolean;
  hitSlop: { top: number; right: number; bottom: number; left: number } | null;
  bounds: { width: number; height: number };
  isPressed: boolean;
  pressOrigin: { x: number; y: number } | null;
  panKeys: number;
  panActive: boolean;
};

type CtxSeams = {
  id: string;
  pressed: number;
  scale: number;
  highlight: number;
  ripple: number;
};

type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

function openSlider(
  caseName: string,
  params: Record<string, string | number | boolean> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height" | "clock"> = {},
): Promise<App> {
  return open("../../../color-slider.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

function ctxEnvAll(app: App, id: string): CtxEnv[] {
  return callsOf(app, "ctx-env")
    .map((args) => args[0] as CtxEnv)
    .filter((record) => record.id === id);
}

function lastCtxEnv(app: App, id: string): CtxEnv {
  const records = ctxEnvAll(app, id);
  const last = records.at(-1);

  if (!last) throw new Error(`ctx-env reported nothing for ${id}`);

  return last;
}

function lastCtxSeams(app: App, id: string): CtxSeams {
  const records = callsOf(app, "ctx-seams")
    .map((args) => args[0] as CtxSeams)
    .filter((record) => record.id === id);
  const last = records.at(-1);

  if (!last) throw new Error(`ctx-seams reported nothing for ${id}`);

  return last;
}

function dragStates(app: App): boolean[] {
  return callsOf(app, "drag-state").map((args) => args[0] as boolean);
}

function lastLayout(app: App, name: string): LayoutEntry {
  const records = callsOf(app, "layout")
    .map((args) => args[0] as LayoutEntry)
    .filter((record) => record.name === name);
  const last = records.at(-1);

  if (!last) throw new Error(`layout reported nothing for ${name}`);

  return last;
}

function onChangeHues(app: App): number[] {
  return callsOf(app, "onChange").map((args) => Number(args[0]));
}

describe("color-slider mobile", () => {
  // adapt-sheets/color-slider.md M-001 (A-001): under the injected touch
  // environment the thumb's `hitSlop` pads the 16 pt knob to the 44 pt
  // minimum on both axes, the seam gate reads open, and the press half of
  // the channel stays at rest — the parts walk the responder system, so
  // `pressDown`/`pressUp`/`scale`/`isPressed` are never wired (the sheet's
  // "不谎报按压" half).
  test("M-001 touch: thumb hitSlop reaches 44pt both axes while the press channels stay at rest", async () => {
    const app = await openSlider("mobile", { scope: "touch", probe: "1" });
    await app.waitUntil(() => callsOf(app, "ctx-env").length >= 2);

    const thumb = lastCtxEnv(app, "thumb");
    expect(thumb.enabled).toBe(true);
    expect(thumb.bounds.width).toBe(16);
    expect(thumb.bounds.height).toBe(16);
    expect(thumb.hitSlop).not.toBeNull();

    const slop = thumb.hitSlop!;
    expect(thumb.bounds.width + slop.left + slop.right).toBeGreaterThanOrEqual(44);
    expect(thumb.bounds.height + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);

    // Every reactive report — mount and every later edge — reads the press
    // flag and origin at rest.
    for (const record of ctxEnvAll(app, "thumb")) {
      expect(record.isPressed).toBe(false);
      expect(record.pressOrigin).toBeNull();
    }

    // The animated channels sampled after a real axial drag: still rest.
    await app.drag("id:thumb", { x: 60, y: 0 });
    await app.press("id:sample-seams");
    await app.waitUntil(() => callsOf(app, "ctx-seams").length >= 2);

    const channels = lastCtxSeams(app, "thumb");
    expect(channels.pressed).toBe(0);
    expect(channels.scale).toBe(1);
    expect(channels.highlight).toBe(0);
    expect(channels.ripple).toBe(0);
  });

  // adapt-sheets/color-slider.md M-002 (A-002): under touch the track's
  // `hitSlop` pads only the cross axis — a horizontal track is 20 pt tall
  // (top/bottom slop), a vertical one 20 pt wide (left/right slop) — while
  // the along axis, already past the minimum, gets none.
  test("M-002 touch: track hitSlop pads the cross axis to 44pt in both orientations", async () => {
    const horizontal = await openSlider("mobile", { scope: "touch", probe: "1" });
    await horizontal.waitUntil(() => callsOf(horizontal, "ctx-env").length >= 2);

    const hTrack = lastCtxEnv(horizontal, "track");
    expect(hTrack.enabled).toBe(true);
    expect(hTrack.hitSlop).not.toBeNull();

    const hSlop = hTrack.hitSlop!;
    expect(hSlop.top).toBeGreaterThan(0);
    expect(hSlop.bottom).toBeGreaterThan(0);
    expect(hSlop.left).toBe(0);
    expect(hSlop.right).toBe(0);
    expect(hTrack.bounds.height + hSlop.top + hSlop.bottom).toBeGreaterThanOrEqual(44);

    const vertical = await openSlider("mobile", {
      scope: "touch",
      probe: "1",
      orientation: "vertical",
    });
    await vertical.waitUntil(() => callsOf(vertical, "ctx-env").length >= 2);

    const vTrack = lastCtxEnv(vertical, "track");
    expect(vTrack.enabled).toBe(true);
    expect(vTrack.hitSlop).not.toBeNull();

    const vSlop = vTrack.hitSlop!;
    expect(vSlop.left).toBeGreaterThan(0);
    expect(vSlop.right).toBeGreaterThan(0);
    expect(vSlop.top).toBe(0);
    expect(vSlop.bottom).toBe(0);
    expect(vTrack.bounds.width + vSlop.left + vSlop.right).toBeGreaterThanOrEqual(44);
  });

  test("track drag can start where the thumb was before a drag", async () => {
    const app = await openSlider("mobile", { scope: "touch", value: "hsl(180, 100%, 50%)" });
    await app.drag("id:thumb", { x: 80, y: 0 });
    expect(onChangeHues(app).at(-1)!).toBeGreaterThan(235);

    const changes = onChangeHues(app).length;
    await app.drag("id:track", { x: -60, y: 0 });
    expect(onChangeHues(app).length).toBeGreaterThan(changes + 1);
    expect(onChangeHues(app).at(-1)!).toBeLessThan(180);
  });

  // adapt-sheets/color-slider.md M-003 (A-003, A-004), claim-direction half:
  // under touch with no surrounding Scroll, an axial drag on either part is
  // claimed by the pan — `onChange` reports per frame, `onChangeEnd` fires
  // exactly once per interaction, and `isDragging` round-trips through the
  // `drag-state` edge records. The `dragAndHold` mid-drag `isDragging`
  // sampling is the headless file's half of this row.
  test("M-003 touch: axial drags on thumb and track claim the pan in both orientations", async () => {
    // Horizontal thumb: delta drag — the hue moves by the finger's travel
    // (~72° for 60 pt of a 300 pt track), not to the touch point.
    const thumb = await openSlider("mobile", { scope: "touch" });
    await thumb.drag("id:thumb", { x: 60, y: 0 });

    expect(callsOf(thumb, "onChange").length).toBeGreaterThan(1);
    expect(callsOf(thumb, "onChangeEnd")).toHaveLength(1);
    const thumbHues = onChangeHues(thumb);
    expect(thumbHues.at(-1)).toBeGreaterThan(0);
    expect(thumbHues.at(-1)!).toBeLessThan(120);

    const thumbStates = dragStates(thumb);
    expect(thumbStates[0]).toBe(false);
    expect(thumbStates.filter(Boolean)).toHaveLength(1);
    expect(thumbStates.at(-1)).toBe(false);
    expect(thumb.texts()).toContain("idle");

    // Horizontal track: the drag jumps to the touch point first (the finger
    // lands on the track's middle → ~50 % → hue ~180), then follows the
    // finger — the sequence starts at the jump value.
    const track = await openSlider("mobile", { scope: "touch" });
    await track.drag("id:track", { x: 60, y: 0 });

    expect(callsOf(track, "onChange").length).toBeGreaterThan(1);
    expect(callsOf(track, "onChangeEnd")).toHaveLength(1);
    const trackHues = onChangeHues(track);
    expect(trackHues[0]).toBeGreaterThan(150);
    expect(trackHues[0]).toBeLessThan(210);
    expect(trackHues.at(-1)!).toBeGreaterThan(trackHues[0]!);

    const trackStates = dragStates(track);
    expect(trackStates.filter(Boolean)).toHaveLength(1);
    expect(trackStates.at(-1)).toBe(false);

    // Vertical orientation: the along axis is y for both parts.
    const vThumb = await openSlider("mobile", {
      scope: "touch",
      orientation: "vertical",
    });
    await vThumb.drag("id:thumb", { x: 0, y: 60 });
    expect(callsOf(vThumb, "onChange").length).toBeGreaterThan(1);
    expect(callsOf(vThumb, "onChangeEnd")).toHaveLength(1);
    expect(dragStates(vThumb).filter(Boolean)).toHaveLength(1);

    const vTrack = await openSlider("mobile", {
      scope: "touch",
      orientation: "vertical",
    });
    await vTrack.drag("id:track", { x: 0, y: 60 });
    expect(callsOf(vTrack, "onChange").length).toBeGreaterThan(1);
    expect(callsOf(vTrack, "onChangeEnd")).toHaveLength(1);
    expect(dragStates(vTrack).filter(Boolean)).toHaveLength(1);
  });

  // adapt-sheets/color-slider.md M-005 (A-004): a touch with no move frame
  // never reaches `shouldClaim`, so the parts' `onTouchEnd` commits the tap
  // instead — the track jumps to the touched point once, the thumb ends the
  // interaction once with no value change (the desktop grant+release
  // sequence). `app.press` cannot name the responder parts (host gap), so
  // the tap is `app.drag` with zero displacement.
  test("M-005 touch: a no-move tap commits through onTouchEnd — track jumps once, thumb ends once unchanged", async () => {
    const track = await openSlider("mobile", { scope: "touch" });
    await track.drag("id:track", { x: 0, y: 0 });

    expect(callsOf(track, "onChange")).toHaveLength(1);
    // The finger lands on the track's middle: ~50 % → hue ~180.
    expect(onChangeHues(track)[0]).toBeGreaterThan(150);
    expect(onChangeHues(track)[0]).toBeLessThan(210);
    expect(callsOf(track, "onChangeEnd")).toHaveLength(1);

    const thumb = await openSlider("mobile", { scope: "touch" });
    await thumb.drag("id:thumb", { x: 0, y: 0 });

    expect(callsOf(thumb, "onChange")).toHaveLength(0);
    expect(callsOf(thumb, "onChangeEnd")).toHaveLength(1);
    // The value never moved: the output still reads hue 0.
    expect(thumb.texts()).toContain("0°, Red");
  });

  // adapt-sheets/color-slider.md M-006 (A-005): under touch the hover
  // signal stays off entirely — `app.hover` produces no hover probe and no
  // `Hovered` marker, and a tap leaves nothing pinned — while the default
  // environment keeps the full enter/leave roundtrip.
  test("M-006 touch suppresses hover state and callbacks; pointer keeps the roundtrip", async () => {
    const touch = await openSlider("mobile", { scope: "touch" });

    await touch.hover("id:track");
    await touch.hover("id:thumb");
    await touch.wait(200);

    expect(callsOf(touch, "trackHoverStart")).toHaveLength(0);
    expect(callsOf(touch, "trackHoverChange")).toHaveLength(0);
    expect(callsOf(touch, "trackHoverEnd")).toHaveLength(0);
    expect(callsOf(touch, "thumbHoverStart")).toHaveLength(0);
    expect(callsOf(touch, "thumbHoverChange")).toHaveLength(0);
    expect(callsOf(touch, "thumbHoverEnd")).toHaveLength(0);
    expect(touch.texts().some((text) => text.includes("Hovered"))).toBe(false);

    // A tap afterwards leaves no sticky hover either (the web sticky-hover
    // failure the gate exists for).
    await touch.drag("id:track", { x: 0, y: 0 });
    await touch.hover("id:track");
    await touch.wait(200);
    expect(callsOf(touch, "trackHoverStart")).toHaveLength(0);
    expect(touch.texts().some((text) => text.includes("Hovered"))).toBe(false);

    const pointer = await openSlider("mobile");
    await pointer.hover("id:track");
    await pointer.wait(200);

    expect(callsOf(pointer, "trackHoverStart").length).toBeGreaterThanOrEqual(1);
    expect(callsOf(pointer, "trackHoverChange").length).toBeGreaterThanOrEqual(1);
    expect(pointer.texts()).toContain("TrackHovered");

    await pointer.hover("id:thumb");
    await pointer.wait(200);
    expect(callsOf(pointer, "thumbHoverStart").length).toBeGreaterThanOrEqual(1);
    expect(pointer.texts()).toContain("ThumbHovered");

    await pointer.hover("id:output");
    await pointer.wait(200);
    expect(callsOf(pointer, "trackHoverEnd").length).toBeGreaterThanOrEqual(1);
    expect(callsOf(pointer, "thumbHoverEnd").length).toBeGreaterThanOrEqual(1);
    expect(pointer.texts()).toContain("TrackIdle");
    expect(pointer.texts()).toContain("ThumbIdle");
  });

  // adapt-sheets/color-slider.md M-007 (A-001…A-004): under touch with
  // `isDisabled` every seam gate closes — `enabled()` false, `hitSlop()`
  // undefined — and no gesture commits: drags on either part and a tap on
  // the track all produce zero `onChange`/`onChangeEnd`.
  test("M-007 touch + disabled: seams gated off and every gesture commits nothing", async () => {
    const app = await openSlider("mobile", {
      scope: "touch",
      disabled: "1",
      probe: "1",
    });
    await app.waitUntil(() => callsOf(app, "ctx-env").length >= 2);

    expect(app.enabled("role:adjustable[Hue]")).toBe(false);

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
    // The pan's handlers mount under touch but its claim predicate reads
    // `isDisabled` — no gesture was ever active.
    expect(ctxEnvAll(app, "thumb").every((record) => !record.panActive)).toBe(true);
    expect(ctxEnvAll(app, "track").every((record) => !record.panActive)).toBe(true);
  });

  // adapt-sheets/color-slider.md M-008 (基线): the default pointer
  // environment is untouched — keyboard commits one `onChangeEnd` per key,
  // a track tap jumps and a thumb drag moves by delta, and the
  // controlled/disabled/alpha cases keep their semantics. The keyboard half
  // opens `platform:"web"`: a real Windows window gives keyboard focus only
  // to Inputs (the heroui.web suite's registered host split), so the
  // keymap assertions run where Tab reaches the thumb.
  test("M-008 default pointer environment: keyboard, tap-jump, delta-drag and parity cases hold", async () => {
    const kb = await openSlider("keyboard", {}, { platform: "web", clock: {} });
    await kb.keyboard.press("tab");
    expect(callsOf(kb, "onFocus")).toHaveLength(1);

    for (const key of ["arrowright", "shift+arrowright", "pageup", "home"]) {
      const before = callsOf(kb, "onChangeEnd").length;
      await kb.keyboard.press(key);
      await kb.clock!.runFor(20);
      expect(callsOf(kb, "onChangeEnd").length).toBe(before + 1);
    }
    expect(callsOf(kb, "onChange").length).toBeGreaterThan(0);

    // Track tap → press-jump + one onChangeEnd (zero-drag: `app.press`
    // cannot name the responder parts).
    const tap = await openSlider("mobile");
    await tap.drag("id:track", { x: 0, y: 0 });
    expect(callsOf(tap, "onChange").length).toBeGreaterThanOrEqual(1);
    expect(onChangeHues(tap).at(-1)!).toBeGreaterThan(150);
    expect(callsOf(tap, "onChangeEnd")).toHaveLength(1);

    // Thumb drag → delta movement, not a jump: 60 pt of a 300 pt track is
    // ~72° of hue, nowhere near the ~180° a center jump would report.
    const drag = await openSlider("mobile");
    await drag.drag("id:thumb", { x: 60, y: 0 });
    expect(callsOf(drag, "onChangeEnd")).toHaveLength(1);
    const hues = onChangeHues(drag);
    expect(hues.at(-1)!).toBeGreaterThan(0);
    expect(hues.at(-1)!).toBeLessThan(120);

    // controlled: the force button still replaces the value.
    const controlled = await openSlider("controlled");
    await controlled.press("id:force-200");
    expect(controlled.texts().some((text) => text.includes("200"))).toBe(true);

    // disabled: the thumb reports disabled and no gesture commits.
    const disabled = await openSlider("disabled");
    expect(disabled.enabled("role:adjustable[Hue]")).toBe(false);
    await disabled.drag("id:thumb", { x: 60, y: 0 });
    expect(callsOf(disabled, "onChange")).toHaveLength(0);

    // alpha: the same thumb drag moves the alpha channel.
    const alpha = await openSlider("alpha");
    await alpha.drag("id:thumb", { x: 60, y: 0 });
    expect(callsOf(alpha, "onChange").length).toBeGreaterThan(0);
    expect(callsOf(alpha, "onChangeEnd")).toHaveLength(1);
  }, 120_000);

  // adapt-sheets/color-slider.md M-009 (基线): desktop zero drift — a
  // pointer thumb drag still round-trips `isDragging`, the seam's
  // `hitSlop()` stays undefined, and the parts keep their upstream
  // geometry (16 pt thumb, 20 pt track cross axis — the `min-*` hit
  // expansion exists only as touch `hitSlop`, never as a class).
  test("M-009 default pointer environment: isDragging round-trips, hitSlop stays undefined, geometry unchanged", async () => {
    const app = await openSlider("mobile", { probe: "1" });
    await app.waitUntil(() => callsOf(app, "ctx-env").length >= 2);

    await app.drag("id:thumb", { x: 60, y: 0 });

    const states = dragStates(app);
    expect(states.filter(Boolean)).toHaveLength(1);
    expect(states.at(-1)).toBe(false);
    expect(app.texts()).toContain("idle");

    const thumb = lastCtxEnv(app, "thumb");
    const track = lastCtxEnv(app, "track");
    expect(thumb.enabled).toBe(false);
    expect(thumb.hitSlop).toBeNull();
    expect(track.enabled).toBe(false);
    expect(track.hitSlop).toBeNull();

    // The layout bounds are the upstream sizes — no min-* class grew them.
    expect(lastLayout(app, "thumb").width).toBe(16);
    expect(lastLayout(app, "thumb").height).toBe(16);
    expect(lastLayout(app, "track").height).toBe(20);
  });

  // adapt-sheets/color-slider.md M-011 (A-001, A-002, 负断言): under the
  // default pointer environment the feedback seam is physically inert —
  // `hitSlop()` answers undefined, `isPressed`/`pressOrigin` never leave
  // rest across tap, drag and hover, and the animated channels sample at
  // their rest values — while the gesture semantics keep working (the
  // M-008 half of the same evidence chain).
  test("M-011 default pointer environment: the feedback seam stays inert across tap, drag and hover", async () => {
    const app = await openSlider("mobile", { probe: "1" });
    await app.waitUntil(() => callsOf(app, "ctx-env").length >= 2);

    // Tap (zero-drag), real drag and hover — the three paths a press
    // feedback seam could observe.
    await app.drag("id:track", { x: 0, y: 0 });
    await app.drag("id:thumb", { x: 60, y: 0 });
    await app.hover("id:track");
    await app.wait(200);

    for (const id of ["thumb", "track"] as const) {
      const records = ctxEnvAll(app, id);
      expect(records.length).toBeGreaterThan(0);
      for (const record of records) {
        expect(record.enabled).toBe(false);
        expect(record.hitSlop).toBeNull();
        expect(record.isPressed).toBe(false);
        expect(record.pressOrigin).toBeNull();
      }
    }

    await app.press("id:sample-seams");
    await app.waitUntil(() => callsOf(app, "ctx-seams").length >= 2);

    for (const id of ["thumb", "track"] as const) {
      const channels = lastCtxSeams(app, id);
      expect(channels.pressed).toBe(0);
      expect(channels.scale).toBe(1);
      expect(channels.highlight).toBe(0);
      expect(channels.ripple).toBe(0);
    }

    // The gestures themselves committed normally — the seam's silence is
    // not a dead slider.
    expect(callsOf(app, "onChangeEnd").length).toBeGreaterThanOrEqual(2);
  });

  // adapt-sheets/color-slider.md M-012 (A-003, A-004, 负断言): under the
  // default pointer environment `panHandlers()` resolves to an empty
  // object — `panKeys` 0 is the proof no gesture listener mounted — while
  // the bare `onResponder*` chain still commits taps and drags with the
  // desktop semantics.
  test("M-012 default pointer environment: panHandlers mount nothing while the bare responder chain commits", async () => {
    const app = await openSlider("mobile", { probe: "1" });
    await app.waitUntil(() => callsOf(app, "ctx-env").length >= 2);

    for (const id of ["thumb", "track"] as const) {
      for (const record of ctxEnvAll(app, id)) {
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
