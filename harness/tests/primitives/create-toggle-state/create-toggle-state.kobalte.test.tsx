/*
 * Ported from Kobalte's own test file:
 *   packages/core/src/primitives/create-toggle-state/create-toggle-state.test.ts
 * at kobaltedev/kobalte main, commit 675b4a11f4.
 *
 * The upstream file is a Solid unit test; NSH opens the state in a real app,
 * presses the case's "run" button and reads the probe's result. One case per
 * upstream `it`, same titles.
 */

import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

type Result = {
  initial: boolean;
  isSelected: boolean;
  afterTrue?: boolean;
  afterFalse?: boolean;
  afterOnce?: boolean;
  afterTwice?: boolean;
  changes: boolean[];
};

async function run(caseName: string) {
  const app = await openScenario("primitives/toggle-state", {
    params: { case: caseName },
  });
  await app.press("id:run");
  await app.waitUntil(() => callsOf(app, "result").length > 0);
  return callsOf(app, "result")[0][0] as Result;
}

test("can be default selected (uncontrolled)", async () => {
  const result = await run("default-selected");

  expect(result.initial).toBe(true);
  expect(result.isSelected).toBe(true);
});

test("can be controlled", async () => {
  const result = await run("controlled");

  expect(result.initial).toBe(true);
  expect(result.isSelected).toBe(true);
  expect(result.changes).toEqual([false]);
});

test("should setSelected with the given value", async () => {
  const result = await run("set");

  expect(result.initial).toBe(false);
  expect(result.afterTrue).toBe(true);
  expect(result.afterFalse).toBe(false);
});

test("should not setSelected with the given value when is read only", async () => {
  const result = await run("readonly-set");

  expect(result.initial).toBe(false);
  expect(result.isSelected).toBe(false);
  expect(result.changes).toEqual([]);
});

test("should toggle selected state", async () => {
  const result = await run("toggle");

  expect(result.initial).toBe(false);
  expect(result.afterOnce).toBe(true);
  expect(result.afterTwice).toBe(false);
});

test("should not toggle selected state when is read only", async () => {
  const result = await run("readonly-toggle");

  expect(result.initial).toBe(false);
  expect(result.isSelected).toBe(false);
  expect(result.changes).toEqual([]);
});
