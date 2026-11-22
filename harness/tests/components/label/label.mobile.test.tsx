import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the label adapt unit, one test per row of
 * adapt-sheets/label.md §4 (M-001…M-009).
 *
 * The fixture is `harness/label.fixtures.tsx`, opened by `host.params`:
 * `case` (basic / states / field / no-field / all), `scope` ("" = host
 * default,
 * "touch" = `EnvironmentScope input="touch"`, "density" = `EnvironmentScope
 * density="compact"`), and the field case's `fieldRequired` / `fieldDisabled`
 * / `fieldInvalid` flags (M-008). Every open pins `platform:"windows"`,
 * 1024×768 — the pointer desktop baseline on both headless and web.
 *
 * Observation channels: `shows` / `texts` / `spanStyle` for the rendered
 * text, `viewStyle().opacity` for the disabled dim, `onLayout` bounds and
 * the `@scenario/probe` calls in `app.storage()` for the field channel and
 * the press triple. The default environment is the desktop-parity half of
 * every row; the injected scopes are the touch/density halves.
 */

type Params = Record<string, string>;

// theme/hero-nsh.theme.json light `foreground` / `danger`, as resolved
// `#rrggbbaa` (label.heroui.test.tsx T-004 pins the same danger value).
const FOREGROUND = "#18181bff";
const DANGER = "#ff383cff";

const FIELD_PROBES = ["pressFieldStart", "pressFieldUp", "focusField"] as const;

function openLabel(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../label.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type Box = { tag: string; x: number; y: number; width: number; height: number };

/** Every recorded layout box, deduplicated per tag (onLayout can re-fire). */
function boxSet(app: App): Record<string, string[]> {
  const groups: Record<string, Set<string>> = {};
  for (const args of callsOf(app, "layout")) {
    const [tag, box] = args as [string, Omit<Box, "tag">];
    (groups[tag] ??= new Set()).add(JSON.stringify(box));
  }
  const out: Record<string, string[]> = {};
  for (const [tag, set] of Object.entries(groups)) {
    out[tag] = [...set].sort();
  }
  return out;
}

/** The field-channel probe names in firing order. */
function fieldOrder(app: App): string[] {
  return calls(app)
    .map((call) => call.name)
    .filter((name) => (FIELD_PROBES as readonly string[]).includes(name));
}

/** Everything an environment comparison reads: texts, span styles, boxes. */
function snapshot(app: App, styleSelectors: string[]) {
  return {
    texts: app.texts(),
    styles: Object.fromEntries(
      styleSelectors.map((selector) => [selector, app.spanStyle(selector)]),
    ),
    boxes: boxSet(app),
  };
}

const BASIC_STYLES = ["text:Mobile label"];
const STATES_STYLES = [
  "text:Required name",
  "text:Disabled name",
  "text:Invalid name",
];

describe("label mobile", () => {
  // adapt-sheets/label.md M-001 (基线): default pointer environment renders
  // the label exactly as before the port — text-sm (14pt) font-medium
  // foreground, and a real layout box.
  test("M-001 default environment renders the baseline label", async () => {
    const app = await openLabel("basic");

    expect(app.shows("text:Mobile label")).toBe(true);
    expect(app.texts()).toContain("Mobile label");

    const style = app.spanStyle("text:Mobile label");
    expect(style.fontSize).toBe(14);
    expect(style.fontWeight).toBe(500);
    expect(style.color).toBe(FOREGROUND);

    const basic = boxSet(app).basic ?? [];
    expect(basic.length).toBeGreaterThan(0);
    expect(
      basic.some((raw) => {
        const box = JSON.parse(raw) as { width: number; height: number };
        return box.width > 0 && box.height > 0;
      }),
    ).toBe(true);
  }, 120_000);

  // adapt-sheets/label.md M-002 (基线): the three appearance states are
  // unchanged — required draws the asterisk, disabled dims to opacity 0.5,
  // invalid paints danger.
  test("M-002 default environment keeps the three appearance states", async () => {
    const app = await openLabel("states");

    expect(app.shows("text:/Required name\\*/")).toBe(true);
    expect(app.viewStyle("id:label-disabled")?.opacity).toBe(0.5);
    expect(app.spanStyle("text:Invalid name").color).toBe(DANGER);
  }, 120_000);

  // adapt-sheets/label.md M-003 (基线): a press on the label reports through
  // the FieldContext channel exactly once per transition — start on press
  // down, up on release, focus on press — and the caller's own press triple
  // fires once each, in the same order as before the port.
  test("M-003 default environment forwards the press to the field channel once", async () => {
    const app = await openLabel("field");

    expect(callsOf(app, "registerLabel")).toEqual([["Field label"]]);

    await app.press("text:Field label");

    for (const name of FIELD_PROBES) {
      expect(callsOf(app, name)).toHaveLength(1);
    }
    expect(callsOf(app, "pressDown")).toHaveLength(1);
    expect(callsOf(app, "pressUp")).toHaveLength(1);
    expect(callsOf(app, "press")).toHaveLength(1);
    expect(fieldOrder(app)).toEqual([
      "pressFieldStart",
      "pressFieldUp",
      "focusField",
    ]);
  }, 120_000);

  // adapt-sheets/label.md M-004 (A-001…A-003): injected touch changes
  // nothing observable — no `input` axis cell exists and the label is not an
  // independent touch target, so texts, span styles and layout boxes are
  // identical to the default environment.
  test("M-004 injected touch renders identically to the default environment", async () => {
    for (const [caseName, selectors] of [
      ["basic", BASIC_STYLES],
      ["states", STATES_STYLES],
    ] as const) {
      const touch = await openLabel(caseName, { scope: "touch" });
      const plain = await openLabel(caseName);

      expect(snapshot(touch, [...selectors])).toEqual(
        snapshot(plain, [...selectors]),
      );
    }
  }, 120_000);

  // adapt-sheets/label.md M-005 (A-001): `density="compact"` changes nothing
  // either — the component table has no density cell, so the preset produces
  // no class difference.
  test("M-005 injected compact density renders identically", async () => {
    for (const [caseName, selectors] of [
      ["basic", BASIC_STYLES],
      ["states", STATES_STYLES],
    ] as const) {
      const compact = await openLabel(caseName, { scope: "density" });
      const plain = await openLabel(caseName);

      expect(snapshot(compact, [...selectors])).toEqual(
        snapshot(plain, [...selectors]),
      );
    }
  }, 120_000);

  // adapt-sheets/label.md M-006 (A-004): under touch the label press still
  // reports through the field channel exactly once per transition (no double
  // report, no label-side second channel), the label's own style and bounds
  // do not move on press (no independent scale — the control's B owns the
  // feedback), and the control stand-in's press produces the same channel
  // order M-003 pinned under the default environment.
  test("M-006 injected touch keeps the shared-B press contract unchanged", async () => {
    const app = await openLabel("field", { scope: "touch" });

    const styleBefore = app.spanStyle("text:Field label");
    const boxesBefore = boxSet(app);

    await app.press("text:Field label");

    for (const name of FIELD_PROBES) {
      expect(callsOf(app, name)).toHaveLength(1);
    }
    expect(callsOf(app, "pressDown")).toHaveLength(1);
    expect(callsOf(app, "pressUp")).toHaveLength(1);
    expect(callsOf(app, "press")).toHaveLength(1);
    expect(fieldOrder(app)).toEqual([
      "pressFieldStart",
      "pressFieldUp",
      "focusField",
    ]);

    // The label itself neither scales nor restyles on press.
    expect(app.spanStyle("text:Field label")).toEqual(styleBefore);
    expect(boxSet(app)).toEqual(boxesBefore);

    // The control stand-in reports through the same channel: its own caller
    // triple fires once, and the field probes repeat the M-003 order.
    await app.press("text:Field control");

    expect(callsOf(app, "targetDown")).toHaveLength(1);
    expect(callsOf(app, "targetUp")).toHaveLength(1);
    expect(callsOf(app, "targetPress")).toHaveLength(1);
    expect(fieldOrder(app)).toEqual([
      "pressFieldStart",
      "pressFieldUp",
      "focusField",
      "pressFieldStart",
      "pressFieldUp",
      "focusField",
    ]);
  }, 120_000);

  // adapt-sheets/label.md M-007 (A-004): with no FieldContext the bare press
  // path is the caller's own triple, once each, and the label neither takes
  // focus on press nor changes appearance. The `focusable ?? false` Tab-order
  // half is web-only and lives in label.mobile.web.test.tsx.
  test("M-007 injected touch keeps the context-free press path unchanged", async () => {
    const app = await openLabel("no-field", { scope: "touch" });

    const styleBefore = app.spanStyle("text:Plain label");
    const boxesBefore = boxSet(app);

    await app.press("text:Plain label");

    expect(callsOf(app, "pressDown")).toHaveLength(1);
    expect(callsOf(app, "pressUp")).toHaveLength(1);
    expect(callsOf(app, "press")).toHaveLength(1);
    expect(callsOf(app, "focus")).toHaveLength(0);
    expect(callsOf(app, "blur")).toHaveLength(0);
    expect(app.spanStyle("text:Plain label")).toEqual(styleBefore);
    expect(boxSet(app)).toEqual(boxesBefore);
  }, 120_000);

  // adapt-sheets/label.md M-008 (A-005): the field state's three getters
  // drive the asterisk, the dim and the danger color through the provider —
  // identically under pointer and touch.
  test("M-008 field state getters render the same under pointer and touch", async () => {
    const params = {
      fieldRequired: "1",
      fieldDisabled: "1",
      fieldInvalid: "1",
    };

    const plain = await openLabel("field", params);
    const touch = await openLabel("field", { ...params, scope: "touch" });

    const reads = (app: App) => ({
      asterisk: app.shows("text:/Field label\\*/"),
      opacity: app.viewStyle("id:field-label")?.opacity,
      color: app.spanStyle("text:Field label").color,
    });

    const expected = reads(plain);
    expect(expected.asterisk).toBe(true);
    expect(expected.opacity).toBe(0.5);
    expect(expected.color).toBe(DANGER);
    expect(reads(touch)).toEqual(expected);
  }, 120_000);

  // adapt-sheets/label.md M-009 (A-007, A-008): delivery coverage — every
  // case dispatches on `host.params.case`, the `scope` param mounts an
  // `EnvironmentScope` ("" behaves as no wrapper), and the file pins
  // windows/1024×768 so all of the above runs headless and web.
  //
  // The sweep opens the aggregate `all` case once per scope (3 opens, not
  // 12): it mounts every case tree under one EnvironmentScope, and each of
  // the four landmarks below still gets its own `shows` assertion per
  // scope — the same 12 case×scope mount checks, delivered through fewer
  // web dev-client connections (the batch-wide connect-timeout gap).
  test("M-009 every fixture case mounts under default and injected scopes", async () => {
    const landmarks: Record<string, string> = {
      basic: "Mobile label",
      // "Disabled name" — the required row's text reads "Required name*",
      // which an exact `text:` selector does not match.
      states: "Disabled name",
      field: "Field label",
      "no-field": "Plain label",
    };

    for (const scope of ["", "touch", "density"]) {
      const app = await openLabel("all", { scope });
      for (const text of Object.values(landmarks)) {
        expect(app.shows(`text:${text}`)).toBe(true);
      }
    }
  }, 120_000);
});
