import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only ColorArea case: T-004 adjusts the value with the arrow keys after
 * Tab moved the keyboard focus onto the Thumb. NSH 0.4.0's Windows host never
 * gives a non-Input view keyboard focus (registered difference), so the case
 * runs on `--target web`, which does move focus with Tab. It keeps its upstream
 * title and line.
 *
 * The focus assertion below is not upstream's: it is the state the keymap
 * binding is gated on, and it tells a real failure apart from a focus that
 * never arrived.
 */

type RecordedColor = { hue: number; saturation: number; hsl: string };

// heroui/packages/react/tests/components/color-area/color-area.test.tsx:57
test("T-004 calls onChange with an updated color when adjusted via arrow keys", async () => {
  const app = await open("../../../color-area.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: "keyboard" } },
  });

  // On `--target web` `open` can resolve before the first commit.
  await app.waitFor("id:value", { timeout: 15_000 });

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);

  await app.keyboard.press("arrowright");
  await app.waitUntil(() => callsOf(app, "onChange").length > 0, { timeout: 15_000 });

  const changes = callsOf(app, "onChange").map((args) => args[0] as RecordedColor);
  const last = changes[changes.length - 1];

  expect(changes.length).toBeGreaterThan(0);
  expect(last?.hue).toBeGreaterThan(200);
  expect(last?.hsl).not.toBe("hsl(200, 50%, 50%)");
});
