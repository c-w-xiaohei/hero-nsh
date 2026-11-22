import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the alert adapt unit, one test per row of
 * adapt-sheets/alert.md §4 (M-001…M-004). The fixture is
 * `harness/alert.fixtures.tsx`: case "mobile" mounts the probed alert (root,
 * indicator and content each report their box over `onLayout`, plus a second
 * alert in a 200pt box for the narrow-width `flex-auto` check) under
 * `EnvironmentScope` driven by `host.params.input` / `host.params.density`.
 *
 * Absent params leave the host-derived environment — pointer + default
 * density on headless and web — which is the desktop-parity baseline every
 * assertion compares against. `platform:"windows"` is the pointer host both
 * targets share (the .mobile.test.tsx convention). The observation channel
 * is what `nsh/test` sees: `shows`, `spanStyle`, `count`, and the `onLayout`
 * bounds records; class names are not observable, so the density axis is
 * read through the laid-out geometry it produces.
 */

type Box = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type EnvParams = {
  input?: "pointer" | "touch";
  density?: "default" | "compact";
};

function openMobile(env: EnvParams = {}): Promise<App> {
  return open("../../../alert.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    clock: {},
    host: {
      params: {
        case: "mobile",
        ...(env.input ? { input: env.input } : {}),
        ...(env.density ? { density: env.density } : {}),
      },
    },
  });
}

function boxes(app: App): Box[] {
  return callsOf(app, "layout").map((args) => args[0] as Box);
}

/** Waits until every probed box has reported at least once. */
async function settleLayout(app: App): Promise<void> {
  await app.waitUntil(() =>
    [
      "root",
      "indicator",
      "content",
      "narrow-root",
      "narrow-indicator",
      "narrow-content",
    ].every((name) => boxes(app).some((box) => box.name === name)),
  );
}

/**
 * name → sorted unique bounds. onLayout can fire more than once per view;
 * comparing the set of distinct boxes keeps repeat firings honest without
 * depending on how many frames the layout took.
 */
function boxSet(app: App): Record<string, string[]> {
  const groups: Record<string, Set<string>> = {};
  for (const box of boxes(app)) {
    const key = JSON.stringify({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    });
    (groups[box.name] ??= new Set()).add(key);
  }
  const out: Record<string, string[]> = {};
  for (const [name, set] of Object.entries(groups)) {
    out[name] = [...set].sort();
  }
  return out;
}

/** The probed box of one part. */
function boxOf(app: App, name: string): Box {
  return boxes(app).find((box) => box.name === name)!;
}

/** The base row gap: space between the indicator and the content, in points. */
function indicatorGap(app: App): number {
  const indicator = boxOf(app, "indicator");
  const content = boxOf(app, "content");
  return Math.round(content.x - (indicator.x + indicator.width));
}

const PART_IDS = [
  "alert-root",
  "alert-indicator",
  "alert-content",
  "alert-title",
  "alert-description",
];

function allPartsShown(app: App): void {
  for (const id of PART_IDS) {
    expect(app.shows(`id:${id}`)).toBe(true);
  }
}

describe("alert mobile", () => {
  // adapt-sheets/alert.md M-001 (A-001, baseline): the host-derived
  // environment — pointer + default density — renders all five parts with
  // the ported geometry unchanged: gap-4 (16pt) between indicator and
  // content, p-1 (4pt) of indicator padding around the 16pt default icon
  // (24pt box), py-3 (12pt) of root vertical padding over the content. The
  // title keeps its text. alert.heroui.test.tsx keeps pinning the desktop
  // contract; this row asserts the same geometry on the scoped fixture.
  test("M-001 default environment: all parts visible with the ported layout", async () => {
    const app = await openMobile();

    await settleLayout(app);

    allPartsShown(app);
    expect(app.shows("id:alert-title >> text:Update available")).toBe(true);
    expect(
      app.shows("id:alert-description >> text:A new version is ready to install."),
    ).toBe(true);

    // 现值: gap-4 = 16pt, p-1 → 16pt icon + 2×4pt pad = 24pt indicator box,
    // py-3 → root height = content height + 2×12pt.
    expect(indicatorGap(app)).toBe(16);
    expect(Math.round(boxOf(app, "indicator").width)).toBe(24);
    const root = boxOf(app, "root");
    const content = boxOf(app, "content");
    expect(Math.round(root.height - content.height)).toBe(24);
    // flex-auto keeps the content wide inside the row, not squeezed to zero.
    expect(Math.round(content.width)).toBeGreaterThan(0);

    // The narrow twin: in a 200pt box the description's max-content width
    // (~200pt) exceeds the ~128pt the row leaves the content, so only
    // `flex-auto`'s shrink side keeps both texts on screen — they show, the
    // content box stays inside the row's leftover width, and nothing clips
    // to zero height.
    expect(app.shows("id:alert-narrow-title >> text:Update available")).toBe(
      true,
    );
    expect(
      app.shows(
        "id:alert-narrow-description >> text:A new version is ready to install.",
      ),
    ).toBe(true);
    const narrowRoot = boxOf(app, "narrow-root");
    const narrowContent = boxOf(app, "narrow-content");
    // px-4×2 + indicator 24 + gap 16 = 72pt of non-content row width.
    expect(Math.round(narrowContent.width)).toBeLessThanOrEqual(
      Math.round(narrowRoot.width) - 72,
    );
    expect(Math.round(narrowContent.width)).toBeGreaterThan(0);
    expect(Math.round(narrowContent.height)).toBeGreaterThan(0);
  });

  // adapt-sheets/alert.md M-002 (A-001, A-003): injected touch changes no
  // laid-out box — the table has no `input` axis and no part is pressable,
  // so visible size never follows the input modality. The warning status's
  // spanStyle is unchanged as well.
  test("M-002 injected touch: identical boxes and status styling", async () => {
    const touch = await openMobile({ input: "touch" });
    const pointer = await openMobile();

    await settleLayout(touch);
    await settleLayout(pointer);

    allPartsShown(touch);
    expect(boxSet(touch)).toEqual(boxSet(pointer));

    const title = "id:alert-title >> text:Update available";
    expect(touch.spanStyle(title).color).toBe(pointer.spanStyle(title).color);
  });

  // adapt-sheets/alert.md M-003 (A-001): `density` owns the gap and padding
  // literals — `compact` tightens every one one step (gap-4→gap-3 = 12pt,
  // py-3→py-2.5 = 10pt per side, p-1→p-0.5 → 20pt indicator box) while the
  // texts stay visible, and an explicit `density="default"` scope resolves
  // to the same boxes as no scope.
  test("M-003 density compact shrinks gap, padding and indicator box; explicit default matches", async () => {
    const compact = await openMobile({ density: "compact" });
    const plain = await openMobile();
    const explicit = await openMobile({ density: "default" });

    await settleLayout(compact);
    await settleLayout(plain);
    await settleLayout(explicit);

    // Baseline values as in M-001.
    expect(indicatorGap(plain)).toBe(16);
    expect(Math.round(boxOf(plain, "indicator").width)).toBe(24);

    // compact: every spacing literal strictly tighter, still > 0.
    expect(indicatorGap(compact)).toBe(12);
    expect(Math.round(boxOf(compact, "indicator").width)).toBe(20);
    const compactRoot = boxOf(compact, "root");
    const compactContent = boxOf(compact, "content");
    expect(Math.round(compactRoot.height - compactContent.height)).toBe(20);
    expect(compactRoot.height).toBeLessThan(boxOf(plain, "root").height);

    // The tighter row does not clip the texts.
    allPartsShown(compact);
    expect(compact.shows("id:alert-title >> text:Update available")).toBe(true);
    expect(
      compact.shows(
        "id:alert-description >> text:A new version is ready to install.",
      ),
    ).toBe(true);

    // An explicit default scope lays out exactly like the uninjected one.
    expect(boxSet(explicit)).toEqual(boxSet(plain));
  });

  // adapt-sheets/alert.md M-004 (A-002, A-003, A-004): there is nothing to
  // press — under an injected touch environment `app.press` finds no
  // pressable view on the root or the indicator, which is the press-noop
  // the sheet's zero-negative-assertion row asks for. Bounds, spanStyle and
  // the visible part count are unchanged, and the only probe traffic the
  // case ever records is `layout`: a touch environment creates no behavior
  // path where none exists.
  test("M-004 injected touch: no pressable surface exists on any part", async () => {
    const app = await openMobile({ input: "touch" });

    await settleLayout(app);

    const before = boxSet(app);
    const titleColor = app.spanStyle(
      "id:alert-title >> text:Update available",
    ).color;
    const partCount = PART_IDS.filter((id) => app.shows(`id:${id}`)).length;

    await expect(app.press("id:alert-root")).rejects.toThrow(
      "no pressable view matches",
    );
    await expect(app.press("id:alert-indicator")).rejects.toThrow(
      "no pressable view matches",
    );

    expect(boxSet(app)).toEqual(before);
    expect(
      app.spanStyle("id:alert-title >> text:Update available").color,
    ).toBe(titleColor);
    expect(PART_IDS.filter((id) => app.shows(`id:${id}`)).length).toBe(
      partCount,
    );

    // The only probe calls the case can ever record are the layout boxes —
    // no press or gesture callback exists to add anything else.
    const names = new Set(calls(app).map((call) => call.name));
    expect([...names]).toEqual(["layout"]);
  });
});
