import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only ColorArea cases: both hold the finger down with `dragAndHold` /
 * `drop`, which only the headless engine and the Linux host run ("Real hosts"
 * in the loop brief) — on the web a press is down and up in one step.
 *
 * X-004 covers the dragging state RAC exposes through the render prop
 * (react-aria/src/color/useColorArea.ts:189-290, R-022); X-005 covers the
 * 16-to-20pt thumb size switch (styles/components/color-area.css:40-44, R-017).
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function lastLayout(app: App, name: string): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

function openFixture(name: string): Promise<App> {
  return open("../../../color-area.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: name } },
  });
}

test("X-004 reports dragging while the finger is down and ends once", async () => {
  const app = await openFixture("drag");

  expect(app.shows("text:Idle")).toBe(true);

  await app.dragAndHold("id:area", { x: 50, y: 0 });

  expect(app.shows("text:Dragging")).toBe(true);
  expect(callsOf(app, "onChange").length).toBeGreaterThanOrEqual(1);
  // Nothing is committed until the finger lifts.
  expect(callsOf(app, "onChangeEnd")).toHaveLength(0);

  await app.drop();

  expect(app.shows("text:Idle")).toBe(true);
  expect(callsOf(app, "onChangeEnd")).toHaveLength(1);
});

test("X-005 grows the thumb to 20pt while dragging and back to 16pt", async () => {
  const app = await openFixture("geometry");

  expect(lastLayout(app, "thumb").width).toBe(16);

  await app.dragAndHold("id:area", { x: 50, y: 0 });
  await app.wait(50);

  const held = lastLayout(app, "thumb");

  expect(held.width).toBe(20);
  expect(held.height).toBe(20);

  await app.drop();
  await app.wait(50);

  const released = lastLayout(app, "thumb");

  expect(released.width).toBe(16);
  expect(released.height).toBe(16);
});
