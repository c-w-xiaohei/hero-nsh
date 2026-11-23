import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only half of the slider adapt assertions — the rows whose
 * evidence needs the native Scroll recognizer or a held finger, neither of
 * which the web target can produce (adapt-sheets/slider.md §4 file column
 * and §6): M-003's `dragAndHold` mid-drag `isDragging` sampling (plus the
 * positive `panActive` observation that proves the pan's own lifecycle
 * ran), M-004's cross-axis "gesture goes to the Scroll" arbitration, M-009's
 * held pointer drag, and M-010's cross-axis termination path.
 *
 * The fixture cases are `mobile` (seam/gesture probes) and `scroll` (the
 * slider inside a real `Scroll` whose axis is perpendicular to the
 * slider's, with `row N` filler proving the scroller itself moves).
 * `scope="touch"` mounts `EnvironmentScope input="touch"`; every open pins
 * `platform:"windows", width:1024, height:768`.
 *
 * Observation is the same probe channel as the dual-target file:
 * `onChange`/`onChangeEnd`, the `Dragging` marker text (`text:Dragging`
 * counts are unambiguous — the hover markers never say it), the `scroll`
 * offset records, the `output` value text, and `ctx-env`'s `panActive` /
 * `panKeys` for the positive pan observation.
 */

function openSlider(
  caseName: string,
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../slider.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

type CtxEnv = {
  part: "track" | "thumb";
  panKeys: number | null;
  panActive: boolean | null;
};

/** The `ctx-env` records one part's `CtxProbe` has written so far. */
function ctxEnvOf(app: App, part: "track" | "thumb"): CtxEnv[] {
  return callsOf(app, "ctx-env")
    .map((args) => args[0] as CtxEnv)
    .filter((record) => record.part === part);
}

type ScrollOffset = { x: number; y: number };

function scrollOffsets(app: App): ScrollOffset[] {
  return callsOf(app, "scroll").map(
    (args) => (args[0] as { offset: ScrollOffset }).offset,
  );
}

function lastOffset(app: App): ScrollOffset {
  return scrollOffsets(app).at(-1) ?? { x: 0, y: 0 };
}

describe("slider mobile headless", () => {
  // adapt-sheets/slider.md M-003 (A-003, A-004), held-drag half: with the
  // finger kept down mid-gesture (`dragAndHold`), the `Dragging` marker
  // reads `Dragging`, `onChangeEnd` has not fired yet — and `drop()` closes
  // the interaction with exactly one `onChangeEnd`. Both parts, both
  // orientations. The `ctx-env` `panActive === true` mid-hold is the
  // positive observation that the pan's own `onDragStart` ran — `isDragging`
  // alone cannot distinguish the pan's grant-driven drag from the bare
  // chain's (the color-slider shadowed-spread regression's complement to
  // M-012's `panKeys === 0` negative).
  test("M-003 touch: a held axial drag reports Dragging mid-gesture and one onChangeEnd on drop", async () => {
    const sessions: {
      app: App;
      part: "thumb" | "track";
      by: { x: number; y: number };
    }[] = [];

    for (const orientation of ["horizontal", "vertical"] as const) {
      for (const part of ["thumb", "track"] as const) {
        const app = await openSlider("mobile", {
          scope: "touch",
          orientation,
          probe: "1",
        });
        sessions.push({
          app,
          part,
          by: orientation === "vertical" ? { x: 0, y: -60 } : { x: 60, y: 0 },
        });
      }
    }

    for (const { app, part, by } of sessions) {
      await app.dragAndHold(`id:${part}`, by);

      // Mid-hold: the marker reports the drag and the interaction has not
      // ended.
      expect(app.count("text:Dragging")).toBe(1);
      expect(callsOf(app, "onChangeEnd")).toHaveLength(0);
      expect(callsOf(app, "onChange").length).toBeGreaterThan(0);

      // Positive pan observation: `pan.active()` only sets inside the pan's
      // `onPanResponderGrant`, so a `ctx-env` record with `panActive ===
      // true` mid-hold is the proof the pan's lifecycle ran on THIS part —
      // a track pan stealing a thumb drag leaves the thumb's `panActive`
      // false (the hit-area deferral the arbitration relies on).
      try {
        await app.waitUntil(
          () => ctxEnvOf(app, part).some((record) => record.panActive === true),
          { timeout: 2000 },
        );
      } catch {
        // Timed out: `pan.active()` never went true — exactly the bug.
      }
      const envRecords = ctxEnvOf(app, part);
      expect(envRecords.length).toBeGreaterThan(0);
      expect(envRecords.every((record) => (record.panKeys ?? 0) > 0)).toBe(true);
      expect(envRecords.some((record) => record.panActive === true)).toBe(true);

      await app.drop();
      await app.wait(100);

      expect(app.count("text:Dragging")).toBe(0);
      expect(callsOf(app, "onChangeEnd")).toHaveLength(1);
    }
  }, 120_000);

  // adapt-sheets/slider.md M-004 (A-003, A-004): inside a real `Scroll`
  // whose axis is perpendicular to the slider's, a cross-axis drag is never
  // claimed — zero `onChange`/`onChangeEnd`, the `Dragging` marker stays
  // `Idle`, the Output's value text unchanged, and the Scroll's offset
  // advances — while an along-axis drag is claimed by the pan: `onChange`
  // reports, `onChangeEnd` fires once, and the Scroll never moves. Both
  // orientations, both parts. The `row N` filler drag is the control: the
  // same Scroll moves when the gesture is not the slider's.
  test("M-004 touch + Scroll: cross-axis drags go to the scroller, along-axis drags stay with the pan", async () => {
    // Control: a plain row scrolls the same Scroll — the offset progress
    // below is the scroller's, not a slider artifact.
    const padControl = await openSlider("scroll", { scope: "touch" });
    await padControl.wait(200);
    await padControl.drag("text:row 0", { x: 0, y: -80 });
    await padControl.wait(200);
    expect(lastOffset(padControl).y).toBeGreaterThan(0);

    // Horizontal slider inside a vertical Scroll: along = x, cross = y.
    for (const part of ["thumb", "track"] as const) {
      const cross = await openSlider("scroll", { scope: "touch" });
      await cross.wait(200);
      expect(cross.shows("id:output >> text:30")).toBe(true);

      await cross.drag(`id:${part}`, { x: 0, y: -80 });
      await cross.wait(200);

      expect(callsOf(cross, "onChange")).toHaveLength(0);
      expect(callsOf(cross, "onChangeEnd")).toHaveLength(0);
      expect(cross.count("text:Dragging")).toBe(0);
      // The value — and so the thumb's position — never moved.
      expect(cross.shows("id:output >> text:30")).toBe(true);
      // The gesture went to the Scroll: its offset advanced.
      expect(lastOffset(cross).y).toBeGreaterThan(0);

      const along = await openSlider("scroll", { scope: "touch" });
      await along.wait(200);
      await along.drag(`id:${part}`, { x: 60, y: 0 });
      await along.wait(200);

      expect(callsOf(along, "onChange").length).toBeGreaterThan(0);
      expect(callsOf(along, "onChangeEnd")).toHaveLength(1);
      expect(along.count("text:Dragging")).toBe(0);
      // The pan held the touches: the Scroll's offset never left zero.
      expect(scrollOffsets(along).every((offset) => offset.y === 0)).toBe(true);
    }

    // Vertical slider inside a horizontal Scroll: along = y, cross = x.
    const padControlH = await openSlider("scroll", {
      scope: "touch",
      orientation: "vertical",
    });
    await padControlH.wait(200);
    await padControlH.drag("text:row 0", { x: -80, y: 0 });
    await padControlH.wait(200);
    expect(lastOffset(padControlH).x).toBeGreaterThan(0);

    for (const part of ["thumb", "track"] as const) {
      const cross = await openSlider("scroll", {
        scope: "touch",
        orientation: "vertical",
      });
      await cross.wait(200);
      expect(cross.shows("id:output >> text:30")).toBe(true);

      await cross.drag(`id:${part}`, { x: -80, y: 0 });
      await cross.wait(200);

      expect(callsOf(cross, "onChange")).toHaveLength(0);
      expect(callsOf(cross, "onChangeEnd")).toHaveLength(0);
      expect(cross.count("text:Dragging")).toBe(0);
      expect(cross.shows("id:output >> text:30")).toBe(true);
      expect(lastOffset(cross).x).toBeGreaterThan(0);

      const along = await openSlider("scroll", {
        scope: "touch",
        orientation: "vertical",
      });
      await along.wait(200);
      await along.drag(`id:${part}`, { x: 0, y: -60 });
      await along.wait(200);

      expect(callsOf(along, "onChange").length).toBeGreaterThan(0);
      expect(callsOf(along, "onChangeEnd")).toHaveLength(1);
      expect(along.count("text:Dragging")).toBe(0);
      expect(scrollOffsets(along).every((offset) => offset.x === 0)).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/slider.md M-009 (基线), held half: under the default
  // pointer environment a held thumb drag still sets `isDragging` mid-
  // gesture — the desktop responder chain is untouched by the touch pan.
  test("M-009 default pointer environment: a held thumb drag reports Dragging mid-gesture", async () => {
    const app = await openSlider("mobile", { probe: "1" });

    await app.dragAndHold("id:thumb", { x: 60, y: 0 });

    expect(app.count("text:Dragging")).toBe(1);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(0);

    await app.drop();
    await app.wait(100);

    expect(app.count("text:Dragging")).toBe(0);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);
  });

  // adapt-sheets/slider.md M-010 (A-003, A-004): the Scroll's native
  // takeover never passes through the JS responder terminate path, so the
  // proof is negative — a held cross-axis drag leaves `isDragging` unset
  // for the whole gesture (the pan's `shouldClaim` never granted and the
  // gated-off bare chain never claimed), the marker stays `Idle`, and
  // `drop()` leaks no `onChangeEnd`.
  test("M-010 touch + Scroll: a held cross-axis drag never sets isDragging and drop leaks no onChangeEnd", async () => {
    for (const part of ["thumb", "track"] as const) {
      const app = await openSlider("scroll", { scope: "touch" });
      await app.wait(200);

      await app.dragAndHold(`id:${part}`, { x: 0, y: -80 });

      // Held mid-gesture: the Scroll owns the touches — the slider never
      // started an interaction.
      expect(app.count("text:Dragging")).toBe(0);
      expect(callsOf(app, "onChange")).toHaveLength(0);
      expect(callsOf(app, "onChangeEnd")).toHaveLength(0);
      expect(lastOffset(app).y).toBeGreaterThan(0);

      await app.drop();
      await app.wait(200);

      expect(callsOf(app, "onChangeEnd")).toHaveLength(0);
      expect(app.count("text:Dragging")).toBe(0);
    }
  });
});
