import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only ColorSlider cases (port sheet 4b, T-003 and T-004). Both move the
 * keyboard focus with Tab and then press an arrow key, which the web target does
 * and a real Windows window does not: NSH 0.4.0's Win32 host gives keyboard
 * focus only to Inputs ("Windows keyboard focus" in the loop brief, registered
 * as an approved difference). They are not narrowed to hide a Windows failure;
 * they cannot run there for a host reason.
 *
 * The upstream tests focus a hidden `input[type=range]` and read `onChange`.
 * NSH has no hidden input: the thumb itself is focusable, so the focus probe on
 * the thumb replaces "the input took focus", and the fixture stores the channel
 * number because a Color object does not survive Storage.
 */

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../color-slider.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/color-slider/color-slider.test.tsx:55
// Rewritten port (port sheet T-003): the hidden input's focus becomes the thumb's
// onFocus probe, and the last onChange payload must carry a hue greater than 0
// (the fixture stores the number, so the test never parses a color).
test("T-003 calls onChange with an updated hue when the channel is adjusted via arrow keys", async () => {
  const app = await openCase("keyboard");

  expect(app.shows("role:adjustable[Hue]")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);

  await app.keyboard.press("arrowright");
  await app.clock!.runFor(20);

  const changes = callsOf(app, "onChange");

  expect(changes.length).toBeGreaterThan(0);
  expect(Number(changes[changes.length - 1]?.[0])).toBeGreaterThan(0);
});

// heroui/packages/react/tests/components/color-slider/color-slider.test.tsx:72
// Rewritten port (port sheet T-004): the single upstream assertion that
// `onChange` was not called becomes two failing-capable facts: the disabled
// state really reached the thumb (`enabled` is false), and neither Tab nor an
// arrow key reaches the value (no focus probe, no onChange probe).
test("T-004 supports disabled state and blocks keyboard interaction", async () => {
  const app = await openCase("disabled");
  const thumb = "role:adjustable[Hue]";

  expect(app.shows(thumb)).toBe(true);
  expect(app.enabled(thumb)).toBe(false);

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowright");
  await app.clock!.runFor(20);

  expect(callsOf(app, "onFocus")).toHaveLength(0);
  expect(callsOf(app, "onChange")).toHaveLength(0);
});
