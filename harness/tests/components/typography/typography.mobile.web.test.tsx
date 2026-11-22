import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * The web-only half of the typography mobile assertions
 * (adapt-sheets/typography.md §4). The headless text engine collapses
 * every paragraph to a single full-width `onTextLayout` line — it reports
 * no real line wrapping — so three observable halves live here, where
 * Chrome lays the text out as the reference app does:
 *
 *   - M-001's `align="end"`: the laid-out line's origin shifts right of
 *     the box's left edge while its right edge stays on the box's right
 *     edge (`spanStyle` reports no textAlign).
 *   - M-003's natural wrapping: the non-truncated paragraph reports more
 *     than one laid-out line.
 *   - M-004's `numberOfLines`: the clamped paragraph reports ≤ 2 lines
 *     while the uncapped control reports more.
 *
 * The desktop pin is `platform:"web"` (the `.web.` convention: the web
 * target reports `platform.os` "web" and the desktop idiom its 1024×768
 * page starts in), so `input` resolves `"pointer"` — the same
 * desktop-parity baseline `typography.mobile.test.tsx` pins with
 * `platform:"windows"` headless. Both files cover what their target
 * observes; the injected-environment rows live in the dual-target file
 * because an environment-invariant component compares equal on whichever
 * side can measure it.
 */

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

function rootBox(app: App, name: string): LayoutEntry {
  const box = layouts(app).find((e) => e.name === name);

  if (!box) {
    throw new Error(`no layout report for ${name}`);
  }

  return box;
}

type LineRec = { text: string; height: number; x: number; width: number };

/** The last `onTextLayout` report per probed text, name → laid-out lines. */
function linesOf(app: App): Record<string, LineRec[]> {
  const out: Record<string, LineRec[]> = {};
  for (const args of callsOf(app, "lines")) {
    const entry = args[0] as { name: string; lines: LineRec[] };
    out[entry.name] = entry.lines;
  }
  return out;
}

async function settleLines(app: App, names: string[]): Promise<void> {
  await app.waitUntil(() => names.every((name) => linesOf(app)[name] !== undefined));
}

async function settleLayout(app: App, names: string[]): Promise<void> {
  await app.waitUntil(() =>
    names.every((name) => layouts(app).some((box) => box.name === name)),
  );
}

type Env = { input?: "touch" };

function openTypo(caseName: string, env: Env = {}): Promise<App> {
  return open("../../../typography.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...env } },
  });
}

describe("typography mobile (web)", () => {
  // adapt-sheets/typography.md M-001 (基线): `align="end"` inside the
  // `w-40` (160pt) column pushes the laid-out line's origin right of zero
  // while its right edge stays on the box's right edge — the observable
  // half of `textAlign: "end"` that `spanStyle` cannot report.
  test("M-001 default environment: align=end shifts the laid-out line right", async () => {
    const app = await openTypo("variants");
    await settleLines(app, ["ty-align"]);

    const align = linesOf(app)["ty-align"];
    expect(align).toBeDefined();
    expect(align).toHaveLength(1);
    expect(align[0]!.x).toBeGreaterThan(0);
    expect(align[0]!.x + align[0]!.width).toBeGreaterThanOrEqual(158);
    expect(align[0]!.x + align[0]!.width).toBeLessThanOrEqual(162);
  }, 120_000);

  // adapt-sheets/typography.md M-003 (基线): the real line layout — the
  // truncated paragraph is exactly one line and the natural-wrapping twin
  // reports more than one, each line height carrying body's 28pt leading,
  // and the grown box stays several times taller (headless reports the
  // box but only a collapsed single-line report).
  test("M-003 default environment: wrap lays out many lines, truncate one", async () => {
    const app = await openTypo("truncate");
    await settleLayout(app, ["ty-truncate", "ty-wrap"]);
    await settleLines(app, ["ty-truncate", "ty-wrap"]);

    const lines = linesOf(app);
    expect(lines["ty-truncate"]).toHaveLength(1);
    expect(lines["ty-wrap"]!.length).toBeGreaterThan(1);
    for (const line of lines["ty-wrap"]!) {
      expect(line.height).toBe(28);
    }
    expect(rootBox(app, "ty-wrap").height).toBeGreaterThan(
      rootBox(app, "ty-truncate").height,
    );
  }, 120_000);

  // adapt-sheets/typography.md M-004 (基线): `numberOfLines: 2` +
  // `textOverflow` cap the laid-out lines at two where the uncapped
  // control wraps past them — the style-member half of the scaling row,
  // asserted on the only target that lays lines out. Under injected touch
  // the same caps hold (the component table has no env axis).
  test("M-004 default + touch: numberOfLines caps the laid-out lines", async () => {
    for (const env of [{}, { input: "touch" } as Env] as const) {
      const app = await openTypo("scaling", env);
      await settleLayout(app, ["ty-clamp", "ty-uncapped"]);
      await settleLines(app, ["ty-clamp", "ty-uncapped"]);

      const lines = linesOf(app);
      expect(lines["ty-clamp"]!.length).toBeLessThanOrEqual(2);
      expect(lines["ty-uncapped"]!.length).toBeGreaterThan(
        lines["ty-clamp"]!.length,
      );
      expect(rootBox(app, "ty-clamp").height).toBeLessThan(
        rootBox(app, "ty-uncapped").height,
      );
    }
  }, 120_000);
});
