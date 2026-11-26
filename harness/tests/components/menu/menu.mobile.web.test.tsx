import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target half of the menu mobile unit: the rows that need `app.hover`
 * (desktop/web-only — ios/android reject it). See menu.mobile.test.tsx
 * for the shared halves and the fixture contract; `platform:"web"` keeps
 * the original windows-pin baseline shape while `input:"pointer"` injects
 * the desktop-parity environment the same way the shared file does.
 */

type Params = Record<string, string>;

function openMenu(
  caseName: string,
  params: Params = {},
): Promise<App> {
  return open("../../../menu.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, input: "pointer", ...params } },
  });
}

type HoverEntry = { row: string; kind: string; value?: boolean };

function hovers(app: App, row: string): HoverEntry[] {
  return callsOf(app, "hover")
    .map((c) => c[0] as HoverEntry)
    .filter((e) => e.row === row);
}

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

/** Press a probe-bar row and wait for its named probe call to land. */
async function pressProbe(
  app: App,
  rowId: string,
  probeName: string,
): Promise<void> {
  const before = callsOf(app, probeName).length;
  await app.press(`id:${rowId}`);
  await app.waitUntil(() => callsOf(app, probeName).length > before);
}

describe("menu mobile (web)", () => {
  // adapt-sheets/menu.md M-003 (A-002): injected touch suppresses the hover
  // channel — `handleMouseEnter`/`Leave` neither write `isHovered` nor run
  // `onHover*` nor move `focusedKey`; the raw `onMouseEnter`/`onMouseLeave`
  // prop callbacks still report (switch/tabs precedent). The default
  // environment keeps the full hover roundtrip including the focus move.
  test("M-003 touch suppresses hover state and callbacks; pointer keeps the roundtrip", async () => {
    const touch = await openMenu("m-seam", { input: "touch" });

    await touch.hover("id:row-a");
    await touch.wait(300);

    // No useHover record of any kind for row a — only the raw host events.
    expect(
      hovers(touch, "a").filter((e) =>
        ["start", "end", "change"].includes(e.kind),
      ),
    ).toHaveLength(0);
    // The render-prop flag never rose: no ` H` marker in row a's text.
    expect(touch.texts().some((t) => t === "Alpha H" || t === "Alpha H F")).toBe(
      false,
    );
    // The virtual focus never followed the synthetic enter.
    await pressProbe(touch, "focused", "focusedKey");
    expect(lastOf<string | null>(touch, "focusedKey")).toBeNull();

    const pointer = await openMenu("m-seam");
    await pointer.hover("id:row-a");
    await pointer.wait(300);

    expect(hovers(pointer, "a")).toContainEqual({ row: "a", kind: "start" });
    expect(hovers(pointer, "a")).toContainEqual({
      row: "a",
      kind: "change",
      value: true,
    });
    expect(pointer.texts()).toContain("Alpha H");
    await pressProbe(pointer, "focused", "focusedKey");
    expect(lastOf<string | null>(pointer, "focusedKey")).toBe("a");

    await pointer.hover("id:after");
    await pointer.wait(300);
    expect(hovers(pointer, "a")).toContainEqual({ row: "a", kind: "end" });
    expect(hovers(pointer, "a")).toContainEqual({
      row: "a",
      kind: "change",
      value: false,
    });
    expect(pointer.texts()).not.toContain("Alpha H");
  }, 120_000);
});
