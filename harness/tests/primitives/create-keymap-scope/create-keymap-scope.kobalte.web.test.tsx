/*
 * The Windows host gap (loop brief, "Windows keyboard focus"): NSH 0.4.0's
 * Win32 host never gives a non-Input view keyboard focus, so the pointer press
 * on the other list does not move the focus there and the bindings never
 * follow. This case moves focus between two lists and then drives the second;
 * it runs on the web target, where a press moves focus.
 *
 * The shared file keeps the cases that start from the scenario's autoFocus.
 */

import { describe, expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

type ListState = {
  id: string;
  focusedKey: string | null;
  isFocused: boolean;
};

/** The latest reported state of every list in the scenario. */
function states(app: App): Record<string, ListState> {
  const result: Record<string, ListState> = {};

  for (const call of callsOf(app, "state")) {
    const state = call[0] as ListState;
    result[state.id] = state;
  }

  return result;
}

async function openScoped(): Promise<App> {
  const app = await openScenario("primitives/keymap-scope", {
    platform: "web",
  });

  await app.waitUntil(() => states(app).a?.isFocused === true);
  return app;
}

async function waitState(
  app: App,
  id: string,
  key: string | null,
): Promise<void> {
  await app.waitUntil(() => states(app)[id]?.focusedKey === key);
}

describe("keymap ownership", () => {
  test("focus moving to the other list moves the bindings with it", async () => {
    const app = await openScoped();

    await app.keyboard.press("down");
    await waitState(app, "a", "apple");
    await app.keyboard.press("b");
    await waitState(app, "a", "banana");

    await app.press("id:focus-b");
    await app.waitUntil(() => states(app).b?.isFocused === true);
    await waitState(app, "b", "apple");
    await app.waitUntil(() => states(app).a?.isFocused === false);

    await app.keyboard.press("down");
    await waitState(app, "b", "apricot");
    // List A kept its focused key and did not hear the key.
    expect(states(app).a?.focusedKey).toBe("banana");

    await app.keyboard.press("b");
    await waitState(app, "b", "banana");
    expect(states(app).a?.focusedKey).toBe("banana");
  });
});
