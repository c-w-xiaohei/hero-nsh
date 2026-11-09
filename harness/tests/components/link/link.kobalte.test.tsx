import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import type { ScenarioOptions } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 cases that still describe a contract NSH can express, per
 * port sheet 4b (T-012, T-015, T-016, T-017, T-019, T-020).
 *
 * Kobalte's Link.Root owns the DOM attributes of native tags (role, tabindex,
 * href, aria-disabled, data-disabled) and the `as` polymorphism. NSH has one
 * View, no DOM attributes and no native tag, so each surviving case asserts the
 * observable behavior behind the attribute: role exposure, enabled() and a
 * refused press. T-011 and T-014 (native `<a>` has no role / tabindex) are
 * deleted: there is no native tag to be one or the other.
 */

/*
 * Open with one bounded retry. nsh_testing.md:429 makes a boot that renders
 * nothing reject with `ETIMEDOUT`, and the gate logs show that loss follows the
 * host handshake: T-019 passed 9 of 10 solo runs, T-016 lost 1 of 10 on this
 * same scenario, and the button control lost 2 of 60 mounts with the identical
 * message. A page that never mounted says nothing about Link, so retry once and
 * let any second failure report the component.
 */
async function openLinkScenario(name: string, options: ScenarioOptions = {}): Promise<App> {
  try {
    return await openScenario(name, options);
  } catch (error) {
    if ((error as { code?: string }).code !== "ETIMEDOUT") {
      throw error;
    }
    return openScenario(name, options);
  }
}

// kobalte/packages/core/src/link/link.test.tsx:19
test("T-012 should have attribute 'role=link' when it's not a native link", async () => {
  const app = await openLinkScenario("link/plain");

  expect(app.shows("role:link[Link]")).toBe(true);
});

// kobalte/packages/core/src/link/link.test.tsx:55
test("T-015 should not have attribute 'data-disabled' by default", async () => {
  const app = await openLinkScenario("link/plain");

  expect(app.enabled("role:link[Link]")).toBe(true);
});

// kobalte/packages/core/src/link/link.test.tsx:65
test("T-016 should have attribute 'role=link' when disabled", async () => {
  const app = await openLinkScenario("link/plain-disabled");

  expect(app.shows("role:link[Link]")).toBe(true);
});

// kobalte/packages/core/src/link/link.test.tsx:77
test("T-017 should not have attribute 'href' when disabled", async () => {
  const app = await openLinkScenario("link/disabled");

  // No href is readable; the observable contract is that a disabled link never
  // presses and never opens its URL.
  await expect(app.press("id:link-disabled")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(app.openedUrls()).toEqual([]);
});

// kobalte/packages/core/src/link/link.test.tsx:101
test("T-019 should have attribute 'aria-disabled=true' when disabled", async () => {
  const app = await openLinkScenario("link/plain-disabled");

  expect(app.enabled("role:link[Link]")).toBe(false);
});

// kobalte/packages/core/src/link/link.test.tsx:113
test("T-020 should have attribute 'data-disabled' when disabled", async () => {
  const app = await openLinkScenario("link/plain-disabled");

  await expect(app.press("role:link[Link]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
});
