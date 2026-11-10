import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { removeButton, rows } from "../../testers/tag";

/*
 * HeroUI 3.2.7 regression cases for TagGroup, per port sheet 4b
 * (T-007 … T-014, T-016).
 *
 * T-007 is a partial port: the `data-slot` / BEM class assertions are D18
 * deletions and only the "two tags rendered" half stays. T-016 is partial for
 * the same reason: `tag--lg` / `tag--surface` are class names, so it keeps the
 * observable size effect (`text-sm` → 14pt). T-010, T-012, T-013 and T-014
 * replace `aria-selected` / `aria-disabled` / `data-slot` with the selection
 * and focus markers the fixture renders from the Tag render props and with
 * `app.enabled`, as the port sheet prescribes.
 *
 * T-015 starts with Tab and lives in tag-group.heroui.web.test.tsx (approved
 * Windows host gap, port sheet section 8).
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

// heroui/packages/react/tests/components/tag-group/tag-group.test.tsx:16
// Partial port (port sheet T-007): the root and list BEM classes plus
// `data-slot` are D18 deletions. The kept half is that both tags rendered.
test("T-007 renders two tags", async () => {
  const app = await openFixture("selection-log");

  expect(rows(app)).toBe(2);
});

// heroui/packages/react/tests/components/tag-group/tag-group.test.tsx:35
test("T-008 renders each Tag as a row within the grid", async () => {
  const app = await openFixture("selection-log");

  expect(app.shows("role:grid")).toBe(true);
  expect(rows(app)).toBe(2);
  expect(app.shows("role:row[News]")).toBe(true);
});

// heroui/packages/react/tests/components/tag-group/tag-group.test.tsx:50
test("T-009 supports composing with a Label", async () => {
  const app = await openFixture("label-description");

  expect(app.shows("role:grid[Amenities]")).toBe(true);
});

// heroui/packages/react/tests/components/tag-group/tag-group.test.tsx:63
// Rewritten port (port sheet T-010): `aria-selected` becomes the `✓` marker the
// Tag's `isSelected` render prop draws; the callback stays a Storage probe.
test("T-010 calls onSelectionChange when single selection is toggled", async () => {
  const app = await openFixture("selection-log");

  expect(app.count("text:✓")).toBe(0);

  await app.press("role:row[News]");

  expect(app.count("role:row[News] >> text:✓")).toBe(1);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["news"]);
});

// heroui/packages/react/tests/components/tag-group/tag-group.test.tsx:92
test("T-011 supports multiple selection", async () => {
  const app = await openFixture("multiple-log");

  await app.press("role:row[News]");
  await app.press("role:row[Travel]");

  const changes = callsOf(app, "selectionChange");
  const last = changes[changes.length - 1][0] as string[];

  expect([...last].sort()).toEqual(["news", "travel"]);
});

// heroui/packages/react/tests/components/tag-group/tag-group.test.tsx:119
// Rewritten port (port sheet T-012): `aria-disabled` becomes `app.enabled`.
test("T-012 exposes individually disabled tags", async () => {
  const app = await openFixture("disabled-individual");

  expect(app.enabled("role:row[News]")).toBe(false);
  expect(app.enabled("role:row[Travel]")).toBe(true);
});

// heroui/packages/react/tests/components/tag-group/tag-group.test.tsx:135
// Rewritten port (port sheet T-013): `aria-disabled` becomes `app.enabled`; the
// group's disabledKeys take the same path as a tag's own isDisabled.
test("T-013 supports disabledKeys on the group", async () => {
  const app = await openFixture("disabled-keys");

  expect(app.enabled("role:row[News]")).toBe(false);
});

// heroui/packages/react/tests/components/tag-group/tag-group.test.tsx:148
// Rewritten port (port sheet T-014): `data-slot="tag-remove-button"` becomes
// the button's accessible name, which the tag's textValue completes.
test("T-014 renders a default remove button and calls onRemove", async () => {
  const app = await openFixture("remove-single");

  expect(app.shows(removeButton("News"))).toBe(true);

  await app.press(removeButton("News"));

  const removed = callsOf(app, "remove");

  expect(removed).toHaveLength(1);
  expect(removed[0][0]).toEqual(["news"]);
});

// heroui/packages/react/tests/components/tag-group/tag-group.test.tsx:190
// Partial port (port sheet T-016): the two class assertions (`tag--lg`,
// `tag--surface`) are D18 deletions. The kept half is the visible size: `lg`
// carries `text-sm` (14pt), while md and sm carry `text-xs` (12pt). The
// `surface` variant only changes colors, which `nsh test` cannot query.
test("T-016 exposes the lg size through the tag text", async () => {
  const app = await openFixture("size-lg");

  expect(app.spanStyle("text:News").fontSize).toBe(14);
});
