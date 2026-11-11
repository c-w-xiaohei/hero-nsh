import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import * as autocomplete from "../../testers/autocomplete";

/*
 * HeroUI 3.2.7 browser regressions for Autocomplete, per port sheet 4b
 * (T-007 … T-011). These run on `--target web` only: they press keys on the
 * filter input, whose focus and the list's `aria-activedescendant` are the
 * upstream assertions. NSH 0.4.0's Win32 host gives keyboard focus only to an
 * Input and does not deliver keymap keys to a view (approved difference, port
 * sheet section 8), so none of them can run in a real Windows window.
 *
 * What nsh/test cannot see — animation names, `data-exiting`, computed
 * `paddingInlineEnd`, `scrollTop`, `aria-activedescendant`, `toHaveFocus` — is
 * replaced by the behavior it stands for; each test says which half it keeps.
 */

function openCase(name: string, options: Parameters<typeof openScenario>[1] = {}): Promise<App> {
  return openScenario(name, {
    platform: "web",
    clock: {},
    width: 1024,
    height: 768,
    ...options,
  });
}

/** Runs past the 100 ms exit hold. */
function settle(app: App): Promise<void> {
  return app.clock!.runFor(120);
}

// heroui/packages/react/tests/components/autocomplete/autocomplete.browser.test.tsx:72
// Partial port (port sheet T-007): the popover's presence after the press is
// kept; the `animationName` / animated-property assertions become the screenshot
// pair of the enter frames, which nsh/test cannot read.
test("T-007 opens with an opacity and transform only animation", async () => {
  const app = await openCase("autocomplete/default");

  expect(autocomplete.getListbox(app)).toBe(false);

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(autocomplete.getOptions(app)).toBe(3);
});

// heroui/packages/react/tests/components/autocomplete/autocomplete.browser.test.tsx:85
// Partial port (port sheet T-008): the exit hold is observable — the list is
// still on screen when Escape returns and gone once the clock passes 100 ms —
// which is the same presence `data-exiting` marks upstream. The animation name,
// `animationFillMode` and the opacity/transform property list are the exit-frame
// screenshots (out of this phase's acceptance, _common.md).
test("T-008 closes with an opacity and transform animation", async () => {
  const app = await openCase("autocomplete/default");

  await autocomplete.open(app, "Select an animal");

  await app.keyboard.press("escape");

  expect(autocomplete.getListbox(app)).toBe(true);

  await settle(app);

  expect(autocomplete.getListbox(app)).toBe(false);
});

// heroui/packages/react/tests/components/autocomplete/autocomplete.browser.test.tsx:109
// Partial port (port sheet T-009): upstream presses 11 pt off the remove glyph's
// centre, inside the 24pt hit target. `nsh test` presses the middle of a view and
// has no offset, so the off-centre half stays a manual check; the press itself
// must remove the tag once and leave the popover closed.
test("T-009 removes the tag on the first press landing off the glyph", async () => {
  const app = await openCase("autocomplete/multiple-tags");

  await app.press("label:Remove tag Dog");
  await settle(app);

  expect(app.shows("role:row[Dog]")).toBe(false);
  expect(app.shows("role:row[Cat]")).toBe(true);
  expect(app.shows("role:row[Panda]")).toBe(true);
  expect(autocomplete.getListbox(app)).toBe(false);
});

// heroui/packages/react/tests/components/autocomplete/autocomplete.browser.test.tsx:131
// Rewritten (port sheet T-010): `indicatorOverlapOf` measures
// `paddingInlineEnd` against the absolutely positioned indicator, which nsh/test
// cannot read. The visible effect — each option's label is on screen beside the
// indicator, not clipped under it — is what the three label assertions check;
// the exact overlap is a screenshot case.
test("T-010 reserves room for the indicator so it never sits on the label", async () => {
  const app = await openCase("autocomplete/multiple-open");

  await app.waitFor(autocomplete.LISTBOX);

  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);
});

// Port sheet section 1 (`disableAutoFocusFirst` is a public Filter prop, not an
// internal switch): with it set, opening leaves the list without a focused row,
// and the first ArrowDown focuses the first option.
test("X-001 keeps the first option unfocused with disableAutoFocusFirst", async () => {
  const app = await openCase("autocomplete/markers-no-autofocus.split");

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(autocomplete.isFocusedOption(app, "Cat")).toBe(false);

  await app.keyboard.press("arrowdown");

  expect(autocomplete.isFocusedOption(app, "Cat")).toBe(true);
});

// heroui/packages/react/tests/components/autocomplete/autocomplete.browser.test.tsx:139
// Partial port (port sheet T-011): the arrows drive the list with the filter
// input keeping the virtual focus, and Enter selects. `aria-activedescendant`,
// `scrollTop` and `toHaveFocus` have no query; the selection that comes out of
// the keyboard walk is the observable half. `max-h-24` keeps the list short, so
// the walk crosses the visible window.
test("T-011 supports keyboard scrolling and selection while keeping virtual focus on the input", async () => {
  const app = await openCase("autocomplete/scrolling");

  await autocomplete.open(app, "Select an animal");
  await app.press("label:Search animals");

  for (let index = 0; index < 15; index++) {
    await app.keyboard.press("arrowdown");
  }

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("option-15");
  expect(autocomplete.getListbox(app)).toBe(false);
  expect(autocomplete.triggerShows(app, "Animal 15")).toBe(true);
});
