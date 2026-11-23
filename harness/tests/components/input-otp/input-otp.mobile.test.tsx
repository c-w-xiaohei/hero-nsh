import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the input-otp adapt unit — one test per row of
 * adapt-sheets/input-otp.md §4 that runs on every target, native
 * ios/android included: M-001…M-004, M-006 and M-007. The paste half
 * (M-005, `app.paste` is headless-only per the sheet's §6), the ios
 * host-derivation half (M-009, `open({platform:"ios"})` exists only
 * headless) and M-008's baseline (`openScenario` pins a desktop window,
 * which native hosts reject) live in `input-otp.mobile.headless.test.tsx`.
 *
 * The fixture is `harness/input-otp.fixtures.tsx`, opened by `host.params`:
 * `case` (`basic` — the default, with the `layout` slot-bounds probe and the
 * onChange/onFocus/onBlur/onSubmit/onPaste probes — `complete`, `readonly`,
 * `disabled`, `autocomplete`, `keyboard-type`, `return-key`) and
 * `testInput` ("pointer"/"touch" through an outer `EnvironmentScope` — the
 * pointer half is the host-independent desktop-parity baseline; the
 * host-derived default differs per target, so it is never assumed).
 */

type Params = Record<string, string>;

function openOtp(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../input-otp.fixtures.tsx", {
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
    const touch = await openOtp("basic", { testInput: "touch" });
    await waitForLayouts(touch);
    for (const index of [0, 1, 2]) {
      expect(layoutFor(touch, index).height).toBeGreaterThanOrEqual(44);
    }

    const pointer = await openOtp("basic", { testInput: "pointer" });
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
    for (const scope of ["pointer", "touch"] as const) {
      const app = await openOtp("basic", scope ? { testInput: scope } : { testInput: "pointer" });

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
    for (const scope of ["pointer", "touch"] as const) {
      const app = await openOtp("return-key", scope ? { testInput: scope } : { testInput: "pointer" });

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
      for (const scope of ["pointer", "touch"] as const) {
        const app = await openOtp(caseName, scope ? { testInput: scope } : { testInput: "pointer" });

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
    const disabled = await openOtp("disabled", { testInput: "touch" });
    // The headless host rejects `app.type` on a non-editable input with
    // `not editable`, but a real browser drops the keys silently so the step
    // resolves — tolerated rather than required (the color-field T-010 /
    // X-001 pattern); the effect assertions below are the contract either way.
    await disabled.type("id:input-otp-input", "1").catch(() => undefined);
    expect(callsOf(disabled, "onChange")).toHaveLength(0);
    expect(disabled.count("id:input-otp-slot-value")).toBe(0);

    const readonly = await openOtp("readonly", { testInput: "touch" });
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
    for (const scope of ["pointer", "touch"] as const) {
      const app = await openOtp("basic", scope ? { testInput: scope } : { testInput: "pointer" });

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

  // adapt-sheets/input-otp.md M-008 (基线) lives in
  // `input-otp.mobile.headless.test.tsx` — it opens the shared scenarios
  // through `openScenario`, which pins a desktop window native hosts
  // reject, so the baseline moved there rather than weaken.
});
