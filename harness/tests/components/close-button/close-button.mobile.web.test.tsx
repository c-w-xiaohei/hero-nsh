import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only mobile assertion for the close-button adapt unit:
 * adapt-sheets/close-button.md §4 M-005 lives here because the sticky-hover
 * half is a web behavior — a web press leaves `hover:` styles applied after
 * the pointer is gone, which is exactly what the `input` axis suppresses under
 * `input="touch"`. The headless run cannot observe that persistence.
 */

function openCloseButton(
  caseName: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../close-button.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

describe("close-button mobile (web)", () => {
  // adapt-sheets/close-button.md M-005 (A-001): under injected touch the
  // `hover:` variant produces nothing, so neither a hover nor the press that
  // follows it can leave a background behind — `backgroundColor` is identical
  // before and after. The pointer control proves the style is observable at
  // all, so the touch half cannot pass vacuously.
  test("M-005 touch suppresses the sticky hover background on web", async () => {
    const pointer = await openCloseButton("events");
    await pointer.hover("id:cb-probe");
    await pointer.waitUntil(
      () => pointer.viewStyle("id:cb-probe")?.backgroundColor !== undefined,
    );
    expect(pointer.viewStyle("id:cb-probe")?.backgroundColor).toBeDefined();

    const app = await openCloseButton("events", { testInput: "touch" });
    const before = app.viewStyle("id:cb-probe")?.backgroundColor;

    await app.hover("id:cb-probe");
    expect(app.viewStyle("id:cb-probe")?.backgroundColor).toBe(before);

    await app.press("id:cb-probe");
    expect(callsOf(app, "press")).toHaveLength(1);
    expect(app.viewStyle("id:cb-probe")?.backgroundColor).toBe(before);
  }, 120_000);
});
