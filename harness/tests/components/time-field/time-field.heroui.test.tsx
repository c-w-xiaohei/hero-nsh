import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { changeCount } from "../../testers/time-field";

/*
 * TimeField regression cases from HeroUI 3.2.7 (port sheet 4b, rows T-001,
 * T-002, T-006, T-007, T-008, T-009, T-010, T-012). Rows T-003 is deleted by the
 * port sheet (BEM class only) and T-004, T-005 and T-011 need segment focus, so
 * they live in time-field.web.test.tsx.
 *
 * These cases read a callback back or target one part by `testID`, so they open
 * the NSH-only fixture at harness/time-field.fixtures.tsx (port sheet 4b.3).
 * The shared scenarios cover the stories and are not asserted here.
 *
 * `getAllByRole("spinbutton")` becomes `app.count("role:spinbutton")`, the
 * role + accessible-name queries become `role:spinbutton[/hour/i]`, and the
 * `[data-slot=…]` / BEM assertions are dropped with the reason recorded above
 * each row (D18, SOP 3.2). The value payload is `Time`, whose own properties
 * survive the probe's JSON round trip (port sheet §5, value adapter).
 */

type CaseParams = Record<string, string | number | boolean>;

function openCase(name: string, params: CaseParams = {}): Promise<App> {
  return open("../../../time-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/time-field/time-field.test.tsx:29
// T-001: three editable parts with the 9:30 value. The name and the text are
// read together: upstream's `getByRole("spinbutton", {name})` plus
// `toHaveTextContent` is one fact per segment here.
test("T-001 should render segmented spinbuttons for hour, minute, and day period", async () => {
  const app = await openCase("default");

  expect(app.count("role:spinbutton")).toBe(3);
  expect(app.shows("role:spinbutton[/hour/i] >> text:9")).toBe(true);
  expect(app.shows("role:spinbutton[/minute/i] >> text:30")).toBe(true);
  expect(app.shows("role:spinbutton[/AM.PM/i] >> text:AM")).toBe(true);
});

// heroui/packages/react/tests/components/time-field/time-field.test.tsx:40
// Partial port of T-002: the BEM block class and the two `[data-slot=…]`
// queries are dropped (D18: no BEM classes, no slots). The visible fact they
// carried — the three editable parts sit inside the group — is kept as the one
// scoped count.
test("T-002 should expose three segments inside the group", async () => {
  const app = await openCase("default");

  expect(app.count("id:tf-group >> role:spinbutton")).toBe(3);
});

// heroui/packages/react/tests/components/time-field/time-field.test.tsx:99
// T-006: upstream rerenders the same field with a new `value`. Two mounts
// cover the initial controlled value; the presses on one of them stand in for
// that rerender: `tf-set-afternoon` / `tf-set-morning` write the fixture's
// parent signal, so the segments must follow. A root that read `props.value`
// once into a plain binding keeps showing 9:30 here and fails.
test("T-006 should support controlled value", async () => {
  const nine = await openCase("controlled", { hour: 9, minute: 30 });

  expect(nine.shows("id:tf-hour >> text:9")).toBe(true);
  expect(nine.shows("id:tf-minute >> text:30")).toBe(true);
  expect(nine.shows("id:tf-day-period >> text:AM")).toBe(true);

  await nine.press("id:tf-set-afternoon");

  expect(nine.shows("id:tf-hour >> text:2")).toBe(true);
  expect(nine.shows("id:tf-minute >> text:15")).toBe(true);
  expect(nine.shows("id:tf-day-period >> text:PM")).toBe(true);

  // A second write to a third value separates "follows the parent" from "took
  // the first update and stopped": both values are away from the mount value.
  await nine.press("id:tf-set-morning");

  expect(nine.shows("id:tf-hour >> text:7")).toBe(true);
  expect(nine.shows("id:tf-minute >> text:05")).toBe(true);
  expect(nine.shows("id:tf-day-period >> text:AM")).toBe(true);

  const afternoon = await openCase("controlled", { hour: 14, minute: 15 });

  expect(afternoon.shows("id:tf-hour >> text:2")).toBe(true);
  expect(afternoon.shows("id:tf-minute >> text:15")).toBe(true);
  expect(afternoon.shows("id:tf-day-period >> text:PM")).toBe(true);
});

// heroui/packages/react/tests/components/time-field/time-field.test.tsx:127
// Rewritten port of T-007: `data-required="true"` has no NSH channel (D18);
// the one visible effect of `isRequired` is the Label's asterisk. Label draws
// it as a nested Text and NSH merges nested text into the parent run, so the
// assertable run is "Time*". The error text assertion stays as upstream.
test("T-007 should mark the label when required and show the FieldError", async () => {
  const app = await openCase("required-invalid");

  expect(app.texts()).toContain("Time*");
  expect(app.shows("text:Please enter a valid time")).toBe(true);
});

// heroui/packages/react/tests/components/time-field/time-field.test.tsx:145
// Partial port of T-008: the `[data-slot="description"]` presence query is
// dropped (D18). The text the description reads is the user-visible half.
test("T-008 should expose the Description text", async () => {
  const app = await openCase("description");

  expect(app.shows("text:Enter a time")).toBe(true);
});

// heroui/packages/react/tests/components/time-field/time-field.test.tsx:160
// Rewritten port of T-009: a disabled view refuses `app.press` with
// ERR_NSH_TEST_DISABLED instead of silently ignoring the input, so the upstream
// "click and ArrowUp change nothing" becomes: every segment reports disabled,
// the press is refused, and no value went out. That is at least as strong as the
// single upstream assertion.
test("T-009 should support disabled state and block value changes", async () => {
  const app = await openCase("disabled");

  expect(app.enabled("id:tf-hour")).toBe(false);
  expect(app.enabled("id:tf-minute")).toBe(false);
  expect(app.enabled("id:tf-day-period")).toBe(false);

  await expect(app.press("id:tf-minute")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(changeCount(app)).toBe(0);
});

// heroui/packages/react/tests/components/time-field/time-field.test.tsx:173
// Rewritten port of T-010: the two `[data-slot=…]` existence queries become the
// two affixes' content, scoped to the group. This is the same composition fact
// (Prefix and Suffix mounted inside the group) and it is user-visible, where the
// attribute was not.
test("T-010 should render the Prefix and Suffix inside the group", async () => {
  const app = await openCase("prefix-suffix");

  expect(app.shows("id:tf-group >> text:prefix")).toBe(true);
  expect(app.shows("id:tf-group >> text:suffix")).toBe(true);
});

// heroui/packages/react/tests/components/time-field/time-field.test.tsx:206
// T-012: the function form of `children` receives the field state (D17: an
// accessor object). The fixture renders "Required" from `isRequired()` next to
// the group, and the hour segment proves the group still mounted inside the
// render function.
test("T-012 should support children as a render function receiving field state", async () => {
  const app = await openCase("render-children");

  expect(app.shows("id:tf-hour")).toBe(true);
  expect(app.shows("text:Required")).toBe(true);
});
