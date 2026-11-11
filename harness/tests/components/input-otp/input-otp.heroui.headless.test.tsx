import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Headless-only InputOTP cases: both drive the field with `app.paste`.
 *
 * Reason for the `.headless.test.tsx` suffix: only the headless engine and the
 * web driver can paste (nsh-testing's native agent has no `paste`, so
 * `--target windows` fails the step with "pasting in tests is not supported on
 * this platform yet"). Headless is the default local target (`pnpm test`) and
 * the one that runs paste on the desktop platform config, so the cases live
 * here and the web and Windows targets skip them without weakening the
 * assertion anywhere. The rest of the unit stays in
 * input-otp.heroui.test.tsx.
 */

// heroui/packages/react/tests/components/input-otp/input-otp.test.tsx:121
// Port (port sheet T-007): upstream's six `data-filled` slots become six
// visible characters, the structure the attribute stood for.
test("T-007 should fill slots from paste", async () => {
  const app = await openScenario("input-otp/paste");

  await app.paste("id:input-otp-input", { text: "654321" });

  expect(callsOf(app, "onChange").length).toBeGreaterThan(0);
  expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("654321");
  expect(app.count("id:input-otp-slot-value")).toBe(6);
});

/*
 * Regression (review): input-otp@1.4.2 normalizes the caret on every sync. A
 * caret at `maxLength` selects the last cell, so the next digit replaces it
 * instead of being dropped; a paste selects min(length, maxLength - 1) …
 * length. The port kept the raw host caret in all three places.
 * src/components/input-otp/input-otp-root.tsx:583-585,612-619,622-627
 */
test("X-002 should replace the last cell after a full code is typed or pasted", async () => {
  const typed = await openScenario("input-otp/typing");

  await typed.type("id:input-otp-input", "123456");
  expect(callsOf(typed, "onChange").at(-1)?.[0]).toBe("123456");

  await typed.type("id:input-otp-input", "7");

  expect(typed.count("id:input-otp-slot-value")).toBe(6);
  expect(callsOf(typed, "onChange").at(-1)?.[0]).toBe("123457");

  const pasted = await openScenario("input-otp/paste");

  await pasted.paste("id:input-otp-input", { text: "654321" });
  expect(callsOf(pasted, "onChange").at(-1)?.[0]).toBe("654321");

  await pasted.type("id:input-otp-input", "7");

  expect(pasted.count("id:input-otp-slot-value")).toBe(6);
  expect(callsOf(pasted, "onChange").at(-1)?.[0]).toBe("654327");
});
