import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { lastLayout, rightOf, triggerFocusCount } from "../../testers/date-picker";

/*
 * DatePicker cases that need a real engine's focus and box (port sheet 4b, rows
 * T-006 and T-007). NSH 0.4.0's Win32 host gives keyboard focus only to an
 * Input — `ref.focus()` on a view is a no-op and Tab walks text fields only
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`), so the
 * trigger cannot take the focus back on a Windows window. Approved difference
 * "Windows keyboard focus and activation (NSH 0.4.0/0.5.0 host gap)", port sheet
 * §8 item 10 and the common rules (`_common.md:52`). Nothing here is hidden on a
 * target where it could work.
 *
 * `toHaveFocus` cannot be queried by `nsh/test`, so the fixture's trigger
 * records its `onFocus` into Storage (port sheet 4b.3): the count is 0 unless
 * the close returned the focus. The popover's dialog role is not available in
 * NSH (port sheet §8 item 1), so its content stands in for it: the calendar's
 * Previous nav button is the visible half of "the popover is on screen".
 */

const TRIGGER = "role:button[Open calendar]";
const PREVIOUS = "role:button[/^Previous$/]";

type CaseParams = Record<string, string | number | boolean>;

function openCase(name: string, params: CaseParams = {}): Promise<App> {
  return open("../../../date-picker.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/date-picker/date-picker.browser.test.tsx:85
// Partial port of T-006 (port sheet 4b): `getByRole("dialog", {name: /Date/})`,
// the popover's `data-slot`, the `[role="dialog"]` count and the "no banner /
// no calendar header element" queries are all DOM structure that NSH does not
// have (no dialog role, no `data-slot`, no landmark roles). The two facts the
// case exists for stay: Escape closes the popover, and the trigger gets the
// focus back — the behaviour of the root's keydown + focus-restore code.
test("T-006 should close on Escape and return the focus to its trigger", async () => {
  const app = await openCase("default");

  expect(triggerFocusCount(app)).toBe(0);

  await app.press(TRIGGER);
  expect(app.shows(PREVIOUS)).toBe(true);

  await app.keyboard.press("escape");

  await app.waitFor(PREVIOUS, { state: "gone" });
  // The focus comes back in an effect after the close, one frame later.
  await app.waitUntil(() => triggerFocusCount(app) > 0);

  expect(app.shows(PREVIOUS)).toBe(false);
  expect(triggerFocusCount(app)).toBeGreaterThan(0);
});

// heroui/packages/react/tests/components/date-picker/date-picker.browser.test.tsx:101
// Partial port of T-007 (port sheet 4b): the `getByRole("dialog", {name:
// "Choose a date"})` query is dropped (no dialog role; that an `aria-label` on
// the popover overrides the Label text is a hand check). The geometry relation
// is kept: with the caller's `flex items-start gap-4` on the popover, the
// trailing preset button sits strictly right of the calendar (§4c G-002).
test("T-007 should lay a custom horizontal popover out with the preset beside the calendar", async () => {
  const app = await openCase("layout");

  await app.press(TRIGGER);
  await app.waitFor("role:button[Use today]");
  // The overlay positions itself a frame after it mounts.
  await app.wait(50);

  const calendar = lastLayout(app, "calendar");
  const preset = lastLayout(app, "preset");

  expect(preset.x - rightOf(calendar)).toBeGreaterThan(0);
});
