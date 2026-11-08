import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 cases that still describe a contract NSH can express, per
 * port sheet 4b (T-027, T-029, T-031, T-032, T-034, T-035, T-036).
 *
 * Kobalte's Button owns the DOM attributes of native tags (type, role, tabindex,
 * disabled, aria-disabled, data-disabled). NSH has one View, no DOM attributes,
 * so each surviving case asserts the observable behavior behind the attribute:
 * role exposure, Tab stops, enabled() and a refused press.
 */

test("T-027 exposes role=button when it is not a native button", async () => {
  // kobalte/packages/core/src/button/button.test.tsx:65
  const app = await openScenario("button/basic");

  expect(app.shows("role:button[Save]")).toBe(true);
});

test("T-029 is a Tab stop when it is not a native button", async () => {
  // kobalte/packages/core/src/button/button.test.tsx:89
  const app = await openScenario("button/tab-order", { platform: "web" });

  await app.keyboard.press("tab");
  await app.keyboard.press("tab");

  expect(callsOf(app, "focus:Second")).toHaveLength(1);
});

test("T-031 is not a Tab stop when it is disabled", async () => {
  // kobalte/packages/core/src/button/button.test.tsx:113
  const app = await openScenario("button/tab-order-disabled", { platform: "web" });

  await app.keyboard.press("tab");
  await app.keyboard.press("tab");

  expect(callsOf(app, "focus:Disabled")).toHaveLength(0);
  expect(callsOf(app, "focus:Third")).toHaveLength(1);
});

test("T-032 is disabled when disabled and it is a native button", async () => {
  // kobalte/packages/core/src/button/button.test.tsx:125
  const app = await openScenario("button/disabled");

  expect(app.enabled("role:button[Save]")).toBe(false);
  await expect(app.press("role:button[Save]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
});

test("T-034 is disabled when disabled and it is not a native button nor input", async () => {
  // kobalte/packages/core/src/button/button.test.tsx:151
  // NSH's single View has no native tag to be one or the other; the contract is
  // the same as T-032 and asserted the same way.
  const app = await openScenario("button/disabled");

  expect(app.enabled("role:button[Save]")).toBe(false);
  await expect(app.press("role:button[Save]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
});

test("T-035 is enabled by default", async () => {
  // kobalte/packages/core/src/button/button.test.tsx:164
  const app = await openScenario("button/basic");

  expect(app.enabled("role:button[Save]")).toBe(true);
});

test("T-036 is not enabled when disabled", async () => {
  // kobalte/packages/core/src/button/button.test.tsx:174
  const app = await openScenario("button/disabled");

  expect(app.enabled("role:button[Save]")).toBe(false);
});
