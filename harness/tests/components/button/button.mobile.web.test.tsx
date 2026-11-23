import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";

/*
 * Web-only mobile assertions for the button adapt unit — the M-007 half
 * the shared file cannot carry: focus-visible is a keyboard-modality
 * concern and `platform:"web"` is the only open that drives Tab focus.
 * `button.mobile.test.tsx` keeps the render-prop/callback-order half; the
 * render-prop focus-ring contract itself is pinned by
 * `button.heroui.test.tsx` T-013 and is not re-ported here.
 */

function openButton(caseName: string): Promise<App> {
  return open("../../../button.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName } },
  });
}

describe("button mobile (web)", () => {
  // adapt-sheets/button.md M-007's web half (基线): Tab still moves focus
  // onto the button — `enabled` reports true and `shows` still finds it.
  test("M-007 web: Tab reaches the button and it stays enabled and visible", async () => {
    const web = await openButton("basic");
    await web.keyboard.press("tab");
    await web.waitUntil(() => web.enabled("id:btn"));
    expect(web.enabled("id:btn")).toBe(true);
    expect(web.shows("id:btn")).toBe(true);
  }, 120_000);
});
