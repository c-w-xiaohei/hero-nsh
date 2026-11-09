import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only HeroUI case for Link: it moves keyboard focus with Tab, which the
 * web target does (headless too) but the real Windows window does not, since
 * NSH 0.4.0 gives no non-Input view keyboard focus there ("Real hosts" in the
 * loop brief). Keeping it in a `.web.` file is what lets the Windows run skip
 * it without weakening the assertion anywhere.
 */

// heroui/packages/react/tests/components/link/link.test.tsx:52
test("T-005 supports focus-visible via keyboard", async () => {
  const app = await openScenario("link/focus.split", { platform: "web" });

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);
  // data-focus-visible is not projected; the render prop observes the same
  // value that drives the focus ring (R-010 / R-011).
  expect(app.shows("text:Focused")).toBe(true);
});
