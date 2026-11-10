import { expect, open, test } from "nsh/test";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { focusTrail, panelText, selectionCalls } from "../../testers/tabs";

/*
 * Kobalte 0.13.14 regression cases for Tabs that need Tab to move the keyboard
 * focus and the arrow / Home / End / Return keys to act on it, ported to
 * HeroUI's API and to NSH's view model per port sheet 4b (T-011 … T-015,
 * T-017, T-018, T-019), plus the X-002 / X-003 focus-ring regressions.
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab walks text fields, `ref.focus()` on a view is a no-op and
 * Return / Space do not activate a focused view
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). Every case here starts with Tab.
 * Approved difference "Windows keyboard focus and activation (NSH 0.4.0 host
 * gap)", port sheet section 8. macOS and the web both move focus with Tab; the
 * pointer cases stay in tabs.kobalte.test.tsx.
 *
 * `document.activeElement` has no query, so the fixture records a focus event
 * per tab and puts a pressable `after` station behind the group: Tab that
 * leaves the tabs lands there, which is how "no tab has the focus" is
 * observable instead of being an absent event. Selection is read as the panel
 * that is mounted, since `aria-selected` has no NSH channel (port sheet
 * section 8).
 */

function openFixture(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../tabs.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

// kobalte/packages/core/src/tabs/tabs.test.tsx:76
// Rewritten port (port sheet T-011): the five `aria-selected` reads and the
// `aria-orientation` read become panel checks — Right selects Analytics, Left
// returns to Overview, and Up / Down change nothing on horizontal tabs.
test("T-011 allows user to change tab item select via left/right arrow keys with horizontal tabs", async () => {
  const app = await openFixture("kobalte-plain", { platform: "web" });

  await app.keyboard.press("tab");

  expect(panelText(app, "Overview panel")).toBe(true);

  await app.keyboard.press("arrowright");

  expect(panelText(app, "Analytics panel")).toBe(true);
  expect(panelText(app, "Overview panel")).toBe(false);

  await app.keyboard.press("arrowleft");

  expect(panelText(app, "Overview panel")).toBe(true);
  expect(panelText(app, "Analytics panel")).toBe(false);

  await app.keyboard.press("arrowup");

  expect(panelText(app, "Overview panel")).toBe(true);
  expect(panelText(app, "Analytics panel")).toBe(false);

  await app.keyboard.press("arrowdown");

  expect(panelText(app, "Overview panel")).toBe(true);
  expect(panelText(app, "Analytics panel")).toBe(false);
});

// kobalte/packages/core/src/tabs/tabs.test.tsx:134
// Rewritten port (port sheet T-012): mirrored for vertical tabs — Down selects
// Analytics, Up returns, and Left / Right change nothing.
test("T-012 allows user to change tab item select via up/down arrow keys with vertical tabs", async () => {
  const app = await openFixture("kobalte-vertical", { platform: "web" });

  await app.keyboard.press("tab");

  expect(panelText(app, "Overview panel")).toBe(true);

  await app.keyboard.press("arrowdown");

  expect(panelText(app, "Analytics panel")).toBe(true);
  expect(panelText(app, "Overview panel")).toBe(false);

  await app.keyboard.press("arrowup");

  expect(panelText(app, "Overview panel")).toBe(true);
  expect(panelText(app, "Analytics panel")).toBe(false);

  await app.keyboard.press("arrowleft");

  expect(panelText(app, "Overview panel")).toBe(true);
  expect(panelText(app, "Analytics panel")).toBe(false);

  await app.keyboard.press("arrowright");

  expect(panelText(app, "Overview panel")).toBe(true);
  expect(panelText(app, "Analytics panel")).toBe(false);
});

// kobalte/packages/core/src/tabs/tabs.test.tsx:198
// Rewritten port (port sheet T-013): Left on the first tab wraps to the last and
// Right on the last wraps back to the first.
test("T-013 wraps focus from first to last/last to first item", async () => {
  const app = await openFixture("kobalte-plain", { platform: "web" });

  await app.keyboard.press("tab");

  expect(panelText(app, "Overview panel")).toBe(true);

  await app.keyboard.press("arrowleft");

  expect(panelText(app, "Reports panel")).toBe(true);
  expect(panelText(app, "Overview panel")).toBe(false);

  await app.keyboard.press("arrowright");

  expect(panelText(app, "Overview panel")).toBe(true);
  expect(panelText(app, "Reports panel")).toBe(false);
});

// kobalte/packages/core/src/tabs/tabs.test.tsx:235
// Rewritten port (port sheet T-014): End selects the last tab, Home the first.
test("T-014 select last item via end key / select first item via home key", async () => {
  const app = await openFixture("kobalte-plain", { platform: "web" });

  await app.keyboard.press("tab");

  expect(panelText(app, "Overview panel")).toBe(true);

  await app.keyboard.press("end");

  expect(panelText(app, "Reports panel")).toBe(true);
  expect(panelText(app, "Overview panel")).toBe(false);

  await app.keyboard.press("home");

  expect(panelText(app, "Overview panel")).toBe(true);
  expect(panelText(app, "Reports panel")).toBe(false);
});

// kobalte/packages/core/src/tabs/tabs.test.tsx:272
// Rewritten port (port sheet T-015): with `keyboardActivation="manual"` the
// arrows move the focus without selecting (the focus probe follows the
// selection panel, which stays on Overview and reports nothing) and Return
// selects the focused tab once.
test("T-015 does not select via left / right keys if 'activationMode' is manual, select on enter / spacebar", async () => {
  const app = await openFixture("kobalte-manual", { platform: "web" });

  await app.keyboard.press("tab");

  expect(focusTrail(app)).toEqual(["overview"]);
  expect(panelText(app, "Overview panel")).toBe(true);

  await app.keyboard.press("arrowright");

  expect(focusTrail(app)).toEqual(["overview", "analytics"]);
  expect(panelText(app, "Overview panel")).toBe(true);
  expect(selectionCalls(app)).toHaveLength(0);

  await app.keyboard.press("arrowright");

  expect(focusTrail(app)).toEqual(["overview", "analytics", "reports"]);
  expect(panelText(app, "Overview panel")).toBe(true);
  expect(selectionCalls(app)).toHaveLength(0);

  await app.keyboard.press("enter");

  expect(panelText(app, "Reports panel")).toBe(true);
  expect(panelText(app, "Overview panel")).toBe(false);
  expect(selectionCalls(app)).toHaveLength(1);
  expect(selectionCalls(app)[0][0]).toBe("reports");
});

// kobalte/packages/core/src/tabs/tabs.test.tsx:371
// Rewritten port (port sheet T-017): with `defaultSelectedKey="analytics"` Tab
// enters the list on the selected tab, which the focus probe replaces for
// `document.activeElement`.
test("T-017 should focus the selected tab when tabbing in for the first time", async () => {
  const app = await openFixture("kobalte-default-analytics", { platform: "web" });

  await app.keyboard.press("tab");

  expect(focusTrail(app)).toEqual(["analytics"]);
});

// kobalte/packages/core/src/tabs/tabs.test.tsx:396
// Partial port (port sheet T-018): with the whole group disabled no tab takes
// the focus when the user tabs in; the `after` station proves Tab still moved,
// so the empty trail is not a missing step. Dropped is the upstream "focus
// lands on the tabpanel" assertion: our panel is not a Tab stop (port sheet
// section 8).
test("T-018 should not focus any tabs when isDisabled tabbing in for the first time", async () => {
  const app = await openFixture("kobalte-disabled-group", { platform: "web" });

  await app.keyboard.press("tab");

  expect(focusTrail(app)).toEqual(["after"]);
});

// kobalte/packages/core/src/tabs/tabs.test.tsx:420
// Rewritten port (port sheet T-019): with the middle tab disabled, Right from
// the first tab reaches the third one and reports it.
test("T-019 disabled tabs cannot be keyboard navigated to", async () => {
  const app = await openFixture("kobalte-disabled-middle", { platform: "web" });

  await app.keyboard.press("tab");

  expect(focusTrail(app)).toEqual(["overview"]);

  await app.keyboard.press("arrowright");

  expect(focusTrail(app)).toEqual(["overview", "reports"]);
  expect(panelText(app, "Reports panel")).toBe(true);
  expect(panelText(app, "Overview panel")).toBe(false);
  expect(selectionCalls(app)).toHaveLength(1);
  expect(selectionCalls(app)[0][0]).toBe("reports");
});

/*
 * Focus ring regressions (this round), read through the render value instead of
 * computed style: every tab's visible text says "Ring <id>" while
 * `isFocusVisible()` is true and "NoRing <id>" while it is false.
 *
 * src/components/tabs/tab.tsx:305: the effect that programmatically focuses the
 * roving tab marks the pending focus as pointer-originated before every
 * `node.focus()`, and `handleFocus` (tab.tsx:395-403) then skips
 * `modality.onFocus()`. A focus event without prior pointer input is
 * keyboard-driven (src/primitives/create-interaction-modality/
 * create-interaction-modality.ts:13-16, :139 records keyboard modality), so the
 * skip leaves the newly focused tab's modality null, `isFocusVisible` false and
 * the ring unpainted.
 */

// Regression (this round): src/components/tabs/tab.tsx:305 — the ring must
// survive the first arrow-key move and the one after it.
test("X-002 keeps the focus ring while the arrow keys move between tabs", async () => {
  const app = await openFixture("kobalte-focus-ring", { platform: "web" });

  await app.keyboard.press("tab");

  expect(app.shows("text:Ring overview")).toBe(true);

  await app.keyboard.press("arrowright");

  expect(app.shows("text:Ring analytics")).toBe(true);
  expect(app.shows("text:Ring overview")).toBe(false);

  await app.keyboard.press("arrowright");

  expect(app.shows("text:Ring reports")).toBe(true);
  expect(app.shows("text:Ring analytics")).toBe(false);
});

// Regression (this round): src/components/tabs/tab.tsx:305 — after a pointer
// press focused a tab, the next keyboard move must paint the ring on the tab it
// lands on: that tab's focus event is its only chance to record the keyboard
// modality. `NoRing analytics` then proves the ring is still focus-scoped.
test("X-003 restores the focus ring on a keyboard move after a pointer press", async () => {
  const app = await openFixture("kobalte-focus-ring", { platform: "web" });

  await app.press("role:tab[NoRing analytics]");

  expect(panelText(app, "Analytics panel")).toBe(true);

  await app.keyboard.press("arrowright");

  expect(app.shows("text:Ring reports")).toBe(true);
  expect(app.shows("text:NoRing analytics")).toBe(true);
});

