import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { layoutOf, rightOf, triggerFocusCount } from "../../testers/date-range-picker";

/*
 * DateRangePicker cases that need a real engine's focus and box (port sheet 4b,
 * rows T-006 and T-007). NSH 0.4.0's Win32 host gives keyboard focus only to an
 * Input — `ref.focus()` on a view is a no-op and Tab walks text fields only
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`), so the
 * trigger cannot take the focus back on a Windows window. Approved difference
 * "Windows keyboard focus and activation (NSH 0.4.0/0.5.0 host gap)", port sheet
 * §8 item 14 and the common rules (`_common.md:52`). Nothing here is hidden on a
 * target where it could work.
 *
 * `toHaveFocus` cannot be queried by `nsh/test`, so the fixture's trigger
 * records its `onFocus` into Storage (port sheet 4b.3): the count is 0 unless
 * the close returned the focus. The popover's dialog role is not available in
 * NSH (port sheet §8 item 1), so its content stands in for it: the range
 * calendar's Previous nav button is the visible half of "the popover is on
 * screen". The popover's box only exists once the overlay has measured and
 * positioned itself, which is why T-007 waits a frame before reading bounds.
 */

const TRIGGER = "role:button[Open calendar]";
const PREVIOUS = "role:button[/^Previous$/]";
const PRESET = "role:button[Use today]";

type CaseParams = Record<string, string | number | boolean>;

function openCase(name: string, params: CaseParams = {}): Promise<App> {
  return open("../../../date-range-picker.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/date-range-picker/date-range-picker.browser.test.tsx:93
// Partial port of T-006 (port sheet 4b): `getByRole("dialog", {name: /Trip
// dates/})`, the popover's `data-slot`, the `[role="dialog"]` count and the "no
// banner / no calendar header element" queries are all DOM structure that NSH
// does not have (no dialog role, no `data-slot`, no landmark roles, no id
// reference resolution). The two facts the case exists for stay: Escape closes
// the popover, and the trigger gets the focus back — the behaviour of the root's
// keydown marker plus the close effect, the NSH form of HeroUI's
// `window.addEventListener("keydown")` + `requestAnimationFrame` pair.
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

// heroui/packages/react/tests/components/date-range-picker/date-range-picker.browser.test.tsx:112
// Partial port of T-007 (port sheet 4b): the upstream case carries no synchronous
// `expect(`; its one `expect.poll` is kept as the geometry relation §4c G-002
// measured. The `getByRole("dialog", {name: "Choose a range"})` query is dropped
// (no dialog role; that an `aria-label` on the popover overrides the Label text
// is a hand check). The relation: with the caller's `flex items-start gap-4` on
// the popover, the trailing preset button sits strictly right of the range
// calendar.
test("T-007 should lay a custom horizontal popover out with the preset beside the calendar", async () => {
  const app = await openCase("layout");

  await app.press(TRIGGER);
  await app.waitFor(PRESET);
  // The overlay positions itself a frame after it mounts.
  await app.wait(50);

  const calendar = layoutOf(app, "calendar");
  const preset = layoutOf(app, "preset");

  expect(preset.x - rightOf(calendar)).toBeGreaterThan(0);
});
