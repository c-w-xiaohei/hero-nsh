import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Breadcrumbs, per port sheet 4b (T-001 …
 * T-008). Every surviving case keeps its upstream file:line and its title.
 *
 * NSH has no DOM attributes: no `data-slot`, no BEM classes (D18), no
 * `aria-current` / `aria-disabled` query, and no `href`. Each case therefore
 * asserts what a user observes instead — the labelled list role, the number of
 * links, the URL the app opens, the current item being unusable and coloured as
 * the link colour, the separator count, `enabled()` and a refused press.
 */

// heroui/packages/react/tests/components/breadcrumbs/breadcrumbs.test.tsx:27
test("T-001 exposes a labelled list role", async () => {
  const app = await openScenario("breadcrumbs/basic");

  expect(app.shows("role:list[Breadcrumbs]")).toBe(true);
  // One link per item stands in for the three `role="listitem"` nodes, which
  // NSH's role table does not have.
  expect(app.count("role:link")).toBe(3);
});

// heroui/packages/react/tests/components/breadcrumbs/breadcrumbs.test.tsx:38
test("T-002 renders each item as a link", async () => {
  const app = await openScenario("breadcrumbs/links");

  expect(app.count("role:link")).toBe(3);

  // `href` is not readable in NSH; the observable contract is the URL the app
  // opens, which only absolute URLs produce (Link §8). One assertion per
  // upstream href assertion, so each link is checked on its own press.
  await app.press("role:link[Home]");
  expect(app.openedUrls()).toEqual(["https://heroui.com/docs"]);

  await app.press("role:link[Products]");
  expect(app.openedUrls()).toEqual([
    "https://heroui.com/docs",
    "https://heroui.com/components",
  ]);
});

// heroui/packages/react/tests/components/breadcrumbs/breadcrumbs.test.tsx:46
test("T-003 exposes current page on the last item without separator", async () => {
  const app = await openScenario("breadcrumbs/basic");

  // data-current / aria-current are not queryable; the current item is the
  // item that cannot be activated and is painted with the link colour.
  expect(app.enabled("role:link[Laptop]")).toBe(false);
  await expect(app.press("role:link[Laptop]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(app.spanStyle("id:item-current >> text:Laptop").color).not.toBe(
    app.spanStyle("id:item-home >> text:Home").color,
  );
  // No separator after the last item: two chevrons for three items.
  expect(app.count("id:icon-chevron-right")).toBe(2);
});

// heroui/packages/react/tests/components/breadcrumbs/breadcrumbs.test.tsx:55
test("T-004 renders a default chevron separator between non-final items", async () => {
  const app = await openScenario("breadcrumbs/basic");

  expect(app.count("id:icon-chevron-right")).toBe(2);
});

// heroui/packages/react/tests/components/breadcrumbs/breadcrumbs.test.tsx:61
test("T-005 supports a custom separator", async () => {
  const app = await openScenario("breadcrumbs/custom-separator.split");

  expect(app.count("id:custom-separator")).toBe(2);
  // The custom node replaces the default chevron entirely.
  expect(app.count("id:icon-chevron-right")).toBe(0);
});

// heroui/packages/react/tests/components/breadcrumbs/breadcrumbs.test.tsx:70
test("T-006 exposes disabled links when isDisabled", async () => {
  const app = await openScenario("breadcrumbs/disabled");

  expect(app.enabled("role:link[Home]")).toBe(false);
  expect(app.enabled("role:link[Products]")).toBe(false);
  await expect(app.press("role:link[Home]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
});

// heroui/packages/react/tests/components/breadcrumbs/breadcrumbs.test.tsx:77
test("T-007 calls onPress when a non-current item is activated", async () => {
  const app = await openScenario("breadcrumbs/action");

  await app.press("role:link[Home]");

  expect(callsOf(app, "onPress")).toHaveLength(1);
});

// heroui/packages/react/tests/components/breadcrumbs/breadcrumbs.test.tsx:94
test("T-008 supports item children as a render function that owns the item content", async () => {
  const app = await openScenario("breadcrumbs/item-render.split");

  expect(app.count("id:custom-item")).toBe(1);
  // The render function replaces the whole item, so no Link is added for it.
  expect(app.count("role:link[Home]")).toBe(0);
});
