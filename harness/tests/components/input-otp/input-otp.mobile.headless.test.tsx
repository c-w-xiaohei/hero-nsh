import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

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
 * The fixture is `harness/input-otp.fixtures.tsx` (`case` + `scope`, the
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
    for (const scope of ["", "touch"] as const) {
      const app = await openOtp("basic", scope ? { scope } : {});

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
});
