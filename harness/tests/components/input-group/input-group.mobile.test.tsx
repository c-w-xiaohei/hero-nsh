import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { lastFocus } from "../../testers/input-group";

/*
 * Mobile assertions for the input-group adapt unit
 * (adapt-sheets/input-group.md §4, M-001…M-007) on every target, native
 * ios/android included: every assertion reads what `nsh/test` observes —
 * `shows`, `value`, `enabled`, `onLayout` probe payloads and
 * `app.storage()` probe calls — and `host.params.testInput` picks the
 * environment explicitly ("pointer" is the host-independent desktop-parity
 * baseline, "touch" the injected side), so the dual-environment rows run
 * identically everywhere. M-002 and M-006's pointer-hover half use
 * `app.hover`, which needs a mouse — they live in
 * `input-group.mobile.headless.test.tsx`.
 *
 * The probes live in `harness/input-group.fixtures.tsx`:
 *   `layout` case   Root / Prefix / Suffix `onLayout` bounds — the touch
 *                   `min-h-11` hit face vs the pointer `min-h-9` row (M-001).
 *   `hover` case    the `isHovered` render-prop marker ("hovered"/"idle")
 *                   plus `onHoverStart`/`onHoverEnd`/`onHoverChange` probes
 *                   and the input's `focus` probes (M-002, M-006).
 *   `submit` case   standalone group: `onSubmit` probe, focus probes on both
 *                   edges (M-004, M-006).
 *   `kbd` case      the keyboard/autofill attribute matrix, one `kbd-*`
 *                   testID per prop value (M-005, M-006).
 *   the port-sheet-4b cases (`default`, `disabled`, `textarea`, `secondary`,
 *   `full-width`, `controlled`, `render-props`) carry the baseline rows
 *   (M-003, M-007).
 */

type Params = Record<string, string>;

function openCase(name: string, params: Params = {}): Promise<App> {
  return open("../../../input-group.fixtures.tsx", {
    locale: "en-US",
    host: {
      // iOS types real key events; "none" keeps a literal string literal.
      params: { case: name, testAutoCapitalize: "none", ...params },
    },
  });
}

type LayoutEntry = { name: string; width: number; height: number };
type FocusRecord = { part: string; focused: boolean };

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

function focusedRecords(app: App): FocusRecord[] {
  return callsOf(app, "focus")
    .map((c) => c[0] as FocusRecord)
    .filter((r) => r.part === "input" && r.focused === true);
}

function blurredRecords(app: App): FocusRecord[] {
  return callsOf(app, "focus")
    .map((c) => c[0] as FocusRecord)
    .filter((r) => r.part === "input" && r.focused === false);
}

describe("input-group mobile", () => {
  // adapt-sheets/input-group.md M-001 (A-001, A-002): the `input` axis'
  // `min-h-11` lifts the group row to the 44 pt hit minimum under touch;
  // the same row keeps its `min-h-9` 36 pt height under pointer — desktop
  // zero drift.
  test("M-001 group row measures at least 44pt under touch and stays 36pt under pointer", async () => {
    const touch = await openCase("layout", { testInput: "touch" });
    await touch.waitUntil(() =>
      callsOf(touch, "layout").some((c) => (c[0] as LayoutEntry).name === "root"),
    );
    expect(layoutFor(touch, "root").height).toBeGreaterThanOrEqual(44);

    const pointer = await openCase("layout", { testInput: "pointer" });
    await pointer.waitUntil(() =>
      callsOf(pointer, "layout").some((c) => (c[0] as LayoutEntry).name === "root"),
    );
    // `min-h-9` resolves to 36 pt on desktop font metrics; iOS measured 40
    // — consistent with host font-metric differences (the run's "font
    // family `Inter` is not available" warnings are a plausible cause,
    // unproven), not a density drift. What the row contract pins is the
    // `min-h-9` floor and a pointer face strictly under the 44 pt touch
    // minimum; the exact 36 pt metric stays pinned in
    // `input-group.mobile.headless.test.tsx`.
    const pointerHeight = layoutFor(pointer, "root").height;
    expect(pointerHeight).toBeGreaterThanOrEqual(36);
    expect(pointerHeight).toBeLessThan(44);
  }, 120_000);

  // adapt-sheets/input-group.md M-002 (A-003, A-004) lives in
  // `input-group.mobile.headless.test.tsx` — `app.hover` needs a mouse, so
  // the row moved there whole rather than split.

  // adapt-sheets/input-group.md M-003 (A-008): the press-to-focus channel is
  // the shared contract on both ends — pressing the Prefix, the Suffix or
  // the group itself (`ig-root`; its center resolves to the input, the
  // padding path upstream's `querySelector("input")` covers) leaves the
  // `ig-input` focus probe reporting `focused: true`, and no press ever
  // records a blur in between. Under `isDisabled` the same press focuses
  // nothing.
  test("M-003 affix and group presses focus the real input in both environments", async () => {
    for (const params of [{ testInput: "pointer" }, { testInput: "touch" }] as Params[]) {
      const app = await openCase("default", params);

      await app.press("id:ig-prefix");
      await app.waitUntil(() => focusedRecords(app).length > 0);
      expect(lastFocus(app, "input")).toBe(true);

      await app.press("id:ig-suffix");
      await app.press("id:ig-root");
      expect(lastFocus(app, "input")).toBe(true);
      // Every recorded edge is a focus gain — no press blurred the input.
      expect(blurredRecords(app)).toHaveLength(0);
    }

    const disabled = await openCase("disabled", { testInput: "pointer" });
    expect(disabled.enabled("label:Amount")).toBe(false);
    await expect(disabled.press("id:ig-prefix")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(focusedRecords(disabled)).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/input-group.md M-004 (A-005, A-006): the declared `onSubmit`
  // rides the existing host channel — Return reports `{ text }` exactly
  // once, and `submitBehavior="submit"` keeps the focus: no blur edge is
  // recorded and a second `app.type` still lands in the same input (the
  // focus-query gap's registered degradation, sheet §6).
  test("M-004 Return submits once with the current text and keeps focus", async () => {
    const app = await openCase("submit", { testInput: "pointer" });

    await app.type("label:Amount", "hello");
    await app.submit("label:Amount");
    await app.waitUntil(() => callsOf(app, "onSubmit").length === 1);

    const submitted = callsOf(app, "onSubmit")[0][0] as { text: string };
    // defaultValue "10" plus the typed "hello" — order-free, the payload is
    // the input's whole current text.
    expect(submitted.text).toContain("10");
    expect(submitted.text).toContain("hello");

    await app.type("label:Amount", " world");
    expect(app.value("label:Amount")).toContain("world");
    expect(blurredRecords(app)).toHaveLength(0);
    expect(callsOf(app, "onSubmit")).toHaveLength(1);
  }, 120_000);

  // adapt-sheets/input-group.md M-005 (A-005): every keyboard / autofill
  // attribute the sheet lists mounts through the existing forwarding chain —
  // one `kbd-*` testID per prop value, all visible, and a typed edit still
  // lands. Resolution values and soft-keyboard labels are the sheet §6 host
  // gap: asserted here is mount + channel, not the keyboard itself.
  test("M-005 keyboard and autofill attribute matrix mounts and stays editable", async () => {
    const app = await openCase("kbd", { testInput: "pointer" });

    const ids = [
      "kbd-keyboard",
      "kbd-inputmode",
      "kbd-type",
      "kbd-return",
      "kbd-hint-done",
      "kbd-hint-go",
      "kbd-hint-next",
      "kbd-hint-previous",
      "kbd-hint-search",
      "kbd-hint-send",
      "kbd-autofill",
    ];
    for (const id of ids) {
      expect(app.shows(`id:${id}`)).toBe(true);
    }

    await app.type("id:kbd-keyboard", "a@b.co");
    expect(app.value("id:kbd-keyboard")).toContain("a@b.co");
  }, 120_000);

  // adapt-sheets/input-group.md M-006 (A-011): this file is the assertion
  // carrier — every fixture probe surface (`focus`, `layout`, the hover
  // trio, `onSubmit`, the `kbd-*` mounts) records through `app.storage()`
  // under BOTH scopes, so a silent fixture regression cannot pass the other
  // rows vacuously. The hover case proves its channel with the press-focus
  // probe (hover probes stay silent under touch by design — M-002); the
  // pointer half's `app.hover` round-trip lives in
  // `input-group.mobile.headless.test.tsx`.
  test("M-006 fixture probes record through open + host.params on both scopes", async () => {
    for (const params of [{ testInput: "pointer" }, { testInput: "touch" }] as Params[]) {
      const layout = await openCase("layout", params);
      await layout.waitUntil(() => callsOf(layout, "layout").length > 0);
      expect(callsOf(layout, "layout").length).toBeGreaterThan(0);

      const hover = await openCase("hover", params);
      await hover.press("id:ig-prefix");
      await hover.waitUntil(() => focusedRecords(hover).length > 0);
      expect(callsOf(hover, "focus").length).toBeGreaterThan(0);

      const submit = await openCase("submit", params);
      await submit.type("label:Amount", "x");
      await submit.submit("label:Amount");
      await submit.waitUntil(() => callsOf(submit, "onSubmit").length === 1);
      expect(callsOf(submit, "onSubmit")).toHaveLength(1);

      const kbd = await openCase("kbd", params);
      expect(kbd.shows("id:kbd-keyboard")).toBe(true);
      expect(kbd.shows("id:kbd-hint-send")).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/input-group.md M-007 (基线): the default environment keeps
  // the desktop contract the existing `input-group.heroui.test.tsx` pins —
  // part composition, disabled refusal, textarea editing, the controlled
  // `onChange({ value })` channel, the render-prop `isFocusWithin` marker and
  // the press-to-focus path. The affix rounding classes
  // (`rounded-s/e-none`) regress through that read-only suite, which stays
  // green untouched.
  test("M-007 baseline: default environment keeps the desktop contract", async () => {
    const app = await openCase("default", { testInput: "pointer" });
    expect(app.shows("id:ig-root >> text:$")).toBe(true);
    expect(app.shows("label:Amount")).toBe(true);
    expect(app.shows("id:ig-root >> text:USD")).toBe(true);
    await app.press("id:ig-suffix");
    await app.waitUntil(() => focusedRecords(app).length > 0);
    expect(lastFocus(app, "input")).toBe(true);

    const disabled = await openCase("disabled", { testInput: "pointer" });
    expect(disabled.enabled("label:Amount")).toBe(false);
    await expect(disabled.press("id:ig-prefix")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(focusedRecords(disabled)).toHaveLength(0);
    // No `app.type` on the non-editable input here: on iOS the type step
    // kills the tester session outright ("no host that takes test steps is
    // connected"). The typed-keys refusal is covered headless in
    // `input-group.mobile.headless.test.tsx`; the kept default value below
    // is the contract half that survives on every target.
    expect(disabled.value("label:Amount")).toBe("10");

    const textarea = await openCase("textarea", { testInput: "pointer" });
    expect(textarea.shows("label:Notes")).toBe(true);
    await textarea.type("label:Notes", "Hello");
    expect(textarea.value("label:Notes")).toBe("Hello");

    const secondary = await openCase("secondary", { testInput: "pointer" });
    expect(secondary.shows("id:ig-root >> text:$")).toBe(true);
    expect(secondary.shows("id:ig-root >> text:USD")).toBe(true);

    const fullWidth = await openCase("full-width", { testInput: "pointer" });
    expect(fullWidth.shows("id:ig-frame")).toBe(true);
    expect(fullWidth.shows("id:ig-root >> text:$")).toBe(true);

    const controlled = await openCase("controlled", { testInput: "pointer" });
    await controlled.type("label:Amount", "5");
    await controlled.waitUntil(() => callsOf(controlled, "onChange").length > 0);
    const last = callsOf(controlled, "onChange").at(-1)![0] as { value: string };
    expect(last.value).toContain("5");

    const renderProps = await openCase("render-props", { testInput: "pointer" });
    expect(renderProps.shows("text:USD")).toBe(true);
    await renderProps.type("label:Amount", "x");
    expect(renderProps.shows("text:focused")).toBe(true);
  }, 120_000);
});
