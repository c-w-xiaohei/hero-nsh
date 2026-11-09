import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only NumberField cases (port sheet 4b, rows T-005 and T-010). Both move
 * the keyboard focus with Tab, which the web target does and the Windows
 * window does not ("Real hosts" in the loop brief), so both live in a `.web.`
 * file: the Windows run skips them without any assertion being weakened.
 *
 * Upstream is the same file as the other HeroUI rows:
 * heroui/packages/react/tests/components/number-field/number-field.test.tsx.
 */

function openCase(name: string, params: Record<string, string | number | boolean> = {}): Promise<App> {
  return open("../../../number-field.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/number-field/number-field.test.tsx:86
// T-005: typing only writes the input text; the value is committed on blur, and
// Tab is the blur. The last onChange is therefore 42 and there is none before.
test("T-005 should call onChange on commit", async () => {
  const app = await openCase("log", { defaultValue: 0, minValue: 0 });

  await app.clear("id:nf-input");
  expect(callsOf(app, "onChange")).toHaveLength(0);

  await app.type("id:nf-input", "42");
  expect(callsOf(app, "onChange")).toHaveLength(0);

  await app.keyboard.press("tab");

  const calls = callsOf(app, "onChange");
  expect(calls[calls.length - 1][0]).toBe(42);
});

// heroui/packages/react/tests/components/number-field/number-field.test.tsx:196
// Rewritten port of T-010: NSH projects no `data-focus-visible`, so the same
// fact is read from the two channels that are public here. Tab focuses the
// input (its onFocus probe records once) and the Input's `className` function
// records `isFocusVisible()` into Storage; the field's only focus stop is the
// text input, so the focus ring belongs to it.
test("T-010 should support focus-visible via keyboard", async () => {
  const app = await openCase("focus");

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);

  const records = callsOf(app, "input-class").map((args) => args[0] as { isFocusVisible: boolean });
  const last = records[records.length - 1];

  if (!last) throw new Error("the Input className render prop recorded nothing");

  expect(last.isFocusVisible).toBe(true);
});
