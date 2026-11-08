/*
 * Ported from Kobalte's own test file:
 *   packages/core/src/primitives/create-disclosure-state/create-disclosure-state.test.ts
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
  isOpen: boolean;
  afterTrue?: boolean;
  afterFalse?: boolean;
  afterOnce?: boolean;
  afterTwice?: boolean;
  changes: boolean[];
};

async function run(caseName: string) {
  const app = await openScenario("primitives/disclosure-state", {
    params: { case: caseName },
  });
  await app.press("id:run");
  await app.waitUntil(() => callsOf(app, "result").length > 0);
  return callsOf(app, "result")[0][0] as Result;
}

test("can be default 'open' (uncontrolled)", async () => {
  const result = await run("default-open");

  expect(result.initial).toBe(true);
  expect(result.isOpen).toBe(true);
});

test("can be controlled", async () => {
  const result = await run("controlled");

  expect(result.initial).toBe(true);
  expect(result.isOpen).toBe(true);
  expect(result.changes).toEqual([false]);
});

test("should set 'isOpen' state with the value from 'setIsOpen'", async () => {
  const result = await run("set");

  expect(result.initial).toBe(false);
  expect(result.afterTrue).toBe(true);
  expect(result.afterFalse).toBe(false);
});

test("should set 'isOpen' state to true when calling 'open'", async () => {
  const result = await run("open");

  expect(result.initial).toBe(false);
  expect(result.isOpen).toBe(true);
});

test("should set 'isOpen' state to false when calling 'close'", async () => {
  const result = await run("close");

  expect(result.initial).toBe(true);
  expect(result.isOpen).toBe(false);
});

test("should toggle 'isOpen' state when calling 'toggle'", async () => {
  const result = await run("toggle");

  expect(result.initial).toBe(false);
  expect(result.afterOnce).toBe(true);
  expect(result.afterTwice).toBe(false);
});
