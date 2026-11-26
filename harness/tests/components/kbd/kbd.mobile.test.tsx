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
 * `input`/`density` feed `EnvironmentScope`. The host-derived default
 * differs per target (touch on ios/android, pointer on desktop and web),
 * so `input:"pointer"` is injected explicitly wherever the desktop-parity
 * baseline is meant. Probes in `app.storage()`: `layout` (each root's full
 * bounds box) and `env` (the host's platform report — it sits outside the
 * scope, so it always reads host-derived values).
 *
 * No `platform`/`width`/`height` open options — the native targets fill
 * the device screen and reject them. Two rows moved to
 * `kbd.mobile.headless.test.tsx`, a local file that keeps the
 * `platform:"windows"` pin: M-006's hover tooltip (`app.hover` does not
 * exist natively) and M-007's desktop-host pin assertion.
 */

type Env = { input?: "touch" | "pointer"; density?: "compact" };

function openKbd(caseName: string, env: Env = {}): Promise<App> {
  return open("../../../kbd.fixtures.tsx", {
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

/**
 * name → sorted unique bounds boxes. `onLayout` can fire more than once per
 * view; comparing the set of distinct boxes keeps repeat firings honest
 * without depending on how many frames the layout took (the
 * breadcrumbs.mobile.test.tsx `boxSet` convention).
 */
function layoutSet(app: App): Record<string, string[]> {
  const groups: Record<string, Set<string>> = {};
  for (const entry of layouts(app)) {
    const key = JSON.stringify({
      x: entry.x,
      y: entry.y,
      width: entry.width,
      height: entry.height,
    });
    (groups[entry.name] ??= new Set()).add(key);
  }
  const out: Record<string, string[]> = {};
  for (const [name, set] of Object.entries(groups)) {
    out[name] = [...set].sort();
  }
  return out;
}

/** The bounds box a root's `onLayout` probe recorded, by probe name. */
function rootBox(app: App, name: string): LayoutEntry {
  const box = layouts(app).find((e) => e.name === name);

  if (!box) {
    throw new Error(`no layout report for ${name}`);
  }

  return box;
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
  test("M-001 pointer baseline: basic renders, root is 24pt, font is 14pt, keys table mounts", async () => {
    const app = await openKbd("basic", { input: "pointer" });

    expect(app.shows("id:kbd-basic")).toBe(true);
    expect(app.shows("text:⌘")).toBe(true);
    expect(app.shows("text:K")).toBe(true);

    const box = rootBox(app, "kbd-basic");
    // Native layout reports fractional-px bounds (Android measured
    // 52.1905/27.8095 for 52/28pt elsewhere): the 24pt root is a contract
    // asserted within a 0.25pt quantization window.
    expect(Math.abs(box.height - 24)).toBeLessThan(0.25);
    expect(app.spanStyle("id:content-basic >> text:K").fontSize).toBe(14);

    const keys = await openKbd("keys", { input: "pointer" });
    for (const key of GLYPHS) {
      expect(keys.shows(`text:${key}`)).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/kbd.md M-002 (基线): default environment — bare string and
  // number children render through `renderChildren`, both variant rows show
  // their children, and the inline Kbd shares the screen with its
  // surrounding text.
  test("M-002 pointer baseline: bare text, both variants, inline render", async () => {
    const bare = await openKbd("bare-text", { input: "pointer" });
    expect(bare.shows("id:kbd-esc")).toBe(true);
    expect(bare.shows("text:Esc")).toBe(true);
    expect(bare.shows("id:kbd-num")).toBe(true);
    expect(bare.shows("text:42")).toBe(true);

    const variants = await openKbd("variants", { input: "pointer" });
    expect(variants.shows("id:kbd-default")).toBe(true);
    expect(variants.shows("id:kbd-light")).toBe(true);
    expect(variants.shows("id:abbr-default >> text:⌘")).toBe(true);
    expect(variants.shows("id:abbr-light >> text:⌘")).toBe(true);

    const inline = await openKbd("inline", { input: "pointer" });
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
      // Snapshot the pointer app before the touch open: a native open
      // relaunches the single host and invalidates every earlier App.
      const pointer = await openKbd(caseName, { input: "pointer" });
      const pointerTexts = pointer.texts();
      const pointerLayout = layoutSet(pointer);

      const touch = await openKbd(caseName, { input: "touch" });

      expect(touch.texts()).toEqual(pointerTexts);
      expect(layoutSet(touch)).toEqual(pointerLayout);
    }

    const touch = await openKbd("basic", { input: "touch" });
    expect(touch.shows("id:kbd-basic")).toBe(true);
    expect(touch.spanStyle("id:content-basic >> text:K").fontSize).toBe(14);
    expect(Math.abs(rootBox(touch, "kbd-basic").height - 24)).toBeLessThan(0.25);
  }, 120_000);

  // adapt-sheets/kbd.md M-004 (A-001): injected `density="compact"` (on the
  // pointer baseline axis, same input on both sides) — the component table
  // has no density cell, so root bounds and the resolved span match the
  // default environment's exactly: 24 pt tall, 14 pt, same texts.
  test("M-004 injected compact density: bounds and span identical to default", async () => {
    const baseline = await openKbd("basic", { input: "pointer" });
    const baselineTexts = baseline.texts();
    const baselineLayout = layoutSet(baseline);

    const compact = await openKbd("basic", {
      input: "pointer",
      density: "compact",
    });

    expect(compact.texts()).toEqual(baselineTexts);
    expect(layoutSet(compact)).toEqual(baselineLayout);
    expect(Math.abs(rootBox(compact, "kbd-basic").height - 24)).toBeLessThan(0.25);
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
  // glyph mounts in both explicit environments; the hover tooltip that
  // surfaces the "Command" label (T-002's observable face) is a desktop
  // gesture the native targets cannot perform, so that arm lives in
  // `kbd.mobile.headless.test.tsx`.
  test("M-006 title channel: the glyph mounts in both environments", async () => {
    for (const env of [
      { input: "pointer" },
      { input: "touch" },
    ] as Env[]) {
      const app = await openKbd("title", env);

      expect(app.shows("id:abbr-title")).toBe(true);
      expect(app.shows("text:⌘")).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/kbd.md M-007 (A-006, A-007): the desktop-host pin — the
  // fixture's `env` probe reports `platform.desktop === true`, the desktop
  // idiom and a resolved `input` of `"pointer"`. That only holds under the
  // `platform:"windows"` pin the native targets reject (their hosts report
  // a touch-derived input), so the row lives in
  // `kbd.mobile.headless.test.tsx`.
});
