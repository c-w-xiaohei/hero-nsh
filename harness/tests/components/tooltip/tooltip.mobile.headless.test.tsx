import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only half of the tooltip mobile assertions: adapt-sheets/
 * tooltip.md M-009 — the Environment derivation path end to end. An ios
 * host with no `EnvironmentScope` derives `input="touch"` from
 * `platform.desktop === false`, so the long-press entry, the outside-press
 * close and the hover-channel gate must behave exactly as the injected
 * `scope="touch"` half of tooltip.mobile.test.tsx proves.
 *
 * `open({platform:"ios"})` rejects on `--target web`
 * (ERR_NSH_TEST_UNSUPPORTED), which is why this row lives in a
 * `.headless.` file. `app.hover` is likewise unavailable on a phone
 * platform, so the "hover channel stays shut" half is asserted through
 * what the host can do: the env probe text and the fact that a plain tap
 * opens nothing — only the held press does.
 *
 * This file also carries M-007's Tab-focus half with `platform:"macos"`:
 * Tab moves focus on macOS headless (and on the web target — the web half
 * lives in tooltip.mobile.web.test.tsx) but not on headless windows, the
 * registered host gap.
 */

const MOBILE_TIP = "text:Mobile tip";

function openChanges(app: App): boolean[] {
  return callsOf(app, "openChange").map((c) => c[0] as boolean);
}

function openTooltip(
  params: Record<string, string> = {},
  platform: "windows" | "macos" | "ios" = "windows",
): Promise<App> {
  return open("../../../tooltip.fixtures.tsx", {
    platform,
    width: platform === "ios" ? 390 : 1024,
    height: platform === "ios" ? 844 : 768,
    host: { params: { case: "mobile", ...params } },
  });
}

describe("tooltip mobile (headless)", () => {
  // adapt-sheets/tooltip.md M-009 (A-001, A-002, A-003): `platform:"ios"`
  // with no scope derives input=touch — the fixture's `env-input=` Text
  // reports it — a plain `app.press` opens nothing (tap is not the touch
  // entry), `app.longPress` opens the tip and records `onOpenChange(true)`,
  // and a press outside closes it again.
  test("M-009 ios host derivation: input=touch — tap stays shut, long-press opens, outside press closes", async () => {
    const app = await openTooltip({}, "ios");

    await app.waitFor("text:env-input=touch");

    // A tap is not the touch entry: press opens nothing.
    await app.press("id:trigger");
    await app.wait(200);
    expect(app.shows(MOBILE_TIP)).toBe(false);
    expect(openChanges(app)).not.toContain(true);

    // The held press is: the tip opens at once and reports true.
    await app.longPress("id:trigger");
    await app.waitUntil(() => openChanges(app).includes(true));
    expect(app.shows(MOBILE_TIP)).toBe(true);

    // Outside press closes it — the touch-only `onPressOutside` path,
    // derived from the host rather than injected.
    await app.press("id:away");
    await app.waitUntil(() => openChanges(app).includes(false));
    await app.waitUntil(() => app.count(MOBILE_TIP) === 0);
    expect(openChanges(app)).toEqual([true, false]);
  }, 120_000);

  // adapt-sheets/tooltip.md M-007 (A-004, 基线): the keyboard-focus channel
  // is untouched by the `input` axis — under `trigger="focus"` Tab focus
  // opens the tip at once and the next Tab's blur closes it, identically
  // under pointer and injected touch. `platform:"macos"` is the
  // focus-capable headless host (headless windows cannot move focus by
  // Tab); the web-target half lives in tooltip.mobile.web.test.tsx.
  test("M-007 headless focus channel: Tab opens the focus-only tip, blur closes it, in both environments", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openTooltip(
        { focusOnly: "1", ...(scope ? { scope } : {}) },
        "macos",
      );

      await app.keyboard.press("tab");
      await app.waitFor(MOBILE_TIP);
      expect(openChanges(app)).toContain(true);

      await app.keyboard.press("tab");
      await app.waitUntil(() => openChanges(app).includes(false));
      await app.waitUntil(() => app.count(MOBILE_TIP) === 0);
    }
  }, 120_000);
});
