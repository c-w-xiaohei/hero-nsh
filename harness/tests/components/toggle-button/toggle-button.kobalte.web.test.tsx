import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only Kobalte cases: T-029, T-030 and T-035 all start with Tab moving the
 * keyboard focus into (or past) the group, which the web target does and a real
 * Windows window does not ("Real hosts" in the loop brief). Focus itself has no
 * nsh/test query, so the scenario probes each member's `onFocus`.
 *
 * Partial ports: Kobalte's roving `tabindex` assertions are not carried over —
 * RAC does not express member focus with `tabindex`, and the difference is
 * registered in the port sheet's section 8. T-031 (Home / End) and T-034
 * (focusing the selected item on the first Tab) are deleted in 4b.
 *
 * T-029 and T-030 read right after `open`, which on `--target web` can resolve
 * before the app's first commit: both wait for the first frame on the layout
 * probes they measure. The wait passes `{ timeout: 15_000 }`, above nsh's own
 * 10 s app-start budget; it only delays the read, every assertion still runs.
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function layoutCalls(app: App): LayoutCall[] {
  return callsOf(app, "layout").map((args) => args[0] as LayoutCall);
}

/** Waits until the app's layout pass has reached `names`: an `open` can resolve before the first commit. */
async function firstFrame(app: App, ...names: string[]): Promise<void> {
  await app.waitUntil(
    () => names.every((name) => layoutCalls(app).some((call) => call.name === name)),
    { timeout: 15_000 },
  );
}

function frame(app: App, name: string): LayoutCall {
  const found = layoutCalls(app).find((call) => call.name === name);

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

/** The member names focus was moved to, in order. */
function focused(app: App): unknown[][] {
  return callsOf(app, "focus");
}

// kobalte/packages/core/src/toggle-group/toggle-group.test.tsx:67
test("T-029 allows user to change toggle item via left/right arrow keys with horizontal group", async () => {
  const app = await openScenario("toggle-button-group/keyboard-horizontal", {
    platform: "web",
  });
  await firstFrame(app, "horizontal-0", "horizontal-1");

  expect(frame(app, "horizontal-1").x).toBeGreaterThan(frame(app, "horizontal-0").x);

  await app.keyboard.press("tab");
  expect(focused(app)).toEqual([["Dogs"]]);

  await app.keyboard.press("arrowright");
  expect(focused(app)).toEqual([["Dogs"], ["Cats"]]);

  await app.keyboard.press("arrowleft");
  expect(focused(app)).toEqual([["Dogs"], ["Cats"], ["Dogs"]]);

  // Up and down belong to the other axis: focus stays where it is.
  await app.keyboard.press("arrowup");
  expect(focused(app)).toEqual([["Dogs"], ["Cats"], ["Dogs"]]);

  await app.keyboard.press("arrowdown");
  expect(focused(app)).toEqual([["Dogs"], ["Cats"], ["Dogs"]]);
});

// kobalte/packages/core/src/toggle-group/toggle-group.test.tsx:126
test("T-030 allows user to change toggle item via up/down arrow keys with vertical group", async () => {
  const app = await openScenario("toggle-button-group/keyboard-vertical", {
    platform: "web",
  });
  await firstFrame(app, "kv-0", "kv-1");

  expect(frame(app, "kv-1").y).toBeGreaterThan(frame(app, "kv-0").y);

  await app.keyboard.press("tab");
  expect(focused(app)).toEqual([["Dogs"]]);

  await app.keyboard.press("arrowdown");
  expect(focused(app)).toEqual([["Dogs"], ["Cats"]]);

  await app.keyboard.press("arrowup");
  expect(focused(app)).toEqual([["Dogs"], ["Cats"], ["Dogs"]]);

  // Left and right belong to the other axis: focus stays where it is.
  await app.keyboard.press("arrowright");
  expect(focused(app)).toEqual([["Dogs"], ["Cats"], ["Dogs"]]);

  await app.keyboard.press("arrowleft");
  expect(focused(app)).toEqual([["Dogs"], ["Cats"], ["Dogs"]]);
});

// kobalte/packages/core/src/toggle-group/toggle-group.test.tsx:329
// Rewritten port (port sheet T-035): with the group disabled no member takes
// focus, so Tab lands straight on the button after it — confirmed by activating
// that button with Enter.
test("T-035 should not focus if group is disabled", async () => {
  const app = await openScenario("toggle-button-group/disabled", { platform: "web" });

  await app.keyboard.press("tab");
  expect(focused(app)).toHaveLength(0);

  await app.keyboard.press("enter");
  expect(callsOf(app, "onChange")).toEqual([[true]]);
});
