import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the color-input-group adapt unit
 * (adapt-sheets/color-input-group.md §4, M-001…M-010). One file for
 * headless+web: every assertion reads what `nsh/test` observes — `shows`,
 * `enabled`, `value`, `onLayout` bounds and the Storage probe calls — and
 * `host.params.scope` picks the environment, so the dual-environment rows
 * run identically on both targets.
 *
 * The probes live in `harness/color-input-group.fixtures.tsx`:
 *   `layout`   the Root's `onLayout` bounds (M-001).
 *   `hover`    the Root's `isHovered` className render-prop record plus
 *              `onHover*` / `onMouse*` and `onPress` probes on the
 *              container / Prefix / Suffix (M-002, and the positive half of
 *              the no-press-channel contract).
 *   `press`    a bare group with no press props at all — a View that hears
 *              presses is a press target, so M-003's negative needs the
 *              surface empty, not just silent.
 *   `submit`   standalone `onSubmit` / `blur` / `onChange` / `focus` probes
 *              with `submitBehavior` / `type` host params (M-004, M-005).
 *   `field-mock`  a `ColorInputGroupFieldContext.Provider` injecting a
 *              field `onSubmit` and `enterKeyHint`; `commit=0` withholds
 *              the field callback (M-004, M-010).
 *   `events`   the `rest` pass-through probes `onPaste` / `onKeyPress` /
 *              `onCompositionChange` (M-007).
 *   `kbd`      every `enterKeyHint` / `returnKeyType` value plus type /
 *              inputMode / autofill / maxLength mounts (M-006).
 */

type Params = Record<string, string>;

function openCase(
  name: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../color-input-group.fixtures.tsx", {
    // The default half of the sheet's dual environment is `platform.desktop`
    // === true — the same host the desktop contract runs on (a bare `nsh
    // test` headless host reports `desktop: false`). `EnvironmentScope`
    // supplies the injected touch half.
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

type RootClassRecord = {
  isHovered: boolean;
};

function rootClassRecords(app: App): RootClassRecord[] {
  return callsOf(app, "root-class").map((args) => args[0] as RootClassRecord);
}

function probeNames(app: App): string[] {
  return calls(app).map((c) => c.name);
}

// adapt-sheets/color-input-group.md M-008 (A-011) — the shared half of the
// two M-008 rows above. Four sequential opens per scope: a dozen web hosts
// in one test exhausts the web target (the M3 run proved it), so the row
// splits one scope per test and reads only the cases that emit probes at
// mount or on one short step.
async function assertFixtureSurface(params: Params) {
  const layout = await openCase("layout", params);
  await layout.waitUntil(() => callsOf(layout, "layout").length > 0);

  const hover = await openCase("hover", params);
  expect(rootClassRecords(hover).length).toBeGreaterThan(0);

  const submit = await openCase("submit", params);
  await submit.type("id:group-input", "x");
  await submit.submit("id:group-input");
  expect(callsOf(submit, "onSubmit")).toHaveLength(1);

  const events = await openCase("events", params);
  await events.type("id:group-input", "x");
  expect(callsOf(events, "onKeyPress")).toHaveLength(1);
}

describe("color-input-group mobile", () => {
  // adapt-sheets/color-input-group.md M-001 (A-001, A-002): under the
  // injected touch environment the `input` axis' `min-h-11` lifts the group
  // row past the 44 pt hit target; under the default pointer environment
  // the same row keeps its desktop 36 pt height (zero drift).
  test("M-001 touch scope lifts the group row to 44pt; pointer keeps 36pt", async () => {
    const touch = await openCase("layout", { scope: "touch" });
    await touch.waitUntil(() => callsOf(touch, "layout").length > 0);
    const touchLayout = callsOf(touch, "layout").at(-1)![0] as {
      width: number;
      height: number;
    };
    expect(touchLayout.height).toBeGreaterThanOrEqual(44);

    const pointer = await openCase("layout");
    await pointer.waitUntil(() => callsOf(pointer, "layout").length > 0);
    const pointerLayout = callsOf(pointer, "layout").at(-1)![0] as {
      width: number;
      height: number;
    };
    expect(pointerLayout.height).toBe(36);
  }, 120_000);

  // adapt-sheets/color-input-group.md M-002 (A-003, A-004): under touch the
  // group's hover face stays inert — pressing the input area and hovering
  // the row leave `isHovered` false and every `onHoverStart/End/Change`
  // probe silent on both Root and Input (the JS signal behind
  // `bg-field-hover`/`bg-default-hover` never rises, so no hover residue
  // can paint — sticky hover included). `onMouseEnter`/`onMouseLeave` host
  // callbacks pass through untouched. The default environment keeps the
  // desktop hover contract.
  test("M-002 injected touch: press and hover never raise the group's hover face", async () => {
    const touch = await openCase("hover", { scope: "touch" });

    await touch.press("id:group-input");
    await touch.hover("id:group");
    await touch.hover("id:group-input");

    for (const name of [
      "root-hover-start",
      "root-hover-end",
      "root-hover-change",
      "input-hover-start",
      "input-hover-end",
      "input-hover-change",
    ]) {
      expect(callsOf(touch, name)).toHaveLength(0);
    }
    expect(rootClassRecords(touch).every((r) => !r.isHovered)).toBe(true);

    const pointer = await openCase("hover");
    await pointer.hover("id:group");
    await pointer.waitUntil(() =>
      rootClassRecords(pointer).some((r) => r.isHovered),
    );
    expect(callsOf(pointer, "root-hover-start")).toHaveLength(1);
    expect(callsOf(pointer, "root-hover-change")).toEqual([[true]]);
    expect(callsOf(pointer, "root-mouse-enter").length).toBeGreaterThanOrEqual(1);

    // The input's own hover pair (A-004) — `app.hover` delivers to the
    // named view, so the input hears its own enter without setting the
    // Root's signal.
    await pointer.hover("id:group-input");
    await pointer.waitUntil(
      () => callsOf(pointer, "input-hover-start").length > 0,
      { timeout: 3_000 },
    );
    expect(callsOf(pointer, "input-hover-start").length).toBeGreaterThanOrEqual(1);
  }, 120_000);

  // adapt-sheets/color-input-group.md M-003 (A-009): the group container
  // keeps no press channel in either environment — the component builds no
  // pressable surface, so on the bare `press` case an affix press finds
  // nothing (ERR_NSH_TEST_NOT_FOUND, the same form toolbar's bare-surface
  // rows use), no focus reaches the input (there is no press-to-focus
  // channel either), and no probe records at all.
  test("M-003 container press finds nothing in both environments", async () => {
    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const app = await openCase("press", params);

      await expect(app.press("text:#")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_NOT_FOUND",
      });
      await expect(app.press("text:%")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_NOT_FOUND",
      });
      expect(calls(app)).toHaveLength(0);
    }
  }, 120_000);

  // adapt-sheets/color-input-group.md M-004 (A-005, A-006): standalone, one
  // `app.submit` reports `onSubmit` exactly once with `{ text }` and the
  // single-line default `blurAndSubmit` fires `blur` with it. Under the
  // field mock the field's `onSubmit` runs first, the local callback
  // second, `blur` stays silent (`submitBehavior` resolves `"submit"`),
  // and typing afterwards still lands in the same input (kept focus).
  test("M-004 submit chain: standalone blurs after submit; field commits in place, field first", async () => {
    const app = await openCase("submit");
    await app.type("id:group-input", "#22c55e");
    await app.submit("id:group-input");

    expect(callsOf(app, "onSubmit")).toHaveLength(1);
    expect(callsOf(app, "onSubmit")[0][0]).toEqual({ text: "#22c55e" });
    expect(callsOf(app, "blur")).toHaveLength(1);

    const field = await openCase("field-mock");
    await field.type("id:group-input", "#ff0000");
    await field.submit("id:group-input");

    expect(callsOf(field, "field-submit")).toHaveLength(1);
    expect(callsOf(field, "field-submit")[0][0]).toEqual({ text: "#ff0000" });
    expect(callsOf(field, "onSubmit")).toHaveLength(1);
    expect(probeNames(field).indexOf("field-submit")).toBeLessThan(
      probeNames(field).indexOf("onSubmit"),
    );
    expect(callsOf(field, "blur")).toHaveLength(0);

    // "submit" keeps the focus: a later type still lands in the same
    // input and reports through `onChange`.
    const changesBefore = callsOf(field, "onChange").length;
    await field.type("id:group-input", "a");
    expect(callsOf(field, "onChange").length).toBeGreaterThan(changesBefore);
  }, 120_000);

  // adapt-sheets/color-input-group.md M-005 (A-005): an explicit
  // `submitBehavior` wins over every default in both environments —
  // `"submit"` commits without a blur (the caller value used to be
  // swallowed), `"blurAndSubmit"` blurs after it.
  test("M-005 explicit submitBehavior wins: submit keeps focus, blurAndSubmit blurs", async () => {
    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const submit = await openCase("submit", { ...params, submitBehavior: "submit" });
      await submit.type("id:group-input", "#000000");
      await submit.submit("id:group-input");
      expect(callsOf(submit, "onSubmit")).toHaveLength(1);
      expect(callsOf(submit, "blur")).toHaveLength(0);

      const blur = await openCase("submit", {
        ...params,
        submitBehavior: "blurAndSubmit",
      });
      await blur.type("id:group-input", "#000000");
      await blur.submit("id:group-input");
      expect(callsOf(blur, "onSubmit")).toHaveLength(1);
      expect(callsOf(blur, "blur")).toHaveLength(1);
    }
  }, 120_000);

  // adapt-sheets/color-input-group.md M-006 (A-005): every value of the
  // keyboard-props chain mounts — mounting is the channel assertion; what
  // the soft keyboard labels / autofills with them is a real-device
  // acceptance item (sheet §6).
  test("M-006 every enterKeyHint / returnKeyType / autofill / maxLength value mounts", async () => {
    const app = await openCase("kbd");

    for (const hint of ["enter", "done", "go", "next", "previous", "search", "send"]) {
      expect(app.shows(`id:kh-${hint}`)).toBe(true);
    }
    for (const kind of ["done", "go", "next", "search", "send"]) {
      expect(app.shows(`id:kr-${kind}`)).toBe(true);
    }
    expect(app.shows("id:k-type")).toBe(true);
    expect(app.shows("id:k-mode")).toBe(true);
    expect(app.shows("id:k-fill")).toBe(true);
    expect(app.shows("id:k-max")).toBe(true);

    // `maxLength` reaches the host: typing past 7 characters clips.
    await app.type("id:k-max", "123456789");
    expect(app.value("id:k-max")).toBe("1234567");
  }, 120_000);

  // adapt-sheets/color-input-group.md M-007 (A-007): the `rest`
  // pass-through face is identical on both ends — `app.paste` fires
  // `onPaste`, typing fires `onKeyPress` once per key; nothing in the
  // component touches them.
  test("M-007 rest pass-through: paste and key presses report in both environments", async () => {
    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const app = await openCase("events", params);

      await app.paste("id:group-input", { text: "#abcdef" });
      expect(callsOf(app, "onPaste")).toHaveLength(1);

      await app.type("id:group-input", "xyz");
      expect(callsOf(app, "onKeyPress")).toHaveLength(3);
    }
  }, 120_000);

  // adapt-sheets/color-input-group.md M-008 (A-011): the assertion carrier
  // itself — every probe-bearing fixture case mounts under both scopes and
  // its recorders land in Storage, so a silent fixture regression cannot
  // pass the rows above vacuously.
  test("M-008 fixture entry: every case mounts and records (pointer scope)", async () => {
    await assertFixtureSurface({});
  }, 120_000);

  test("M-008 fixture entry: every case mounts and records (touch scope)", async () => {
    await assertFixtureSurface({ scope: "touch" });
  }, 120_000);

  // adapt-sheets/color-input-group.md M-009 (基线): the default environment
  // keeps the desktop contract — the same faces and assertions
  // `color-input-group.heroui.test.tsx` pins (S-001…S-005), all mounted at
  // once by the fixture's `baseline` case (sequential opens exhaust the
  // web target's browser pool, so the whole row reads one app).
  test("M-009 baseline: default environment keeps the desktop contract", async () => {
    const app = await openCase("baseline");

    // S-001: affix string children render as text.
    expect(app.shows("text:#")).toBe(true);
    expect(app.shows("text:%")).toBe(true);

    // S-002: every keystroke reports onChange({value}); the controlled
    // fixture writes it back.
    expect(app.enabled("id:b-controlled-input")).toBe(true);
    await app.type("id:b-controlled-input", "#22c55e");
    expect(app.value("id:b-controlled-input")).toBe("#22c55e");
    const changes = callsOf(app, "onChange");
    expect(changes.length).toBeGreaterThanOrEqual(2);
    expect(changes[changes.length - 1][0]).toEqual({ value: "#22c55e" });

    // S-003: the Input's own disabled / readOnly props.
    expect(app.enabled("id:b-disabled-input")).toBe(false);
    await app.type("id:b-disabled-input", "#ff0000").catch(() => undefined);
    expect(app.value("id:b-disabled-input")).toBe("");
    expect(callsOf(app, "onChange")).toEqual(changes);

    expect(app.enabled("id:b-readonly-input")).toBe(false);
    expect(app.value("id:b-readonly-input")).toBe("#ff0000");

    // S-004: the Root's render props report hover and focus-within.
    type FullRecord = {
      isHovered: boolean;
      isFocusWithin: boolean;
      isFocusVisible: boolean;
    };
    const records = () => callsOf(app, "root-class").map((a) => a[0] as FullRecord);
    const last = () => records().at(-1)!;

    expect(last().isHovered).toBe(false);
    await app.hover("id:b-rp");
    expect(last().isHovered).toBe(true);
    await app.type("id:b-rp-input", "ff0000");
    expect(last().isFocusWithin).toBe(true);
    await app.press("id:b-blur");
    expect(last().isFocusWithin).toBe(false);
    expect(callsOf(app, "input-focus")).toHaveLength(1);
    expect(callsOf(app, "input-blur")).toHaveLength(1);
    expect(records().every((r) => r.isFocusVisible === r.isFocusWithin)).toBe(true);

    // S-005: every variant mounts with its parts.
    expect(app.count("id:b-variant")).toBe(4);
    expect(app.shows("text:prefix")).toBe(true);
  }, 120_000);

  // adapt-sheets/color-input-group.md M-010 (A-006): a field without
  // `onSubmit` leaves the standalone chain untouched — `app.submit` fires
  // only the local `onSubmit` once and the host's single-line default
  // still blurs after submitting. No second owner is introduced.
  test("M-010 field without onSubmit: only the local callback runs, blur unchanged", async () => {
    const app = await openCase("field-mock", { commit: "0" });
    await app.type("id:group-input", "#00ff00");
    await app.submit("id:group-input");

    expect(callsOf(app, "field-submit")).toHaveLength(0);
    expect(callsOf(app, "onSubmit")).toHaveLength(1);
    expect(callsOf(app, "onSubmit")[0][0]).toEqual({ text: "#00ff00" });
    expect(callsOf(app, "blur")).toHaveLength(1);
  }, 120_000);
});
