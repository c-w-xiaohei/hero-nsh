import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import * as combo from "../../testers/combo-box";

/*
 * Headless-only ComboBox cases: this one holds the trigger down with
 * `dragAndHold` / `drop`, which only the headless engine and the Linux host run
 * ("Real hosts" in the loop brief). It stays out of the plain files so the web
 * and Windows targets do not report the engine's missing API as a component
 * failure.
 */

function openCase(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../combo-box.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    clock: {},
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

// src/components/combo-box/combo-box-trigger.tsx:36-96 (review finding);
// upstream packages/react/src/components/combo-box/combo-box.tsx:170-176:
// the trigger's `onPressStart` / `onPressUp` / `onPressEnd` follow Button's
// phases — start and change(true) on press-down, up / press / end and
// change(false) on release — instead of both landing at activation.
test("X-011 follows Button's press phases on the trigger", async () => {
  const app = await openCase("log");

  expect(callsOf(app, "triggerPressStart")).toHaveLength(0);
  expect(callsOf(app, "triggerPressChange")).toHaveLength(0);

  await app.dragAndHold(combo.COMBO_BOX_TRIGGER, { x: 0, y: 0 });

  expect(callsOf(app, "triggerPressStart")).toHaveLength(1);
  expect(callsOf(app, "triggerPressChange")).toEqual([[true]]);
  expect(callsOf(app, "triggerPressUp")).toHaveLength(0);
  expect(callsOf(app, "triggerPressEnd")).toHaveLength(0);

  await app.drop();
  await app.clock!.runFor(20);

  expect(callsOf(app, "triggerPressUp")).toHaveLength(1);
  expect(callsOf(app, "triggerPress")).toHaveLength(1);
  expect(callsOf(app, "triggerPressEnd")).toHaveLength(1);
  expect(callsOf(app, "triggerPressChange")).toEqual([[true], [false]]);
  expect(combo.getListbox(app)).toBe(true);
});
