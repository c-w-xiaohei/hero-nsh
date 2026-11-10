import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only ToggleButton cases: each moves the keyboard focus with Tab, which the
 * web target does and a real Windows window does not ("Real hosts" in the loop
 * brief; the Windows host gap is a registered difference). They keep their
 * upstream titles and lines.
 *
 * Both wait for the first frame after `open` before they read: on `--target web`
 * `open` can resolve before the app's first commit, and a read straight after it
 * sees an empty screen. Each waits on what it reads first, with `{ timeout:
 * 15_000 }`, above nsh's own 10 s app-start budget. The wait only delays the
 * read — every assertion still runs and can still fail.
 */

// heroui/packages/react/tests/components/toggle-button/toggle-button.test.tsx:115
// Rewritten port (port sheet T-009): the focus ring itself is paint, which
// nsh/test cannot read; the render prop prints `isFocusVisible`, the state the
// ring's classList is gated on.
test("T-009 supports focus-visible via keyboard", async () => {
  const app = await openScenario("toggle-button/focus.split", { platform: "web" });
  await app.waitFor("text:Bold off NoRing", { timeout: 15_000 });

  expect(app.shows("text:Bold off NoRing")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);
  expect(app.shows("text:Bold off Ring")).toBe(true);

  await app.keyboard.press("tab");
  expect(app.shows("text:Bold off NoRing")).toBe(true);
});

// heroui/packages/react/tests/components/toggle-button/toggle-button.test.tsx:124
test("T-010 supports keyboard activation with Enter and Space", async () => {
  const app = await openScenario("toggle-button/focus.split", { platform: "web" });
  await app.waitFor("text:Bold off NoRing", { timeout: 15_000 });

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);

  await app.keyboard.press("enter");
  expect(app.shows("text:Bold on Ring")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true]]);

  await app.keyboard.press("space");
  expect(app.shows("text:Bold off Ring")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true], [false]]);
});
