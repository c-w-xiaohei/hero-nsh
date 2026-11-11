import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import { createTableTester } from "../../testers/table";

/*
 * HeroUI 3.2.7 regression cases for Table, per port sheet 4b (T-001 … T-006).
 * Each case keeps its upstream file:line above it and its title starts with
 * the port-sheet id. The assertions follow SOP 3.2: what NSH cannot read
 * (`data-slot`, BEM classes, `data-indeterminate`, SVG stroke offsets, DOM
 * identity) is replaced by the observable effect, never dropped silently; the
 * partial ports say in a comment what stays unread.
 *
 * T-007 and T-008 move the keyboard focus between cells, which the web target
 * does and a real Windows window does not ("Real hosts" in the loop brief), so
 * they live in table.keyboard.web.test.tsx.
 */

const teamRows = ["Kate", "John", "Sara"];

function focusLog(app: App): string[] {
  return callsOf(app, "focus").map((args) => String(args[0]));
}

function lastFocus(app: App): string | undefined {
  return focusLog(app).at(-1);
}

async function expectLetterKeystroke(
  scenario: string,
  focusName: "input" | "textarea",
): Promise<void> {
  const editable = "label:Alpha value";
  const app = await openScenario(scenario);
  await app.clock?.runFor(20);

  await app.press(editable);
  await app.clock?.runFor(20);
  expect(lastFocus(app)).toBe(focusName);

  await app.type(editable, "y");
  await app.clock?.runFor(20);
  expect(lastFocus(app)).toBe(focusName);
  expect(app.value(editable)).toBe("y");
}

// heroui/packages/react/tests/components/table/table.test.tsx:174
test("T-001 should expose shell slots and grid role", async () => {
  const app = await openScenario("table/team");
  await app.clock?.runFor(20);

  // Upstream's `getByRole("grid", {name: "Team"})`; the eight `data-slot`
  // checks are not transplantable (D18).
  expect(app.shows("role:grid[Team]")).toBe(true);

  expect(app.texts()).toContain("Member");
  expect(app.texts()).toContain("Role");
  for (const name of teamRows) {
    expect(app.texts()).toContain(name);
  }
  // The header row is a `role="row"` too: one header + three data rows.
  expect(app.count("role:row")).toBe(4);
  expect(app.count("role:cell")).toBe(9);
  expect(app.texts()).toContain("CEO");
  expect(app.texts()).toContain("CTO");
  expect(app.texts()).toContain("CMO");
});

// heroui/packages/react/tests/components/table/table.test.tsx:188
test("T-002 should toggle row selection via the Table tester", async () => {
  const app = await openScenario("table/team");
  await app.clock?.runFor(20);

  const tester = createTableTester(app);
  await tester.toggleRowSelection({ row: "John" });
  await app.clock?.runFor(20);

  const selection = callsOf(app, "selection");
  expect(selection.length).toBe(1);
  expect(selection[0]).toEqual([["2"]]);
});

// heroui/packages/react/tests/components/table/table.test.tsx:207
test("T-003 should move selection through indeterminate and select-all", async () => {
  const app = await openScenario("table/team");
  await app.clock?.runFor(20);

  /*
   * Partial port: upstream's ten assertions read `data-indeterminate`,
   * `data-selected`, the indicator elements' identities and the checkmark's
   * `stroke-dashoffset` (44 / 66). `nsh/test` sees neither aria state nor
   * vector strokes, so the observable contract is the selection transition
   * itself.
   */
  await app.press("role:checkbox[Select Kate]");
  await app.clock?.runFor(20);
  expect(callsOf(app, "selection").at(-1)).toEqual([["1"]]);

  await app.press("role:checkbox[Select all]");
  await app.clock?.runFor(20);
  expect(callsOf(app, "selection").at(-1)).toEqual(["all"]);

  for (const name of teamRows) {
    await app.press(`role:checkbox[Select ${name}]`);
    await app.clock?.runFor(20);
  }

  const selection = callsOf(app, "selection");
  expect(selection.at(-1)).toEqual([[]]);
  expect(selection.length).toBe(5);
});

// heroui/packages/react/tests/components/table/table.test.tsx:250
test("T-004 should toggle sort via the Table tester", async () => {
  const app = await openScenario("table/team-sorted");
  await app.clock?.runFor(20);

  // Upstream's `[data-slot="table-sortable-column-header"]` check becomes the
  // column label itself.
  expect(app.shows("text:Member")).toBe(true);

  const tester = createTableTester(app);
  await tester.toggleSort({ column: "Member" });
  await app.clock?.runFor(20);

  const sort = callsOf(app, "sort");
  expect(sort.length).toBe(1);
  expect(sort[0]?.[0]).toEqual({ column: "name", direction: "descending" });
});

// heroui/packages/react/tests/components/table/table.test.tsx:272
test("T-005 should match letter keystrokes in a nested input", async () => {
  /*
   * Partial port: upstream's `it.each` covers input, textarea and a native
   * `select`. The first two are kept, one case each; the select branch is
   * dropped because NSH has no native `<select>` and a pointer press does not
   * focus a View on the host, so its two `toHaveFocus` assertions cannot be
   * reproduced.
   */
  await expectLetterKeystroke("table/typeahead-input", "input");
});

// heroui/packages/react/tests/components/table/table.test.tsx:272
test("T-005 should match letter keystrokes in a nested textarea", async () => {
  await expectLetterKeystroke("table/typeahead-textarea", "textarea");
});

// heroui/packages/react/tests/components/table/table.test.tsx:290
test("T-006 should match letter keystrokes in a nested editable target", async () => {
  /*
   * Partial port: NSH has no `contenteditable` element and no DOM-level
   * `keyDown`; the nested editable target is honoured with an `Input`, which
   * is the editable target the host does have.
   */
  const app = await openScenario("table/typeahead-input");
  await app.clock?.runFor(20);

  const editable = "label:Alpha value";

  await app.press(editable);
  await app.clock?.runFor(20);
  expect(lastFocus(app)).toBe("input");

  await app.keyboard.press("y");
  await app.clock?.runFor(20);

  expect(app.value(editable)).toBe("y");
  expect(lastFocus(app)).toBe("input");
});
