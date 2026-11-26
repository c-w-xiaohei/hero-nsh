import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the number-field adapt unit — the rows of
 * adapt-sheets/number-field.md §4 that need a capability only the headless
 * engine has. Two halves only a headless ios host can drive:
 * `open({platform:"ios"})` derives `input()==="touch"` from the platform
 * with no `EnvironmentScope` (the `platform` option rejects on `--target
 * web`), and `dragAndHold`/`app.drag`/`drop` are the only steps that hold a
 * press open mid-gesture or cancel it (M-012). M-004 and M-011's hover half
 * moved here from the shared file because `app.hover` needs a mouse.
 *
 * The fixture is `harness/number-field.fixtures.tsx`:
 *   case "press" probe=1 — both step buttons wired to the `events` sequence
 *     probe plus `StepButtonProbe` (reads `PressableFeedbackContext`) and
 *     `FieldProbe` (reads `NumberFieldContext`) inside the field.
 *   case "hold" — `onChange` counts steps and `hold` samples the count at
 *     450/550/700/1100 ms after the press-down step; the buttons carry
 *     `delayLongPress={1400}` so a held press outlives the last mark.
 *
 * Probe channels (app.storage()): `seam-env` ({name, enabled, hitSlop}),
 * `seam-edge` ({name, seam} per isPressed edge), `seam-hold` ({name,
 * midHold, seamPressed, scale, hitSlop, enabled} at +300/+1100 ms per edge),
 * `events` ([name, phase] — down/start/changeT/up/end/changeF/press plus
 * the field's onChange marker) and `hold` ({at, steps}).
 */

type SeamEdge = { name: string; seam: boolean };

type SeamEnv = { name: string; enabled: boolean; hitSlop: unknown };

type SeamHold = {
  name: string;
  midHold: boolean;
  seamPressed: boolean;
  scale: number;
  hitSlop: unknown;
  enabled: boolean;
};

type HoldSample = { at: number; steps: number };

function openField(caseName: string, params: Record<string, string> = {}): Promise<App> {
  return open("../../../number-field.fixtures.tsx", {
    platform: "ios",
    width: 390,
    height: 844,
    host: { params: { case: caseName, ...params } },
  });
}

/** The windows pin — `app.hover` needs the mouse-capable host. */
function openPointer(caseName: string, params: Record<string, string> = {}): Promise<App> {
  return open("../../../number-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

function seamEdges(app: App, name: string): boolean[] {
  return callsOf(app, "seam-edge")
    .map((c) => c[0] as SeamEdge)
    .filter((e) => e.name === name)
    .map((e) => e.seam);
}

function lastSeamEnv(app: App): Record<string, SeamEnv> {
  const out: Record<string, SeamEnv> = {};
  for (const call of callsOf(app, "seam-env")) {
    const e = call[0] as SeamEnv;
    out[e.name] = e;
  }
  return out;
}

function seamHolds(app: App, name: string, midHold: boolean): SeamHold[] {
  return callsOf(app, "seam-hold")
    .map((c) => c[0] as SeamHold)
    .filter((h) => h.name === name && h.midHold === midHold);
}

function holdSamples(app: App): HoldSample[] {
  return callsOf(app, "hold").map((c) => c[0] as HoldSample);
}

type HoverState = {
  part: string;
  isHovered?: boolean;
  isFocused?: boolean;
  isFocusWithin?: boolean;
  isPressed?: boolean;
};

function hoverStates(app: App, part: string): HoverState[] {
  return callsOf(app, "hover-state")
    .map((c) => c[0] as HoverState)
    .filter((s) => s.part === part);
}

function buttonPhases(app: App, name: string): string[] {
  return callsOf(app, "events")
    .map((c) => c as [string, string])
    .filter((e) => e[0] === name)
    .map((e) => e[1]);
}

describe("number-field mobile (headless)", () => {
  // adapt-sheets/number-field.md M-012 (A-002, A-004, A-006): an ios host
  // derives `input()==="touch"` with no EnvironmentScope — the seam gate
  // opens on its own (`enabled` true at mount), a press round-trips
  // `isPressed`, and the 44 pt columns correctly compute no hitSlop. A
  // `dragAndHold` mid-press shows the 600 ms first-repeat window in the
  // `hold` samples, and `app.drag`'s cancellation runs the same
  // pressUp path: the press chain ends without `press`, the seam flag and
  // the scale channel return to rest.
  test("M-012 ios host derives touch: seam engages, 600ms hold window holds, drag cancel resets", async () => {
    // --- Host derivation + press round-trip (case "press", probe=1) -------
    const app = await openField("press", { probe: "1" });

    const env = lastSeamEnv(app);
    expect(env["inc"]?.enabled).toBe(true);
    expect(env["inc"]?.hitSlop).toBeNull();
    expect(env["dec"]?.enabled).toBe(true);

    await app.press("id:nf-inc");
    await app.waitUntil(() => buttonPhases(app, "inc").includes("press"));
    expect(app.value("id:nf-input")).toBe("1");

    const seams = seamEdges(app, "inc");
    expect(seams).toContain(true);
    expect(seams.indexOf(true)).toBeLessThan(seams.lastIndexOf(false));
    expect(seams.at(-1)).toBe(false);

    // --- dragAndHold: the touch 600 ms first-repeat window (case "hold") --
    const held = await openField("hold");
    await held.dragAndHold("id:nf-inc", { x: 0, y: 0 });
    // The finger stays down; the fixture's samples at 450/550/700 ms land
    // mid-hold and read the step count against the touch window.
    await held.waitUntil(() => holdSamples(held).some((s) => s.at === 700));
    await held.wait(50);

    const samples = new Map(holdSamples(held).map((s) => [s.at, s.steps]));
    expect(samples.get(550)).toBe(1);
    expect(samples.get(700)).toBeGreaterThanOrEqual(2);

    // `drop()` lifts the finger: pressUp clears the hold timer, so the step
    // count freezes — no further onChange lands afterwards.
    await held.drop();
    const frozen = callsOf(held, "onChange").length;
    await held.wait(200);
    expect(callsOf(held, "onChange")).toHaveLength(frozen);

    // --- app.drag cancellation: end and cancel share pressUp ---------------
    const drag = await openField("press", { probe: "1" });
    await drag.drag("id:nf-inc", { x: 0, y: 60 });
    await drag.waitUntil(() => buttonPhases(drag, "inc").includes("up"));

    // The press was cancelled mid-gesture: the chain recorded down → up →
    // end → changeF but never `press`, and the field still took its
    // press-down step exactly once.
    const phases = buttonPhases(drag, "inc");
    expect(phases).toContain("down");
    expect(phases).toContain("changeT");
    expect(phases).toContain("up");
    expect(phases).toContain("end");
    expect(phases).toContain("changeF");
    expect(phases).not.toContain("press");
    expect(
      callsOf(drag, "events").filter((c) => c[0] === "onChange"),
    ).toHaveLength(1);

    // The seam unwound on the same pressUp path: the flag returned false
    // and the settled sample reads scale back at 1.
    const dragSeams = seamEdges(drag, "inc");
    expect(dragSeams).toContain(true);
    expect(dragSeams.at(-1)).toBe(false);
    await drag.waitUntil(() => seamHolds(drag, "inc", false).length > 0);
    const settled = seamHolds(drag, "inc", false).at(-1)!;
    expect(settled.seamPressed).toBe(false);
    expect(settled.scale).toBe(1);
  }, 120_000);

  // adapt-sheets/number-field.md M-004 (A-005): under touch the hover writes
  // stay off on Group, Input and both step buttons — `app.hover` and a press
  // leave `isHovered` false, no `onHover*` callback records, and the group's
  // background never takes the hover fill (the web sticky-hover regression
  // the axis exists to prevent). The pointer environment's hover
  // round-trips. Moved from the shared file: `app.hover` needs a mouse.
  test("M-004 injected touch suppresses hover on every part; pointer keeps it", async () => {
    const touch = await openPointer("hover", { testInput: "touch" });
    const baseBg = touch.viewStyle("id:nf-group")?.backgroundColor;

    for (const selector of ["id:nf-group", "id:nf-input", "id:nf-dec", "id:nf-inc"]) {
      await touch.hover(selector);
    }
    await touch.press("id:nf-inc");
    await touch.wait(150);

    // No hover callback ever fired and no render prop ever read hovered.
    expect(callsOf(touch, "hover")).toHaveLength(0);
    for (const part of ["group", "input", "dec", "inc"]) {
      const states = hoverStates(touch, part);
      expect(states.length).toBeGreaterThan(0);
      expect(states.every((s) => s.isHovered === false)).toBe(true);
    }
    // The group's background never took the hover fill — before, during and
    // after the press it reads the same color.
    expect(touch.viewStyle("id:nf-group")?.backgroundColor).toBe(baseBg);

    const pointer = await openPointer("hover", { testInput: "pointer" });
    const pointerBase = pointer.viewStyle("id:nf-group")?.backgroundColor;

    await pointer.hover("id:nf-group");
    await pointer.waitUntil(() => callsOf(pointer, "hover").length > 0);

    const hoverCalls = callsOf(pointer, "hover").map((c) => c as [string, string, unknown?]);
    expect(hoverCalls).toContainEqual(["group", "start"]);
    expect(hoverCalls).toContainEqual(["group", "change", true]);
    expect(hoverStates(pointer, "group").some((s) => s.isHovered === true)).toBe(true);
    const pointerHoverBg = pointer.viewStyle("id:nf-group")?.backgroundColor;
    expect(pointerHoverBg).toBeDefined();
    expect(pointerHoverBg).not.toBe(pointerBase);
  }, 120_000);

  // adapt-sheets/number-field.md M-011's hover half (A-012): the `hover`
  // case's own `app.hover` record under pointer — the shared file proves
  // the same carrier on both scopes without a mouse.
  test("M-011 pointer: the hover case records the hover channel", async () => {
    const hoverApp = await openPointer("hover", { testInput: "pointer" });
    await hoverApp.hover("id:nf-group");
    await hoverApp.wait(100);
    expect(hoverStates(hoverApp, "group").length).toBeGreaterThan(0);
  }, 120_000);
});
