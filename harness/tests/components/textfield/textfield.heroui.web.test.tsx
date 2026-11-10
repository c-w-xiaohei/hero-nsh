import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only TextField cases (port sheet 4b, row T-012). Tab moves the keyboard
 * focus on the web target and not on the Windows window ("Real hosts" in the
 * loop brief), so the case lives in a `.web.` file: the Windows run skips it
 * without any assertion being weakened.
 *
 * Upstream is the same file as the other HeroUI rows:
 * heroui/packages/react/tests/components/textfield/textfield.test.tsx.
 */

function openCase(name: string): Promise<App> {
  return open("../../../textfield.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/textfield/textfield.test.tsx:183
// Rewritten port of T-012 (port sheet): NSH projects no `data-focus-visible`, so
// the same fact is read from the two channels that are public here. Tab focuses
// the input (the onFocus probe records once) and the Input's `className`
// function records `isFocusVisible()` into Storage; a text input counts as
// focus-visible as soon as it is focused.
test("T-012 supports focus-visible via keyboard", async () => {
  const app = await openCase("focus");

  await app.keyboard.press("tab");

  expect(callsOf(app, "onFocus")).toHaveLength(1);

  const records = callsOf(app, "input-class").map(
    (args) => args[0] as { isFocusVisible: boolean },
  );
  const last = records[records.length - 1];

  if (!last) throw new Error("the Input className render prop recorded nothing");

  expect(last.isFocusVisible).toBe(true);
});
