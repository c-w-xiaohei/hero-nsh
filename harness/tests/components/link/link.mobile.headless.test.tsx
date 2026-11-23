import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only halves of the link adapt unit's M-003 and M-004
 * (adapt-sheets/link.md §4). Both depend on `app.hover`, a mouse gesture
 * the ios/android targets cannot perform, and on the `platform:"windows"`
 * pin that creates the pointer host — this local file keeps both. The
 * shared `link.mobile.test.tsx` file carries the press/disabled/hitSlop
 * halves, which run on every target.
 *
 *   M-003  T-004 parity: under the pointer baseline, hover still raises
 *          the underline.
 *   M-004  under injected touch a hover's `onHover` callbacks still fire
 *          but paint no underline (the axis drops the hover classes);
 *          under pointer the same case keeps the desktop hover style.
 */

function openLink(
  caseName: string,
  scope?: "touch" | "pointer",
): Promise<App> {
  return open("../../../link.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...(scope ? { scope } : {}) } },
  });
}

describe("link mobile headless", () => {
  test("M-003 hover half: pointer baseline hover still raises the underline (T-004)", async () => {
    const app = await openLink("basic", "pointer");

    await app.hover("id:link-under-test");
    expect(callsOf(app, "onHover")).toContainEqual(["start"]);
    expect(
      app.spanStyle("id:link-under-test >> text:Link label").underline,
    ).toBe(true);
  }, 120_000);

  test("M-004 hover half: touch hover paints no underline, pointer keeps it", async () => {
    const touch = await openLink("basic", "touch");

    await touch.hover("id:link-under-test");
    expect(callsOf(touch, "onHover")).toContainEqual(["start"]);
    expect(
      touch.spanStyle("id:link-under-test >> text:Link label").underline,
    ).toBe(false);

    const pointer = await openLink("basic", "pointer");
    await pointer.hover("id:link-under-test");
    expect(
      pointer.spanStyle("id:link-under-test >> text:Link label").underline,
    ).toBe(true);
  }, 120_000);
});
