import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target half of the tooltip M-007 focus assertion: adapt-sheets/
 * tooltip.md M-007 (A-004, 基线) — the keyboard-focus channel is untouched
 * by the `input` axis. `platform:"web"` is the focus-capable host here
 * (Tab moves focus on the web target and on macOS headless, not on
 * headless windows — the registered host gap; the headless half of the
 * same row lives in tooltip.mobile.headless.test.tsx).
 *
 * Under `trigger="focus"` a `Tooltip.Trigger` is the first Tab stop: focus
 * opens the tip at once through `focusStart` → `show`, and the next Tab
 * moving focus to the `away` Button blurs it closed through `focusEnd` →
 * `hide(true)`. Both run under the default environment and under an
 * injected `EnvironmentScope input="touch"` — a touch device with a
 * keyboard keeps the focus semantics (A-004). The pointer/hover negatives
 * of the same row live in tooltip.mobile.test.tsx.
 */

const MOBILE_TIP = "text:Mobile tip";

function openChanges(app: App): boolean[] {
  return callsOf(app, "openChange").map((c) => c[0] as boolean);
}

describe("tooltip mobile (web)", () => {
  // adapt-sheets/tooltip.md M-007 (A-004): Tab focus opens a
  // `trigger="focus"` tip and blur closes it, identically under pointer
  // and injected touch.
  test("M-007 web focus channel: Tab opens the focus-only tip, blur closes it, in both environments", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await open("../../../tooltip.fixtures.tsx", {
        platform: "web",
        width: 1024,
        height: 768,
        host: {
          params: {
            case: "mobile",
            focusOnly: "1",
            ...(scope ? { scope } : {}),
          },
        },
      });

      // First Tab stop is the trigger; focus opens the tip at once.
      await app.keyboard.press("tab");
      await app.waitFor(MOBILE_TIP);
      expect(openChanges(app)).toContain(true);

      // The next Tab moves focus to the `away` Button: the trigger's blur
      // closes the tip through `focusEnd` → `hide(true)`.
      await app.keyboard.press("tab");
      await app.waitUntil(() => openChanges(app).includes(false));
      await app.waitUntil(() => app.count(MOBILE_TIP) === 0);
    }
  }, 120_000);
});
