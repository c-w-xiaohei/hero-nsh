import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Link, per port sheet 4b (T-001, T-004,
 * T-006 … T-010). Every surviving case keeps its upstream file:line and title.
 *
 * NSH projects no BEM block, no data-slot / data-* attributes and no href, so
 * each case asserts what a user can observe instead: the role and accessible
 * name, the URL the app opened, the resolved underline of the text, callbacks
 * recorded through probe(), enabled() and a refused press. T-002 and T-003 are
 * deleted upstream-side (D18: BEM classes and data attributes are not ported).
 */

// heroui/packages/react/tests/components/link/link.test.tsx:12
test("T-001 renders with role, accessible name, and href", async () => {
  const app = await openScenario("link/basic");

  expect(app.shows("role:link[HeroUI]")).toBe(true);

  // The href is data in NSH: the observable contract is the URL the app opens.
  await app.press("role:link[HeroUI]");
  expect(app.openedUrls()).toEqual(["https://heroui.com"]);
});

// heroui/packages/react/tests/components/link/link.test.tsx:41
test("T-004 supports hover state", async () => {
  const app = await openScenario("link/basic");

  // The base classes say no-underline; the hover state adds it (R-006).
  await app.hover("id:link-docs");
  expect(app.spanStyle("id:link-docs >> text:HeroUI").underline).toBe(true);

  await app.hover("id:link-elsewhere");
  expect(app.spanStyle("id:link-docs >> text:HeroUI").underline).toBe(false);
});

// heroui/packages/react/tests/components/link/link.test.tsx:61
test("T-006 calls onPress on click", async () => {
  const app = await openScenario("link/basic");

  await app.press("role:link[HeroUI]");

  expect(callsOf(app, "onPress")).toHaveLength(1);
});

// heroui/packages/react/tests/components/link/link.test.tsx:74
test("T-007 supports disabled state and blocks press", async () => {
  const app = await openScenario("link/disabled");

  // aria-disabled / data-disabled: a user observes a link that takes no input.
  expect(app.enabled("id:link-disabled")).toBe(false);
  await expect(app.press("id:link-disabled")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onPress")).toHaveLength(0);
});

// heroui/packages/react/tests/components/link/link.test.tsx:91
test("T-008 exposes no hover state when disabled", async () => {
  const app = await openScenario("link/disabled");

  await app.hover("id:link-disabled");
  expect(callsOf(app, "onHoverStart")).toHaveLength(0);
  expect(app.spanStyle("id:link-disabled >> text:Docs").underline).toBe(false);
});

// heroui/packages/react/tests/components/link/link.test.tsx:104
test("T-009 exposes data-slot when composed", async () => {
  const app = await openScenario("link/icon-default");

  expect(app.shows("id:link-icon")).toBe(true);
  expect(app.shows("id:link-default-icon")).toBe(true);
  // data-default-icon="true" is not projected (D18); its visible effect is the
  // ms-1 pb-1.5 spacing kept by R-016 and checked against screenshots.
});

// heroui/packages/react/tests/components/link/link.test.tsx:119
test("T-010 supports custom icon children without default icon marker", async () => {
  const app = await openScenario("link/icon-custom");

  expect(app.shows("text:→")).toBe(true);
  expect(app.count("id:link-default-icon")).toBe(0);
  // The absent data-default-icon attribute is not projected (D18).
});

/*
 * The render props are part of the public API (port sheet 1.1) and have no
 * upstream case: aria-current drives isCurrent, which a render prop exposes.
 * The six accessors are covered by link/render-props.split in the visual run.
 */
test("X-001 derives isCurrent from aria-current", async () => {
  const app = await openScenario("link/current");

  expect(app.shows("id:link-current >> text:Current page")).toBe(true);
  expect(app.shows("id:link-not-current >> text:Other page")).toBe(true);
});
