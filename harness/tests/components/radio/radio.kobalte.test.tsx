import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { getRadios, getSelectedRadio, triggerRadio } from "../../testers/radio";

/*
 * Kobalte 0.13.14 radio-group cases, rewritten against HeroUI's API per port
 * sheet 4b (T-013 … T-066). Kobalte's ItemInput / ItemControl / ItemLabel /
 * ItemDescription / ItemIndicator / Root / ErrorMessage have no HeroUI
 * counterpart: ItemControl is Radio.Control, ItemLabel and the bare text are
 * Radio.Content's text, ItemDescription is the Description beside the Content,
 * and the ItemInput id / aria / name assertions have no NSH channel. The sheet
 * deletes T-018, T-020, T-021, T-023, T-026, T-027, T-030 … T-033, T-041,
 * T-049 … T-051, T-053 … T-057, T-059 and T-060 for that reason, so they have
 * no test here.
 *
 * Each item renders a "<name>:selected" / "<name>:unselected" marker
 * (harness/radio.fixtures.tsx): aria-checked and input.checked have no NSH
 * query, and the marker is the selected state a test can read.
 */

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
) {
  return open("../../../radio.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

type LayoutCall = { value: string; x: number; y: number; width: number; height: number };

function lastLayout(app: App, value: string): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.value === value);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${value}`);

  return found;
}

/* -------------------------------------------------------------------------------------------------
 * Selection and focus
 * -----------------------------------------------------------------------------------------------*/

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:18
// Partial port (port sheet T-013): name / value / input.checked stay unread.
test("T-013 handles defaults", async () => {
  const app = await openCase("pets");

  expect(app.shows("role:radiogroup[Favorite Pet]")).toBe(true);
  expect(getRadios(app)).toBe(3);
  expect(app.shows("text:Dogs:unselected")).toBe(true);
  expect(app.shows("text:Cats:unselected")).toBe(true);
  expect(app.shows("text:Dragons:unselected")).toBe(true);

  await app.press("role:radio[Dragons]");

  expect(callsOf(app, "onChange")).toEqual([["dragons"]]);
  expect(app.shows("text:Dragons:selected")).toBe(true);
  expect(app.shows("text:Dogs:unselected") && app.shows("text:Cats:unselected")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:76
// Partial port (port sheet T-014): input.checked / value stay unread.
test("T-014 can have a default value", async () => {
  const app = await openCase("pets", { default: "cats" });

  expect(getRadios(app)).toBe(3);
  expect(app.shows("text:Cats:selected")).toBe(true);
  expect(callsOf(app, "onChange")).toHaveLength(0);

  await app.press("role:radio[Dragons]");

  expect(callsOf(app, "onChange")).toEqual([["dragons"]]);
  expect(app.shows("text:Dragons:selected")).toBe(true);
  expect(app.shows("text:Cats:unselected")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:126
// Partial port (port sheet T-015): input.checked stays unread.
test("T-015 value can be controlled", async () => {
  const app = await openCase("controlled");

  expect(getRadios(app)).toBe(3);
  expect(app.shows("text:Cats:selected")).toBe(true);

  await app.press("role:radio[Dragons]");

  expect(callsOf(app, "onChange")).toEqual([["dragons"]]);
  // The controlled parent did not write back: Cats stays selected.
  expect(app.shows("text:Cats:selected")).toBe(true);
  expect(app.shows("text:Dragons:unselected")).toBe(true);

  await app.press("id:force");
  expect(app.shows("text:Dogs:selected")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:172
// Partial port (port sheet T-016): the input's name / value / checked stay
// unread; the Control's press is the case.
test("T-016 can select value by clicking on the item control", async () => {
  const app = await openCase("pets", { controlTestID: "dragons-control" });

  expect(getRadios(app)).toBe(3);
  expect(app.shows("text:Dogs:unselected") && app.shows("text:Cats:unselected")).toBe(true);
  expect(callsOf(app, "onChange")).toHaveLength(0);

  await app.press("id:dragons-control");

  expect(callsOf(app, "onChange")).toEqual([["dragons"]]);
  expect(app.shows("text:Dragons:selected")).toBe(true);
});

/* -------------------------------------------------------------------------------------------------
 * Names, description and error message
 * -----------------------------------------------------------------------------------------------*/

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:304
// Partial port (port sheet T-019): aria-labelledby, HTMLSpanElement and the
// absent `for` stay unread.
test("T-019 supports visible label", async () => {
  const app = await openCase("pets");

  expect(app.shows("role:radiogroup[Favorite Pet]")).toBe(true);
  expect(app.shows("text:Favorite Pet")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:394
test("T-022 supports 'aria-label'", async () => {
  const app = await openCase("pets", { label: "", ariaLabel: "My Favorite Pet" });

  expect(app.shows("role:radiogroup[My Favorite Pet]")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:455
// Partial port (port sheet T-024): description.id, aria-describedby and the id
// uniqueness check stay unread.
test("T-024 supports visible description", async () => {
  const app = await openCase("pets", { description: "Description" });

  expect(app.shows("text:Description")).toBe(true);
  expect(app.count("text:Description")).toBe(1);
  expect(app.shows("role:radiogroup[Favorite Pet]")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:491
// Partial port (port sheet T-025): itemDescription.id and aria-describedby stay
// unread.
test("T-025 supports visible description on single radio", async () => {
  const app = await openCase("item-description");

  expect(app.shows("text:Description")).toBe(true);
  expect(app.count("text:Description")).toBe(1);
  expect(app.shows("role:radio[Dogs]")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:577
// Partial port (port sheet T-028): errorMessage.id, aria-describedby and the id
// uniqueness check stay unread.
test("T-028 supports visible error message when invalid", async () => {
  const app = await openCase("pets", { invalid: true, error: "ErrorMessage" });

  expect(app.shows("text:ErrorMessage")).toBe(true);
  expect(app.count("text:ErrorMessage")).toBe(1);
  expect(app.shows("role:radiogroup[Favorite Pet]")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:613
test("T-029 should not be described by error message when not invalid", async () => {
  const app = await openCase("pets", { error: "ErrorMessage" });

  expect(app.shows("text:ErrorMessage")).toBe(false);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:745
// Rewritten port (port sheet T-034): data-invalid has no channel; its visible
// result is the error message.
test("T-034 should have 'data-invalid' attribute when invalid", async () => {
  const app = await openCase("pets", { invalid: true, error: "ErrorMessage" });

  expect(app.shows("text:ErrorMessage")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:759
// Rewritten port (port sheet T-035): data-required has no channel; the visible
// result is the asterisk the group Label paints when required.
test("T-035 should have 'data-required' attribute when required", async () => {
  const app = await openCase("pets", { required: true });

  expect(app.texts().some((text) => text.endsWith("*"))).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:773
// Rewritten port (port sheet T-036): data-disabled has no channel; the read is
// the radio's enabled state.
test("T-036 should have 'data-disabled' attribute when disabled", async () => {
  const app = await openCase("pets", { disabled: true });

  expect(app.enabled("role:radio[Dogs]")).toBe(false);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:787
// Rewritten port (port sheet T-037): data-readonly has no channel; the read is
// the read-only behaviour.
test("T-037 should have 'data-readonly' attribute when readonly", async () => {
  const app = await openCase("pets", { readonly: true });

  await app.press("role:radio[Dragons]");

  expect(app.shows("text:Dragons:unselected")).toBe(true);
});

/* -------------------------------------------------------------------------------------------------
 * Orientation
 * -----------------------------------------------------------------------------------------------*/

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:801
// Rewritten port (port sheet T-038): aria-orientation has no channel; the read
// is the layout it describes.
test("T-038 sets 'aria-orientation' by default", async () => {
  const app = await openCase("layout");

  const first = lastLayout(app, "a");
  const second = lastLayout(app, "b");

  expect(second.y).toBeGreaterThan(first.y + first.height);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:830
// Rewritten port (port sheet T-039): the horizontal layout side by side.
test("T-039 sets 'aria-orientation' based on the 'orientation' prop", async () => {
  const app = await openCase("layout", { orientation: "horizontal" });

  const first = lastLayout(app, "a");
  const second = lastLayout(app, "b");

  expect(second.x).toBeGreaterThanOrEqual(first.x + first.width);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:859
// Rewritten port (port sheet T-040): aria-invalid has no channel; its visible
// result is the error message.
test("T-040 sets 'aria-invalid' when 'validationState=invalid'", async () => {
  const app = await openCase("pets", { invalid: true, error: "ErrorMessage" });

  expect(app.shows("text:ErrorMessage")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:918
// Partial port (port sheet T-042): the group's aria-required and the inputs'
// absence of it stay unread; the asterisk is the visible half.
test("T-042 sets 'aria-required' when 'isRequired' is true", async () => {
  const app = await openCase("pets", { required: true });

  expect(app.texts().some((text) => text.endsWith("*"))).toBe(true);
});

/* -------------------------------------------------------------------------------------------------
 * Disabled and read-only
 * -----------------------------------------------------------------------------------------------*/

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:953
// Partial port (port sheet T-043): the group's aria-disabled stays unread.
test("T-043 sets 'aria-disabled' and makes radios disabled when 'isDisabled' is true", async () => {
  const app = await openCase("pets", { default: "cats", disabled: true });

  expect(app.enabled("role:radio[Dogs]")).toBe(false);
  expect(app.enabled("role:radio[Cats]")).toBe(false);
  expect(app.enabled("role:radio[Dragons]")).toBe(false);

  await expect(app.press("role:radio[Dragons]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.shows("text:Cats:selected")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:998
// Partial port (port sheet T-044): the input's checked / disabled stay unread.
test("T-044 can have a single disabled radio", async () => {
  const app = await openCase("pets", { disabledValue: "cats" });

  expect(app.enabled("role:radio[Dogs]")).toBe(true);
  expect(app.enabled("role:radio[Cats]")).toBe(false);
  expect(app.enabled("role:radio[Dragons]")).toBe(true);

  await expect(app.press("role:radio[Cats]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.shows("text:Cats:unselected")).toBe(true);

  await app.press("role:radio[Dogs]");

  expect(callsOf(app, "onChange")).toEqual([["dogs"]]);
  expect(app.shows("text:Dogs:selected")).toBe(true);
  expect(app.shows("text:Cats:unselected") && app.shows("text:Dragons:unselected")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:1053
// Rewritten port (port sheet T-045): the group's aria attributes stay unread.
test("T-045 doesn't set 'aria-disabled' or make radios disabled by default", async () => {
  const app = await openCase("pets");

  expect(app.enabled("role:radio[Dogs]")).toBe(true);
  expect(app.enabled("role:radio[Cats]")).toBe(true);
  expect(app.enabled("role:radio[Dragons]")).toBe(true);

  await app.press("role:radio[Dogs]");
  expect(app.shows("text:Dogs:selected")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:1088
// Rewritten port (port sheet T-046): isDisabled={false} changes nothing.
test("T-046 doesn't set 'aria-disabled' or make radios disabled when 'isDisabled' is false", async () => {
  const app = await openCase("pets", { disabled: false });

  expect(app.enabled("role:radio[Dogs]")).toBe(true);
  expect(app.enabled("role:radio[Cats]")).toBe(true);
  expect(app.enabled("role:radio[Dragons]")).toBe(true);

  await app.press("role:radio[Dogs]");
  expect(app.shows("text:Dogs:selected")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:1123
// Partial port (port sheet T-047): aria-readonly stays unread.
test("T-047 sets 'aria-readonly=true' on radio group", async () => {
  const app = await openCase("pets", { default: "cats", readonly: true });

  await app.press("role:radio[Dragons]");

  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.shows("text:Cats:selected")).toBe(true);
  expect(app.enabled("role:radio[Dragons]")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:1164
test("T-048 should not update state for readonly radio group", async () => {
  const app = await openCase("pets", { readonly: true });

  await app.press("role:radio[Dragons]");

  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.shows("text:Dragons:unselected")).toBe(true);
});

/* -------------------------------------------------------------------------------------------------
 * Item name and indicator
 * -----------------------------------------------------------------------------------------------*/

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:1280
test("T-052 supports 'aria-label'", async () => {
  const app = await openCase("without-content-label");

  expect(app.shows("role:radio[Label]")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:1392
// Partial port (port sheet T-058): input.checked and the indicator node's
// presence stay unread, because the HeroUI Indicator is always mounted; the
// case keeps the initial state and the pressed one.
test("T-058 should display indicator when 'selected'", async () => {
  const app = await openCase("indicator");

  expect(app.shows("text:mark")).toBe(false);
  expect(app.shows("text:Cats:unselected")).toBe(true);

  await app.press("role:radio[Cats]");

  expect(app.shows("text:mark")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([["cats"]]);
});

/* -------------------------------------------------------------------------------------------------
 * State attributes rewritten to their visible result
 * -----------------------------------------------------------------------------------------------*/

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:1455
// Rewritten port (port sheet T-061): data-invalid on the radios has no channel.
test("T-061 should have 'data-invalid' attribute on radios when radio group is invalid", async () => {
  const app = await openCase("pets", { invalid: true, error: "ErrorMessage" });

  expect(app.shows("text:ErrorMessage")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:1477
// Rewritten port (port sheet T-062): data-required on the radios has no channel.
test("T-062 should have 'data-required' attribute on radios when radio group is required", async () => {
  const app = await openCase("pets", { required: true });

  expect(app.texts().some((text) => text.endsWith("*"))).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:1499
// Rewritten port (port sheet T-063): data-readonly on the radios has no channel.
test("T-063 should have 'data-readonly' attribute on radios when radio group is readonly", async () => {
  const app = await openCase("pets", { default: "cats", readonly: true });

  await app.press("role:radio[Dragons]");

  expect(app.shows("text:Cats:selected")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:1521
// Rewritten port (port sheet T-064): data-disabled on the radios has no channel.
test("T-064 should have 'data-disabled' attribute on radios when radio group is disabled", async () => {
  const app = await openCase("pets", { disabled: true });

  expect(app.enabled("role:radio[Cats]")).toBe(false);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:1543
// Rewritten port (port sheet T-065): data-disabled on a single radio has no
// channel; the read is that radio's enabled state next to a usable one.
test("T-065 should have 'data-disabled' attribute on single disabled radio", async () => {
  const app = await openCase("pets", { disabledValue: "cats" });

  expect(app.enabled("role:radio[Cats]")).toBe(false);
  expect(app.enabled("role:radio[Dogs]")).toBe(true);
});

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:1565
// Rewritten port (port sheet T-066): data-checked has no channel; the selected
// marker is its visible result.
test("T-066 should have 'data-checked' attribute on checked radio", async () => {
  const app = await openCase("pets", { default: "cats" });

  expect(app.shows("text:Cats:selected")).toBe(true);
});
