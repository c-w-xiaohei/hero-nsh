import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for DisclosureGroup and
 * `useDisclosureGroupNavigation`, plus the Kobalte accordion cases that map to
 * the group's expansion set, per port sheet 4b (T-008 … T-028).
 *
 * Assertion translation (SOP 3.2): `aria-expanded`, `aria-controls` and the
 * panel's `role` / `aria-labelledby` have no NSH channel, so those upstream
 * assertions are dropped as registered partial ports; "expanded" is asserted
 * through the one visible consequence, whether the panel body shows. Callback
 * payloads arrive through probes that spread the `Set` into Storage, so the
 * key order the upstream test checks is what the probe records.
 */

const TRIGGER_PREVIEW = "role:button[Preview]";
const TRIGGER_DOWNLOAD = "role:button[Download]";
const PREVIEW_CONTENT = "text:Preview content";
const DOWNLOAD_CONTENT = "text:Download content";

function openCase(params: Record<string, string | number | boolean> = {}): Promise<App> {
  return open("../../../disclosure.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: "group", ...params } },
  });
}

function openNav(params: Record<string, string | number | boolean> = {}): Promise<App> {
  return open("../../../disclosure.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: "nav", ...params } },
  });
}

/* -------------------------------------------------------------------------------------------------
 * DisclosureGroup unit cases
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/disclosure-group/disclosure-group.test.tsx:43
// Partial port (port sheet T-008): the `data-slot` attribute and the
// `disclosure-group` BEM class have no NSH channel (D18). Kept: the root exists,
// named by testID.
test("T-008 exposes the group root", async () => {
  const app = await openCase();

  expect(app.shows("id:disclosure-group")).toBe(true);
});

// heroui/packages/react/tests/components/disclosure-group/disclosure-group.test.tsx:52
test("T-009 renders each Disclosure trigger", async () => {
  const app = await openScenario("disclosure/group");

  expect(app.shows(TRIGGER_PREVIEW)).toBe(true);
  expect(app.shows(TRIGGER_DOWNLOAD)).toBe(true);
});

// heroui/packages/react/tests/components/disclosure-group/disclosure-group.test.tsx:59
// Partial port (port sheet T-010): three `aria-expanded` assertions are dropped.
// Kept: pressing Preview shows its content; pressing Download shows its own and
// clips the Preview body (single-expanded group).
test("T-010 supports single expanded item by default", async () => {
  const app = await openCase();

  await app.press(TRIGGER_PREVIEW);
  expect(app.shows(PREVIEW_CONTENT)).toBe(true);

  await app.press(TRIGGER_DOWNLOAD);
  expect(app.shows(DOWNLOAD_CONTENT)).toBe(true);
  expect(app.shows(PREVIEW_CONTENT)).toBe(false);
});

// heroui/packages/react/tests/components/disclosure-group/disclosure-group.test.tsx:73
// Partial port (port sheet T-011): the two `aria-expanded` assertions are
// dropped; both panel bodies showing is the effect they stood for.
test("T-011 supports multiple expanded items with allowsMultipleExpanded", async () => {
  const app = await openScenario("disclosure/group-multiple");

  expect(app.shows(PREVIEW_CONTENT)).toBe(true);
  expect(app.shows(DOWNLOAD_CONTENT)).toBe(true);
});

// heroui/packages/react/tests/components/disclosure-group/disclosure-group.test.tsx:86
// Partial port (port sheet T-012): `aria-expanded` is dropped. Kept: the
// controlled `expandedKeys` keeps Preview open, and pressing Download reports
// the new set (the probe writes its keys in order, so ["download"]).
test("T-012 supports controlled expandedKeys and onExpandedChange", async () => {
  const app = await openCase({ case: "group-controlled" });

  expect(app.shows(PREVIEW_CONTENT)).toBe(true);

  await app.press(TRIGGER_DOWNLOAD);

  expect(callsOf(app, "onExpandedChange")).toEqual([["download"]]);
});

// heroui/packages/react/tests/components/disclosure-group/disclosure-group.test.tsx:98
// Rewritten port (port sheet T-013): both `toBeDisabled()` assertions become
// `app.enabled(...) === false`.
test("T-013 supports group disabled state on all items", async () => {
  const app = await openCase({ case: "group-disabled" });

  expect(app.enabled(TRIGGER_PREVIEW)).toBe(false);
  expect(app.enabled(TRIGGER_DOWNLOAD)).toBe(false);
});

/* -------------------------------------------------------------------------------------------------
 * useDisclosureGroupNavigation
 *
 * The harness renders `currentIndex()` into the first text on screen and the
 * four buttons of the upstream fixture (Previous, Next, Force previous, Force
 * next). `itemIds` is preview / download / share.
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:62
test("T-014 exposes the index of the first expanded item", async () => {
  const app = await openNav({ expanded: "download" });

  expect(app.texts()[0]).toBe("1");
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:68
test("T-015 exposes the index of the earliest item when several are expanded", async () => {
  const app = await openNav({ expanded: "share,download" });

  expect(app.texts()[0]).toBe("1");
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:74
test("T-016 falls back to the first item when nothing is expanded", async () => {
  const app = await openNav();

  expect(app.texts()[0]).toBe("0");
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:80
test("T-017 exposes -1 when there are no items", async () => {
  const app = await openNav({ items: "none" });

  expect(app.texts()[0]).toBe("-1");
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:86
// The harness is called without `itemIds` at all (port sheet T-018).
test("T-018 treats a missing itemIds list as empty", async () => {
  const app = await openCase({ case: "nav-missing-items" });

  expect(app.texts()[0]).toBe("-1");
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:92
test("T-019 ignores expanded keys that are not in the item list", async () => {
  const app = await openNav({ expanded: "missing" });

  expect(app.texts()[0]).toBe("0");
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:100
test("T-020 disables Previous on the first item and enables Next", async () => {
  const app = await openNav({ expanded: "preview" });

  expect(app.enabled("role:button[Previous]")).toBe(false);
  expect(app.enabled("role:button[Next]")).toBe(true);
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:107
test("T-021 disables Next on the last item", async () => {
  const app = await openNav({ expanded: "share" });

  expect(app.enabled("role:button[Previous]")).toBe(true);
  expect(app.enabled("role:button[Next]")).toBe(false);
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:114
test("T-022 disables both directions when there are no items", async () => {
  const app = await openNav({ items: "none" });

  expect(app.enabled("role:button[Previous]")).toBe(false);
  expect(app.enabled("role:button[Next]")).toBe(false);
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:121
// Force previous is always enabled, so the hook's own bounds guard is what
// keeps the callback from firing.
test("T-023 ignores a previous request on the first item", async () => {
  const app = await openNav({ expanded: "preview" });

  await app.press("role:button[Force previous]");

  expect(callsOf(app, "onExpandedChange")).toHaveLength(0);
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:129
test("T-024 ignores a next request on the last item", async () => {
  const app = await openNav({ expanded: "share" });

  await app.press("role:button[Force next]");

  expect(callsOf(app, "onExpandedChange")).toHaveLength(0);
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:139
test("T-025 calls onExpandedChange with only the previous item", async () => {
  const app = await openNav({ expanded: "share" });

  await app.press("role:button[Previous]");

  expect(callsOf(app, "onExpandedChange")).toEqual([["download"]]);
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:147
test("T-026 calls onExpandedChange with only the next item", async () => {
  const app = await openNav({ expanded: "preview" });

  await app.press("role:button[Next]");

  expect(callsOf(app, "onExpandedChange")).toEqual([["download"]]);
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:157
// Multiple mode adds the target to the existing set; the probe spreads the set
// in iteration order, so the upstream Set order is preserved.
test("T-027 adds the previous item to the existing selection", async () => {
  const app = await openNav({ expanded: "share", multiple: true });

  await app.press("role:button[Previous]");

  expect(callsOf(app, "onExpandedChange")).toEqual([["share", "download"]]);
});

// heroui/packages/react/tests/components/disclosure-group/use-disclosure-group-navigation.test.tsx:168
test("T-028 adds the next item to the existing selection", async () => {
  const app = await openNav({ expanded: "preview", multiple: true });

  await app.press("role:button[Next]");

  expect(callsOf(app, "onExpandedChange")).toEqual([["preview", "download"]]);
});
