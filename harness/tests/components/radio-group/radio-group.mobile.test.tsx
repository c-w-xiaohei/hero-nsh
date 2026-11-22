import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the radio-group adapt unit, one test per row of
 * adapt-sheets/radio-group.md §4 (M-001…M-007). The action is B(继承): the
 * press surface belongs to each `Radio`/`Radio.Content` row (the radio
 * unit's delivered seam), and the group container itself gains no feedback
 * — these rows pin that boundary from the group's side.
 *
 * The fixture is `harness/radio-group.fixtures.tsx`, opened by `host.params`:
 * `scope` ("" or "touch" through `EnvironmentScope`), `default`,
 * `orientation`, `disabled`, `readonly`, `gap`. Probes in `app.storage()`:
 * `onChange` (the group's single commit channel), `press` (per-row Content
 * onPress — proves a press landed when no `onChange` may follow), `layout`
 * (`part` = "group" | "radio" | "content"), `onFocus`/`onBlur` (per item).
 * The "<name>:selected" markers stand in for aria-checked.
 *
 * M-007's keyboard half cannot run on a headless Windows window (the
 * registered focus gap), so it opens `platform: "web"` explicitly inside
 * the test — the same split button.mobile.test.tsx uses — and reuses
 * radio.fixtures.tsx's `group-focus` case, which already records the
 * group's onFocus/onBlur/onFocusChange and the per-item focus probes.
 */

type Params = Record<string, string | number | boolean>;

function openGroup(
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../radio-group.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params },
  });
}

type LayoutRecord = {
  part: "group" | "radio" | "content";
  name?: string;
  x?: number;
  y?: number;
  width: number;
  height: number;
};

function layouts(app: App, part: LayoutRecord["part"], name?: string): LayoutRecord[] {
  return callsOf(app, "layout")
    .map((c) => c[0] as LayoutRecord)
    .filter((l) => l.part === part && (name === undefined || l.name === name));
}

function lastLayout(
  app: App,
  part: LayoutRecord["part"],
  name?: string,
): LayoutRecord {
  const last = layouts(app, part, name).at(-1);

  if (!last) throw new Error(`the layout probe reported no ${part}${name ? `/${name}` : ""}`);

  return last;
}

function pressCount(app: App, value: string): number {
  return callsOf(app, "press").filter((c) => c[0] === value).length;
}

describe("radio-group mobile", () => {
  // adapt-sheets/radio-group.md M-001 (A-004): default environment (pointer
  // baseline) — a whole-row press on an unselected item commits `onChange`
  // exactly once with that value, and pressing the now-selected item again
  // appends nothing (radio semantics: no deselect, the group's `select`
  // writes once and `createControllableSignal` dedupes the repeat).
  test("M-001 default environment: row press commits once and a re-press never re-commits", async () => {
    const app = await openGroup();

    await app.press("role:radio[Cats]");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([["cats"]]);
    expect(app.shows("text:Cats:selected")).toBe(true);

    await app.press("role:radio[Cats]");
    await app.waitUntil(() => pressCount(app, "cats") === 2);
    await app.wait(20);
    expect(callsOf(app, "onChange")).toEqual([["cats"]]);
    expect(app.shows("text:Cats:selected")).toBe(true);
    expect(app.shows("text:Dogs:unselected")).toBe(true);
  }, 120_000);

  // adapt-sheets/radio-group.md M-002 (A-001): the group's bare surface —
  // the `group-gap` spacer between the items — is not a press surface.
  // `nsh/test` can only press a view that hears presses, so the strongest
  // observable form of "组不加反馈" is that the press finds no pressable
  // view at all; the probes and markers then confirm nothing moved.
  test("M-002 pressing the group's bare gap finds no pressable and commits nothing", async () => {
    const app = await openGroup({ gap: "1" });

    expect(app.shows("id:group-gap")).toBe(true);

    await expect(app.press("id:group-gap")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(app.shows("text:Dogs:selected")).toBe(true);
  }, 120_000);

  // adapt-sheets/radio-group.md M-003 (A-001): the same bare-surface press
  // under an injected touch environment — "group 不加反馈" holds on mobile
  // exactly as under pointer.
  test("M-003 under touch the group's bare gap still has no pressable", async () => {
    const app = await openGroup({ gap: "1", scope: "touch" });

    expect(app.shows("id:group-gap")).toBe(true);

    await expect(app.press("id:group-gap")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(app.shows("text:Dogs:selected")).toBe(true);
  }, 120_000);

  // adapt-sheets/radio-group.md M-004 (A-004): under `EnvironmentScope
  // input="touch"` the inherited row seam still holds inside the group —
  // one press commits once, the Content row keeps its 44 pt `min-h-11`
  // floor through the group's `mt-4` itemClass, and the group's
  // `isDisabled`/`isReadOnly` still block the write.
  test("M-004 under touch: row press commits once, the 44pt floor holds, disabled and read-only refuse writes", async () => {
    const app = await openGroup({ scope: "touch" });

    await app.press("role:radio[Cats]");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([["cats"]]);

    await app.waitUntil(() => layouts(app, "content", "Cats").length > 0);
    expect(lastLayout(app, "content", "Cats").height).toBeGreaterThanOrEqual(44);

    const disabled = await openGroup({ disabled: true, scope: "touch" });
    expect(disabled.enabled("role:radio[Cats]")).toBe(false);
    await expect(disabled.press("role:radio[Cats]")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(disabled, "onChange")).toHaveLength(0);

    const readonly = await openGroup({ readonly: true, scope: "touch" });
    await readonly.press("role:radio[Cats]");
    await readonly.waitUntil(() => pressCount(readonly, "cats") >= 1);
    await readonly.wait(20);
    expect(callsOf(readonly, "onChange")).toHaveLength(0);
    expect(readonly.shows("text:Cats:unselected")).toBe(true);
    expect(readonly.shows("text:Dogs:selected")).toBe(true);
  }, 120_000);

  // adapt-sheets/radio-group.md M-005 (A-002): the group's variant table
  // carries no `input`/`density` axis — the root's laid-out width is
  // identical under pointer and touch, and `orientation="horizontal"`
  // still puts the first two items on the same row in both environments.
  test("M-005 group root width is identical across environments and horizontal items share a row", async () => {
    const pointer = await openGroup();
    await pointer.waitUntil(() => layouts(pointer, "group").length > 0);
    const pointerWidth = lastLayout(pointer, "group").width;

    const touch = await openGroup({ scope: "touch" });
    await touch.waitUntil(() => layouts(touch, "group").length > 0);
    const touchWidth = lastLayout(touch, "group").width;

    expect(pointerWidth).toBeGreaterThan(0);
    expect(touchWidth).toBe(pointerWidth);

    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const app = await openGroup({ ...params, orientation: "horizontal" });
      await app.waitUntil(
        () =>
          layouts(app, "radio", "Dogs").length > 0 &&
          layouts(app, "radio", "Cats").length > 0,
      );
      expect(lastLayout(app, "radio", "Cats").y).toBe(
        lastLayout(app, "radio", "Dogs").y,
      );
    }
  }, 120_000);

  // adapt-sheets/radio-group.md M-006 (A-003): the group `Label` press
  // takes the `focusField` path — it focuses the tab-stop item without
  // writing a value, in both environments. Focus itself is a registered
  // host gap on headless Windows, so the assertion stays on the contract:
  // no `onChange`, selection marker unmoved.
  test("M-006 group Label press commits nothing and leaves the selection", async () => {
    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const app = await openGroup(params);

      await app.press("id:group-label");
      await app.wait(50);

      expect(callsOf(app, "onChange")).toHaveLength(0);
      expect(app.shows("text:Dogs:selected")).toBe(true);
      expect(app.shows("text:Cats:unselected")).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/radio-group.md M-007 (基线): desktop zero-drift sample —
  // the focus-within contract is unchanged: the first item entering the
  // group fires the group's `onFocus`/`onFocusChange(true)` once, arrow
  // moves inside the group never produce `onBlur`/`onFocusChange(false)`,
  // and the real leave commits the delayed blur pair. Keyboard focus only
  // exists on the web target, so this row opens `platform: "web"` and
  // reuses radio.fixtures.tsx's `group-focus` case (the same upstream
  // unit the heroui.web suite already pins).
  test("M-007 baseline: focus-within enters once, survives arrow moves, and leaves once", async () => {
    const app = await open("../../../radio.fixtures.tsx", {
      platform: "web",
      width: 1024,
      height: 768,
      host: { params: { case: "group-focus" } },
    });

    await app.keyboard.press("tab");
    expect(callsOf(app, "groupFocus")).toEqual([["group"]]);
    expect(callsOf(app, "groupBlur")).toHaveLength(0);
    expect(callsOf(app, "groupFocusChange")).toEqual([[true]]);

    await app.keyboard.press("arrowdown");
    await app.keyboard.press("arrowup");
    expect(callsOf(app, "onFocus")).toEqual([["a"], ["b"], ["a"]]);
    expect(callsOf(app, "groupFocus")).toEqual([["group"]]);
    expect(callsOf(app, "groupBlur")).toHaveLength(0);
    expect(callsOf(app, "groupFocusChange")).toEqual([[true]]);

    await app.keyboard.press("tab");
    expect(callsOf(app, "groupBlur")).toEqual([["group"]]);
    expect(callsOf(app, "groupFocusChange")).toEqual([[true], [false]]);
    expect(callsOf(app, "groupFocus")).toEqual([["group"]]);
  }, 120_000);
});
