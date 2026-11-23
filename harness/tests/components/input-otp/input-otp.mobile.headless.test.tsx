import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Headless-only mobile assertions for the input-otp adapt unit — the two
 * rows of adapt-sheets/input-otp.md §4 that the shared targets cannot
 * observe:
 *
 *   M-005  `app.paste` — the sheet's §6 registers that the assertion lives
 *          headless-only (the paste step needs the headless engine / web
 *          driver; this file pins the headless half the sheet assigns).
 *   M-009  `open({platform:"ios"})` host derivation — `platform:"ios"|
 *          "android"` is rejected on `--target web`
 *          (ERR_NSH_TEST_UNSUPPORTED), so the "Environment default exports
 *          the mobile half" assertion can only run here.
 *
 * The fixture is `harness/input-otp.fixtures.tsx` (`case` + `testInput`, the
 * same params as input-otp.mobile.test.tsx); `platform:"windows"` pins the
 * pointer host for the desktop-parity halves.
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

function layoutFor(app: App, index: number): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.index === index);
  return entries[entries.length - 1];
}

describe("input-otp mobile (headless)", () => {
  // adapt-sheets/input-otp.md M-005 (A-004): G paste — `pasteBehavior=
  // "report"` + `handlePaste` is one contract on both ends: under the
  // injected touch environment and under the default pointer environment,
  // pasting six digits fills all six slots, the last `onChange` carries the
  // pasted code, and `onPaste` fires exactly once after it.
  test("M-005 paste fills six slots, onChange carries the code, onPaste fires once after, both environments", async () => {
    for (const testInput of ["pointer", "touch"] as const) {
      const app = await openOtp("basic", { testInput });

      await app.paste("id:input-otp-input", { text: "654321" });
      await app.waitUntil(() => callsOf(app, "onChange").length > 0);

      expect(app.count("id:input-otp-slot-value")).toBe(6);
      expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("654321");
      expect(callsOf(app, "onPaste")).toHaveLength(1);

      // Ordering across probe names: `onPaste` is the tail call of the paste
      // handler — it lands after the `onChange` that carried the code.
      const all = calls(app);
      const lastChange = all.map((c) => c.name).lastIndexOf("onChange");
      const pasteAt = all.findIndex((c) => c.name === "onPaste");
      expect(pasteAt).toBeGreaterThan(lastChange);
      expect(pasteAt).toBeGreaterThanOrEqual(0);
    }
  }, 120_000);

  // adapt-sheets/input-otp.md M-009 (A-001, A-002): with no EnvironmentScope
  // an ios host derives `input()==="touch"` from `platform.desktop`, so the
  // `input` axis resolves the touch cells (slot bounds ≥44 pt) and the edit
  // chain works — the host-derivation half of the mobile environment. Headless
  // only: `--target web` rejects a `platform` option.
  test("M-009 ios host derives touch: slot bounds ≥44pt and typing works without a scope", async () => {
    const app = await openOtp("basic", {}, { platform: "ios", width: 390, height: 844 });

    await app.waitUntil(() => callsOf(app, "layout").length >= 3);
    for (const index of [0, 1, 2]) {
      expect(layoutFor(app, index).height).toBeGreaterThanOrEqual(44);
    }

    await app.type("id:input-otp-input", "12");
    await app.waitUntil(() => callsOf(app, "onChange").length >= 2);
    expect(callsOf(app, "onChange").map((c) => c[0])).toEqual(["1", "12"]);
    expect(app.count("id:input-otp-slot-value")).toBe(2);
  }, 120_000);

  // adapt-sheets/input-otp.md M-008 (基线): desktop zero drift under the
  // default environment — the shared scenarios keep every semantic the
  // existing heroui tests pin: the onChange sequence, onComplete exactly
  // once, last-cell replacement on a full code, pattern rejection, the
  // controlled value never writing back, FieldError rendering, disabled
  // refusal and Return keeping focus. Moved from the shared file:
  // `openScenario` pins a windows window, which native hosts reject.
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
