import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the typography adapt unit, one test per row of
 * adapt-sheets/typography.md §4 (M-001…M-010). Every 落点 in the sheet is
 * 保留: the variant table takes no `input`/`density` cell, no gesture or
 * presentation seam applies, so these tests pin the unchanged contract —
 * the semantic type scale, alignment, color, weight, truncation, wrapping
 * and the passthrough scaling host props render identically in the default
 * environment and under injected touch/density, and no press path exists
 * on either side.
 *
 * The fixture is `harness/typography.fixtures.tsx` — `host.params.case`
 * picks the shape (`lines`, `variants`, `truncate`, `scaling`, `prose`; an
 * absent case keeps the original `lines` probe that `typography.heroui.web
 * .test.tsx` reads) and `input`/`density` feed `EnvironmentScope` (absent =
 * the host default, pointer — the desktop-parity baseline). Probes in
 * `app.storage()`: `layout` (each tagged part's full bounds box), `lines`
 * (each `onTextLayout` line report — the only channel that sees a line's
 * height or horizontal placement) and `env` (the host platform plus the
 * scope-resolved `input`, which M-007/M-010 read).
 *
 * `open` keeps the w1 pin (`platform:"windows"`, 1024×768): without it the
 * headless engine lands on the phone host where `input` defaults to touch
 * and every pointer-default assertion inverts. No `ios`/`android` open and
 * no drag case, so this is a dual-target `.mobile.test.tsx`.
 *
 * One 宿主缺口 shapes the split: the headless text engine collapses every
 * paragraph to a single full-width `onTextLayout` line, so a wrapped
 * paragraph's real line count and an `align="end"` line's shifted origin
 * are only observable on the web target. Those halves live in
 * `typography.mobile.web.test.tsx`; this file asserts what both targets
 * do observe (mounts, texts, span styles, box heights — the clamped box
 * stays smaller than the uncapped one on both).
 */

type Env = { input?: "touch"; density?: "compact" };

function openTypo(caseName?: string, env: Env = {}): Promise<App> {
  return open("../../../typography.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: {
      params: { ...(caseName === undefined ? {} : { case: caseName }), ...env },
    },
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

/** The bounds box a part's `onLayout` probe recorded, by probe name. */
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

/** Waits until every probed box has reported at least once. */
async function settleLayout(app: App, names: string[]): Promise<void> {
  await app.waitUntil(() =>
    names.every((name) => layouts(app).some((box) => box.name === name)),
  );
}

/** Waits until every probed text has reported its lines at least once. */
async function settleLines(app: App, names: string[]): Promise<void> {
  await app.waitUntil(() => names.every((name) => linesOf(app)[name] !== undefined));
}

type EnvReport = {
  os: string;
  desktop: boolean;
  idiom: string;
  input: string;
};

function envOf(app: App): EnvReport {
  return callsOf(app, "env").at(-1)?.[0] as EnvReport;
}

// Resolved on the harness theme (theme/hero-nsh.theme.json): `muted` is
// oklch(0.5517 0.0138 285.94) → #71717aff, the same token the description
// unit's M-001 reads for `text-muted`.
const MUTED = "#71717aff";

const VARIANT_LAYOUTS = ["ty-body"];
const VARIANT_LINES = ["ty-align"];
const TRUNCATE_LAYOUTS = ["ty-truncate", "ty-wrap"];
const TRUNCATE_LINES = ["ty-truncate", "ty-wrap"];
const SCALING_LAYOUTS = ["ty-noscale", "ty-fit", "ty-clamp", "ty-uncapped"];
const SCALING_LINES = ["ty-clamp", "ty-uncapped"];
const PROSE_LAYOUTS = ["prose"];

describe("typography mobile", () => {
  // adapt-sheets/typography.md M-001 (基线): the default environment is the
  // desktop-parity surface — the `variants` case mounts every part and the
  // resolved spans carry the semantic type scale (body 16, body-xs 12,
  // h2 30, Paragraph-sm 14), the muted color resolves to the theme token
  // and the bold weight resolves to 700 — the same values
  // `typography.heroui.test.tsx` pins. The `align="end"` line's shifted
  // origin is the headless blind spot (`onTextLayout` collapses it to a
  // full-width line); `typography.mobile.web.test.tsx` M-001 reads it.
  test("M-001 default environment: variant parts render with the semantic type scale", async () => {
    const app = await openTypo("variants");
    await settleLayout(app, VARIANT_LAYOUTS);
    await settleLines(app, VARIANT_LINES);

    expect(app.shows("id:ty-body")).toBe(true);
    expect(app.shows("id:ty-bodyxs")).toBe(true);
    expect(app.shows("id:ty-h2")).toBe(true);
    expect(app.shows("id:ty-parasm")).toBe(true);
    expect(app.shows("id:ty-code")).toBe(true);
    expect(app.shows("id:ty-align")).toBe(true);
    expect(app.shows("id:ty-muted")).toBe(true);
    expect(app.shows("id:ty-bold")).toBe(true);

    expect(app.texts()).toContain("Body copy");
    expect(app.spanStyle("text:Body copy").fontSize).toBe(16);
    expect(app.spanStyle("text:Body XS copy").fontSize).toBe(12);
    expect(app.spanStyle("text:Section title").fontSize).toBe(30);
    expect(app.spanStyle("text:Small copy").fontSize).toBe(14);
    expect(app.spanStyle("id:ty-code >> text:const x = 1;").fontSize).toBe(14);
    expect(app.spanStyle("text:Muted copy").color).toBe(MUTED);
    expect(app.spanStyle("text:Bold copy").fontWeight).toBe(700);
  }, 120_000);

  // adapt-sheets/typography.md M-002 (基线): the `prose` case — the
  // container mounts with its `onLayout` box, the Heading carries the
  // header-role semantics (NSH's `<h3>` equivalent: `role="header"` +
  // `accessibilityLevel`, which T-004 established), and the Paragraphs and
  // the inline Code inside it all show. The inline code's `testID` sits on
  // its zero-width root span, so its glyph asserts by text, as `texts()`
  // reports it.
  test("M-002 default environment: Prose container mounts with heading and paragraphs", async () => {
    const app = await openTypo("prose");
    await settleLayout(app, PROSE_LAYOUTS);

    expect(app.shows("id:prose")).toBe(true);
    expect(app.shows("role:header[Prose heading]")).toBe(true);
    expect(app.shows("id:prose-para")).toBe(true);
    expect(app.shows("text:proseCode")).toBe(true);
    expect(app.shows("id:prose-para2")).toBe(true);
    expect(app.texts()).toContain("Regular prose copy");

    const box = rootBox(app, "prose");
    expect(box.height).toBeGreaterThan(0);
    expect(box.width).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/typography.md M-003 (基线): the `truncate` case — the
  // truncated paragraph reports exactly one line (the tail-ellipsis form)
  // while the natural-wrapping twin's box grows several times taller: the
  // existing wrap/truncate contract on the desktop baseline. The wrap
  // twin's real line count (>1) is the headless blind spot; the web file's
  // M-003 asserts it (both targets report the truncated side as one line).
  test("M-003 default environment: truncate is one line, the wrap twin grows taller", async () => {
    const app = await openTypo("truncate");
    await settleLayout(app, TRUNCATE_LAYOUTS);
    await settleLines(app, TRUNCATE_LINES);

    const lines = linesOf(app);
    expect(lines["ty-truncate"]).toHaveLength(1);
    expect(rootBox(app, "ty-wrap").height).toBeGreaterThan(
      rootBox(app, "ty-truncate").height,
    );
  }, 120_000);

  // adapt-sheets/typography.md M-004 (基线): the `scaling` case — the
  // scaling/wrapping host props reach the `Text` through `rest`/`style`:
  // the `allowFontScaling={false}` + `maxFontSizeMultiplier` paragraph and
  // the `adjustsFontSizeToFit` + `minimumFontScale` paragraph mount and
  // keep their 16pt body (no system scale is injected, so the props stay
  // inert — the 宿主缺口登记 degrades this row to 挂接), and the
  // `numberOfLines: 2` + `textOverflow` style member caps its paragraph's
  // box where the uncapped control grows far taller. The laid-out line
  // counts (≤2 vs more) are the headless blind spot; the web file's M-004
  // asserts them.
  test("M-004 default environment: scaling host props pass through, numberOfLines clamps the box", async () => {
    const app = await openTypo("scaling");
    await settleLayout(app, SCALING_LAYOUTS);
    await settleLines(app, SCALING_LINES);

    expect(app.shows("id:ty-noscale")).toBe(true);
    expect(app.shows("id:ty-fit")).toBe(true);
    expect(app.shows("id:ty-clamp")).toBe(true);
    expect(app.shows("id:ty-uncapped")).toBe(true);

    expect(app.spanStyle("text:An unscaled").fontSize).toBe(16);
    expect(app.spanStyle("text:A fit-to-box").fontSize).toBe(16);

    const lines = linesOf(app);
    expect(lines["ty-clamp"]!.length).toBeLessThanOrEqual(2);
    expect(rootBox(app, "ty-clamp").height).toBeLessThan(
      rootBox(app, "ty-uncapped").height,
    );
  }, 120_000);

  // adapt-sheets/typography.md M-005 (A-001…A-004, A-006): injected
  // `input="touch"` — every case's texts, layout reports, line reports and
  // span styles are identical to the pointer baseline: the `input` and
  // `density` axes are not wired into this variant table, so text never
  // becomes a touch target.
  test("M-005 injected touch: every case renders identically to the pointer baseline", async () => {
    const waits: Record<string, { layouts: string[]; lines: string[] }> = {
      variants: { layouts: VARIANT_LAYOUTS, lines: VARIANT_LINES },
      prose: { layouts: PROSE_LAYOUTS, lines: [] },
      truncate: { layouts: TRUNCATE_LAYOUTS, lines: TRUNCATE_LINES },
      scaling: { layouts: SCALING_LAYOUTS, lines: SCALING_LINES },
    };

    for (const caseName of Object.keys(waits)) {
      const pointer = await openTypo(caseName);
      const touch = await openTypo(caseName, { input: "touch" });
      await settleLayout(pointer, waits[caseName]!.layouts);
      await settleLayout(touch, waits[caseName]!.layouts);
      await settleLines(pointer, waits[caseName]!.lines);
      await settleLines(touch, waits[caseName]!.lines);

      expect(touch.texts()).toEqual(pointer.texts());
      expect(layoutSet(touch)).toEqual(layoutSet(pointer));
      expect(linesOf(touch)).toEqual(linesOf(pointer));
    }

    const touch = await openTypo("variants", { input: "touch" });
    expect(touch.shows("id:ty-body")).toBe(true);
    expect(touch.spanStyle("text:Body copy").fontSize).toBe(16);
    expect(touch.spanStyle("text:Muted copy").color).toBe(MUTED);
  }, 120_000);

  // adapt-sheets/typography.md M-006 (A-003): injected `density="compact"`
  // (with `input="touch"`, the mobile combination) — the component table
  // has no density cell, so the compact preset produces no class or bounds
  // difference; heading and body semantic sizes stay exactly the default
  // environment's.
  test("M-006 injected compact density: bounds and spans identical to default", async () => {
    for (const caseName of ["variants", "prose"] as const) {
      const baseline = await openTypo(caseName);
      const compact = await openTypo(caseName, {
        input: "touch",
        density: "compact",
      });
      const names = caseName === "variants" ? VARIANT_LAYOUTS : PROSE_LAYOUTS;
      await settleLayout(baseline, names);
      await settleLayout(compact, names);

      expect(compact.texts()).toEqual(baseline.texts());
      expect(layoutSet(compact)).toEqual(layoutSet(baseline));
    }

    const compact = await openTypo("variants", {
      input: "touch",
      density: "compact",
    });
    expect(compact.spanStyle("text:Section title").fontSize).toBe(30);
    expect(compact.spanStyle("text:Body copy").fontSize).toBe(16);
    expect(compact.spanStyle("text:Body XS copy").fontSize).toBe(12);
  }, 120_000);

  // adapt-sheets/typography.md M-007 (A-008): injected touch on the
  // `scaling` case — the same passthrough parts M-004 asserts behave
  // identically: text scaling and wrapping do not diverge with the
  // environment, and the `env` probe reports `input` as `"touch"`, proving
  // the `EnvironmentScope` injection took.
  test("M-007 injected touch on scaling: passthrough identical, env probe reports touch", async () => {
    const pointer = await openTypo("scaling");
    const touch = await openTypo("scaling", { input: "touch" });
    await settleLayout(pointer, SCALING_LAYOUTS);
    await settleLayout(touch, SCALING_LAYOUTS);
    await settleLines(pointer, SCALING_LINES);
    await settleLines(touch, SCALING_LINES);

    expect(envOf(touch).input).toBe("touch");
    expect(touch.texts()).toEqual(pointer.texts());
    expect(layoutSet(touch)).toEqual(layoutSet(pointer));
    expect(linesOf(touch)).toEqual(linesOf(pointer));

    expect(touch.shows("id:ty-noscale")).toBe(true);
    expect(touch.shows("id:ty-clamp")).toBe(true);
  }, 120_000);

  // adapt-sheets/typography.md M-008 (A-007): a press on a text part
  // resolves no view that hears presses and rejects
  // `ERR_NSH_TEST_NOT_FOUND` — the refusal is the observable "no press
  // path" of a pure display component (description.mobile M-006's form) —
  // and no probe call beyond the layout/lines/env records lands. Run in
  // both environments: the missing press path is a contract, not a
  // desktop quirk.
  test("M-008 both environments: pressing text parts rejects — no press path exists", async () => {
    for (const env of [{}, { input: "touch" } as Env] as const) {
      const app = await openTypo("variants", env);
      await settleLayout(app, VARIANT_LAYOUTS);

      for (const selector of ["id:ty-body", "id:ty-h2", "id:ty-code"]) {
        await expect(app.press(selector)).rejects.toMatchObject({
          code: "ERR_NSH_TEST_NOT_FOUND",
        });
      }

      expect(
        calls(app).every(
          (call) =>
            call.name === "layout" || call.name === "lines" || call.name === "env",
        ),
      ).toBe(true);
      expect(app.shows("id:ty-body")).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/typography.md M-009 (A-009, A-010): the derived parts —
  // `level`→`h2` (30pt), `size`→`body-sm` (14pt), fixed `code` (the
  // `font-mono`/`bg-default` chip face, whose spanStyle exposes no
  // fontFamily and so is read through the resolved size plus the chip's
  // background) — and the weight context: a `Typography.Code` nested in a
  // `weight="bold"` Paragraph paints 700 (X-005's channel) in both
  // environments.
  test("M-009 both environments: derived types resolve, code inherits the bold weight", async () => {
    for (const env of [{}, { input: "touch" } as Env] as const) {
      const variants = await openTypo("variants", env);
      expect(variants.spanStyle("text:Section title").fontSize).toBe(30);
      expect(variants.spanStyle("text:Small copy").fontSize).toBe(14);
      const code = variants.spanStyle("id:ty-code >> text:const x = 1;");
      expect(code.fontSize).toBe(14);
      expect(code.backgroundColor).toBeDefined();

      const prose = await openTypo("prose", env);
      expect(prose.spanStyle("text:proseCode").fontWeight).toBe(700);
    }
  }, 120_000);

  // adapt-sheets/typography.md M-010 (A-011, A-012): the fixture itself —
  // an absent `case` keeps the original `lines` probe (the three X-003 /
  // X-004 paragraph reports, byte-identical for `typography.heroui.web
  // .test.tsx`), the new cases dispatch by `host.params.case`, the desktop
  // pin reports `input: "pointer"` on both targets and the injected touch
  // shows through the env probe (`platform.os` is "windows" on the pinned
  // headless engine; the web target always reports "web" — the desktop
  // idiom the `platform` option forces is what the pin buys there).
  test("M-010 fixture: default case is the lines probe, dispatch and env injection work", async () => {
    const plain = await openTypo();
    await settleLines(plain, ["plain-sm", "code-sm", "base-span"]);

    const lines = linesOf(plain);
    expect(lines["plain-sm"]!.length).toBeGreaterThan(0);
    expect(lines["code-sm"]!.length).toBeGreaterThan(0);
    expect(lines["base-span"]!.length).toBeGreaterThan(0);

    const env = envOf(plain);
    expect(env.desktop).toBe(true);
    expect(env.idiom).toBe("desktop");
    expect(env.input).toBe("pointer");
    expect(["windows", "web"]).toContain(env.os);

    const touch = await openTypo("variants", { input: "touch" });
    expect(envOf(touch).input).toBe("touch");
    expect(touch.shows("id:ty-body")).toBe(true);
  }, 120_000);
});
