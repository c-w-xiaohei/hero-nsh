import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * ColorInputGroup regression cases (port sheet 4b.2). Upstream 3.2.7 ships no
 * test for this internal module: `packages/react/tests/components/` has no
 * `color-input-group` directory and the only references under tests are the
 * three ColorField lines listed as cross-unit in the port sheet (they belong to
 * ColorField's 4b). The rows below are therefore this unit's own `S-` cases and
 * carry the port sheet id instead of an upstream file:line; each one cites the
 * rules and state-table rows it stands for.
 *
 * All steps run headless on the desktop (`platform: "windows"`), the platform
 * the port sheet gives for 4b.2: hover needs a desktop or web platform, typing
 * focuses an Input on every platform, and no case needs Tab focus movement.
 * The fixture is `harness/color-input-group.fixtures.tsx`, NSH-only, because
 * the reference package does not export this module (port sheet 4b.3).
 */

function openCase(name: string) {
  return open("../../../color-input-group.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

type RootClassRecord = {
  isHovered: boolean;
  isFocusWithin: boolean;
  isFocusVisible: boolean;
};

function rootClassRecords(app: App): RootClassRecord[] {
  return callsOf(app, "root-class").map((args) => args[0] as RootClassRecord);
}

function lastRootClass(app: App): RootClassRecord {
  const records = rootClassRecords(app);
  const found = records[records.length - 1];

  if (!found) throw new Error("the Root className render prop recorded nothing");

  return found;
}

// port sheet 4b.2 S-001 (rules R-017 / R-018, section 1.4)
// The strings sit directly in Prefix / Suffix; the parts must wrap them in
// Text, or NSH's View draws nothing and both shows() assertions fail.
test("S-001 should render prefix and suffix string children as text", async () => {
  const app = await openCase("prefix-suffix");

  expect(app.shows("text:#")).toBe(true);
  expect(app.shows("text:%")).toBe(true);
  expect(app.count("text:#")).toBe(1);
});

// port sheet 4b.2 S-002 (section 1.3, Input's value / onChange contract)
// Typing goes key by key; each character reports one onChange({ value }) with
// the text so far, and the controlled fixture writes it back.
test("S-002 should type into the input and report every keystroke to onChange", async () => {
  const app = await openCase("controlled");

  expect(app.enabled("id:group-input")).toBe(true);

  await app.type("id:group-input", "#22c55e");

  expect(app.value("id:group-input")).toBe("#22c55e");

  const calls = callsOf(app, "onChange");

  expect(calls.length).toBeGreaterThanOrEqual(2);
  expect(calls[calls.length - 1][0]).toEqual({ value: "#22c55e" });
});

// port sheet 4b.2 S-003 (section 1.3, Input's own disabled / readOnly)
// The group's isDisabled is appearance only and does not reach the Input
// (R-014), so both states come from the Input's own props here.
test("S-003 should honour the Input's own disabled and readOnly props", async () => {
  const disabled = await openCase("disabled");

  expect(disabled.enabled("id:group-input")).toBe(false);
  await expect(disabled.type("id:group-input", "#ff0000")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(disabled, "onChange")).toHaveLength(0);

  const readOnly = await openCase("readonly");

  expect(readOnly.enabled("id:group-input")).toBe(false);
  expect(readOnly.value("id:group-input")).toBe("#ff0000");
  expect(callsOf(readOnly, "onChange")).toHaveLength(0);
});

// port sheet 4b.2 S-004 (rules R-009 / R-010, section 2 state table)
// Root reports the pointer and focus-within state through its render props.
// NSH's pointer press does not move focus away from an Input, so the blur step
// goes through the Input's public ref, the same state change a click elsewhere
// causes on the web.
test("S-004 should report hover and focus-within through the Root render props", async () => {
  const app = await openCase("render-props");

  expect(lastRootClass(app).isHovered).toBe(false);

  await app.hover("id:group");
  expect(lastRootClass(app).isHovered).toBe(true);

  await app.type("id:group-input", "ff0000");
  expect(lastRootClass(app).isFocusWithin).toBe(true);

  await app.press("id:blur");
  expect(lastRootClass(app).isFocusWithin).toBe(false);

  expect(callsOf(app, "input-focus")).toHaveLength(1);
  expect(callsOf(app, "input-blur")).toHaveLength(1);
  expect(
    rootClassRecords(app).every((record) => record.isFocusVisible === record.isFocusWithin),
  ).toBe(true);
});

// port sheet 4b.2 S-005 (rules R-001 … R-035)
// Every variant mounts with all its parts. The class strings themselves are the
// gate's unknown-class check; this case only proves no part is left unrendered.
test("S-005 should mount every variant with its parts", async () => {
  const app = await openCase("variants");

  expect(app.count("id:group")).toBe(4);
  expect(app.count("id:group-input")).toBe(4);
  expect(app.shows("text:prefix")).toBe(true);
});
