import { describe, expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * V4 of research section 10: what NSH actually delivers to TypeScript for keys,
 * focus, Tab order and pointer presses. This row is web-only: Tab moves focus
 * through focusable views in tree order on the web target, and keyboard focus
 * does not move with Tab on a real Windows window ("Real hosts" in the loop
 * brief). The shared file keeps the other V4 rows.
 */
describe("V4 key and focus events on a real engine", () => {
  function events(app: App): string[] {
    return callsOf(app, "event").map((call) => {
      const name = String(call[0]);
      const value = call[1];
      if (name === "keymap") {
        return `${name}:${String((value as { keystroke?: unknown }).keystroke)}`;
      }
      return `${name}:${String(value)}`;
    });
  }

  test("Tab moves focus through focusable views in tree order", async () => {
    const app = await openScenario("v4/events", {
      params: { case: "events" },
      platform: "web",
    });

    await app.keyboard.press("tab");
    await app.waitUntil(() => events(app).includes("focus:a"));
    expect(events(app)).toContain("focus:a");

    await app.keyboard.press("tab");
    await app.waitUntil(() => events(app).includes("focus:b"));
    expect(events(app)).toContain("blur:a");
    expect(events(app)).toContain("focus:b");
  });
});
