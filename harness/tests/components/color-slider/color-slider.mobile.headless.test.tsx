import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only half of the color-slider adapt assertions — the rows whose
 * evidence needs the native Scroll recognizer or a held finger, neither of
 * which the web target can produce (adapt-sheets/color-slider.md §4 file
 * column and §6): M-003's `dragAndHold` mid-drag `isDragging` sampling,
 * M-004's cross-axis "gesture goes to the Scroll" arbitration, and M-010's
 * cross-axis termination path.
 *
 * The fixture cases are `mobile` (seam/gesture probes) and `scroll` (the
 * slider inside a real `Scroll` whose axis is perpendicular to the
 * slider's, plus a plain `pad` control proving the scroller itself moves).
 * `scope="touch"` mounts `EnvironmentScope input="touch"`; every open pins
 * `platform:"windows", width:1024, height:768`.
 *
 * Observation is the same probe channel as the dual-target file:
 * `onChange`/`onChangeEnd`, `drag-state` (`isDragging` edges), the `idle` /
 * `dragging` marker text, and `scroller` offset records.
 */

function openSlider(
  caseName: string,
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../color-slider.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

function dragStates(app: App): boolean[] {
  return callsOf(app, "drag-state").map((args) => args[0] as boolean);
}

type CtxEnv = { id: string; panKeys: number; panActive: boolean };

/** The `ctx-env` records one part's `SeamProbe` has written so far. */
function ctxEnvOf(app: App, id: string): CtxEnv[] {
  return callsOf(app, "ctx-env")
    .map((args) => args[0] as CtxEnv)
    .filter((record) => record.id === id);
}

function scrollerOffsets(app: App): { x: number; y: number }[] {
  return callsOf(app, "scroller").map(
    (args) => args[0] as { x: number; y: number },
  );
}

function lastOffset(app: App): { x: number; y: number } {
  const offsets = scrollerOffsets(app);
  return offsets.at(-1) ?? { x: 0, y: 0 };
}

describe("color-slider mobile headless", () => {
  // adapt-sheets/color-slider.md M-003 (A-003, A-004), held-drag half: with
  // the finger kept down mid-gesture (`dragAndHold`), the `dragging`
  // marker reads `dragging`, `isDragging` is set, `onChangeEnd` has not
  // fired yet — and `drop()` closes the interaction with exactly one
  // `onChangeEnd`. Both parts, both orientations.
  test("M-003 touch: a held axial drag reports isDragging mid-gesture and one onChangeEnd on drop", async () => {
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
          by: orientation === "vertical" ? { x: 0, y: 60 } : { x: 60, y: 0 },
        });
      }
    }

    for (const { app, part, by } of sessions) {
      await app.dragAndHold(`id:${part}`, by);

      // Mid-hold: the marker and the edge probe both report the drag, and
      // the interaction has not ended.
      expect(app.texts()).toContain("dragging");
      expect(dragStates(app)).toContain(true);
      expect(callsOf(app, "onChangeEnd")).toHaveLength(0);
      expect(callsOf(app, "onChange").length).toBeGreaterThan(0);

      // Positive pan observation (review M-013 complement to M-012's
      // `panKeys === 0` negative): `ctx-env` must report `panActive === true`
      // on this part while the finger is still held — `pan.active()` only
      // sets inside the pan's `onPanResponderGrant`, which the shadowed-spread
      // defect never ran. `probe=1` mounts the per-part `SeamProbe`s.
      try {
        await app.waitUntil(
          () => ctxEnvOf(app, part).some((record) => record.panActive),
          { timeout: 2000 },
        );
      } catch {
        // Timed out: `pan.active()` never went true — exactly the bug.
      }
      const envRecords = ctxEnvOf(app, part);
      // Mid-hold the pan must own the gesture: the handlers are mounted
      // (`panKeys > 0`, the positive half of M-012's `panKeys === 0`) and at
      // least one report reads `panActive` — the pan's grant ran.
      expect(envRecords.length).toBeGreaterThan(0);
      expect(
        envRecords.every((record) => record.panKeys > 0),
      ).toBe(true);
      expect(envRecords.some((record) => record.panActive)).toBe(true);

      await app.drop();
      await app.wait(100);

      expect(app.texts()).toContain("idle");
      expect(dragStates(app).at(-1)).toBe(false);
      expect(callsOf(app, "onChangeEnd")).toHaveLength(1);
    }
  });

  // adapt-sheets/color-slider.md M-004 (A-003, A-004): inside a real
  // `Scroll` whose axis is perpendicular to the slider's, a cross-axis drag
  // is never claimed — zero `onChange`/`onChangeEnd`, `isDragging` never
  // set, the value marker unchanged, and the Scroll's offset advances —
  // while an along-axis drag is claimed by the pan: `onChange` reports,
  // `onChangeEnd` fires once, and the Scroll never moves. Both
  // orientations, both parts.
  test("M-004 touch + Scroll: cross-axis drags go to the scroller, along-axis drags stay with the pan", async () => {
    // Control: the plain `pad` area scrolls the same Scroll — the offset
    // progress below is the scroller's, not a slider artifact.
    const padControl = await openSlider("scroll", { scope: "touch" });
    await padControl.wait(200);
    await padControl.drag("id:pad", { x: 0, y: -80 });
    await padControl.wait(200);
    expect(lastOffset(padControl).y).toBeGreaterThan(0);

    // Horizontal slider inside a vertical Scroll: along = x, cross = y.
    for (const part of ["thumb", "track"] as const) {
      const cross = await openSlider("scroll", { scope: "touch" });
      await cross.wait(200);
      const valueBefore = cross.texts().find((text) => text.includes("°"));
      expect(valueBefore).toBeDefined();

      await cross.drag(`id:${part}`, { x: 0, y: -80 });
      await cross.wait(200);

      expect(callsOf(cross, "onChange")).toHaveLength(0);
      expect(callsOf(cross, "onChangeEnd")).toHaveLength(0);
      expect(dragStates(cross).filter(Boolean)).toHaveLength(0);
      // The value — and so the thumb's position — never moved.
      expect(cross.texts()).toContain(valueBefore!);
      // The gesture went to the Scroll: its offset advanced.
      expect(lastOffset(cross).y).toBeGreaterThan(0);

      const along = await openSlider("scroll", { scope: "touch" });
      await along.wait(200);
      await along.drag(`id:${part}`, { x: 60, y: 0 });
      await along.wait(200);

      expect(callsOf(along, "onChange").length).toBeGreaterThan(0);
      expect(callsOf(along, "onChangeEnd")).toHaveLength(1);
      expect(dragStates(along).filter(Boolean)).toHaveLength(1);
      // The pan held the touches: the Scroll's offset never left zero.
      expect(scrollerOffsets(along).every((offset) => offset.y === 0)).toBe(true);
    }

    // Vertical slider inside a horizontal Scroll: along = y, cross = x.
    const padControlH = await openSlider("scroll", {
      scope: "touch",
      orientation: "vertical",
    });
    await padControlH.wait(200);
    await padControlH.drag("id:pad", { x: -80, y: 0 });
    await padControlH.wait(200);
    expect(lastOffset(padControlH).x).toBeGreaterThan(0);

    for (const part of ["thumb", "track"] as const) {
      const cross = await openSlider("scroll", {
        scope: "touch",
        orientation: "vertical",
      });
      await cross.wait(200);
      const valueBefore = cross.texts().find((text) => text.includes("°"));
      expect(valueBefore).toBeDefined();

      await cross.drag(`id:${part}`, { x: -80, y: 0 });
      await cross.wait(200);

      expect(callsOf(cross, "onChange")).toHaveLength(0);
      expect(callsOf(cross, "onChangeEnd")).toHaveLength(0);
      expect(dragStates(cross).filter(Boolean)).toHaveLength(0);
      expect(cross.texts()).toContain(valueBefore!);
      expect(lastOffset(cross).x).toBeGreaterThan(0);

      const along = await openSlider("scroll", {
        scope: "touch",
        orientation: "vertical",
      });
      await along.wait(200);
      await along.drag(`id:${part}`, { x: 0, y: 60 });
      await along.wait(200);

      expect(callsOf(along, "onChange").length).toBeGreaterThan(0);
      expect(callsOf(along, "onChangeEnd")).toHaveLength(1);
      expect(dragStates(along).filter(Boolean)).toHaveLength(1);
      expect(scrollerOffsets(along).every((offset) => offset.x === 0)).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/color-slider.md M-010 (A-003, A-004): the Scroll's native
  // takeover never passes through the JS responder terminate path, so the
  // proof is negative — a held cross-axis drag leaves `isDragging` unset
  // for the whole gesture (`startDragging` never ran), the marker stays
  // `idle`, and `drop()` leaks no `onChangeEnd`.
  test("M-010 touch + Scroll: a held cross-axis drag never sets isDragging and drop leaks no onChangeEnd", async () => {
    for (const part of ["thumb", "track"] as const) {
      const app = await openSlider("scroll", { scope: "touch" });
      await app.wait(200);

      await app.dragAndHold(`id:${part}`, { x: 0, y: -80 });

      // Held mid-gesture: the Scroll owns the touches — the slider never
      // started an interaction.
      expect(app.texts()).toContain("idle");
      expect(app.texts()).not.toContain("dragging");
      expect(dragStates(app).filter(Boolean)).toHaveLength(0);
      expect(callsOf(app, "onChange")).toHaveLength(0);
      expect(callsOf(app, "onChangeEnd")).toHaveLength(0);
      expect(lastOffset(app).y).toBeGreaterThan(0);

      await app.drop();
      await app.wait(200);

      expect(callsOf(app, "onChangeEnd")).toHaveLength(0);
      expect(dragStates(app).filter(Boolean)).toHaveLength(0);
    }
  });

  // Review regression (implementation bug, review finding M-013): the pan's
  // `{...pan.panHandlers()}` spread sat BEFORE the part's own
  // `onResponderGrant`/`onResponderMove`/`onResponderRelease`/
  // `onResponderTerminate` props, so JSX last-prop-wins shadowed the pan's
  // `onPanResponderGrant` lifecycle — `pan.active()` never set, `onDragStart`
  // never ran, and `isDragging` still went true through the bare chain.
  // Evidence: src/components/color-slider/color-slider-thumb.tsx:535,577-582
  // and color-slider-track.tsx:543,556-561. Required behavior: under touch
  // the pan owns the claimed drag end-to-end — `ctx-env` reports
  // `panActive === true` while the finger is held, `onChangeEnd` fires
  // exactly once on `drop()`, and the claim ledger skips the claimed
  // `onTouchEnd` so no double-commit lands.
  test("M-013 touch: a held axial drag reports panActive mid-gesture and one onChangeEnd on drop", async () => {
    for (const part of ["thumb", "track"] as const) {
      const app = await openSlider("mobile", { scope: "touch", probe: "1" });
      await app.waitUntil(() => callsOf(app, "ctx-env").length >= 2);

      await app.dragAndHold(`id:${part}`, { x: 60, y: 0 });

      // Mid-hold: the pan's own lifecycle must be live — `panActive` true in
      // this part's `ctx-env` records while `dragging` is also true (the
      // shadowed signature is `dragging` with `panActive` never set). Under
      // the defect `pan.active()` stays false the whole hold, so this
      // `waitUntil` times out — the red the fix turns green.
      try {
        await app.waitUntil(
          () => ctxEnvOf(app, part).some((record) => record.panActive),
          { timeout: 2000 },
        );
      } catch {
        // Timed out: `pan.active()` never went true — exactly the bug.
      }
      const envRecords = ctxEnvOf(app, part);
      expect(envRecords.length).toBeGreaterThan(0);
      // The pan's handlers are mounted (`panKeys > 0`, the positive half of
      // M-012's `panKeys === 0`) and at least one report reads `panActive` —
      // `onPanResponderGrant` ran, which the bare chain shadowed.
      expect(envRecords.every((record) => record.panKeys > 0)).toBe(true);
      expect(envRecords.some((record) => record.panActive)).toBe(true);
      expect(app.texts()).toContain("dragging");
      expect(callsOf(app, "onChangeEnd")).toHaveLength(0);

      await app.drop();
      await app.wait(100);

      // Exactly one commit: the pan's `onDragEnd` released the interaction
      // and the claimed `onTouchEnd` was skipped by the ledger — not a
      // second `onChangeEnd` from the bare chain.
      expect(callsOf(app, "onChangeEnd")).toHaveLength(1);
      expect(dragStates(app).at(-1)).toBe(false);
      expect(app.texts()).toContain("idle");
    }
  });
});
