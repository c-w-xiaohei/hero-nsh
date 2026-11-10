import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { changeCount } from "../../testers/date-field";

/*
 * DateField regression cases from HeroUI 3.2.7 (port sheet 4b, rows T-001,
 * T-002, T-007, T-008, T-009, T-010, T-011). Rows T-003 and T-004 are deleted by
 * the port sheet (BEM class only), and T-005, T-006 and T-012 need segment
 * focus, so they live in date-field.web.test.tsx.
 *
 * These cases read a callback back or target one part by `testID`, so they open
 * the NSH-only fixture at harness/date-field.fixtures.tsx (port sheet 4b.3).
 * The shared scenarios cover the stories and are not asserted here.
 *
 * `getAllByRole("spinbutton")` becomes `app.count("role:spinbutton")`, the
 * role + accessible-name queries become `role:spinbutton[/month/i]`, and the
 * `[data-slot=…]` / BEM assertions are dropped with the reason recorded above
 * each row (D18, SOP 3.2).
 */

type CaseParams = Record<string, string | number | boolean>;

function openCase(name: string, params: CaseParams = {}): Promise<App> {
  return open("../../../date-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/date-field/date-field.test.tsx:29
// T-001: three editable parts with the 2026-08-15 value. The name and the text
// are read together: upstream's `getByRole("spinbutton", {name})` plus
// `toHaveTextContent` is one fact per segment here.
test("T-001 should render segmented spinbuttons for month, day, and year", async () => {
  const app = await openCase("default");

  expect(app.count("role:spinbutton")).toBe(3);
  expect(app.shows("role:spinbutton[/month/i] >> text:8")).toBe(true);
  expect(app.shows("role:spinbutton[/day/i] >> text:15")).toBe(true);
  expect(app.shows("role:spinbutton[/year/i] >> text:2026")).toBe(true);
});

// heroui/packages/react/tests/components/date-field/date-field.test.tsx:40
// Partial port of T-002: the root BEM class and the two `[data-slot=…]`
// queries are dropped (D18: no BEM classes, no slots). The visible fact they
// carried — the three editable parts sit inside the group — is kept as the one
// scoped count.
test("T-002 should expose three segments inside the group", async () => {
  const app = await openCase("default");

  expect(app.count("id:df-group >> role:spinbutton")).toBe(3);
});

// heroui/packages/react/tests/components/date-field/date-field.test.tsx:112
// T-007: upstream rerenders the same field with a new `value`. NSH has no
// rerender in `nsh/test`, so two mounts cover the two values; both are away
// from the fixture's default (2026-08-15), so a root that ignored `value`
// fails.
test("T-007 should support controlled value", async () => {
  const first = await openCase("controlled", { year: 2026, month: 8, day: 15 });

  expect(first.shows("id:df-year >> text:2026")).toBe(true);

  const second = await openCase("controlled", { year: 2027, month: 1, day: 1 });

  expect(second.shows("id:df-year >> text:2027")).toBe(true);
  expect(second.shows("id:df-month >> text:1")).toBe(true);
});

// heroui/packages/react/tests/components/date-field/date-field.test.tsx:139
// Rewritten port of T-008: `data-required="true"` has no NSH channel (D18);
// the one visible effect of `isRequired` is the Label's asterisk. Label draws
// it as a nested Text and NSH merges nested text into the parent run, so the
// assertable run is "Date*". The error text assertion stays as upstream.
test("T-008 should mark the label when required and show the FieldError", async () => {
  const app = await openCase("required-invalid");

  expect(app.texts()).toContain("Date*");
  expect(app.shows("text:Please enter a valid date")).toBe(true);
});

// heroui/packages/react/tests/components/date-field/date-field.test.tsx:157
// Partial port of T-009: the `[data-slot="description"]` presence query is
// dropped (D18). The text the description reads is the user-visible half.
test("T-009 should expose the Description text", async () => {
  const app = await openCase("description");

  expect(app.shows("text:Enter a date")).toBe(true);
});

// heroui/packages/react/tests/components/date-field/date-field.test.tsx:172
// Rewritten port of T-010: a disabled view refuses `app.press` with
// ERR_NSH_TEST_DISABLED instead of silently ignoring the input, so the upstream
// "click and ArrowUp change nothing" becomes: every segment reports disabled,
// the press is refused, and no value went out. That is at least as strong as the
// single upstream assertion.
test("T-010 should support disabled state and block value changes", async () => {
  const app = await openCase("disabled");

  expect(app.enabled("id:df-month")).toBe(false);
  expect(app.enabled("id:df-day")).toBe(false);
  expect(app.enabled("id:df-year")).toBe(false);

  await expect(app.press("id:df-day")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(changeCount(app)).toBe(0);
});

// heroui/packages/react/tests/components/date-field/date-field.test.tsx:189
// Rewritten port of T-011: the two `[data-slot=…]` existence queries become the
// two affixes' content, scoped to the group. This is the same composition fact
// (Prefix and Suffix mounted inside the group) and it is user-visible, where the
// attribute was not.
test("T-011 should render the Prefix and Suffix inside the group", async () => {
  const app = await openCase("prefix-suffix");

  expect(app.shows("id:df-group >> text:prefix")).toBe(true);
  expect(app.shows("id:df-group >> text:suffix")).toBe(true);
});
