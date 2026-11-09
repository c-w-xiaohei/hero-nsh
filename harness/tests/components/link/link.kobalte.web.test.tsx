import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only Kobalte cases for Link: both move the keyboard focus with Tab, which
 * the web target does (headless too) but the real Windows window does not,
 * since NSH 0.4.0 gives no non-Input view keyboard focus there ("Real hosts" in
 * the loop brief).
 *
 * The upstream cases assert tabindex="0"; NSH projects no attributes, so the
 * contract becomes whether the link is a Tab stop. T-014 (a native `<a>` has no
 * tabindex) is deleted: there is no native tag.
 */

// kobalte/packages/core/src/link/link.test.tsx:31
test("T-013 should have attribute 'tabindex=0' when it's not a native link and is not disabled", async () => {
  const app = await openScenario("link/tab", { platform: "web" });

  await app.keyboard.press("tab");
  await app.keyboard.press("tab");

  expect(callsOf(app, "focus:Link")).toHaveLength(1);
});

// kobalte/packages/core/src/link/link.test.tsx:89
test("T-018 should not have attribute 'tabindex=0' when it's disabled", async () => {
  const app = await openScenario("link/tab-disabled", { platform: "web" });

  await app.keyboard.press("tab");
  await app.keyboard.press("tab");

  expect(callsOf(app, "focus:Link")).toHaveLength(0);
  expect(callsOf(app, "focus:After")).toHaveLength(1);
});
