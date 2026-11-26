import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only halves of the pagination adapt unit (adapt-sheets/
 * pagination.md §4) that cannot run on the ios/android targets: they need
 * `app.hover` (a mouse gesture), `open({width})`/`app.setViewport` (a
 * resizable window — a real phone's screen is fixed) or a ≥640 px
 * viewport for `sm:`/`md:` breakpoint literals. This local file keeps the
 * `platform:"windows"` pin; the shared `pagination.mobile.test.tsx`
 * carries every viewport-independent assertion.
 *
 *   M-004  the hover halves: touch's hover paints no background, pointer's
 *          paints `bg-default-hover`.
 *   M-008  the 360 px viewport: `shows()` visibility under overflow and
 *          the `flex-col sm:flex-row` vertical stacking under 640 px.
 *   M-009  the exact `md:`-shrunk size bounds (28/32/36).
 *   M-011  the Ellipsis hover half: a hover changes nothing either.
 */

type Params = Record<string, string>;

function openPagination(
  caseName: string,
  params: Params = {},
  width = 1024,
): Promise<App> {
  return open("../../../pagination.fixtures.tsx", {
    platform: "windows",
    width,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

type Box = { name: string; x: number; y: number; width: number; height: number };

function lastBoxes(app: App): Record<string, Box> {
  const out: Record<string, Box> = {};
  for (const call of callsOf(app, "layout")) {
    const b = call[0] as Box;
    out[b.name] = b;
  }
  return out;
}

async function waitForBoxes(app: App, names: string[]): Promise<void> {
  await app.waitUntil(() =>
    names.every((n) => callsOf(app, "layout").some((c) => (c[0] as Box).name === n)),
  );
}

describe("pagination mobile headless", () => {
  test("M-004 hover half: touch hover paints no background; pointer keeps the hover background", async () => {
    const touch = await openPagination("press", { scope: "touch" });
    const base = touch.viewStyle("id:link-2")?.backgroundColor;

    await touch.hover("id:link-2");
    await touch.wait(100);
    expect(touch.viewStyle("id:link-2")?.backgroundColor).toBe(base);

    await touch.press("id:link-2");
    await touch.waitUntil(() =>
      callsOf(touch, "events").some((c) => c[0] === "link-2" && c[1] === "press"),
    );
    expect(touch.viewStyle("id:link-2")?.backgroundColor).toBe(base);

    const pointer = await openPagination("press", { scope: "pointer" });
    const pointerBase = pointer.viewStyle("id:link-2")?.backgroundColor;
    await pointer.hover("id:link-2");
    await pointer.wait(100);
    const pointerHover = pointer.viewStyle("id:link-2")?.backgroundColor;
    expect(pointerHover).toBeDefined();
    expect(pointerHover).not.toBe(pointerBase);
  }, 120_000);

  test("M-008 360px viewport: summary stacks above the content row under 640px, overflow parts render", async () => {
    for (const scope of ["pointer", "touch"] as const) {
      const app = await openPagination("overflow", { scope }, 360);

      await app.waitUntil(() => app.shows("text:Page 4 of 9"));
      // `shows()` is viewport-bound: at 360 px the single content row
      // overflows, so the trailing links, the end Ellipsis and Next sit
      // off-screen. Their render is proven by the `layout` boxes the
      // shared file reads — every part reports `onLayout` whether or not
      // it is in view.
      expect(app.shows("text:Page 4 of 9")).toBe(true);
      expect(app.shows("text:Previous")).toBe(true);
      expect(app.shows("text:1")).toBe(true);
      expect(app.texts()).toContain("…");

      // Vertical stacking: `sm:flex-row` is inactive under 640 px, so the
      // content row sits below the summary.
      await waitForBoxes(app, ["summary", "content"]);
      const stacked = lastBoxes(app);
      expect(stacked["content"]!.y).toBeGreaterThanOrEqual(
        stacked["summary"]!.y + stacked["summary"]!.height,
      );
    }
  }, 120_000);

  test("M-009 size pin: the three sizes lay out at the md:-shrunk 28/32/36 bounds", async () => {
    const sizes = await openPagination("sizes", { scope: "pointer" });
    await waitForBoxes(sizes, ["size-sm", "size-md", "size-lg"]);
    const boxes = lastBoxes(sizes);
    expect(Math.round(boxes["size-sm"]!.width)).toBe(28);
    expect(Math.round(boxes["size-sm"]!.height)).toBe(28);
    expect(Math.round(boxes["size-md"]!.width)).toBe(32);
    expect(Math.round(boxes["size-md"]!.height)).toBe(32);
    expect(Math.round(boxes["size-lg"]!.width)).toBe(36);
    expect(Math.round(boxes["size-lg"]!.height)).toBe(36);
  }, 120_000);

  test("M-011 hover half: a hover on the Ellipsis changes nothing", async () => {
    const app = await openPagination("press", { scope: "pointer" });
    const before = app.spanStyle("id:ellipsis >> text:…")?.color;
    await app.hover("id:ellipsis");
    await app.wait(100);
    expect(app.spanStyle("id:ellipsis >> text:…")?.color).toBe(before);
  }, 120_000);
});
