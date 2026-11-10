import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { removeButton } from "../../testers/tag";

/*
 * HeroUI 3.2.7 regression cases for Tag and TagGroup, per port sheet 4b
 * (T-001, T-003 … T-006).
 *
 * The cases that only assert `data-slot` / BEM class strings are D18
 * deletions (T-002) and are not ported. The browser cases that hit a point
 * with `elementFromPoint` are partial ports: NSH has no coordinate hit test,
 * so their observable user result is kept and the geometry check is listed in
 * port sheet section 8. `data-testid` becomes a role + accessible name.
 *
 * The keyboard cases that start with Tab (T-015) live in the `.web.` files:
 * NSH 0.4.0's Win32 host gives keyboard focus only to an Input, an approved
 * difference (port sheet section 8).
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

type LayoutCall = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function layoutOf(app: App, name: string): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

// X-001: plain children must stay live, not be frozen at their first read.
// src/components/tag/tag-root.tsx:197-200 (TagContent) and
// src/components/tag/tag-children.tsx:11-33
test("X-001 keeps plain tag children live when a signal changes", async () => {
  const app = await openFixture("live-children");

  expect(app.shows("text:One")).toBe(true);

  await app.press("role:button[Update]");

  expect(app.shows("text:Updated")).toBe(true);
  expect(app.count("text:One")).toBe(0);
});

// heroui/packages/react/tests/components/tag/tag.test.tsx:23
test("T-001 renders with row role and accessible name", async () => {
  const app = await openScenario("tag/default");

  expect(app.shows("role:row[News]")).toBe(true);
});

// heroui/packages/react/tests/components/tag/tag.test.tsx:37
// Rewritten port (port sheet T-003): `data-testid` is not projected, so the
// custom button is identified by its visible `×` and the count of buttons named
// "Remove tag News". The default button must not be appended next to it.
test("T-003 supports a custom RemoveButton child instead of the default", async () => {
  const app = await openFixture("custom-remove");

  expect(app.shows("text:×")).toBe(true);
  expect(app.count("role:button[Remove tag News]")).toBe(1);

  await app.press("role:button[Remove tag News]");

  const removed = callsOf(app, "remove");

  expect(removed).toHaveLength(1);
  expect(removed[0][0]).toEqual(["news"]);
});

// heroui/packages/react/tests/components/tag/tag.browser.test.tsx:57
// Partial port (port sheet T-004): the four `elementFromPoint` offsets are
// dropped (no coordinate hit test). The kept result is that the remove button
// itself is pressable in every size and the press is not swallowed by the row;
// the 24pt area beyond the button centre rests on `hitSlop={6}` (R-023) and is
// listed in port sheet section 8.
test("T-004 exposes a pressable remove button on sm, md and lg", async () => {
  for (const size of ["sm", "md", "lg"] as const) {
    const app = await openFixture("remove-log", { params: { size } });

    await app.press(removeButton("Dog"));

    const removed = callsOf(app, "remove");

    expect(removed).toHaveLength(1);
    expect(removed[0][0]).toEqual(["dog"]);
  }
});

// heroui/packages/react/tests/components/tag/tag.browser.test.tsx:79
// Rewritten port (port sheet T-005): `getBoundingClientRect` becomes the root's
// onLayout box. The removable tag carries a 24×24 press area through `hitSlop`,
// which is not laid out, so its height must equal the plain tag's.
test("T-005 keeps the tag height unchanged", async () => {
  const app = await openFixture("heights");

  const removable = layoutOf(app, "removable");
  const plain = layoutOf(app, "plain");

  expect(removable.height).toBeGreaterThan(0);
  expect(removable.height).toBe(plain.height);
});

// heroui/packages/react/tests/components/tag/tag.browser.test.tsx:100
// Partial port (port sheet T-006): the two `elementFromPoint` hits are dropped.
// The kept result is that pressing the tag body selects it without running
// onRemove, and that a neighbouring tag is pressable as well (multiple
// selection so the first tag stays selected).
test("T-006 leaves the tag body and neighbouring tags pressable", async () => {
  const app = await openFixture("remove-log");

  await app.press("role:row[Dog]");

  expect(app.count("role:row[Dog] >> text:✓")).toBe(1);
  expect(callsOf(app, "remove")).toHaveLength(0);

  await app.press("role:row[Cat]");

  expect(app.count("role:row[Cat] >> text:✓")).toBe(1);
  expect(app.count("role:row[Dog] >> text:✓")).toBe(1);
  expect(callsOf(app, "remove")).toHaveLength(0);
});
