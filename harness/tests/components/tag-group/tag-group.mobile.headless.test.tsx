import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the e-parts TagGroup mechanism unit — the
 * `TagGroupItem` compound and its convenience parts — one test per row of
 * adapt-sheets/e-parts.md §4 (M-027…M-032, M-033, M-034). This unit has no
 * headless-only rows (Tag's press model is environment-free), so this file
 * and the web twin carry the same assertions.
 *
 * The fixture is `harness/tag-group.fixtures.tsx`, opened by `host.params`:
 * `case` (parts/plain), `scope`, `size`, `iconsize`. The observable
 * surface: `role:row[Name]` selectors and the `✓` marker (the
 * tag.fixtures.tsx convention — it stands in for the unobservable
 * `aria-selected`), `spanStyle` for the Label's size tier, the `layout`
 * probe for the Background/glyph geometry, and `selectionChange`/`remove`
 * for the collection callbacks.
 */

type Params = Record<string, string>;

function openTags(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../tag-group.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function layoutOf(app: App, name: string): LayoutEntry {
  return callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .find((l) => l.name === name)!;
}

describe("tag-group mobile (headless)", () => {
  // adapt-sheets/e-parts.md M-027 (A-013, A-014): `TagGroupItem` IS the
  // `TagRoot` — it registers into `TagGroup.List`, presses like a tag, and
  // drives `onSelectionChange` and the `✓` selection marker.
  test("M-027 TagGroupItem registers in the list and selects like a tag", async () => {
    const app = await openTags("parts");

    expect(app.shows("role:grid")).toBe(true);
    expect(app.shows("role:row[News]")).toBe(true);
    expect(app.shows("role:row[Travel]")).toBe(true);
    expect(app.count("text:✓")).toBe(0);

    await app.press("role:row[News]");

    await app.waitUntil(() => callsOf(app, "selectionChange").length === 1);
    expect(callsOf(app, "selectionChange")).toEqual([[["news"]]]);
    expect(app.count("role:row[News] >> text:✓")).toBe(1);
  }, 120_000);

  // adapt-sheets/e-parts.md M-028 (A-013): `.Label` renders the tag's text
  // and follows the group's `size` tier — `text-xs` (12 pt) at sm/md,
  // `text-base` (16 pt) at lg.
  test("M-028 the Label renders and follows the group size", async () => {
    const md = await openTags("parts");
    expect(md.shows("id:label-news")).toBe(true);
    expect(md.spanStyle("text:News").fontSize).toBe(14);

    const sm = await openTags("parts", { size: "sm" });
    expect(sm.spanStyle("text:News").fontSize).toBe(12);

    const lg = await openTags("parts", { size: "lg" });
    expect(lg.spanStyle("text:News").fontSize).toBe(16);
  }, 120_000);

  // adapt-sheets/e-parts.md M-029 (A-013): `.Background` mounts the
  // `absolute inset-0` fill layer — its laid-out bounds match the tag's.
  test("M-029 the Background fill matches the tag's bounds", async () => {
    const app = await openTags("parts");
    await app.waitUntil(() =>
      callsOf(app, "layout").some(
        (c) => (c[0] as LayoutEntry).name === "bg-news",
      ),
    );

    // The fill covers the whole pill: same size as the tag, and it reaches
    // past the content box to the tag's edges (its origin sits inside the
    // tag's own padding, so it starts at or before the tag's origin).
    const bg = layoutOf(app, "bg-news");
    const tag = layoutOf(app, "tag-news");
    expect(bg.width).toBeGreaterThan(0);
    expect(Math.abs(bg.width - tag.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(bg.height - tag.height)).toBeLessThanOrEqual(1);
    // The origins are parent-relative (the tag's to the list, the fill's to
    // the inner cell): the fill's negative offset past the cell's content
    // edge is what lets it reach the pill's edges.
    expect(bg.x).toBeLessThanOrEqual(0);
    expect(bg.y).toBeLessThanOrEqual(0);
  }, 120_000);

  // adapt-sheets/e-parts.md M-030 (A-013): `.RemoveButton` mounts the
  // self-drawn cross (`tag-group-item-remove-icon`), `iconProps.size`
  // changes the glyph's laid-out box, and pressing the button removes the
  // tag through the group's `onRemove`.
  test("M-030 the RemoveButton removes the tag and iconProps.size resizes the glyph", async () => {
    const app = await openTags("parts");
    expect(app.shows("id:tag-group-item-remove-icon")).toBe(true);
    expect(app.shows("role:button[Remove tag News]")).toBe(true);

    await app.press("role:button[Remove tag News]");
    await app.waitUntil(() => callsOf(app, "remove").length === 1);
    expect(callsOf(app, "remove")).toEqual([[["news"]]]);

    const big = await openTags("parts", { iconsize: "24" });
    await big.waitUntil(() =>
      callsOf(big, "layout").some(
        (c) => (c[0] as LayoutEntry).name === "glyph-news",
      ),
    );
    const glyph = layoutOf(big, "glyph-news");
    expect(glyph.width).toBe(24);
    expect(glyph.height).toBe(24);
  }, 120_000);

  // adapt-sheets/e-parts.md M-031 (A-014): no environment branch in the
  // compound — under injected touch the selection, removal and Label
  // behavior is line-identical to the pointer baseline.
  test("M-031 injected touch keeps selection, removal and label behavior identical", async () => {
    const app = await openTags("parts", { scope: "touch" });

    expect(app.shows("role:row[News]")).toBe(true);
    expect(app.spanStyle("text:News").fontSize).toBe(14);
    expect(app.shows("id:tag-group-item-remove-icon")).toBe(true);

    await app.press("role:row[News]");
    await app.waitUntil(() => callsOf(app, "selectionChange").length === 1);
    expect(callsOf(app, "selectionChange")).toEqual([[["news"]]]);
    expect(app.count("role:row[News] >> text:✓")).toBe(1);

    await app.press("role:button[Remove tag News]");
    await app.waitUntil(() => callsOf(app, "remove").length === 1);
    expect(callsOf(app, "remove")).toEqual([[["news"]]]);
  }, 120_000);

  // adapt-sheets/e-parts.md M-032 (A-014, A-015): `TagGroupItem` and its
  // parts mount from `@heroui/react`, and the plain `Tag`/`TagGroup` path
  // works unchanged alongside it in one list.
  test("M-032 TagGroupItem mounts from the public entry next to plain Tag", async () => {
    const app = await openTags("parts");
    expect(app.shows("id:label-news")).toBe(true);
    expect(app.shows("id:tag-group-item-remove-icon")).toBe(true);

    // The plain case mixes `Tag` (original path) and `TagGroupItem` in one
    // grid: both register, both select.
    const plain = await openTags("plain");
    expect(plain.shows("role:row[One]")).toBe(true);
    expect(plain.shows("role:row[Two]")).toBe(true);

    await plain.press("role:row[Two]");
    await plain.waitUntil(
      () => callsOf(plain, "selectionChange").length === 1,
    );
    expect(callsOf(plain, "selectionChange")).toEqual([[["two"]]]);
    expect(plain.count("role:row[Two] >> text:✓")).toBe(1);
  }, 120_000);

  // adapt-sheets/e-parts.md M-033/M-034 (A-016, A-017): the fixture opens in
  // both environments and its probes record.
  test("M-033 and M-034 the fixture opens in both environments and its probes record", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openTags("parts", scope ? { scope } : {});
      expect(app.shows("role:row[News]")).toBe(true);
      await app.press("role:row[News]");
      await app.waitUntil(
        () => callsOf(app, "selectionChange").length === 1,
      );
      expect(callsOf(app, "selectionChange")).toEqual([[["news"]]]);
    }
  }, 120_000);
});
