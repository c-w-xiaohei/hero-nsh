import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 cases for Breadcrumbs, per port sheet 4b (T-009 … T-016).
 *
 * Kobalte's `Breadcrumbs.Root` renders a `<nav>` and hands `current` to the
 * caller; HeroUI is the authority here: the container is a labelled `list` and
 * the last item is current without being marked. NSH has no DOM attributes, so
 * each case asserts the observable consequence of the upstream attribute:
 * role exposure, `enabled()`, a refused press, the colour of the current item
 * and the separator count. T-013 (`aria-hidden` on the separator) is deleted:
 * `nsh/test` has no accessibility tree, so nothing can read it.
 */

// kobalte/packages/core/src/breadcrumbs/breadcrumbs.test.tsx:15
test("T-009 should have default 'aria-label'", async () => {
  const app = await openScenario("breadcrumbs/basic");

  // The accessible name is part of the role selector; HeroUI's role is `list`.
  expect(app.shows("role:list[Breadcrumbs]")).toBe(true);
});

// kobalte/packages/core/src/breadcrumbs/breadcrumbs.test.tsx:22
test("T-010 should have default separator", async () => {
  const app = await openScenario("breadcrumbs/basic");

  // Kobalte defaults to "/"; HeroUI overrides that with the chevron icon.
  expect(app.count("id:icon-chevron-right")).toBe(2);
});

// kobalte/packages/core/src/breadcrumbs/breadcrumbs.test.tsx:45
test("T-011 supports custom string separator", async () => {
  const app = await openScenario("breadcrumbs/string-separator");

  // Counted through texts() to avoid `>` colliding with the ` >> ` selector
  // syntax.
  expect(app.texts().filter((text) => text === ">")).toHaveLength(2);
});

// kobalte/packages/core/src/breadcrumbs/breadcrumbs.test.tsx:68
test("T-012 supports custom JSX.Element separator", async () => {
  const app = await openScenario("breadcrumbs/jsx-separator.split");

  expect(app.count("id:jsx-separator")).toBe(2);
  expect(app.count("id:icon-chevron-right")).toBe(0);
});

// kobalte/packages/core/src/breadcrumbs/breadcrumbs.test.tsx:118
test("T-014 should expose the current link as current", async () => {
  const app = await openScenario("breadcrumbs/basic");

  // aria-current="page" is not queryable; being current means being unusable
  // and painted with the link colour.
  expect(app.enabled("role:link[Laptop]")).toBe(false);
  await expect(app.press("role:link[Laptop]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(app.spanStyle("id:item-current >> text:Laptop").color).not.toBe(
    app.spanStyle("id:item-home >> text:Home").color,
  );
});

// kobalte/packages/core/src/breadcrumbs/breadcrumbs.test.tsx:141
test("T-015 marks the current link with a distinct colour", async () => {
  const app = await openScenario("breadcrumbs/basic");

  // `data-current` is not projected (D18); the only visible difference of the
  // current item is its colour.
  expect(app.spanStyle("id:item-current >> text:Laptop").color).not.toBe(
    app.spanStyle("id:item-home >> text:Home").color,
  );
});

// kobalte/packages/core/src/breadcrumbs/breadcrumbs.test.tsx:164
test("T-016 should be disabled when is current link", async () => {
  const app = await openScenario("breadcrumbs/basic");

  expect(app.enabled("role:link[Laptop]")).toBe(false);
  await expect(app.press("role:link[Laptop]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
});
