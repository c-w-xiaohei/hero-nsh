import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the textfield adapt unit
 * (adapt-sheets/textfield.md §4): M-001, M-003…M-007 run here on the
 * shared targets — headless, web and the native ios/android CI lanes —
 * while M-002 (`app.hover` has no mouse channel on native) and M-008 (the
 * `platform:"ios"` host derivation) live in
 * `textfield.mobile.headless.test.tsx`. Every assertion reads what
 * `nsh/test` observes — `shows`, `value`, `enabled`, `onLayout` bounds
 * probes and the Storage probe calls — and `host.params.testInput` picks
 * the environment explicitly ("pointer" is the host-independent
 * desktop-parity baseline, "touch" wraps the case in `EnvironmentScope
 * input="touch"`), so the dual-environment rows run identically on every
 * target. Native hosts fill the device screen and reject the
 * `platform`/`width`/`height` open options, so this file carries none;
 * `locale:"en-US"` stays because the probes are locale-sensitive.
 *
 * The probes live in `harness/textfield.fixtures.tsx`:
 *   `layout`   Input / TextArea `onLayout` bounds — the touch `min-h-11`
 *              hit face vs the pointer row (M-001).
 *   `hover`    the Input's `isHovered` className render-prop record plus
 *              `onHoverStart`/`onHoverEnd`/`onHoverChange` and the
 *              `onMouseEnter`/`onMouseLeave` pass-through probes, with
 *              `hover-away` as the leave target (the headless M-002; the
 *              shared M-006 only mounts it).
 *   `submit`   TextField + Label + Input: root `field-submit`, input
 *              `onSubmit` / `onChange` / `onBlur` / `onFocus` probes;
 *              `submitBehavior` / `enterKeyHint` / `returnKeyType` params
 *              (M-003, M-006).
 *   `submit-standalone`  a bare Input with the same submit probes
 *              (M-003, M-006).
 *   `submit-textarea`  a TextArea with `onSubmit` / `onChange` / `onBlur`
 *              probes and the `submitBehavior` param ("" = "newline")
 *              (M-004, M-006).
 *   `keyboard`  one Input whose `keyboardType` / `inputMode` /
 *              `enterKeyHint` / `autoComplete` / `autoCorrect` /
 *              `autoCapitalize` / `maxLength` come from host.params, with
 *              an `onChange` probe (M-005, M-006).
 *   `baseline`  the M-007 default-environment contract in one mount:
 *              `onFocusChange`, controlled write-back refusal, `masked` /
 *              `type="password"`, Label / Description / FieldError texts,
 *              the invalid render and the TextArea rows height; the
 *              composition fan-out stays on the `composition` case.
 */

type Params = Record<string, string>;

function openCase(name: string, params: Params = {}): Promise<App> {
  return open("../../../textfield.fixtures.tsx", {
    locale: "en-US",
    host: {
      // iOS types real key events; "none" keeps a literal string literal.
      params: { case: name, testAutoCapitalize: "none", ...params },
    },
  });
}

type LayoutEntry = { width: number; height: number };
type HoverRecord = { isHovered: boolean };
type ChangeRecord = { value: string };

function lastLayout(app: App, name: string): LayoutEntry {
  return callsOf(app, name).at(-1)![0] as LayoutEntry;
}

function hoverRecords(app: App): HoverRecord[] {
  return callsOf(app, "input-class").map((c) => c[0] as HoverRecord);
}

async function waitLayout(app: App): Promise<void> {
  await app.waitUntil(
    () => callsOf(app, "input-layout").length > 0 && callsOf(app, "textarea-layout").length > 0,
  );
}

describe("textfield mobile", () => {
  // adapt-sheets/textfield.md M-001 (A-001, A-002): the `input` axis'
  // `min-h-11` lifts the Input's row to the 44 pt touch target; the same
  // row stays below that floor under pointer — the pointer cell is empty
  // (desktop zero drift). The exact pointer height is host-dependent
  // (33 px headless, 36 px web — font metrics), so the assertion stops at
  // the floor, not a pixel value (the sheet's "40pt" was the py-2
  // estimate). The TextArea's touch cell is empty by the sheet's
  // conservative ruling, so its rows height is identical in both
  // environments.
  test("M-001 touch lifts the Input row to 44pt; pointer stays below the floor; TextArea unchanged", async () => {
    const touch = await openCase("layout", { testInput: "touch" });
    await waitLayout(touch);
    expect(lastLayout(touch, "input-layout").height).toBeGreaterThanOrEqual(44);
    expect(lastLayout(touch, "textarea-layout").height).toBe(56);

    const pointer = await openCase("layout", { testInput: "pointer" });
    await waitLayout(pointer);
    expect(lastLayout(pointer, "input-layout").height).toBeLessThan(44);
    expect(lastLayout(pointer, "textarea-layout").height).toBe(56);
  }, 120_000);

  // adapt-sheets/textfield.md M-002 (A-003) lives in
  // `textfield.mobile.headless.test.tsx` — `app.hover` needs a mouse
  // channel the native ios/android targets do not have, so the row moved
  // there whole rather than split.

  // adapt-sheets/textfield.md M-003 (A-004, A-005): the declared `onSubmit`
  // rides the host channel in both environments — `app.submit` reports it
  // exactly once with `{ text }` = the current text, the single-line
  // default `submitBehavior="submit"` keeps the focus (no `onBlur` record,
  // the focus-query gap's registered degradation — a second `app.type`
  // still lands in the same input), and inside a field the root's
  // `onSubmit` runs before the input's local one. An explicit
  // `submitBehavior="blurAndSubmit"` fires `onBlur` once. One scope per
  // test: three sequential web hosts per scope is what the target
  // tolerates (the color-input-group M-008 split).
  async function assertSubmitChain(params: Params) {
    const field = await openCase("submit", params);
    await field.type("id:name", "hello");
    await field.submit("id:name");
    await field.waitUntil(() => callsOf(field, "onSubmit").length === 1);

    expect(callsOf(field, "field-submit")).toHaveLength(1);
    expect(callsOf(field, "field-submit")[0][0]).toEqual({ text: "hello" });
    expect(callsOf(field, "onSubmit")).toHaveLength(1);
    expect(callsOf(field, "onSubmit")[0][0]).toEqual({ text: "hello" });
    const names = calls(field).map((c) => c.name);
    expect(names.indexOf("field-submit")).toBeLessThan(names.indexOf("onSubmit"));
    expect(callsOf(field, "onBlur")).toHaveLength(0);

    await field.type("id:name", " world");
    expect(field.value("id:name")).toBe("hello world");

    const standalone = await openCase("submit-standalone", params);
    await standalone.type("id:name", "hey");
    await standalone.submit("id:name");
    await standalone.waitUntil(() => callsOf(standalone, "onSubmit").length === 1);

    expect(callsOf(standalone, "onSubmit")).toHaveLength(1);
    expect(callsOf(standalone, "onSubmit")[0][0]).toEqual({ text: "hey" });
    expect(callsOf(standalone, "onBlur")).toHaveLength(0);

    await standalone.type("id:name", "!");
    expect(standalone.value("id:name")).toBe("hey!");

    const blur = await openCase("submit-standalone", {
      ...params,
      submitBehavior: "blurAndSubmit",
    });
    await blur.type("id:name", "x");
    await blur.submit("id:name");
    await blur.waitUntil(() => callsOf(blur, "onSubmit").length === 1);

    expect(callsOf(blur, "onSubmit")).toHaveLength(1);
    expect(callsOf(blur, "onBlur")).toHaveLength(1);
  }

  test("M-003 submit chain: once with { text }, focus kept, field before input (pointer scope)", async () => {
    await assertSubmitChain({ testInput: "pointer" });
  }, 120_000);

  test("M-003 submit chain: once with { text }, focus kept, field before input (touch scope)", async () => {
    await assertSubmitChain({ testInput: "touch" });
  }, 120_000);

  // adapt-sheets/textfield.md M-004 (A-004): the TextArea's two submit
  // modes diverge in both environments — `submitBehavior="newline"` (the
  // default) makes `app.submit` insert a line break (`onChange` tail value
  // contains `\n`) and never fires `onSubmit`; an explicit `"submit"`
  // reports `onSubmit` once and inserts nothing. One scope per test, the
  // same web-target split as M-003 / M-006.
  async function assertTextAreaSubmitModes(params: Params) {
    const newline = await openCase("submit-textarea", params);
    await newline.type("id:bio", "ab");
    await newline.submit("id:bio");
    await newline.wait(100);

    expect(callsOf(newline, "onSubmit")).toHaveLength(0);
    const lastChange = callsOf(newline, "onChange").at(-1)![0] as ChangeRecord;
    expect(lastChange.value).toContain("\n");

    const submit = await openCase("submit-textarea", {
      ...params,
      submitBehavior: "submit",
    });
    await submit.type("id:bio", "ab");
    await submit.submit("id:bio");
    await submit.waitUntil(() => callsOf(submit, "onSubmit").length === 1);

    expect(callsOf(submit, "onSubmit")).toHaveLength(1);
    expect(callsOf(submit, "onSubmit")[0][0]).toEqual({ text: "ab" });
    const changes = callsOf(submit, "onChange").map((c) => c[0] as ChangeRecord);
    expect(changes.every((c) => !c.value.includes("\n"))).toBe(true);
  }

  test("M-004 TextArea submit modes: newline inserts a break, submit reports once (pointer scope)", async () => {
    await assertTextAreaSubmitModes({ testInput: "pointer" });
  }, 120_000);

  test("M-004 TextArea submit modes: newline inserts a break, submit reports once (touch scope)", async () => {
    await assertTextAreaSubmitModes({ testInput: "touch" });
  }, 120_000);

  // adapt-sheets/textfield.md M-005 (A-006): every keyboard / autofill
  // parameter the sheet lists mounts through the existing forwarding
  // chain in both environments — `app.type` → `onChange` still works, and
  // `maxLength=4` clips the sixth character. Resolution values and the
  // soft-keyboard labels themselves are the sheet §6 host gap: asserted
  // here is mount + channel, not the keyboard. One scope per test, the
  // same web-target split as M-003.
  async function assertKeyboardChannel(params: Params) {
    const app = await openCase("keyboard", {
      ...params,
      keyboardType: "numeric",
      inputMode: "decimal",
      enterKeyHint: "go",
      autoComplete: "off",
      autoCorrect: "off",
      autoCapitalize: "none",
    });
    expect(app.shows("id:name")).toBe(true);
    // `keyboardType:"numeric"` + `inputMode:"decimal"` resolves to Android
    // `inputType=numberDecimal`: the KeyListener filters letter key events
    // before they reach the text, exactly as a real numeric keypad has no
    // letter keys (run's M-005: `app.type("id:name","abc")` left `""`).
    // Digits are the text this channel can carry on Android and they type
    // identically on every other target.
    await app.type("id:name", "123");
    expect(app.value("id:name")).toBe("123");
    expect((callsOf(app, "onChange").at(-1)![0] as ChangeRecord).value).toBe("123");

    const done = await openCase("keyboard", { ...params, enterKeyHint: "done" });
    expect(done.shows("id:name")).toBe(true);
    await done.type("id:name", "z");
    expect(done.value("id:name")).toBe("z");

    const max = await openCase("keyboard", { ...params, maxLength: "4" });
    await max.type("id:name", "abcdef");
    expect(max.value("id:name")).toBe("abcd");
  }

  test("M-005 keyboard and autofill params mount and stay editable (pointer scope)", async () => {
    await assertKeyboardChannel({ testInput: "pointer" });
  }, 120_000);

  test("M-005 keyboard and autofill params mount and stay editable (touch scope)", async () => {
    await assertKeyboardChannel({ testInput: "touch" });
  }, 120_000);

  // adapt-sheets/textfield.md M-006 (A-008): this file is the assertion
  // carrier — `Scoped` mounts both environments and every probe surface
  // the rows above read (`input-layout` / `textarea-layout`, the
  // `input-class` render-prop records, `field-submit` / `onSubmit` /
  // `onBlur`, `onChange`) records through `app.storage()`, so a silent
  // fixture regression cannot pass the other rows vacuously. The hover
  // case mounts and its render-prop probes record here; the live
  // `app.hover` delivery behind them is the headless M-002's assertion
  // (native has no mouse channel).
  async function assertFixtureSurface(params: Params) {
    const layout = await openCase("layout", params);
    await waitLayout(layout);
    expect(callsOf(layout, "input-layout").length).toBeGreaterThan(0);
    expect(callsOf(layout, "textarea-layout").length).toBeGreaterThan(0);

    const hover = await openCase("hover", params);
    await hover.waitUntil(() => hoverRecords(hover).length > 0);
    expect(hoverRecords(hover).length).toBeGreaterThan(0);

    const submit = await openCase("submit", params);
    await submit.type("id:name", "x");
    await submit.submit("id:name");
    await submit.waitUntil(() => callsOf(submit, "onSubmit").length === 1);
    expect(callsOf(submit, "field-submit")).toHaveLength(1);

    const standalone = await openCase("submit-standalone", params);
    await standalone.type("id:name", "y");
    await standalone.submit("id:name");
    await standalone.waitUntil(() => callsOf(standalone, "onSubmit").length === 1);

    const textarea = await openCase("submit-textarea", params);
    await textarea.type("id:bio", "q");
    await textarea.submit("id:bio");
    await textarea.wait(100);
    expect(callsOf(textarea, "onChange").length).toBeGreaterThan(0);

    const keyboard = await openCase("keyboard", params);
    await keyboard.type("id:name", "ab");
    expect(callsOf(keyboard, "onChange").length).toBeGreaterThan(0);
  }

  test("M-006 fixture entry: every case mounts and records (pointer scope)", async () => {
    await assertFixtureSurface({ testInput: "pointer" });
  }, 120_000);

  test("M-006 fixture entry: every case mounts and records (touch scope)", async () => {
    await assertFixtureSurface({ testInput: "touch" });
  }, 120_000);

  // adapt-sheets/textfield.md M-007 (基线): the default environment keeps
  // the desktop contract the existing `textfield.heroui.test.tsx` /
  // `textarea.heroui.test.tsx` pin — the `onChange` sequence, the
  // controlled write-back refusal (owner keeps "Ada" while the attempted
  // "Ada!" is only reported), `focus`/`blur` → `onFocusChange`, the Label
  // reaching the input as its name, the Description / FieldError texts,
  // the invalid render, `masked` / `type="password"` mounts, and the
  // TextArea's rows height + Enter line break. The composition fan-out is
  // the `composition` case's X-001 assertion, re-read here; the read-only
  // files stay green untouched.
  test("M-007 baseline: default environment keeps the desktop contract", async () => {
    const app = await openCase("baseline", { testInput: "pointer" });

    // Label → accessible name; Description + FieldError texts; invalid render.
    expect(app.shows("label:Baseline name")).toBe(true);
    expect(app.texts()).toContain("Baseline hint");
    expect(app.texts()).toContain("Baseline error");

    // onChange sequence (root string payload) + input { value } payload,
    // then focus → onFocusChange(true).
    await app.type("id:baseline-name", "Bo");
    await app.waitUntil(() => callsOf(app, "onFocusChange").length === 1);
    const rootChanges = callsOf(app, "root-change").map((c) => c[0]);
    expect(rootChanges.length).toBeGreaterThanOrEqual(2);
    expect(rootChanges.at(-1)).toBe("Bo");
    expect(callsOf(app, "onFocusChange")).toEqual([[true]]);

    // Controlled write-back refusal: the owner never writes, so the host
    // text is corrected back to "Ada" while "Ada!" is only reported.
    await app.type("id:baseline-controlled-input", "!");
    await app.waitUntil(() => callsOf(app, "onFocusChange").length === 2);
    expect(app.value("id:baseline-controlled-input")).toBe("Ada");
    expect(callsOf(app, "controlled-change").at(-1)![0]).toBe("Ada!");
    expect(callsOf(app, "onFocusChange")).toEqual([[true], [false]]);

    // masked / type="password" mount and edit through the same channel.
    expect(app.enabled("id:baseline-password")).toBe(true);
    expect(app.enabled("id:baseline-masked")).toBe(true);
    await app.type("id:baseline-password", "s3cret");
    expect(app.value("id:baseline-password")).toBe("s3cret");
    expect((callsOf(app, "onChange").at(-1)![0] as ChangeRecord).value).toBe("s3cret");
    await app.type("id:baseline-masked", "hide");
    expect(app.value("id:baseline-masked")).toBe("hide");

    // TextArea rows height (rows={3} → 76 px on the desktop host) and the
    // Enter line break stays in the value.
    await app.type("id:baseline-bio", "a\nb");
    expect(app.value("id:baseline-bio")).toContain("\n");
    await app.waitUntil(() => callsOf(app, "baseline-textarea-layout").length > 0);
    expect(lastLayout(app, "baseline-textarea-layout").height).toBe(76);

    // Composition fan-out (X-001): start / update / end all reach the
    // root's onCompositionChange through the field context.
    const composition = await openCase("composition", { testInput: "pointer" });
    await composition.press("id:compose");
    const phases = callsOf(composition, "onCompositionChange");
    expect(phases).toHaveLength(3);
    expect(phases[0]).toEqual([{ composing: true, text: "n" }]);
    expect(phases[1]).toEqual([{ composing: true, text: "ni" }]);
    expect(phases[2]).toEqual([{ composing: false, text: "" }]);
  }, 120_000);
});
