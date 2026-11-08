/*
 * Ported from Kobalte's own test file:
 *   packages/core/src/primitives/create-controllable-signal/create-controllable-signal.test.tsx
 * at kobaltedev/kobalte main, commit 675b4a11f4.
 *
 * Kobalte runs these against Solid with `createRoot` and `vi.fn`; NSH has no
 * unit-test renderer, so each case opens the primitive in a real app, presses
 * the case's "run" button and reads what the probe wrote to Storage. The
 * assertions are the upstream ones.
 */

import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

type Result = {
  initialValue?: string;
  afterFirst?: { value?: string; changes: string[] };
  afterSecondValue?: string;
  afterSecondChanges?: string[];
  prevSeen?: string[];
  value?: string;
  changes?: string[];
  initialDefined?: boolean;
  finalIsNaN?: boolean;
  finalChanges?: number;
};

async function run(caseName: string, target = "run") {
  const app = await openScenario("primitives/controllable-signal", {
    params: { case: caseName },
  });
  await app.press(`id:${target}`);
  await app.waitUntil(() => callsOf(app, "result").length > 0);
  return { app, result: callsOf(app, "result")[0][0] as Result };
}

test("should handle setValue behavior (uncontrolled mode)", async () => {
  const { result } = await run("uncontrolled-set");

  expect(result.initialValue).toBe("defaultValue");
  expect(result.afterFirst?.value).toBe("newValue");
  expect(result.afterFirst?.changes).toEqual(["newValue"]);
  expect(result.afterSecondValue).toBe("newValue");
  // Setting the same value twice in a row does not call onChange again.
  expect(result.afterSecondChanges).toEqual(["newValue"]);
});

test("should handle setValue with callback behavior (uncontrolled mode)", async () => {
  const { result } = await run("uncontrolled-callback");

  expect(result.prevSeen).toEqual(["defaultValue", "newValue"]);
  expect(result.value).toBe("newValue");
  expect(result.changes).toEqual(["newValue"]);
});

test("should handle setValue behavior (controlled mode)", async () => {
  const { result } = await run("controlled-set");

  // The prop wins: setValue reports but does not write the controlled value.
  expect(result.afterFirst?.value).toBe("controlledValue");
  expect(result.afterFirst?.changes).toEqual(["newValue"]);
  // Setting the value the prop already holds does not call onChange.
  expect(result.afterSecondValue).toBe("controlledValue");
  expect(result.afterSecondChanges).toEqual(["newValue"]);
});

test("should handle setValue with callback behavior (controlled mode)", async () => {
  const { result } = await run("controlled-callback");

  expect(result.prevSeen).toEqual(["controlledValue", "controlledValue"]);
  expect(result.value).toBe("controlledValue");
  expect(result.changes).toEqual(["newValue"]);
});

test("should update value after props.value change (controlled mode)", async () => {
  const app = await openScenario("primitives/controllable-signal", {
    params: { case: "controlled-update" },
  });

  expect(app.texts()).toContain("controlledValue changes 0");
  expect(callsOf(app, "result")).toHaveLength(0);

  await app.press("id:update");
  await app.waitUntil(() => app.texts().includes("updated changes 0"));

  expect(app.texts()).toContain("updated changes 0");
  expect(callsOf(app, "result")).toHaveLength(0);
});

test("should only trigger onChange once when using NaN", async () => {
  const { result } = await run("nan");

  expect(result.initialDefined).toBe(false);
  expect(result.finalIsNaN).toBe(true);
  expect(result.finalChanges).toBe(1);
});
