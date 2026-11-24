import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the number-field adapt unit — one test per row of
 * adapt-sheets/number-field.md §4 (M-001…M-011, M-013). The held-drag and
 * ios-derivation halves that need `dragAndHold`/`app.drag` or
 * `open({platform:"ios"})` live in `number-field.mobile.headless.test.tsx`
 * (M-012).
 *
 * The fixture is `harness/number-field.fixtures.tsx`, opened by `host.params`:
 * `case` — the pre-existing desktop cases (parts/log/controlled/invalid/
 * disabled/readonly/…) plus the mobile carriers `press` (both step buttons
 * wired to the `events` sequence + `onPress`/`onChange`/`onLayout`/`onHover*`
 * probes and, with `probe=1`, a `StepButtonProbe` inside each button reading
 * `PressableFeedbackContext` and a `FieldProbe` inside the root reading
 * `NumberFieldContext`), `layout` (Group/Input/both buttons `onLayout`),
 * `hover` (`isHovered` render-prop records + `onHover*` callbacks on every
 * hoverable part), `hold` (`onChange` count + `hold` samples at
 * 450/550/700/1100 ms after the first step) and `submit` (`onSubmit`/`onBlur`/
 * `onChange` probes + `submitBehavior`/`enterKeyHint`/`returnKeyType`/
 * `autoCapitalize` params).
 *
 * `testInput` ("pointer"/"touch" through an outer `EnvironmentScope`)
 * replaces the `scope` param: the pointer half is the host-independent
 * desktop-parity baseline — the host-derived default differs per target
 * (touch on native phones, pointer on desktop/web) and the open's
 * `platform`/`width`/`height` options are gone because native hosts fill
 * the device screen and reject them, so this file runs on ios/android too.
 *
 * Observation channels, all in `app.storage()` through `@scenario/probe`:
 * `events` ([name, phase] — button phases down/start/changeT/up/end/
 * changeF/press, plus the field's `onChange`/`blur`/`submit` markers),
 * `seam-env` ({name, enabled, hitSlop} on mount and every gate/slop change),
 * `seam-edge` ({name, seam} per `feedback.isPressed` edge — silent under
 * pointer), `seam-hold` ({name, midHold, seamPressed, scale, hitSlop,
 * enabled} sampled +300 ms mid-hold and +1100 ms settled), `seam-sample`
 * (the same channels read after each `press` event), `field-env` ({input,
 * groupCols, hasDecrement, hasIncrement} — the root's single axis read),
 * `layout` ({name, x, y, width, height} per part `onLayout`), `hover`
 * ([part, phase] of the `onHover*` callbacks) and `hover-state` (the
 * `isHovered`/`isFocused`/`isFocusWithin`/`isPressed` render-prop records).
 */

type Params = Record<string, string | number | boolean>;

function openField(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../number-field.fixtures.tsx", {
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type SeamEdge = { name: string; seam: boolean };

type SeamEnv = { name: string; enabled: boolean; hitSlop: Edges | null };

type SeamSample = {
  name: string;
  seamPressed: boolean;
  scale: number;
  hitSlop: Edges | null;
  enabled: boolean;
};

type SeamHold = SeamSample & { midHold: boolean };

type FieldEnv = {
  input: string | null;
  groupCols: string | null;
  hasDecrement: boolean | null;
  hasIncrement: boolean | null;
};

type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

type HoverState = {
  part: string;
  isHovered?: boolean;
  isFocused?: boolean;
  isFocusWithin?: boolean;
  isPressed?: boolean;
};

type HoldSample = { at: number; steps: number };

function lastOf<T>(app: App, name: string): T {
  const all = callsOf(app, name);
  return all[all.length - 1][0] as T;
}

/** The recorded `events` phases of one button, in order. */
function buttonPhases(app: App, name: string): string[] {
  return callsOf(app, "events")
    .map((c) => c as [string, string])
    .filter((e) => e[0] === name)
    .map((e) => e[1]);
}

/** The field-level `events` markers (`onChange` / `blur` / `submit`), in order. */
function fieldMarkers(app: App): string[] {
  return callsOf(app, "events")
    .map((c) => c[0] as string)
    .filter((n) => n === "onChange" || n === "blur" || n === "submit");
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

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

async function waitForLayouts(app: App, names: string[]): Promise<void> {
  await app.waitUntil(() =>
    names.every((n) => callsOf(app, "layout").some((c) => (c[0] as LayoutEntry).name === n)),
  );
}

function hoverStates(app: App, part: string): HoverState[] {
  return callsOf(app, "hover-state")
    .map((c) => c[0] as HoverState)
    .filter((s) => s.part === part);
}

function holdSamples(app: App): HoldSample[] {
  return callsOf(app, "hold").map((c) => c[0] as HoldSample);
}

/* The press chain one completed tap on a step button records, identical on
 * both inputs (A-004 leaves the order untouched): the field's `onChange`
 * marker first — `step()` runs at the head of `handlePressDown` — then
 * down/start/changeT on the way down and up/end/changeF/press on the way
 * up. `onChange` markers repeat: the button's hold-repeat is a real
 * behavior and a synthesized `app.press` holds the touch for a
 * host-dependent duration — iOS's lands past the 400 ms pointer first
 * delay, so its stream shows extra `["onChange"]` entries between
 * `changeT` and `up` (run 45344508005: value "6" from one press). The
 * phase chain itself is asserted verbatim below. */
const INC_PRESS_SEQUENCE = [
  ["onChange"],
  ["inc", "down"],
  ["inc", "start"],
  ["inc", "changeT"],
  ["inc", "up"],
  ["inc", "end"],
  ["inc", "changeF"],
  ["inc", "press"],
] as const;

/* The stream the one press records: `onChange` heads it (step runs at
 * press-down), the button's phase chain is verbatim, and hold-repeat
 * `onChange` markers may interleave — but only inside the hold window:
 * `handlePressUp` clears the timer (`step-button.tsx:382`) before `up`
 * reports, so an `onChange` at or after release is a stray step the
 * contract forbids, never a tolerated repeat. */
function pressStream(app: App): unknown[][] {
  const stream = eventStream(app);
  expect(stream[0]).toEqual(["onChange"]);

  const up = stream.findIndex((e) => e[0] === "inc" && e[1] === "up");
  const phases = stream.filter(
    // Drop only repeat `onChange` markers strictly inside the hold
    // window: `clearHold()` precedes `up`, so one landing at or after
    // release is a stray step and must stay for the verbatim check —
    // filtering it out too would silently mask it.
    (e, i) => e[0] !== "onChange" || i === 0 || i >= up,
  );
  expect(phases).toEqual([...INC_PRESS_SEQUENCE]);

  return stream;
}

function eventStream(app: App): unknown[][] {
  return callsOf(app, "events");
}

describe("number-field mobile", () => {
  // adapt-sheets/number-field.md M-001 (A-004, 负断言): under the default
  // pointer environment the touch-gated seam is a zero-cost pass-through —
  // `isPressed` never rises, `hitSlop()` stays undefined, `scale` pins at 1,
  // no hold samples schedule — while the press contract (step → onChange,
  // the down→up→press chain, the caller's onPress) fires once per press.
  test("M-001 default environment: the touch feedback path does not exist while the press contract holds", async () => {
    const app = await openField("press", { testInput: "pointer", probe: "1" });

    await app.press("id:nf-inc");
    await app.waitUntil(() => buttonPhases(app, "inc").includes("press"));

    // The contract half: each committed step reported `onChange` once and
    // the value equals the step count (0 + N — a long synthesized press
    // may legitimately repeat, iOS CI proved), the full press chain
    // recorded, `onPress` exactly once.
    pressStream(app);
    expect(callsOf(app, "onPress")).toEqual([["inc"]]);
    const steps = callsOf(app, "events").filter((c) => c[0] === "onChange").length;
    expect(steps).toBeGreaterThanOrEqual(1);
    expect(app.value("id:nf-input")).toBe(String(steps));

    // The seam half: every edge report is seam=false (the mount-time false
    // included), the gate reads closed with no slop, and a held press still
    // schedules no channel samples — `isPressed` never rose.
    const edges = callsOf(app, "seam-edge").map((c) => c[0] as SeamEdge);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((e) => e.seam === false)).toBe(true);

    const env = lastSeamEnv(app);
    expect(env["inc"]?.enabled).toBe(false);
    expect(env["inc"]?.hitSlop).toBeNull();
    expect(env["dec"]?.enabled).toBe(false);

    // The post-press sample reads every channel at rest.
    await app.waitUntil(() => callsOf(app, "seam-sample").length > 0);
    const sample = lastOf<SeamSample>(app, "seam-sample");
    expect(sample.seamPressed).toBe(false);
    expect(sample.scale).toBe(1);
    expect(sample.hitSlop).toBeNull();
    expect(sample.enabled).toBe(false);

    // A hold changes nothing: the desktop hold-repeat still steps (that is
    // the preserved contract — the 400 ms first repeat lands inside the
    // 500 ms hold), but the seam stays inert throughout.
    await app.longPress("id:nf-inc");
    await app.waitUntil(
      () => callsOf(app, "events").filter((c) => c[0] === "onChange").length >= 2,
    );
    expect(callsOf(app, "seam-edge").every((c) => (c[0] as SeamEdge).seam === false)).toBe(true);
    expect(callsOf(app, "seam-hold")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/number-field.md M-002 (A-004): injected touch — the seam's
  // `isPressed` completes the true→false roundtrip on press, a held press
  // reads `scale` below 1 mid-hold (≈0.97 flat, `ignoreScaleCoefficient`)
  // and back to 1 after release; the 44 pt touch column already meets the
  // hit target, so `hitSlop()` reports no expansion while `enabled` holds.
  test("M-002 injected touch: seam round-trips, held scale presses below 1, 44pt column needs no slop", async () => {
    const app = await openField("press", { testInput: "touch", probe: "1" });

    await app.press("id:nf-inc");
    await app.waitUntil(() => buttonPhases(app, "inc").includes("press"));

    // The user-visible contract is unchanged under touch: the verbatim
    // press chain with hold-repeat `onChange` markers allowed past the
    // first, and the value tracking the committed step count.
    pressStream(app);
    const touchSteps = callsOf(app, "events").filter((c) => c[0] === "onChange").length;
    expect(touchSteps).toBeGreaterThanOrEqual(1);
    expect(app.value("id:nf-input")).toBe(String(touchSteps));

    // The seam's own flag round-tripped through the button's context probe.
    const seams = seamEdges(app, "inc");
    expect(seams).toContain(true);
    expect(seams.indexOf(true)).toBeLessThan(seams.lastIndexOf(false));
    expect(seams.at(-1)).toBe(false);

    // Gate open at mount; the 44 px column already reaches the 44 pt target
    // so the computed slop is empty — the channel is live, the expansion is
    // correctly zero (sheet §4's "补量为 0/undefined 侧").
    const env = lastSeamEnv(app);
    expect(env["inc"]?.enabled).toBe(true);
    expect(env["inc"]?.hitSlop).toBeNull();
    expect(env["dec"]?.enabled).toBe(true);

    // A held press: the fixture's +300 ms sample lands mid-hold with the
    // scale timing complete — the flat 0.97 target — and a +1100 ms sample
    // lands after release plus the return animation. The earlier tap's own
    // delayed samples can drift into this window, so the held read filters
    // on `seamPressed` and the settled read waits for a sample that
    // actually reports the returned channel.
    await app.longPress("id:nf-inc");
    await app.waitUntil(() =>
      seamHolds(app, "inc", true).some((h) => h.seamPressed),
    );
    const held = seamHolds(app, "inc", true).filter((h) => h.seamPressed).at(-1)!;
    const scaleEnv = lastOf<{ reduceMotion: boolean }>(app, "env");
    // The held scale's end value follows the host's motion preference:
    // Android CI runs with `animator_duration_scale 0.0`, which the host
    // reports as reduce-motion (`env` probe) and `createPressFeedback`
    // honors by pinning the channel at 1 (`press-feedback.ts:197` —
    // contract behavior, not a dropped press: `seamPressed` still
    // records the hold). Where the host animates, the held value must
    // dip to the flat 0.97 as before — the same branch button M-004
    // introduced (0a56376).
    if (scaleEnv.reduceMotion) {
      expect(held.scale).toBe(1);
    } else {
      expect(held.scale).toBeLessThan(1);
      expect(held.scale).toBeGreaterThan(0.9);
      expect(Math.abs(held.scale - 0.97)).toBeLessThan(0.05);
    }
    expect(held.enabled).toBe(true);
    expect(held.hitSlop).toBeNull();

    await app.waitUntil(() =>
      seamHolds(app, "inc", false).some((h) => !h.seamPressed && h.scale === 1),
    );
    const settled = seamHolds(app, "inc", false).at(-1)!;
    expect(settled.seamPressed).toBe(false);
    expect(settled.scale).toBe(1);
  }, 120_000);

  // adapt-sheets/number-field.md M-003 (A-001, A-003, A-011): the `input`
  // axis's `min-h-11` lifts the touch row to the 44 pt target and `w-11` /
  // `groupCols: "44px"` widen the step columns; the default environment
  // keeps the desktop 36 pt row and 40 pt columns — zero drift.
  test("M-003 touch row and step columns measure 44pt; default environment keeps 36/40", async () => {
    const touch = await openField("layout", { testInput: "touch" });
    await waitForLayouts(touch, ["group", "dec", "inc"]);

    const touchGroup = layoutFor(touch, "group");
    expect(touchGroup.height).toBeGreaterThanOrEqual(43.4);
    expect(touchGroup.height).toBeLessThanOrEqual(44.6);
    for (const name of ["dec", "inc"]) {
      const box = layoutFor(touch, name);
      expect(box.width).toBeGreaterThanOrEqual(43.4);
      expect(box.width).toBeLessThanOrEqual(44.6);
    }

    const pointer = await openField("layout", { testInput: "pointer" });
    await waitForLayouts(pointer, ["group", "dec", "inc"]);

    const pointerGroup = layoutFor(pointer, "group");
    expect(pointerGroup.height).toBeLessThan(40);
    expect(pointerGroup.height).toBeGreaterThan(34);
    for (const name of ["dec", "inc"]) {
      const box = layoutFor(pointer, name);
      expect(box.width).toBeGreaterThanOrEqual(39.4);
      expect(box.width).toBeLessThanOrEqual(40.6);
    }
  }, 120_000);

  // adapt-sheets/number-field.md M-004 (A-005) lives in
  // `number-field.mobile.headless.test.tsx` — `app.hover` needs a mouse, so
  // the row moved there whole rather than split.

  // adapt-sheets/number-field.md M-005 (A-006): the hold-repeat's first
  // delay follows the axis — touch widens the window to 600 ms, pointer
  // keeps 400 ms, the 60 ms cadence is the same on both. The `hold` case
  // samples the step count at 450/550/700/1100 ms after the press-down step;
  // the buttons' `delayLongPress={1400}` keeps `app.longPress` held past the
  // last mark (the fixture note records why the default 500 ms is not
  // enough). Every step fires `onChange` exactly once, in order.
  test("M-005 hold-repeat first delay is 600ms on touch, 400ms on pointer, one 60ms cadence", async () => {
    const touch = await openField("hold", { testInput: "touch" });
    await touch.longPress("id:nf-inc");
    await touch.waitUntil(() => holdSamples(touch).length >= 4);

    const touchSamples = new Map(holdSamples(touch).map((s) => [s.at, s.steps]));
    // Inside the 600 ms window the count is still the press-down step alone.
    expect(touchSamples.get(450)).toBe(1);
    expect(touchSamples.get(550)).toBe(1);
    // Past it the repeats have started and keep the shared cadence.
    expect(touchSamples.get(700)).toBeGreaterThanOrEqual(2);
    expect(touchSamples.get(1100)).toBeGreaterThan(touchSamples.get(700)!);

    // Native relaunches the single host per open(): the touch app's change
    // list must be plain data before `pointer` opens — its handle is dead
    // after.
    const touchChanges = callsOf(touch, "onChange").map((c) => c[0] as number);

    const pointer = await openField("hold", { testInput: "pointer" });
    await pointer.longPress("id:nf-inc");
    await pointer.waitUntil(() => holdSamples(pointer).length >= 4);

    const pointerSamples = new Map(holdSamples(pointer).map((s) => [s.at, s.steps]));
    // The 400 ms window already produced a repeat by the 450 ms mark.
    expect(pointerSamples.get(450)).toBeGreaterThanOrEqual(2);
    expect(pointerSamples.get(550)).toBeGreaterThan(pointerSamples.get(450)!);
    expect(pointerSamples.get(1100)).toBeGreaterThan(pointerSamples.get(700)!);

    // One `onChange` per step, values 1..N — the step contract itself is
    // untouched by the axis (each app committed its own count above).
    for (const changes of [
      touchChanges,
      callsOf(pointer, "onChange").map((c) => c[0] as number),
    ]) {
      expect(changes.length).toBeGreaterThanOrEqual(2);
      expect(changes).toEqual(changes.map((_, i) => i + 1));
    }
  }, 120_000);

  // adapt-sheets/number-field.md M-006 (A-007): the edit → submit chain —
  // `app.type` edits, `app.submit` (Return) commits then reports `onSubmit`
  // once, in that order; `submitBehavior="submit"` keeps the focus (no blur,
  // the next `app.type` still lands in the same input) while
  // `"blurAndSubmit"` reports the blur. The new prop mouths mount.
  test("M-006 submit commits before onSubmit, keeps focus by default, blurAndSubmit blurs", async () => {
    const app = await openField("submit", { testInput: "pointer" });

    await app.press("id:nf-input");
    await app.clear("id:nf-input");
    await app.type("id:nf-input", "5");
    await app.submit("id:nf-input");

    await app.waitUntil(() => callsOf(app, "onSubmit").length === 1);
    // `field.commit()` runs before `local.onSubmit`: the commit's onChange
    // precedes the submit marker in the global probe order.
    const names = calls(app).map((c) => c.name);
    expect(names.lastIndexOf("onChange")).toBeLessThan(names.lastIndexOf("onSubmit"));
    expect(callsOf(app, "onChange").at(-1)).toEqual([5]);
    // `submitBehavior="submit"`: no blur, focus kept — typing still lands.
    expect(callsOf(app, "blur")).toHaveLength(0);
    await app.type("id:nf-input", "7");
    expect(app.value("id:nf-input")).toBe("57");

    const blurApp = await openField("submit", { testInput: "pointer", submitBehavior: "blurAndSubmit" });
    await blurApp.press("id:nf-input");
    await blurApp.clear("id:nf-input");
    await blurApp.type("id:nf-input", "5");
    await blurApp.submit("id:nf-input");
    await blurApp.waitUntil(() => callsOf(blurApp, "onSubmit").length === 1);
    await blurApp.waitUntil(() => callsOf(blurApp, "blur").length === 1);

    // The new mouths mount and keep the field working: each prop value opens
    // the same case and the edit/submit chain still runs.
    const variants: Params[] = [
      { enterKeyHint: "done" },
      { enterKeyHint: "search" },
      { returnKeyType: "go" },
      { returnKeyType: "default" },
      { submitBehavior: "newline" },
      { autoCapitalize: "none" },
    ];
    for (const params of variants) {
      const variant = await openField("submit", { testInput: "pointer", ...params });
      expect(variant.shows("id:nf-input")).toBe(true);
      await variant.press("id:nf-input");
      await variant.type("id:nf-input", "5");
      expect(variant.value("id:nf-input")).toContain("5");
    }
  }, 120_000);

  // adapt-sheets/number-field.md M-007 (A-009): the press-down step still
  // moves focus to the input on both inputs — a following `app.type` lands
  // in the same input and the keymap stays live — and the step event order
  // is identical under pointer and touch.
  test("M-007 step press keeps the focusInput path and the event order on both inputs", async () => {
    for (const params of [{ testInput: "pointer" } as Params, { testInput: "touch" }]) {
      const app = await openField("press", { probe: "1", ...params });

      await app.press("id:nf-inc");
      await app.waitUntil(() => buttonPhases(app, "inc").includes("press"));
      pressStream(app);

      // focusInput ran on press-down: the input holds the focus, so the
      // keymap binding is live and a following type lands in the same box.
      // The step count before arrowup is host-dependent (a held press may
      // repeat — see `pressStream`), so it is read, not pinned.
      const stepsSoFar = callsOf(app, "events").filter((c) => c[0] === "onChange").length;
      await app.keyboard.press("arrowup");
      await app.waitUntil(
        () => callsOf(app, "events").filter((c) => c[0] === "onChange").length === stepsSoFar + 1,
      );
      // The type lands in the focused input and appends to its current
      // text: 0 → N press steps → arrowup step → typed "3" → "<N+1>3".
      const text = app.value("id:nf-input");
      await app.type("id:nf-input", "3");
      expect(app.value("id:nf-input")).toBe(`${text}3`);
    }
  }, 120_000);

  // adapt-sheets/number-field.md M-008 (A-010, 负断言): the Group container
  // has no press channel on either input — a press on the Label (the field
  // contract's focus path) produces no group hover/press record and no
  // step; the group itself reports nothing.
  test("M-008 group container has no press channel on either input", async () => {
    for (const params of [{ testInput: "pointer" } as Params, { testInput: "touch" }]) {
      const app = await openField("hover", params);

      // The Label's press is the field's focus contract, not a group press:
      // it focuses the input (the isFocused record proves where it landed)
      // and leaves the group's own channels silent.
      await app.press("text:Width");
      await app.waitUntil(() =>
        hoverStates(app, "input").some((s) => s.isFocused === true),
      );

      expect(callsOf(app, "hover")).toHaveLength(0);
      expect(hoverStates(app, "group").every((s) => s.isHovered === false)).toBe(true);
      expect(app.value("id:nf-input")).toBe("0");
    }
  }, 120_000);

  // adapt-sheets/number-field.md M-009 (A-008): the edit/parse filter and
  // the six keymap bindings behave identically under both inputs — typing
  // rejects non-numeric text, ArrowUp/Down and PageUp/Down step, Home/End
  // commit the bounds. (The `accessibilityActions` increment/decrement
  // half has no `nsh/test` channel — recorded as a host gap.)
  test("M-009 typing filter and the six keymap bindings agree on both inputs", async () => {
    for (const params of [{ testInput: "pointer" } as Params, { testInput: "touch" }]) {
      const app = await openField("log", {
        defaultValue: 10,
        minValue: 0,
        maxValue: 100,
        ...params,
      });

      await app.press("id:nf-input");
      await app.clear("id:nf-input");
      await app.type("id:nf-input", "12");
      expect(app.value("id:nf-input")).toBe("12");

      // A letter the parser refuses leaves the text untouched.
      await app.type("id:nf-input", "a");
      expect(app.value("id:nf-input")).toBe("12");

      const expected = [13, 12, 13, 12, 0, 100, 99];
      const keys = [
        "arrowup",
        "arrowdown",
        "pageup",
        "pagedown",
        "home",
        "end",
        "arrowdown",
      ];
      for (const key of keys) {
        await app.keyboard.press(key);
      }
      await app.waitUntil(
        () => callsOf(app, "onChange").length === expected.length,
      );
      expect(callsOf(app, "onChange").map((c) => c[0])).toEqual(expected);
    }
  }, 120_000);

  // adapt-sheets/number-field.md M-010 (基线): the default environment is
  // byte-for-byte the desktop contract — parts compose, the controlled
  // value follows external writes, disabled and readonly refuse edits, the
  // invalid/required/description texts render. The existing `.heroui.` /
  // `.kobalte.` files stay read-only and keep their own assertions.
  test("M-010 default environment baseline: composition, controlled, disabled, readonly, field texts", async () => {
    const parts = await openField("parts", { testInput: "pointer" });
    expect(parts.shows("label:Width")).toBe(true);
    for (const id of ["nf-group", "nf-input", "nf-dec", "nf-inc"]) {
      expect(parts.shows(`id:${id}`)).toBe(true);
    }

    const composition = await openField("composition", {
      testInput: "pointer",
      hasDecrement: true,
      hasIncrement: false,
    });
    expect(composition.shows("id:nf-dec")).toBe(true);
    expect(composition.shows("id:nf-inc")).toBe(false);

    const controlled = await openField("controlled", { testInput: "pointer", initial: 10 });
    await controlled.press("id:set-zero");
    expect(controlled.value("id:nf-input")).toBe("0");
    await controlled.press("id:set-max");
    // The committed value formats through the locale: 2048 → "2,048".
    expect(controlled.value("id:nf-input")).toBe("2,048");

    const disabled = await openField("disabled", { testInput: "pointer" });
    expect(disabled.enabled("id:nf-input")).toBe(false);
    await expect(disabled.press("id:nf-inc")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(disabled, "onChange")).toHaveLength(0);

    const readonly = await openField("readonly", { testInput: "pointer" });
    expect(readonly.enabled("id:nf-input")).toBe(false);
    // Read-only closes `canStep`, so the step buttons report disabled and a
    // press is refused — the desktop contract, unchanged.
    await expect(readonly.press("id:nf-inc")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(readonly, "onChange")).toHaveLength(0);
    expect(readonly.value("id:nf-input")).toBe("10");

    const invalid = await openField("invalid", { testInput: "pointer" });
    expect(invalid.shows("text:Max is 10")).toBe(true);

    const required = await openField("required", { testInput: "pointer" });
    expect(required.shows("label:Width")).toBe(true);

    const description = await openField("description", { testInput: "pointer" });
    expect(description.shows("text:Description")).toBe(true);
  }, 120_000);

  // adapt-sheets/number-field.md M-011 (A-012): the fixture's probe surface
  // itself — every channel the mobile assertions read (`seam-env`,
  // `seam-edge`, `seam-hold`, `seam-sample`, `field-env`, `events`,
  // `layout`, `hover`, `hover-state`, `hold`, `onSubmit`/`blur`/`onChange`)
  // reaches `app.storage()` on both environments.
  test("M-011 fixture probe surface: every channel is readable through app.storage()", async () => {
    for (const params of [{ testInput: "pointer", probe: "1" } as Params, { testInput: "touch", probe: "1" }]) {
      const app = await openField("press", params);

      // Mount-time channels: the seam gate per button and the field axis.
      await app.waitUntil(
        () =>
          callsOf(app, "seam-env").length >= 2 &&
          callsOf(app, "field-env").length >= 1,
      );
      const env = lastSeamEnv(app);
      expect(env["inc"]).toBeDefined();
      expect(env["dec"]).toBeDefined();
      expect(lastOf<FieldEnv>(app, "field-env").input).not.toBeNull();

      await app.press("id:nf-inc");
      await app.waitUntil(() => buttonPhases(app, "inc").includes("press"));

      // Post-press channels: the edge report, the settle sample and the
      // press-chain events all landed in storage.
      expect(callsOf(app, "seam-edge").length).toBeGreaterThan(0);
      await app.waitUntil(() => callsOf(app, "seam-sample").length > 0);
      expect(callsOf(app, "events").length).toBeGreaterThan(0);
    }

    // The remaining carriers record their own channels under both scopes:
    // `layout` bounds, `hover-state` render-prop records, `hold` samples and
    // the `submit` chain's `onSubmit`/`blur` probes.
    for (const params of [{ testInput: "pointer" } as Params, { testInput: "touch" }]) {
      const layoutApp = await openField("layout", params);
      await waitForLayouts(layoutApp, ["group", "dec", "inc"]);
      expect(callsOf(layoutApp, "layout").length).toBeGreaterThanOrEqual(3);

      // `app.hover` needs a mouse, so the `hover` case's own record is
      // asserted headless-side (`number-field.mobile.headless.test.tsx`);
      // here the mount alone proves the channel records.
      const hoverApp = await openField("hover", params);
      await hoverApp.wait(50);
      expect(hoverStates(hoverApp, "group").length).toBeGreaterThan(0);

      const holdApp = await openField("hold", params);
      await holdApp.longPress("id:nf-inc");
      await holdApp.waitUntil(() => holdSamples(holdApp).length >= 1);
      expect(callsOf(holdApp, "onChange").length).toBeGreaterThanOrEqual(1);

      const submitApp = await openField("submit", params);
      await submitApp.press("id:nf-input");
      await submitApp.submit("id:nf-input");
      await submitApp.waitUntil(() => callsOf(submitApp, "onSubmit").length === 1);
    }
  }, 120_000);

  // adapt-sheets/number-field.md M-013 (A-002): the axis travels the root's
  // single read channel — one `EnvironmentScope input="touch"` flips the
  // group's column template (`groupCols` 40px → 44px) and opens the step
  // buttons' seam gate (`field.input()` → `enabled`) in the same mount, so
  // no part reads the environment itself. The default environment reports
  // the pointer档 on both probes.
  test("M-013 the input axis reaches groupCols and the seam gate through one context read", async () => {
    const touch = await openField("press", { testInput: "touch", probe: "1" });
    await touch.waitUntil(() => callsOf(touch, "field-env").length >= 1);

    const touchField = lastOf<FieldEnv>(touch, "field-env");
    expect(touchField.input).toBe("touch");
    expect(touchField.groupCols).toBe("44px");
    expect(touchField.hasDecrement).toBe(true);
    expect(touchField.hasIncrement).toBe(true);
    expect(lastSeamEnv(touch)["inc"]?.enabled).toBe(true);

    const pointer = await openField("press", { testInput: "pointer", probe: "1" });
    await pointer.waitUntil(() => callsOf(pointer, "field-env").length >= 1);

    const pointerField = lastOf<FieldEnv>(pointer, "field-env");
    expect(pointerField.input).toBe("pointer");
    expect(pointerField.groupCols).toBe("40px");
    expect(lastSeamEnv(pointer)["inc"]?.enabled).toBe(false);
  }, 120_000);
});
