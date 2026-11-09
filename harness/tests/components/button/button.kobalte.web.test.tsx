import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only Kobalte Button cases: both check where Tab lands, and keyboard focus
 * does not move with Tab on a real Windows window ("Real hosts" in the loop
 * brief). The web target runs them unchanged.
 */

// kobalte/packages/core/src/button/button.test.tsx:89
test("T-029 is a Tab stop when it is not a native button", async () => {
  const app = await openScenario("button/tab-order", { platform: "web" });

  await app.keyboard.press("tab");
  expect(callsOf(app, "focus:First")).toHaveLength(1);

  await app.keyboard.press("tab");
  expect(callsOf(app, "focus:Second")).toHaveLength(1);
});

// kobalte/packages/core/src/button/button.test.tsx:113
test("T-031 is not a Tab stop when it is disabled", async () => {
  const app = await openScenario("button/tab-order-disabled", { platform: "web" });

  await app.keyboard.press("tab");
  await app.keyboard.press("tab");

  expect(callsOf(app, "focus:Disabled")).toHaveLength(0);
  expect(callsOf(app, "focus:Third")).toHaveLength(1);
});
