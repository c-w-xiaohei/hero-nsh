import { expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { lastSegment, rootRecord } from "../../testers/date-input-group";

/*
 * DateInputGroup regression cases (port sheet 4b).
 *
 * HeroUI 3.2.7 ships no test for this internal module: `packages/react/tests/
 * components/` has no `date-input-group` directory, the directory itself has
 * no `.test.tsx` / `.browser.test.tsx` / `.ssr.test.tsx` / `.stories.tsx`, and
 * `rg -l 'DateInputGroup|date-input-group' packages/react/tests` hits only the
 * DateField / TimeField / DatePicker / DateRangePicker consumer files whose
 * rows belong to those units' 4b (port sheet 4b.1 and 4b.2). The port sheet
 * therefore has zero `T-` rows and gives this unit its own `S-` cases; each one
 * below cites the fixture case (4b.3) and the rules / state rows it stands for.
 *
 * Nothing here is a HeroUI API scenario: the module is not exported from the
 * reference package's entry, and DateField / TimeField are later units, so the
 * only reachable app is `harness/date-input-group.fixtures.tsx` (NSH-only,
 * port sheet 4b.3). No shared scenario exists and scenarios/index.ts is not
 * touched.
 *
 * What this file can and cannot prove: `nsh/test` reads views, texts, roles,
 * accessibility names and Storage; it cannot read computed styles, so the
 * painted side of section 4 (opacity, ring, outline, the padding the affix
 * registrations drive) is checked by the rule list and, later, by the
 * DateField / TimeField screenshots. The cases here cover the parts, the
 * segment list and the render props this unit owns.
 */

function openCase(name: string, options: OpenOptions = {}): Promise<App> {
  return open("../../../date-input-group.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...options,
    host: { params: { case: name } },
  });
}

// port sheet 4b.3 `default`, rules R-018 / R-019, section 1.5
// One editable `spinbutton` per date part, in the locale's order, and the
// literal separators between them are drawn text. The literals are not
// editable (R-019), which is what keeps the Tab stops equal to the editable
// parts only.
test("S-001 should render a spinbutton per date part between literal separators", async () => {
  const app = await openCase("default");

  expect(app.count("role:spinbutton")).toBe(3);

  expect(app.shows("text:mm")).toBe(true);
  expect(app.shows("text:dd")).toBe(true);
  expect(app.shows("text:yyyy")).toBe(true);

  // `text:/` would read as an unterminated regex in the selector grammar, so
  // the separators are read from the visible texts instead.
  expect(app.texts().filter((text) => text === "/")).toHaveLength(2);

  expect(lastSegment(app, "literal").isEditable).toBe(false);
  expect(lastSegment(app, "month").isEditable).toBe(true);
});

// port sheet 4b.3 `prefix-suffix`, rules R-025 / R-026, section 1.3
// The affixes are plain strings in the caller's JSX. NSH draws no text for a
// bare string inside a View, so both assertions fail unless Prefix and Suffix
// wrap their children in Text; the scope proves they sit inside the group.
test("S-002 should render Prefix and Suffix string children as text in the group", async () => {
  const app = await openCase("prefix-suffix");

  expect(app.shows("label:date >> text:#")).toBe(true);
  expect(app.shows("label:date >> text:%")).toBe(true);
  expect(app.count("label:date >> role:spinbutton")).toBe(3);
});

// port sheet 4b.3 `variants`, rules R-027 / R-028 / R-033, sections 1.1 / 1.6
// Every variant is the same part tree; the class strings themselves are the
// gate's unknown-class check, and this case proves no part goes missing when
// `variant` or `fullWidth` changes. Each group is named by its aria-label,
// which section 1.2 maps to `accessibilityLabel`.
test("S-003 should mount every variant with its input and segments", async () => {
  const app = await openCase("variants");

  expect(app.shows("label:primary")).toBe(true);
  expect(app.shows("label:secondary")).toBe(true);
  expect(app.shows("label:full-width")).toBe(true);

  expect(app.count("label:primary >> role:spinbutton")).toBe(3);
  expect(app.count("label:secondary >> role:spinbutton")).toBe(3);
  expect(app.count("label:full-width >> role:spinbutton")).toBe(3);
});

// port sheet 4b.3 `disabled` / `invalid`, rules R-007 / R-008, sections 1.2 / 2
// `isDisabled` and `isInvalid` are Root props: they change the group's
// appearance and feed the two render props. `nsh/test` cannot read a class or a
// painted colour, so the recorded render props are the observable contract; the
// default case is the control that keeps the two probes from passing on a
// component that always reports `true`.
test("S-004 should report isDisabled and isInvalid through the Root render props", async () => {
  const disabled = await openCase("disabled");

  expect(rootRecord(disabled).isDisabled).toBe(true);

  const invalid = await openCase("invalid");

  expect(rootRecord(invalid).isInvalid).toBe(true);

  const plain = await openCase("default");

  expect(rootRecord(plain).isDisabled).toBe(false);
  expect(rootRecord(plain).isInvalid).toBe(false);
});
