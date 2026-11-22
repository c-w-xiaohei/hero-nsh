import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Mobile assertions for the input-otp adapt unit — one test per row of
 * adapt-sheets/input-otp.md §4 that the shared (headless + web) targets can
 * observe: M-001…M-004, M-006…M-008. The paste half (M-005, `app.paste` is
 * headless-only per the sheet's §6) and the ios host-derivation half (M-009,
 * `open({platform:"ios"})` exists only headless) live in
 * `input-otp.mobile.headless.test.tsx`.
 *
 * The fixture is `harness/input-otp.fixtures.tsx`, opened by `host.params`:
 * `case` (`basic` — the default, with the `layout` slot-bounds probe and the
 * onChange/onFocus/onBlur/onSubmit/onPaste probes — `complete`, `readonly`,
 * `disabled`, `autocomplete`, `keyboard-type`, `return-key`) and `scope`
 * (`"touch"` wraps the case in `EnvironmentScope input="touch"`; absent is
 * the host's default environment — pointer on the pinned desktop host, the
 * desktop-parity half).
 *
 * `platform:"windows"` pins the pointer host both targets share: without it
 * a suite run opens the app on the phone-sized headless engine
 * (`platform.desktop` false), so the environment's `input` defaults to
 * touch and every pointer-default assertion in this file inverts (the
 * switch/tabs `.mobile.test.tsx` convention).
 */

type Params = Record<string, string>;

function openOtp(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../input-otp.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type LayoutEntry = { index: number; x: number; y: number; width: number; height: number };

/** The last `layout` probe record for one measured slot (basic case: slots 0–2). */
function layoutFor(app: App, index: number): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.index === index);
  return entries[entries.length - 1];
}

async function waitForLayouts(app: App, count = 3): Promise<void> {
  await app.waitUntil(() => callsOf(app, "layout").length >= count);
}

describe("input-otp mobile", () => {
  // adapt-sheets/input-otp.md M-001 (A-001): the `input` axis's visible half —
  // under touch each cell's `min-h-11` lifts the slot bounds to the 44 pt hit
  // minimum; under the default pointer environment the base `h-10` (40 pt)
  // resolves verbatim and the width is unchanged.
  test("M-001 touch lifts slot height to 44pt, default environment keeps 40pt", async () => {
    const touch = await openOtp("basic", { scope: "touch" });
    await waitForLayouts(touch);
    for (const index of [0, 1, 2]) {
      expect(layoutFor(touch, index).height).toBeGreaterThanOrEqual(44);
    }

    const pointer = await openOtp("basic");
    await waitForLayouts(pointer);
    for (const index of [0, 1, 2]) {
      const entry = layoutFor(pointer, index);
      expect(entry.height).toBe(40);
      // The hit axis touches height only: the cell width is identical across
      // environments (same window, same flex layout).
      expect(Math.abs(entry.width - layoutFor(touch, index).width)).toBeLessThan(0.5);
    }
  }, 120_000);

  // adapt-sheets/input-otp.md M-002 (A-005): the focus-entry half of G+B — a
  // press on the covering input reports `onFocus`, and typing then lands
  // digit by digit. Asserted under the injected touch environment and under
  // the default (pointer) environment as the desktop-parity dual.
  test("M-002 press focuses the field and typing lands in both environments", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openOtp("basic", scope ? { scope } : {});

      await app.press("id:input-otp-input");
      await app.waitUntil(() => callsOf(app, "onFocus").length > 0);

      await app.type("id:input-otp-input", "12");
      await app.waitUntil(() => callsOf(app, "onChange").length >= 2);

      expect(callsOf(app, "onChange").map((c) => c[0])).toEqual(["1", "12"]);
      expect(app.count("id:input-otp-slot-value")).toBe(2);
    }
  }, 120_000);

  // adapt-sheets/input-otp.md M-003 (A-003): G submit — typing to `maxLength`
  // fires `onComplete` exactly once, Return reports `onSubmit` exactly once
  // and keeps focus (`submitBehavior="submit"`: no `onBlur`, the fake caret
  // contract holds), and the field stays editable afterwards. Both
  // environments.
  test("M-003 complete once, enter submits once and keeps focus, both environments", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openOtp("return-key", scope ? { scope } : {});

      await app.type("id:input-otp-input", "1234");
      await app.waitUntil(() => callsOf(app, "onComplete").length === 1);
      expect(callsOf(app, "onComplete")[0][0]).toBe("1234");

      await app.keyboard.press("enter");
      await app.waitUntil(() => callsOf(app, "onSubmit").length === 1);

      // `submitBehavior="submit"`: Return reports onSubmit and keeps focus —
      // the kept-focus half is the silent onBlur probe.
      expect(callsOf(app, "onBlur")).toHaveLength(0);

      // Still editable: the next digit replaces the last cell of the full
      // code (the caret rests on it), proving focus never left the input.
      await app.type("id:input-otp-input", "5");
      await app.waitUntil(() => callsOf(app, "onChange").at(-1)?.[0] === "1235");
      expect(app.count("id:input-otp-slot-value")).toBe(4);
    }
  }, 120_000);

  // adapt-sheets/input-otp.md M-004 (A-002): G auto-fill/soft-keyboard — the
  // `keyboardType`/`inputMode`/`autoComplete` resolutions mount and the edit
  // chain is untouched in both environments (the keyboard itself and the
  // SMS-fill sheet are registered host gaps, sheet §6).
  test("M-004 keyboard-type and autocomplete cases edit normally in both environments", async () => {
    for (const caseName of ["keyboard-type", "autocomplete"] as const) {
      for (const scope of ["", "touch"] as const) {
        const app = await openOtp(caseName, scope ? { scope } : {});

        expect(app.shows("id:input-otp")).toBe(true);
        expect(app.shows("id:input-otp-input")).toBe(true);

        await app.type("id:input-otp-input", "123");
        await app.waitUntil(() => callsOf(app, "onChange").length >= 3);

        expect(callsOf(app, "onChange").map((c) => c[0])).toEqual(["1", "12", "123"]);
        expect(app.count("id:input-otp-slot-value")).toBe(3);
      }
    }
  }, 120_000);

  // adapt-sheets/input-otp.md M-006 (A-007): disabled refuses the edit — the
  // typed keys never land, no `onChange` fires and no slot characters appear;
  // `readOnly` blocks edits the same way while the default value stays put —
  // asserted under the injected touch environment.
  test("M-006 disabled refuses typing, readonly keeps its value, under touch", async () => {
    const disabled = await openOtp("disabled", { scope: "touch" });
    // The headless host rejects `app.type` on a non-editable input with
    // `not editable`, but a real browser drops the keys silently so the step
    // resolves — tolerated rather than required (the color-field T-010 /
    // X-001 pattern); the effect assertions below are the contract either way.
    await disabled.type("id:input-otp-input", "1").catch(() => undefined);
    expect(callsOf(disabled, "onChange")).toHaveLength(0);
    expect(disabled.count("id:input-otp-slot-value")).toBe(0);

    const readonly = await openOtp("readonly", { scope: "touch" });
    expect(readonly.count("id:input-otp-slot-value")).toBe(3);
    await readonly.type("id:input-otp-input", "9").catch(() => undefined);
    expect(callsOf(readonly, "onChange")).toHaveLength(0);
    expect(readonly.count("id:input-otp-slot-value")).toBe(3);
    expect(readonly.value("id:input-otp-input")).toBe("123");
  }, 120_000);

  // adapt-sheets/input-otp.md M-007 (A-010): the fixture itself is the
  // assertion vehicle — `Scoped` mounts in both environments and every probe
  // (`layout` bounds, `onChange`, `onFocus`, `onBlur`, `onSubmit`, `onPaste`)
  // records through `app.storage()`.
  test("M-007 the fixture mounts in both environments and every probe records", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openOtp("basic", scope ? { scope } : {});

      expect(app.shows("id:input-otp")).toBe(true);
      expect(app.shows("id:input-otp-input")).toBe(true);
      expect(app.count("id:input-otp-slot")).toBe(6);

      // The `layout` probe fires for the three measured slots on mount.
      await waitForLayouts(app);
      for (const index of [0, 1, 2]) {
        expect(layoutFor(app, index).height).toBeGreaterThan(0);
      }

      // The interaction probes record: press → onFocus, type → onChange.
      await app.press("id:input-otp-input");
      await app.waitUntil(() => callsOf(app, "onFocus").length > 0);
      await app.type("id:input-otp-input", "7");
      await app.waitUntil(() => callsOf(app, "onChange").length === 1);
      expect(callsOf(app, "onChange")[0][0]).toBe("7");

      // The remaining probe names are readable storage channels even before
      // they fire (onBlur/onSubmit/onPaste stay empty until their event).
      for (const name of ["onBlur", "onSubmit", "onPaste"]) {
        expect(Array.isArray(callsOf(app, name))).toBe(true);
      }
    }
  }, 120_000);

  // adapt-sheets/input-otp.md M-008 (基线): desktop zero drift under the
  // default environment — the shared scenarios keep every semantic the
  // existing heroui tests pin: the onChange sequence, onComplete exactly
  // once, last-cell replacement on a full code, pattern rejection, the
  // controlled value never writing back, FieldError rendering, disabled
  // refusal and Return keeping focus. (`app.paste` is headless-only and its
  // dual lives in M-005; the scenarios run on the pointer host here.)
  //
  // Split into two tests of four scenarios each: apps close only when their
  // test ends, so the eight mounts otherwise stay live together on the web
  // target and exhaust its browser pool — the toast w3b M-008 failure mode
  // (mid-test `open(): the page did not connect in 60 s`).
  test("M-008 default environment baseline: typing, complete, replace, pattern", async () => {
    // T-003 dual: typing reports the whole code on every keystroke.
    const typing = await openScenario("input-otp/typing");
    await typing.type("id:input-otp-input", "12");
    await typing.waitUntil(() => callsOf(typing, "onChange").length >= 2);
    expect(callsOf(typing, "onChange").map((c) => c[0])).toEqual(["1", "12"]);
    expect(typing.count("id:input-otp-slot-value")).toBe(2);

    // T-004 dual: onComplete fires once when maxLength is reached.
    const complete = await openScenario("input-otp/complete");
    await complete.type("id:input-otp-input", "1234");
    await complete.waitUntil(() => callsOf(complete, "onComplete").length === 1);
    expect(callsOf(complete, "onComplete")[0][0]).toBe("1234");
    expect(complete.count("id:input-otp-slot-value")).toBe(4);

    // X-002/S-006 dual: a full code's caret rests on the last cell, so the
    // next digit replaces it instead of being dropped.
    const filled = await openScenario("input-otp/filled");
    await filled.type("id:input-otp-input", "456");
    await filled.type("id:input-otp-input", "7");
    await filled.waitUntil(() => callsOf(filled, "onChange").at(-1)?.[0] === "123457");
    expect(filled.count("id:input-otp-slot-value")).toBe(6);

    // S-001 dual: a pattern that rejects the whole candidate drops the edit.
    const pattern = await openScenario("input-otp/pattern");
    await pattern.type("id:input-otp-input", "1");
    await pattern.wait(300);
    expect(pattern.count("id:input-otp-slot-value")).toBe(0);
    expect(callsOf(pattern, "onChange")).toHaveLength(0);
    await pattern.type("id:input-otp-input", "ab");
    await pattern.waitUntil(() => callsOf(pattern, "onChange").length > 0);
    expect(callsOf(pattern, "onChange").at(-1)?.[0]).toBe("ab");
    expect(pattern.count("id:input-otp-slot-value")).toBe(2);
  }, 180_000);

  test("M-008 default environment baseline: controlled, invalid, disabled, enter", async () => {
    // S-002 dual: a controlled value reports onChange but never writes back.
    const controlled = await openScenario("input-otp/controlled");
    await controlled.type("id:input-otp-input", "9");
    await controlled.waitUntil(() => callsOf(controlled, "onChange").length > 0);
    expect(controlled.count("id:input-otp-slot-value")).toBe(2);
    expect(controlled.texts()).not.toContain("9");
    expect(callsOf(controlled, "onChange").at(-1)?.[0]).toBe("129");

    // T-006 dual: isInvalid + FieldError renders the message.
    const invalid = await openScenario("input-otp/invalid");
    expect(invalid.shows("text:Invalid code")).toBe(true);

    // T-005 dual: the disabled input refuses edits at the host.
    const disabled = await openScenario("input-otp/disabled");
    expect(disabled.enabled("id:input-otp-input")).toBe(false);
    await disabled.type("id:input-otp-input", "1").catch(() => undefined);
    expect(disabled.count("id:input-otp-slot-value")).toBe(0);
    expect(callsOf(disabled, "onChange")).toHaveLength(0);

    // X-003 dual: Return keeps focus — the fake caret survives it.
    const basic = await openScenario("input-otp/basic");
    await basic.press("id:input-otp-input");
    expect(basic.count("id:input-otp-caret")).toBe(1);
    await basic.keyboard.press("enter");
    expect(basic.count("id:input-otp-caret")).toBe(1);
  }, 180_000);
});
