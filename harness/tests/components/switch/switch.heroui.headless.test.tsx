import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
  options: { platform?: "windows" | "web" } = {},
) {
  return open("../../../switch.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

/*
 * Headless-only Switch cases: both hold a press with `dragAndHold` / `drop`,
 * which only the headless engine and the Linux host run ("Real hosts" in the
 * loop brief). They keep their titles and upstream comments unchanged.
 */

// react-aria/src/toggle/useToggle.ts:186,223
test("X-005 keeps a read-only switch out of the pressed state", async () => {
  const app = await openCase("readonly-selected");
  const control = "role:switch[Enable notifications]";

  expect(app.shows("text:NotPressed")).toBe(true);

  await app.dragAndHold(control, { x: 0, y: 0 });
  expect(app.shows("text:NotPressed")).toBe(true);
  expect(app.shows("text:On")).toBe(true);

  await app.drop();
  expect(app.shows("text:NotPressed")).toBe(true);
});

// react-aria/src/toggle/useToggle.ts:134-147
test("X-007 shows the pressed state while the Label is held down", async () => {
  const app = await openCase("press");

  expect(app.shows("text:NotPressed")).toBe(true);

  await app.dragAndHold("text:Enable notifications", { x: 0, y: 0 });
  expect(app.shows("text:Pressed")).toBe(true);

  await app.drop();
  expect(app.shows("text:NotPressed")).toBe(true);
});
