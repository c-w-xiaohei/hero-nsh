import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the kbd adapt unit, one test per row of
 * adapt-sheets/kbd.md §4 (M-001…M-007). Every 落点 in the sheet is 保留:
 * the variant table takes no `input`/`density` cell, no gesture or
 * presentation seam applies, so these tests pin the unchanged contract —
 * the keycap's box, glyph and title channel render identically in the
 * default environment and under injected touch/density, and no press path
 * exists on either side.
 *
 * The fixture is `harness/kbd.fixtures.tsx` — `host.params.case` picks the
 * shape (`basic`, `keys`, `variants`, `inline`, `bare-text`, `title`) and
 * `input`/`density` feed `EnvironmentScope` (absent = the host default,
 * pointer — the desktop-parity baseline). Probes in `app.storage()`:
 * `layout` (each root's full bounds box) and `env` (the host's
 * `platform.os`/`platform.desktop`, which M-007's pin assertion reads).
 *
 * `open` keeps the w1 pin (`platform:"windows"`, 1024×768): without it the
 * headless engine lands on the phone host where `input` defaults to touch
 * and every pointer-default assertion inverts. No `ios`/`android` open and
 * no drag case, so this is a dual-target `.mobile.test.tsx`.
 */

type Env = { input?: "touch"; density?: "compact" };

function openKbd(caseName: string, env: Env = {}): Promise<App> {
  return open("../../../kbd.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...env } },
  });
}

type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function layouts(app: App): LayoutEntry[] {
  return callsOf(app, "layout").map((c) => c[0] as LayoutEntry);
}

/** The bounds box a root's `onLayout` probe recorded, by probe name. */
function rootBox(app: App, name: string): LayoutEntry {
  const box = layouts(app).find((e) => e.name === name);

  if (!box) {
    throw new Error(`no layout report for ${name}`);
  }

  return box;
}

type EnvReport = { os: string; desktop: boolean };

function envOf(app: App): EnvReport {
  return callsOf(app, "env").at(-1)?.[0] as EnvReport;
}

/* The deduplicated `kbdKeysMap` glyph table (`win` repeats `⌘`, `alt`
 * repeats `⌥`): 23 `KbdKey`s mount, 21 distinct glyph texts show. */
const GLYPHS = [
  "⌘", "⇧", "⌃", "⌥", "↵", "⌫", "⎋", "⇥", "⇪", "↑", "→",
  "↓", "←", "⇞", "⇟", "↖", "↘", "?", "␣", "Fn",
];

describe("kbd mobile", () => {
  // adapt-sheets/kbd.md M-001 (基线): default environment — `basic` shows
  // the glyph and the key label, the root's box is exactly 24 pt tall
  // (`h-6`), the resolved span is 14 pt (`text-sm`), and `keys` mounts the
  // whole `kbdKeysMap` glyph table — the same render `kbd.heroui.test.tsx`
  // T-001 pins.
  test("M-001 default environment: basic renders, root is 24pt, font is 14pt, keys table mounts", async () => {
    const app = await openKbd("basic");

    expect(app.shows("id:kbd-basic")).toBe(true);
    expect(app.shows("text:⌘")).toBe(true);
    expect(app.shows("text:K")).toBe(true);

    const box = rootBox(app, "kbd-basic");
    expect(box.height).toBe(24);
    expect(app.spanStyle("id:content-basic >> text:K").fontSize).toBe(14);

    const keys = await openKbd("keys");
    for (const key of GLYPHS) {
      expect(keys.shows(`text:${key}`)).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/kbd.md M-002 (基线): default environment — bare string and
  // number children render through `renderChildren`, both variant rows show
  // their children, and the inline Kbd shares the screen with its
  // surrounding text.
  test("M-002 default environment: bare text, both variants, inline render", async () => {
    const bare = await openKbd("bare-text");
    expect(bare.shows("id:kbd-esc")).toBe(true);
    expect(bare.shows("text:Esc")).toBe(true);
    expect(bare.shows("id:kbd-num")).toBe(true);
    expect(bare.shows("text:42")).toBe(true);

    const variants = await openKbd("variants");
    expect(variants.shows("id:kbd-default")).toBe(true);
    expect(variants.shows("id:kbd-light")).toBe(true);
    expect(variants.shows("id:abbr-default >> text:⌘")).toBe(true);
    expect(variants.shows("id:abbr-light >> text:⌘")).toBe(true);

    const inline = await openKbd("inline");
    expect(inline.shows("id:kbd-inline")).toBe(true);
    expect(inline.shows("text:Esc")).toBe(true);
    expect(inline.texts().join("")).toContain("to close the dialog.");
  }, 120_000);

  // adapt-sheets/kbd.md M-003 (A-001…A-004): injected `input="touch"` —
  // every case's mount, texts, span style and layout report is identical
  // to the pointer baseline: the `input` axis is not wired into this
  // variant table, so the keycap never becomes a touch target.
  test("M-003 injected touch: every case renders identically to the pointer baseline", async () => {
    for (const caseName of [
      "basic",
      "keys",
      "variants",
      "inline",
      "bare-text",
    ] as const) {
      const pointer = await openKbd(caseName);
      const touch = await openKbd(caseName, { input: "touch" });

      expect(touch.texts()).toEqual(pointer.texts());
      expect(layouts(touch)).toEqual(layouts(pointer));
    }

    const touch = await openKbd("basic", { input: "touch" });
    expect(touch.shows("id:kbd-basic")).toBe(true);
    expect(touch.spanStyle("id:content-basic >> text:K").fontSize).toBe(14);
    expect(rootBox(touch, "kbd-basic").height).toBe(24);
  }, 120_000);

  // adapt-sheets/kbd.md M-004 (A-001): injected `density="compact"` (with
  // `input="touch"`, the mobile combination) — the component table has no
  // density cell, so root bounds and the resolved span match the default
  // environment's exactly: 24 pt tall, 14 pt, same texts.
  test("M-004 injected compact density: bounds and span identical to default", async () => {
    const baseline = await openKbd("basic");
    const compact = await openKbd("basic", {
      input: "touch",
      density: "compact",
    });

    expect(compact.texts()).toEqual(baseline.texts());
    expect(layouts(compact)).toEqual(layouts(baseline));
    expect(rootBox(compact, "kbd-basic").height).toBe(24);
    expect(compact.spanStyle("id:content-basic >> text:K").fontSize).toBe(14);
  }, 120_000);

  // adapt-sheets/kbd.md M-005 (A-005): injected touch — a press on the
  // keycap (root, abbr glyph or content text) resolves no view that hears
  // presses and rejects `ERR_NSH_TEST_NOT_FOUND`: the refusal is the
  // observable "no press path" of a pure display component, and no
  // component-owned callback or state exists to change.
  test("M-005 injected touch: pressing the keycap rejects — no press path exists", async () => {
    const app = await openKbd("basic", { input: "touch" });

    for (const selector of [
      "id:kbd-basic",
      "id:abbr-basic",
      "id:content-basic",
    ]) {
      await expect(app.press(selector)).rejects.toMatchObject({
        code: "ERR_NSH_TEST_NOT_FOUND",
      });
    }
  }, 120_000);

  // adapt-sheets/kbd.md M-006 (A-005): the `title` channel — the abbr's
  // glyph mounts and the hover tooltip surfaces the same "Command" label
  // in both environments (T-002's observable face), untouched by the
  // injected input: the host's `hover`/`tooltip` channels are
  // environment-independent.
  test("M-006 title channel: glyph shows and the same tooltip surfaces in both environments", async () => {
    for (const env of [{}, { input: "touch" } as Env] as const) {
      const app = await openKbd("title", env);

      expect(app.shows("id:abbr-title")).toBe(true);
      expect(app.shows("text:⌘")).toBe(true);

      await app.hover("text:⌘");
      await app.waitFor("text:Command", { timeout: 2000 });
      expect(app.shows("text:Command")).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/kbd.md M-007 (A-006, A-007): the desktop pin holds — the
  // fixture's `env` probe reports `platform.desktop === true`, so the
  // default environment really is the pointer baseline and M-001/M-002's
  // assertions mean the same thing on headless and web (the unpinned
  // headless engine would report the phone host, `desktop === false`).
  test("M-007 desktop pin: host reports a desktop platform in the default environment", async () => {
    const app = await openKbd("basic");

    expect(envOf(app).desktop).toBe(true);
    expect(envOf(app).os).toBe("windows");
  }, 120_000);
});
