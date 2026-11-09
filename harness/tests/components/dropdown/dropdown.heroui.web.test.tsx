import { open, test, expect } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";
import { close, menu } from "../../testers/dropdown";

/*
 * The two Dropdown cases that need a real keyboard focus handoff (port sheet
 * 4b: T-003, T-009). Both start with the trigger holding keyboard focus and
 * T-009 ends with focus restored to it; NSH 0.4.0's Win32 host never gives a
 * non-Input view keyboard focus and `ref.focus()` on a view is a no-op there,
 * so they run on the web target (approved difference, port sheet section 8).
 *
 * Everything else about Dropdown stays in dropdown.heroui.test.tsx.
 */

function openFixture(name: string, extra: Parameters<typeof open>[1] = {}): Promise<App> {
  return open("../../../dropdown.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    clock: {},
    ...extra,
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/dropdown/dropdown.test.tsx:61
// Ported (port sheet T-003). The upstream Menu tester with
// `interactionType: "keyboard"` focuses the trigger, presses Enter, then
// navigates from the focused option to the target. Here Tab focuses the only
// focusable view (the trigger) and Enter opens the menu with its first row
// ("New file") focused, so two ArrowDowns reach "Delete file" — the same index
// arithmetic the tester does.
test("T-003 supports open and select via keyboard", async () => {
  const app = await openFixture("default");

  await app.keyboard.press("tab");
  await app.keyboard.press("enter");
  await app.waitFor("role:menu");

  expect(menu(app)).toBe(true);

  // The popover moves focus into the menu a frame after opening.
  await app.clock!.runFor(20);

  await app.keyboard.press("arrowdown");
  await app.keyboard.press("arrowdown");
  await app.keyboard.press("enter");
  await app.clock!.runFor(200);

  expect(callsOf(app, "onAction")[0]?.[0]).toBe("delete-file");
  expect(menu(app)).toBe(false);
});

// heroui/packages/react/tests/components/dropdown/dropdown.browser.test.tsx:57
// Rewritten port (port sheet T-009): the five `expect.element` checks become
// presence checks plus the trigger's recorded focus events. `nsh test` cannot
// query focus, so the fixture probes `Dropdown.Trigger`'s onFocus / onBlur and
// the last of those events must be a focus, not a blur.
test("T-009 opens the menu, shows items, and restores focus to the trigger after Escape", async () => {
  const app = await openFixture("default");

  await app.press("role:button[Menu]");

  expect(menu(app)).toBe(true);
  expect(app.shows("role:menuitem[New file]")).toBe(true);
  expect(app.shows("role:menuitem[Copy link]")).toBe(true);

  await close(app);
  await app.clock!.runFor(200);

  expect(menu(app)).toBe(false);

  const focusEvents = calls(app)
    .filter((call) => call.name === "triggerFocus" || call.name === "triggerBlur")
    .map((call) => call.name);

  expect(focusEvents[focusEvents.length - 1]).toBe("triggerFocus");
});

// src/components/dropdown/dropdown-trigger.tsx:213-247, dropdown-root.tsx:106-112,
// dropdown-menu.tsx:98-102
// Probe: ArrowDown on the focused trigger opened nothing, and Tab+Enter left
// the menu root focused with no row, so a second Enter ran no action. The
// trigger must bind Arrows (and Enter/Space) and hand the open focus strategy
// to the Menu: "first" for ArrowDown/Enter, "last" for ArrowUp.
test("X-005 opens the menu on its first or last row from the trigger's arrow keys", async () => {
  const app = await openFixture("default");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowdown");
  await app.waitFor("role:menu");
  await app.clock!.runFor(20);

  await app.keyboard.press("enter");
  await app.clock!.runFor(200);

  expect(callsOf(app, "onAction")[0]?.[0]).toBe("new-file");
  expect(menu(app)).toBe(false);

  // Closing returns focus to the trigger, and ArrowUp opens on the last row.
  await app.keyboard.press("arrowup");
  await app.waitFor("role:menu");
  await app.clock!.runFor(20);

  await app.keyboard.press("enter");
  await app.clock!.runFor(200);

  expect(callsOf(app, "onAction")[1]?.[0]).toBe("delete-file");
  expect(menu(app)).toBe(false);
});
