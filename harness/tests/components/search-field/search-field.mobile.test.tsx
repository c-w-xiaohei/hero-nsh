import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the search-field adapt unit, one test per row of
 * adapt-sheets/search-field.md §4: M-001…M-009 here (headless + web), M-010
 * in `search-field.mobile.headless.test.tsx` (the `platform:"ios"` host
 * derivation exists only on the headless engine).
 *
 * The fixture is `harness/search-field.fixtures.tsx`, opened by
 * `host.params.case` (`basic` / `layout` / `hover` / `submit` / `clear` /
 * `empty-escape` / `readonly` / `disabled` / `empty` / `controlled` /
 * `invalid`) plus `scope` ("touch" wraps the case in
 * `EnvironmentScope input="touch"`), and the keyboard-channel params on the
 * `submit` case (`enterKeyHint` / `returnKeyType` / `type` / `inputMode` /
 * `keyboardType` / `autoComplete`). The default environment is pointer on
 * both targets — that is the desktop-parity half of every row.
 *
 * Every `open` pins `platform:"windows", width:1024, height:768`: without
 * the pin a bare headless open lands on the phone-sized engine where
 * `input` defaults to touch and every pointer-default assertion inverts.
 *
 * What `nsh/test` cannot see is asserted through the fixture's probes in
 * `app.storage()` — `group-layout` / `input-layout` bounds, `group-props` /
 * `input-props` / `root-props` render props, the `hover` callback records
 * and the Root/Input `onChange` / `onClear` / `onSubmit` / `onFocus` /
 * `onBlur` calls. Class names and computed style are never read; the soft
 * keyboard's actual labels and the native focus owner are the sheet §6
 * registered host gaps, so "keeps focus" is asserted as "no `onBlur`
 * record + typing still lands".
 *
 * Probe payload shapes differ by case: on the Root `onChange(value)` the
 * arg is the string itself; on the Input `onChange({ value })` it is an
 * object (sheet §1).
 */

type Params = Record<string, string>;

type Bounds = { origin: { x: number; y: number }; size: { width: number; height: number } };

type GroupProps = {
  isHovered: boolean;
  isFocusWithin: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isInvalid: boolean;
};

type InputProps = {
  isHovered: boolean;
  isFocused: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isInvalid: boolean;
};

type RootProps = {
  isEmpty: boolean;
  isDisabled: boolean;
  isInvalid: boolean;
  isReadOnly: boolean;
  isRequired: boolean;
};

function openCase(
  name: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../search-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

function lastOf<T>(app: App, name: string): T {
  const all = callsOf(app, name);
  const found = all[all.length - 1]?.[0] as T | undefined;

  if (found === undefined) throw new Error(`the fixture recorded no ${name} call`);

  return found;
}

function groupBounds(app: App): Bounds {
  return lastOf<Bounds>(app, "group-layout");
}

function lastGroupProps(app: App): GroupProps {
  return lastOf<GroupProps>(app, "group-props");
}

function lastInputProps(app: App): InputProps {
  return lastOf<InputProps>(app, "input-props");
}

function lastRootProps(app: App): RootProps {
  return lastOf<RootProps>(app, "root-props");
}

const INPUT = "label:Search";
const CLEAR = "role:button[Clear search]";

describe("search-field mobile", () => {
  // adapt-sheets/search-field.md M-001 (A-001): the `input` axis'
  // `min-h-11` lifts the Group row from the `h-9` 36 pt height to the 44 pt
  // touch target under the injected touch environment; the pointer
  // environment keeps 36 pt — desktop zero drift. Bounds are the fixture's
  // `onLayout` probes (`event.bounds`), the only measurable input of the
  // hit-area contract.
  test("M-001 touch lifts the group to 44pt, pointer keeps 36pt", async () => {
    const touch = await openCase("layout", { scope: "touch" });
    await touch.waitUntil(() => callsOf(touch, "group-layout").length > 0);
    expect(groupBounds(touch).size.height).toBeGreaterThanOrEqual(44);

    const pointer = await openCase("layout");
    await pointer.waitUntil(() => callsOf(pointer, "group-layout").length > 0);
    expect(groupBounds(pointer).size.height).toBe(36);
  }, 120_000);

  // adapt-sheets/search-field.md M-002 (A-002, A-003): under touch neither a
  // hover nor a press (whose sticky web hover is the registered hazard)
  // raises `isHovered` — the Group and Input render props stay false and
  // the four `onHover*` callbacks record nothing, which is also what keeps
  // the hover fill classes off (they ride the same `hovered` signal; class
  // names are not observable). The press itself still lands: the input
  // focuses. Under pointer the hover round-trips exactly as on desktop.
  test("M-002 injected touch suppresses group and input hover; pointer keeps it", async () => {
    const touch = await openCase("hover", { scope: "touch" });

    await touch.hover("id:sf-group");
    await touch.hover("id:sf-input");
    // The press itself still lands: the input's `isFocused` render prop
    // rises (the hover case wires no `onFocus` probe — the render props
    // are its focus channel).
    await touch.press(INPUT);
    await touch.waitUntil(() => lastInputProps(touch).isFocused === true);
    await touch.wait(50);

    expect(callsOf(touch, "hover")).toHaveLength(0);
    for (const c of callsOf(touch, "group-props")) {
      expect((c[0] as GroupProps).isHovered).toBe(false);
    }
    for (const c of callsOf(touch, "input-props")) {
      expect((c[0] as InputProps).isHovered).toBe(false);
    }

    const pointer = await openCase("hover");

    await pointer.hover("id:sf-input");
    await pointer.waitUntil(() => callsOf(pointer, "hover").length > 0);

    const hoverCalls = callsOf(pointer, "hover").map((c) => c[0] as unknown[]);
    expect(hoverCalls).toContainEqual(["input", "start"]);
    expect(hoverCalls).toContainEqual(["input", "change", true]);
    expect(lastInputProps(pointer).isHovered).toBe(true);
    expect(lastGroupProps(pointer).isHovered).toBe(true);

    // Moving onto the Label (outside the group) ends both hovers.
    await pointer.hover("text:Search");
    await pointer.waitUntil(() => {
      const ends = callsOf(pointer, "hover").filter(
        (c) => (c[0] as unknown[])[1] === "end",
      );
      return ends.length > 0 && lastGroupProps(pointer).isHovered === false;
    });
    expect(lastInputProps(pointer).isHovered).toBe(false);
  }, 120_000);

  // adapt-sheets/search-field.md M-003 (A-004, A-005): `app.submit` is the
  // IME search / Return dual channel — it reports `onSubmit` exactly once
  // with the current text, and `submitBehavior="submit"` keeps the focus:
  // no `onBlur` record and a second `app.type` still lands in the same
  // input (the focus-query host gap's registered degradation, sheet §6).
  test("M-003 submit reports once with the text and keeps focus in both environments", async () => {
    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const app = await openCase("submit", params);

      await app.type(INPUT, "hero");
      await app.submit(INPUT);
      await app.waitUntil(() => callsOf(app, "onSubmit").length === 1);

      expect(callsOf(app, "onSubmit")).toEqual([["hero"]]);
      expect(callsOf(app, "onBlur")).toHaveLength(0);

      await app.type(INPUT, "!");
      expect(app.value(INPUT)).toBe("hero!");
      expect(callsOf(app, "onBlur")).toHaveLength(0);
      expect(callsOf(app, "onSubmit")).toHaveLength(1);
    }
  }, 120_000);

  // adapt-sheets/search-field.md M-004 (A-004): every keyboard / autofill
  // parameter the sheet lists mounts through the existing forwarding chain
  // and the typed edit still lands — the assertion stops at "channel
  // connected" because the soft keyboard's actual label is the sheet §6
  // host gap. Both environments; the `kbd` fixture case mounts all eight
  // variants as separate labeled fields in one app (one open per
  // environment — sixteen sequential web opens exceed the host's live-app
  // budget, the input-group `kbd` precedent).
  test("M-004 keyboard parameter matrix mounts and stays editable in both environments", async () => {
    const variants = [
      "hint-search",
      "hint-go",
      "hint-done",
      "return-search",
      "type-search",
      "type-email",
      "mode-numeric",
      "autofill-off",
    ];

    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const app = await openCase("kbd", params);

      for (const slug of variants) {
        const id = `id:kbd-${slug}`;
        expect(app.shows(id)).toBe(true);

        await app.type(id, "ab");
        await app.waitUntil(() => callsOf(app, `kbd-${slug}`).length > 0);

        // Root `onChange(value)` — the arg is the string itself.
        expect(callsOf(app, `kbd-${slug}`).at(-1)?.[0]).toBe("ab");
        expect(app.value(id)).toBe("ab");
      }
    }
  }, 120_000);

  // adapt-sheets/search-field.md M-005 (A-006): the press-to-edit channel is
  // the shared contract on both ends — pressing the input focuses it
  // (`onFocus` records) and `app.type` edits keystroke by keystroke, the
  // behavior half of the soft-keyboard entry (the keyboard itself is §6).
  test("M-005 press focuses the input and typing edits in both environments", async () => {
    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const app = await openCase("basic", params);

      await app.press(INPUT);
      await app.waitUntil(() => callsOf(app, "onFocus").length > 0);
      expect(callsOf(app, "onBlur")).toHaveLength(0);

      await app.type(INPUT, "ab");
      await app.waitUntil(() => callsOf(app, "onChange").length > 0);

      expect(app.value(INPUT)).toBe("ab");
      expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("ab");
      expect(callsOf(app, "onBlur")).toHaveLength(0);
    }
  }, 120_000);

  // adapt-sheets/search-field.md M-006 (A-007): under touch the clear
  // button's press chain keeps its desktop order — `onPressStart` hands the
  // focus back to the input (`onFocus` records, no `onBlur` in between),
  // `onPress` clears (`onChange` tail `""` + `onClear` once) — and typing
  // still lands in the same input afterwards (`preventFocusOnPress` + the
  // focus return keep the soft-keyboard entry up). The hit-area expansion
  // itself is CloseButton's seam, already proven by its own unit; the
  // 20 pt `onLayout` bounds are not re-asserted here. The readonly /
  // disabled halves: the clear button reports `enabled === false`.
  test("M-006 clear press empties once, returns focus and typing continues; readonly/disabled disable it", async () => {
    const touch = await openCase("clear", { scope: "touch" });

    await touch.press(CLEAR);
    await touch.waitUntil(() => callsOf(touch, "onClear").length === 1);

    expect(callsOf(touch, "onClear")).toHaveLength(1);
    expect(callsOf(touch, "onFocus").length).toBeGreaterThanOrEqual(1);
    expect(callsOf(touch, "onChange").at(-1)?.[0]).toBe("");
    expect(touch.value(INPUT)).toBe("");
    expect(callsOf(touch, "onBlur")).toHaveLength(0);

    await touch.type(INPUT, "x");
    await touch.waitUntil(() => callsOf(touch, "onChange").length > 1);
    expect(touch.value(INPUT)).toBe("x");
    expect(callsOf(touch, "onChange").at(-1)?.[0]).toBe("x");
    expect(callsOf(touch, "onBlur")).toHaveLength(0);

    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const readonly = await openCase("readonly", params);
      expect(readonly.enabled(CLEAR)).toBe(false);
      await expect(readonly.press(CLEAR)).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(readonly, "onClear")).toHaveLength(0);

      const disabled = await openCase("disabled", params);
      expect(disabled.enabled(CLEAR)).toBe(false);
      await expect(disabled.press(CLEAR)).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(disabled, "onClear")).toHaveLength(0);
    }
  }, 120_000);

  // adapt-sheets/search-field.md M-007 (A-008): Escape clears a focused,
  // editable, non-empty field — the keymap scope is identical on both
  // ends, and touch simply has no hardware path to it. Non-empty: `onClear`
  // once and the value empties; a second Escape on the now-empty field and
  // an Escape on the `empty-escape` case record nothing.
  test("M-007 Escape clears a non-empty field once and passes through an empty one", async () => {
    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const app = await openCase("clear", params);

      await app.press(INPUT);
      await app.waitUntil(() => callsOf(app, "onFocus").length > 0);
      await app.keyboard.press("escape");
      await app.waitUntil(() => callsOf(app, "onClear").length === 1);

      expect(app.value(INPUT)).toBe("");
      expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("");

      // The value is empty now: the keymap scope is unbound, so a second
      // Escape must not fire `onClear` again.
      await app.keyboard.press("escape");
      await app.wait(100);
      expect(callsOf(app, "onClear")).toHaveLength(1);

      // The `empty-escape` case wires no focus probe: the press still
      // focuses the input (the Escape scope needs it), then Escape on an
      // empty field records nothing.
      const empty = await openCase("empty-escape", params);
      await empty.press(INPUT);
      await empty.wait(100);
      await empty.keyboard.press("escape");
      await empty.wait(100);
      expect(callsOf(empty, "onClear")).toHaveLength(0);
    }
  }, 120_000);

  // adapt-sheets/search-field.md M-008 (A-011): this file is the assertion
  // carrier — every fixture probe surface records through `open` +
  // `host.params` on BOTH scopes, so a silent fixture regression cannot
  // pass the other rows vacuously. Under touch the `hover` callback probe
  // is silent by design (M-002), so that half proves the channel with the
  // render-prop and focus probes instead; the callback half is asserted on
  // the pointer side.
  test("M-008 fixture probes record through open + host.params on both scopes", async () => {
    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const layout = await openCase("layout", params);
      await layout.waitUntil(
        () =>
          callsOf(layout, "group-layout").length > 0 &&
          callsOf(layout, "input-layout").length > 0,
      );

      const submit = await openCase("submit", params);
      await submit.type(INPUT, "smoke");
      await submit.submit(INPUT);
      await submit.waitUntil(() => callsOf(submit, "onSubmit").length === 1);
      expect(callsOf(submit, "onBlur")).toHaveLength(0);

      const clear = await openCase("clear", params);
      await clear.press(CLEAR);
      await clear.waitUntil(() => callsOf(clear, "onClear").length === 1);
      expect(callsOf(clear, "onChange").length).toBeGreaterThan(0);
      expect(callsOf(clear, "onFocus").length).toBeGreaterThan(0);

      const hover = await openCase("hover", params);
      await hover.waitUntil(
        () =>
          callsOf(hover, "group-props").length > 0 &&
          callsOf(hover, "input-props").length > 0,
      );

      if (params.scope !== "touch") {
        await hover.hover("id:sf-group");
        await hover.waitUntil(() => callsOf(hover, "hover").length > 0);
        expect(callsOf(hover, "hover").length).toBeGreaterThan(0);
      }
    }
  }, 120_000);

  // adapt-sheets/search-field.md M-009 (基线): the default (pointer)
  // environment keeps the desktop contract item for item — the same
  // semantics `search-field.heroui.test.tsx` pins, read through this
  // fixture's probes: typing reports the `onChange` sequence and the Label
  // still names the input; a controlled value never writes itself back;
  // the `isEmpty` render prop flips on clear; the focus render props
  // report `isFocusWithin` / `isFocused`; disabled and read-only reject
  // edits; the invalid field renders its FieldError and hides the
  // Description. (The cases this fixture does not carry — `secondary`,
  // `unmount.split`, the submit/escape variants — regress through the
  // existing heroui suite this row samples.)
  test("M-009 default environment baseline: typing, controlled, isEmpty, focus props, disabled/readonly, invalid", async () => {
    // Typing → the Root `onChange` sequence, one record per keystroke,
    // each the running text; the Label keeps naming the input.
    const basic = await openCase("basic");
    expect(basic.shows(INPUT)).toBe(true);

    await basic.type(INPUT, "he");
    await basic.type(INPUT, "llo");
    await basic.waitUntil(() => callsOf(basic, "onChange").length >= 5);

    const changes = callsOf(basic, "onChange").map((c) => c[0] as string);
    expect(changes).toEqual(["h", "he", "hel", "hell", "hello"]);
    expect(basic.value(INPUT)).toBe("hello");

    // A controlled value reports the edit but never writes itself back.
    const controlled = await openCase("controlled");
    expect(controlled.value(INPUT)).toBe("hero");
    await controlled.type(INPUT, "x");
    await controlled.waitUntil(() => callsOf(controlled, "onChange").length > 0);
    expect(controlled.value(INPUT)).toBe("hero");
    expect(callsOf(controlled, "onChange").at(-1)?.[0]).toBe("herox");

    // `isEmpty` flips false → true across the clear press — the render
    // prop behind upstream's `data-empty` (D18).
    const empty = await openCase("empty");
    await empty.waitUntil(() => callsOf(empty, "root-props").length > 0);
    expect(lastRootProps(empty).isEmpty).toBe(false);

    await empty.press(CLEAR);
    await empty.waitUntil(() => lastRootProps(empty).isEmpty === true);
    expect(empty.value(INPUT)).toBe("");

    // The focus render props: typing moves `isFocusWithin` on the Group
    // and `isFocused` on the Input (the focus.split semantics).
    const focus = await openCase("hover");
    await focus.type(INPUT, "h");
    await focus.waitUntil(
      () => lastGroupProps(focus).isFocusWithin && lastInputProps(focus).isFocused,
    );
    expect(lastGroupProps(focus).isFocusWithin).toBe(true);
    expect(lastInputProps(focus).isFocused).toBe(true);

    // Disabled: the input takes no input and the clear button is disabled;
    // typing is rejected or ignored, the `defaultValue` stays and `onClear`
    // never records (the `ERR_NSH_TEST_DISABLED` half is the press on the
    // disabled clear button below).
    const disabled = await openCase("disabled");
    expect(disabled.enabled(INPUT)).toBe(false);
    expect(disabled.enabled(CLEAR)).toBe(false);
    await disabled.type(INPUT, "x").catch(() => undefined);
    await disabled.wait(100);
    expect(disabled.value(INPUT)).toBe("hero");
    await expect(disabled.press(CLEAR)).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(disabled, "onClear")).toHaveLength(0);

    // Read-only: same editing block, value kept, clear button disabled.
    const readonly = await openCase("readonly");
    expect(readonly.enabled(INPUT)).toBe(false);
    expect(readonly.enabled(CLEAR)).toBe(false);
    expect(readonly.value(INPUT)).toBe("hero");
    await readonly.type(INPUT, "x").catch(() => undefined);
    await readonly.wait(100);
    expect(readonly.value(INPUT)).toBe("hero");
    await expect(readonly.press(CLEAR)).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(readonly, "onClear")).toHaveLength(0);

    // Invalid: the FieldError text is on screen and the Description is
    // hidden — T-008's visible half.
    const invalid = await openCase("invalid");
    expect(invalid.shows("text:Enter at least 3 characters")).toBe(true);
    expect(invalid.shows("text:Search by title or author")).toBe(false);
  }, 120_000);
});
