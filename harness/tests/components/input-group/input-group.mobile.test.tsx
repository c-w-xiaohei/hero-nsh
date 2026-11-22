import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { focusCount, lastFocus } from "../../testers/input-group";

/*
 * Mobile assertions for the input-group adapt unit, one test per row of
 * adapt-sheets/input-group.md §4 (M-001…M-007). The fixture is
 * `harness/input-group.fixtures.tsx` — `case` picks the shape (default /
 * disabled / textarea / secondary / full-width / controlled / render-props /
 * layout / hover / submit / kbd) and `scope` picks the environment (`"touch"`
 * mounts `EnvironmentScope input="touch"`; absent is the host default,
 * pointer — the desktop-parity baseline).
 *
 * What `nsh/test` observes carries every row: `layout` probes (onLayout
 * bounds) for the hit face, the `isHovered` render-prop text plus
 * `onHover*` probes for the hover seam, the input's focus/blur probes for
 * the press-to-focus channel, and `onSubmit` / `onChange` for the keyboard
 * chain. `app.submit` sends Return to a named control.
 *
 * The file pins `platform:"windows", 1024×768`: an unpinned headless open
 * lands on the phone-sized engine where `platform.desktop` is false, the
 * environment's input defaults to touch and every pointer-default assertion
 * inverts (the w1 convention; the M-008 ios-derivation half lives in
 * `input-group.mobile.headless.test.tsx`, which opens unpinned by design).
 */

type Params = Record<string, string>;

function openCase(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../input-group.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: caseName, ...params } },
  });
}

type LayoutEntry = { name: string; width: number; height: number };

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

describe("input-group mobile", () => {
  // adapt-sheets/input-group.md M-001 (A-001, A-002): injected touch raises
  // the row's hit face to the 44pt `min-h-11` cell while the default
  // environment keeps the pre-axis row (the pointer cell is empty, so the
  // desktop output is byte-for-byte).
  test("M-001 injected touch: root measures at least 44pt, default row unchanged", async () => {
    const touch = await openCase("layout", { scope: "touch" });
    await touch.waitUntil(() =>
      callsOf(touch, "layout").some((c) => (c[0] as LayoutEntry).name === "root"),
    );
    expect(layoutFor(touch, "root").height).toBeGreaterThanOrEqual(44);
    expect(layoutFor(touch, "prefix").height).toBeGreaterThanOrEqual(44);

    const pointer = await openCase("layout");
    await pointer.waitUntil(() =>
      callsOf(pointer, "layout").some((c) => (c[0] as LayoutEntry).name === "root"),
    );
    expect(layoutFor(pointer, "root").height).toBeLessThan(44);
  }, 120_000);

  // adapt-sheets/input-group.md M-002 (A-003, A-004): injected touch — a
  // press (and the web sticky hover it leaves) lights neither the group's
  // `isHovered` render-prop nor the hover callbacks; the default
  // environment's hover still round-trips.
  test("M-002 injected touch suppresses hover state and callbacks, default keeps them", async () => {
    const touch = await openCase("hover", { scope: "touch" });
    await touch.hover("id:ig-root");
    expect(touch.shows("text:idle")).toBe(true);
    expect(touch.shows("text:hovered")).toBe(false);
    await touch.press("id:ig-prefix");
    await touch.waitUntil(() => callsOf(touch, "focus").length >= 1);
    expect(touch.shows("text:idle")).toBe(true);
    expect(touch.shows("text:hovered")).toBe(false);
    expect(callsOf(touch, "onHoverStart")).toHaveLength(0);
    expect(callsOf(touch, "onHoverEnd")).toHaveLength(0);
    expect(callsOf(touch, "onHoverChange")).toHaveLength(0);

    const pointer = await openCase("hover");
    await pointer.hover("id:ig-root");
    await pointer.waitFor("text:hovered");
    expect(callsOf(pointer, "onHoverStart")).toHaveLength(1);
    expect(callsOf(pointer, "onHoverChange")).toEqual([[true]]);
  }, 120_000);

  // adapt-sheets/input-group.md M-003 (A-008): the affix press-to-focus
  // channel is a shared contract, not a new gesture — under both
  // environments pressing an affix focuses the real input, and a disabled
  // group still refuses it.
  test("M-003 both environments: affix press focuses the input, disabled refuses", async () => {
    for (const params of [{} as Params, { scope: "touch" }]) {
      const app = await openCase("default", params);

      await app.press("id:ig-prefix");
      await app.waitUntil(() => focusCount(app, "input") >= 1);
      expect(lastFocus(app, "input")).toBe(true);
    }

    const disabled = await openCase("disabled", { scope: "touch" });
    // The group reports disabled, so a press on an affix rejects — the
    // press-to-focus channel can never run while disabled.
    await expect(disabled.press("id:ig-prefix")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(focusCount(disabled, "input")).toBe(0);
    expect(disabled.enabled("label:Amount")).toBe(false);
  }, 120_000);

  // adapt-sheets/input-group.md M-004 (A-005, A-006): the declared `onSubmit`
  // prop reaches the host — Return in the input reports `{ text }` exactly
  // once, and `submitBehavior="submit"` keeps the focus (the blur probe
  // records nothing; typing still edits the same input).
  test("M-004 injected touch: Return submits once with the text, focus stays", async () => {
    const app = await openCase("submit", { scope: "touch" });

    await app.type("id:ig-input", "a");
    await app.waitUntil(() => app.value("id:ig-input") === "10a");
    await app.submit("id:ig-input");
    await app.waitUntil(() => callsOf(app, "onSubmit").length >= 1);

    expect(callsOf(app, "onSubmit")).toEqual([[{ text: "10a" }]]);
    // `submitBehavior="submit"` keeps the focus — no blur record, and the
    // input still accepts edits.
    expect(callsOf(app, "focus").filter((c) => (c[0] as { focused: boolean }).focused === false)).toHaveLength(0);
    await app.type("id:ig-input", "b");
    await app.waitUntil(() => app.value("id:ig-input") === "10ab");
  }, 120_000);

  // adapt-sheets/input-group.md M-005 (A-005): every keyboard attribute the
  // group forwards reaches the host channel — `keyboardType` / `inputMode` /
  // `type` / `returnKeyType` / the `enterKeyHint` set / the autofill trio /
  // `maxLength` all mount and stay editable (what the soft-keyboard label
  // actually shows is the host gap, sheet §6).
  test("M-005 injected touch: the keyboard-attribute matrix mounts and edits", async () => {
    const app = await openCase("kbd", { scope: "touch" });

    for (const id of [
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
    ]) {
      expect(app.shows(`id:${id}`)).toBe(true);
      expect(app.enabled(`id:${id}`)).toBe(true);
    }

    // The channel is live: typing into a mapped row still reports onChange
    // through the same path every case uses.
    await app.type("id:kbd-type", "x");
    await app.waitUntil(() => app.value("id:kbd-type") === "x");
  }, 120_000);

  // adapt-sheets/input-group.md M-006 (A-011): the carrier itself works —
  // every new case mounts under both environments and its probe surface is
  // readable (the assertions above are only as good as this one).
  test("M-006 fixture carrier: scoped cases mount, probes readable", async () => {
    for (const params of [{} as Params, { scope: "touch" }]) {
      const layout = await openCase("layout", params);
      await layout.waitUntil(() => callsOf(layout, "layout").length >= 1);
      expect(callsOf(layout, "layout").length).toBeGreaterThan(0);

      const hover = await openCase("hover", params);
      expect(hover.shows("id:ig-input")).toBe(true);

      const submit = await openCase("submit", params);
      expect(submit.shows("id:ig-input")).toBe(true);

      const kbd = await openCase("kbd", params);
      expect(kbd.shows("id:kbd-keyboard")).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/input-group.md M-007 (基线): default-environment zero drift
  // — the parts render, press-to-focus fires, hover lights the render-prop,
  // typing reports `{ value }`, disabled refuses edits, the textarea edits,
  // secondary and full-width mount unchanged.
  test("M-007 default environment baseline: desktop semantics unchanged", async () => {
    const app = await openCase("default");
    expect(app.shows("id:ig-root >> text:$")).toBe(true);
    expect(app.shows("id:ig-root >> text:USD")).toBe(true);
    expect(app.shows("label:Amount")).toBe(true);

    await app.press("id:ig-suffix");
    await app.waitUntil(() => focusCount(app, "input") >= 1);
    expect(lastFocus(app, "input")).toBe(true);

    const hover = await openCase("hover");
    await hover.hover("id:ig-root");
    await hover.waitFor("text:hovered");

    const controlled = await openCase("controlled");
    await controlled.type("id:ig-input", "7");
    await controlled.waitUntil(() => callsOf(controlled, "onChange").length >= 1);
    expect(callsOf(controlled, "onChange")).toEqual([[{ value: "7" }]]);

    const disabled = await openCase("disabled");
    expect(disabled.enabled("label:Amount")).toBe(false);
    await expect(disabled.press("id:ig-prefix")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(focusCount(disabled, "input")).toBe(0);

    const textarea = await openCase("textarea");
    await textarea.type("label:Notes", "Hello");
    expect(textarea.value("label:Notes")).toBe("Hello");

    const secondary = await openCase("secondary");
    expect(secondary.shows("id:ig-root >> text:USD")).toBe(true);

    const fullWidth = await openCase("full-width");
    expect(fullWidth.shows("id:ig-frame >> text:USD")).toBe(true);
  }, 120_000);
});
