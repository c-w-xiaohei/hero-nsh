/*
 * No Kobalte tests exist for keymap ownership (Kobalte binds to elements and
 * relies on DOM bubbling). These tests cover the NSH rule that replaces it,
 * through `createKeymapScope` and the `primitives/keymap-scope` scenario:
 *
 * - NSH keeps only the newest binding per keystroke, so two mounted lists must
 *   bind only while each has the focus;
 * - a list's keys must not take the printable keys of a text field.
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
  test("only the focused list hears the arrows and typeahead", async () => {
    const app = await openScoped();

    // List A has the focus from autoFocus (its container, no item yet).
    expect(states(app).a?.focusedKey).toBeNull();
    expect(states(app).b?.focusedKey).toBeNull();
    expect(states(app).b?.isFocused).toBe(false);

    await app.keyboard.press("down");
    await waitState(app, "a", "apple");
    expect(states(app).b?.focusedKey).toBeNull();

    await app.keyboard.press("b");
    await waitState(app, "a", "banana");
    expect(states(app).b?.focusedKey).toBeNull();
  });

  test("a text field keeps its printable keys", async () => {
    const app = await openScoped();

    await app.keyboard.press("down");
    await waitState(app, "a", "apple");

    // The input takes the keyboard focus and types its own letters. The list
    // binding has no `when`, so the keymap leaves the letters the input uses
    // to the input; with `when: "always"` the list would take "b" here.
    await app.type("id:field", "b");

    await app.waitUntil(() => callsOf(app, "keypress").length > 0);
    const typed = callsOf(app, "keypress").map((call) => String(call[0]));
    expect(typed).toEqual(["b"]);

    // The list did not run its typeahead: Apple is still the focused key.
    expect(states(app).a?.focusedKey).toBe("apple");
    expect(states(app).b?.focusedKey).toBeNull();

    // Even an arrow belongs to the focused input (it moves the caret), so it
    // does not reach the list either.
    await app.keyboard.press("down");
    await app.wait(80);
    expect(states(app).a?.focusedKey).toBe("apple");
  });
});
