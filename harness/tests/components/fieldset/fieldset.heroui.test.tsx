import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Fieldset, per port sheet 4b
 * (T-001, T-003, T-004). Upstream's fieldset directory has one test file, no
 * browser or SSR cases, and Kobalte has no fieldset component, so there is no
 * `.kobalte.` file.
 *
 * T-002 and T-005 are dropped by the port sheet: both only assert `data-slot`
 * and the BEM block class, which D18 does not project, and the four layout
 * declarations they stand for are covered by the `fieldset/composed`
 * screenshot. T-004's `data-disabled` attribute has no NSH channel either; the
 * case is rewritten to the effect that attribute carries, the disabled scope
 * reaching a descendant button through FieldsetContext (port sheet §5.2).
 * `accessibilityState.disabled` is the remaining substitute marker and is a
 * Windows screen-reader manual check, since `nsh/test` cannot read it.
 */

function openFixture(name: string) {
  return open("../../../fieldset.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/fieldset/fieldset.test.tsx:6
test("T-001 renders composed legend and fields", async () => {
  const app = await openScenario("fieldset/composed");

  expect(app.shows("text:Profile")).toBe(true);
  expect(app.shows("text:Name field")).toBe(true);
  expect(app.shows("role:button[Save]")).toBe(true);
});

// heroui/packages/react/tests/components/fieldset/fieldset.test.tsx:32
// Rewritten port (port sheet T-003): the upstream case asserts an arbitrary
// `data-foo` attribute. NSH has no data-* passthrough (D18); `testID` is the
// equivalent channel, so the fixture passes `testID="fieldset"` and the
// assertion reads it back. Dropped: the attribute name itself.
test("T-003 supports testID passthrough", async () => {
  const app = await openFixture("attributed");

  expect(app.shows("id:fieldset")).toBe(true);
});

// heroui/packages/react/tests/components/fieldset/fieldset.test.tsx:42
// Rewritten port (port sheet T-004): the upstream case reads `data-disabled`
// off the root. NSH has no attribute channel, so the case asserts the effect:
// a Button nested in `<Fieldset disabled>` is disabled, its press is refused,
// and its handler never runs. The Button side of this belongs to port sheet
// §5.2 (Button reads FieldsetContext), so this case is expected to fail until
// that one-line addition lands; it is the faithful translation either way.
test("T-004 disables the whole subtree from the root disabled state", async () => {
  const app = await openScenario("fieldset/disabled");

  expect(app.enabled("role:button[Save]")).toBe(false);
  await expect(app.press("role:button[Save]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "fieldset.save")).toHaveLength(0);
});

// Regression X-001: the root passed `props.children` raw into the provider's
// View, and NSH drops a string inside a View, so `<Fieldset>Content</Fieldset>`
// showed an empty screen. HeroUI takes `children: ReactNode`
// (heroui/packages/react/src/components/fieldset/fieldset.tsx:37) and its own
// cases pass a bare string child
// (heroui/packages/react/tests/components/fieldset/fieldset.test.tsx:25 and
// :34-36); port sheet tmp/port-sheets/fieldset.md:27 requires this unit's
// children wrapper to wrap bare strings/numbers. Bug site:
// src/components/fieldset/fieldset.tsx:128.
test("X-001 renders bare string, number and string-array root children", async () => {
  const app = await openFixture("children");

  expect(app.shows("text:Bare string")).toBe(true);
  expect(app.shows("text:42")).toBe(true);
  expect(app.shows("text:First")).toBe(true);
  expect(app.shows("text:Second")).toBe(true);
});
