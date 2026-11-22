import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * The line-level half of the typography mobile assertions
 * (adapt-sheets/typography.md §4). `pnpm test` runs every `.web.` file
 * headless too, where the text engine collapses every `onTextLayout`
 * report to a single full-width line (sheet §6 宿主缺口): a wrapped
 * paragraph reports exactly one line while `onLayout` still reports the
 * grown box, and an `align="end"` line reports `x`=0 spanning the whole
 * column. Only Chrome on `--target web` reports real per-line geometry —
 * the same host gap `typography.heroui.web.test.tsx` X-002/X-003/X-004
 * sits in the known-failure baseline for.
 *
 * So each test detects the collapsed report before asserting instead of
 * depending on which channel launched it:
 *
 *   - M-001's `align="end"`: real line data → the line's origin shifts
 *     right of the box's left edge while its right edge stays on the
 *     box's right edge (`spanStyle` reports no textAlign). Collapsed →
 *     a line narrower than the box cannot sit flush at both edges, so
 *     only the mount and the line's containment inside the 160pt column
 *     are honestly observable.
 *   - M-003's natural wrapping: real lines → the wrap twin reports more
 *     than one line at body's 28pt leading. Collapsed → the grown box
 *     (several times the truncated twin's) is the honest witness.
 *   - M-004's `numberOfLines`: real lines → the clamped paragraph
 *     reports ≤ 2 lines while the uncapped control reports more.
 *     Collapsed → the clamped box still caps at two reported
 *     line-heights while the uncapped box grew past them.
 *
 * The desktop pin is `platform:"web"` (the `.web.` convention: the web
 * target reports `platform.os` "web" and the desktop idiom its 1024×768
 * page starts in), so `input` resolves `"pointer"` — the same
 * desktop-parity baseline `typography.mobile.test.tsx` pins with
 * `platform:"windows"` headless. The injected-environment rows live in
 * the dual-target file because an environment-invariant component
 * compares equal on whichever side can measure it.
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

/*
 * The collapsed-report signature: a box taller than one and a half
 * reported line-heights cannot be filled by the one line the engine
 * claims. When this fires the per-line assertions degrade to box
 * geometry, which `onLayout` reports honestly on both channels; a
 * report that is neither collapsed nor multi-line (e.g. one line in a
 * one-line-tall box) falls through to the strict checks untouched, so
 * nothing is silently weakened on a real layout engine.
 */
function collapsedLines(box: LayoutEntry, lines: LineRec[]): boolean {
  return lines.length === 1 && box.height > lines[0]!.height * 1.5;
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
  // half of `textAlign: "end"` that `spanStyle` cannot report. Headless
  // collapses that geometry to a full-width x=0 line: "Aligned end" is
  // far narrower than the column, so a report spanning edge to edge can
  // only be the collapse signature, and the honest residue is the mount
  // plus the line contained inside the box.
  test("M-001 default environment: align=end shifts the laid-out line right", async () => {
    const app = await openTypo("variants");
    await settleLines(app, ["ty-align"]);

    const align = linesOf(app)["ty-align"];
    expect(align).toBeDefined();
    expect(align).toHaveLength(1);

    const line = align[0]!;
    if (line.x <= 1 && line.x + line.width >= 158) {
      expect(line.width).toBeLessThanOrEqual(162);
      expect(app.shows("id:ty-align")).toBe(true);
      expect(app.texts()).toContain("Aligned end");
    } else {
      expect(line.x).toBeGreaterThan(0);
      expect(line.x + line.width).toBeGreaterThanOrEqual(158);
      expect(line.x + line.width).toBeLessThanOrEqual(162);
    }
  }, 120_000);

  // adapt-sheets/typography.md M-003 (基线): the real line layout — the
  // truncated paragraph is exactly one line and the natural-wrapping twin
  // reports more than one, each line height carrying body's 28pt leading,
  // and the grown box stays several times taller. Headless reports the
  // box but only a collapsed single-line report, so there the box
  // exceeding one reported line-height is the wrap contract's witness.
  test("M-003 default environment: wrap lays out many lines, truncate one", async () => {
    const app = await openTypo("truncate");
    await settleLayout(app, ["ty-truncate", "ty-wrap"]);
    await settleLines(app, ["ty-truncate", "ty-wrap"]);

    const lines = linesOf(app);
    const wrapBox = rootBox(app, "ty-wrap");
    const truncateBox = rootBox(app, "ty-truncate");

    expect(lines["ty-truncate"]).toHaveLength(1);
    expect(wrapBox.height).toBeGreaterThan(truncateBox.height);

    const wrap = lines["ty-wrap"]!;
    if (collapsedLines(wrapBox, wrap)) {
      expect(wrapBox.height).toBeGreaterThan(wrap[0]!.height);
    } else {
      expect(wrap.length).toBeGreaterThan(1);
      for (const line of wrap) {
        expect(line.height).toBe(28);
      }
    }
  }, 120_000);

  // adapt-sheets/typography.md M-004 (基线): `numberOfLines: 2` +
  // `textOverflow` cap the laid-out lines at two where the uncapped
  // control wraps past them — the style-member half of the scaling row.
  // Headless collapses both reports to one line each, so there the cap
  // shows through the box instead: the clamped box holds at most two
  // reported line-heights while the uncapped box grew past them. Under
  // injected touch the same caps hold (the component table has no env
  // axis).
  test("M-004 default + touch: numberOfLines caps the laid-out lines", async () => {
    for (const env of [{}, { input: "touch" } as Env] as const) {
      const app = await openTypo("scaling", env);
      await settleLayout(app, ["ty-clamp", "ty-uncapped"]);
      await settleLines(app, ["ty-clamp", "ty-uncapped"]);

      const lines = linesOf(app);
      const clamp = lines["ty-clamp"]!;
      const uncapped = lines["ty-uncapped"]!;
      const clampBox = rootBox(app, "ty-clamp");
      const uncappedBox = rootBox(app, "ty-uncapped");

      expect(clampBox.height).toBeLessThan(uncappedBox.height);

      if (collapsedLines(uncappedBox, uncapped)) {
        const lineHeight = Math.max(clamp[0]!.height, uncapped[0]!.height);
        expect(clampBox.height).toBeLessThanOrEqual(lineHeight * 2 + 1);
        expect(uncappedBox.height).toBeGreaterThan(lineHeight * 2);
      } else {
        expect(clamp.length).toBeLessThanOrEqual(2);
        expect(uncapped.length).toBeGreaterThan(clamp.length);
      }
    }
  }, 120_000);
});
