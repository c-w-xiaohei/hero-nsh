import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 regression cases for TagGroup that need Tab to move the
 * keyboard focus, per port sheet 4b (T-018, T-019, T-023, T-025, T-027, T-034,
 * T-035).
 *
 * Why this file is `.web.`: every case starts with Tab on the grid, which owns
 * the only Tab stop. NSH 0.4.0's Win32 host gives keyboard focus only to an
 * Input — Tab walks text fields, `ref.focus()` on a view is a no-op and Return /
 * Space do not activate a focused view (crates/nsh-platform-windows/src/input.rs:997-1053,
 * mount.rs:440; crates/nsh-core/src/props.rs:365). Approved difference "Windows
 * keyboard focus and activation (NSH 0.4.0 host gap)", port sheet section 8.
 * macOS and the web both move focus with Tab, so nothing is hidden where it
 * could work.
 *
 * Focus is virtual: the list holds the real focus and `focusedKey` names the
 * row, so the `▶` marker stands in for `document.activeElement`. Up/down case
 * T-018 is rewritten to left/right because the TagGroup is one horizontal grid
 * row (RAC's ListKeyboardDelegate with orientation horizontal); up/down do not
 * move the focus there. Wrapping is built in (RAC writes shouldFocusWrap: true),
 * so T-019 needs no prop.
 */

function openFixture(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../tag.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

// kobalte/packages/core/src/listbox/listbox.test.tsx:62
// Rewritten port (port sheet T-018): up/down become right/left; focus is read
// through the `▶` marker; the marker count proves only one row is focused.
test("T-018 changes the focused tag with the left and right arrow keys", async () => {
  const app = await openFixture("typeahead", { platform: "web" });

  await app.keyboard.press("tab");

  expect(app.count(`role:row[One] >> text:▶`)).toBe(1);
  expect(app.count("text:▶")).toBe(1);

  await app.keyboard.press("arrowright");

  expect(app.count(`role:row[Two] >> text:▶`)).toBe(1);
  expect(app.count("text:▶")).toBe(1);

  await app.keyboard.press("arrowleft");

  expect(app.count(`role:row[One] >> text:▶`)).toBe(1);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:91
// Rewritten port (port sheet T-019): wrapping is built into the TagGroup, so
// the first row's left arrow lands on the last row and the last row's right
// arrow returns to the first.
test("T-019 wraps focus from the first to the last tag and back", async () => {
  const app = await openFixture("typeahead", { platform: "web" });

  await app.keyboard.press("tab");

  expect(app.count(`role:row[One] >> text:▶`)).toBe(1);

  await app.keyboard.press("arrowleft");

  expect(app.count(`role:row[Three] >> text:▶`)).toBe(1);
  expect(app.count("text:▶")).toBe(1);

  await app.keyboard.press("arrowright");

  expect(app.count(`role:row[One] >> text:▶`)).toBe(1);
  expect(app.count("text:▶")).toBe(1);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:233
// Partial port (port sheet T-023): `tabindex="0"` is dropped (the list is the
// only Tab stop). Kept: Tab-in focuses the selected row and it shows selected,
// with no selection callback.
test("T-023 supports an uncontrolled default selection", async () => {
  const app = await openFixture("default-selection", { platform: "web" });

  await app.keyboard.press("tab");

  expect(app.count(`role:row[Two] >> text:▶`)).toBe(1);
  expect(app.count("role:row[Two] >> text:✓")).toBe(1);
  expect(callsOf(app, "selectionChange")).toHaveLength(0);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:300
// Rewritten port (port sheet T-025): Space on the focused row is the native
// press the component routes by modality, so the row under the `▶` marker is
// the one selected.
test("T-025 supports using the space key to change the tag selection", async () => {
  const app = await openFixture("typeahead", { platform: "web" });

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowright");
  await app.keyboard.press("arrowright");

  expect(app.count(`role:row[Three] >> text:▶`)).toBe(1);
  expect(app.count("text:✓")).toBe(0);

  await app.keyboard.press("space");

  expect(app.count("role:row[Three] >> text:✓")).toBe(1);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toContain("3");
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:375
// Rewritten port (port sheet T-027): the disabled row is not enabled, its press
// is refused, focus starts on the first row and the right arrow skips it.
test("T-027 supports disabled tags with the keyboard", async () => {
  const app = await openFixture("typeahead-disabled", { platform: "web" });

  expect(app.enabled("role:row[Two]")).toBe(false);

  await expect(app.press("role:row[Two]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  expect(callsOf(app, "selectionChange")).toHaveLength(0);

  await app.keyboard.press("tab");

  expect(app.count(`role:row[One] >> text:▶`)).toBe(1);

  await app.keyboard.press("arrowright");

  expect(app.count(`role:row[Three] >> text:▶`)).toBe(1);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:733
// Rewritten port (port sheet T-034): type-ahead moves the focus; `t` reaches
// Two and `o` reaches One.
test("T-034 supports type to select", async () => {
  const app = await openFixture("typeahead", { platform: "web" });

  await app.keyboard.press("tab");

  expect(app.count(`role:row[One] >> text:▶`)).toBe(1);

  await app.keyboard.press("t");

  expect(app.count(`role:row[Two] >> text:▶`)).toBe(1);

  await app.keyboard.press("o");

  expect(app.count(`role:row[One] >> text:▶`)).toBe(1);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:764
// Rewritten port (port sheet T-035): the prefix lives 500 ms; after 600 ms the
// second `o` starts a new search and still lands on One.
test("T-035 resets the search text after a timeout", async () => {
  const app = await openFixture("typeahead", { platform: "web", clock: {} });

  await app.keyboard.press("tab");
  await app.keyboard.press("o");

  expect(app.count(`role:row[One] >> text:▶`)).toBe(1);

  await app.clock?.runFor(600);

  await app.keyboard.press("o");

  expect(app.count(`role:row[One] >> text:▶`)).toBe(1);
});
