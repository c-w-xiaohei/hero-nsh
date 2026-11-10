import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only ColorField case (port sheet 4b.1, row T-012). It moves the keyboard
 * focus with Tab, which the web target does and the Windows window does not
 * ("Real hosts" in the loop brief), so it lives in a `.web.` file: the Windows
 * run skips it without any assertion being weakened.
 *
 * Upstream is the same file as the other HeroUI rows:
 * heroui/packages/react/tests/components/color-field/color-field.test.tsx.
 */

function openCase(name: string) {
  return open("../../../color-field.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/color-field/color-field.test.tsx:212
// Partial port of T-012: `toHaveFocus()` is kept as the field's onFocus probe
// after Tab. The dropped assertion is `[data-focus-visible='true']`: NSH
// projects no such attribute, and `nsh test` reads neither focus nor computed
// style, so the focus ring is left to the screenshot comparison (port sheet
// 4b.1, T-012).
test("T-012 should support focus-visible via keyboard", async () => {
  const app = await openCase("focus-probe");

  await app.keyboard.press("tab");

  expect(callsOf(app, "onFocus")).toHaveLength(1);
});
