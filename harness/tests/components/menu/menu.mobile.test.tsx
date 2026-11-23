import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import {
  menu as menuShows,
  open as pressTrigger,
  selectOption,
} from "../../testers/menu";

/*
 * Mobile assertions for the menu adapt unit, one test per row of
 * adapt-sheets/menu.md §4 that the ios/android targets can observe:
 * M-001 … M-002, M-004 … M-015 and M-017 (M-003's hover rows live in
 * `menu.mobile.web.test.tsx` — `app.hover` is desktop/web-only). The
 * held-press sampling and the `platform:"ios"` halves live in
 * `menu.mobile.headless.test.tsx`.
 *
 * The fixture is `harness/menu.fixtures.tsx`, opened by `host.params`:
 * `case` (`m-seam`/`m-narrow` for the B(项) seam, `f-*` for the collection
 * seam, the existing desktop cases for the parity rows), `input`/`density`
 * through `EnvironmentScope`, `hide`/`toggle`/`probekey`/`ctx`/`mode` for
 * the f-* drivers. Every assertion reads what `nsh/test` can observe —
 * `shows()`, `enabled()`, `count()`, `texts()`, `onLayout` bounds and the
 * `@scenario/probe` calls in `app.storage()`.
 *
 * The probe bars mount inside `<Menu>` (direct children for static menus,
 * index-0 siblings of the render-fn output under `items`) because
 * `MenuContext` only reaches the provider's subtree; they drive `sendKey`,
 * `activateFocused` and the registry/collection reads — the headless host
 * cannot give the root view focus, so the keymap entry points are exercised
 * through the same functions its bindings call (the list-box `OwnerShim`
 * convention).
 *
 * Known host gaps this file rides (adapt sheet §6): `hitSlop` is a view
 * prop with no read channel (asserted through the ctx probe's computed
 * value only); `setAccessibilityFocus`/`announce` cannot be read back, so
 * M-012 asserts the fixture-side probe that reads the same fallback source
 * the SR effect uses; `<If>`-in-`<Each>` never unmounts, so "unmounted" is
 * a row that never mounted at mount time (the `hide` param); the web host
 * synthesizes a whole gesture in one turn, so chain shapes assert the
 * landed contract while the `platform` probe tells the hosts apart.
 */

type Params = Record<string, string>;

function openMenu(
  caseName: string,
  params: Params = {},
): Promise<App> {
  return open("../../../menu.fixtures.tsx", {
    host: { params: { case: caseName, input: "pointer", ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type CtxEnv = {
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  allDisabled: boolean;
};

type CtxState = {
  seamPressed: boolean;
  pressed: number;
  scale: number;
  highlight: number;
  ripple: number;
  origin: { x: number; y: number } | null;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  enabled: boolean;
  allDisabled: boolean;
};

type CtxChannels = Omit<CtxState, "hitSlop" | "bounds" | "allDisabled">;

type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type EventEntry = { row: string; kind: string; value?: boolean };

type NodeEntry = {
  type: string;
  key: string;
  textValue: string;
  disabled: boolean;
  level: number;
};

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

/** The host OS the app itself reports — `"web"` on `--target web` even when
 * the test opens with a desktop `platform` (the tabs convention). */
function isWeb(app: App): boolean {
  return lastOf<unknown>(app, "platform") === "web";
}

/** A press that waits for nothing — used where the following assertion's
 * own probe or `texts()` read is the settle signal. */
async function pressSettled(app: App, selector: string): Promise<void> {
  await app.press(selector);
  await app.wait(100);
}

function layouts(app: App, name: string): LayoutEntry[] {
  return callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((l) => l.name === name);
}

function lastLayout(app: App, name: string): LayoutEntry {
  const list = layouts(app, name);
  return list[list.length - 1];
}

function events(app: App, row: string): EventEntry[] {
  return callsOf(app, "events")
    .map((c) => c[0] as EventEntry)
    .filter((e) => e.row === row);
}

/** Rows in any selection mode: `menuitem`, `menuitemradio` or
 * `menuitemcheckbox` (the manager's mode picks the role). */
function menuRows(app: App): number {
  return (
    app.count("role:menuitem") +
    app.count("role:menuitemradio") +
    app.count("role:menuitemcheckbox")
  );
}

async function pressProbe(
  app: App,
  id: string,
  probeName: string,
): Promise<void> {
  const before = callsOf(app, probeName).length;
  await app.press(`id:${id}`);
  await app.waitUntil(() => callsOf(app, probeName).length > before);
}

describe("menu mobile", () => {
  // adapt-sheets/menu.md M-001 (A-003, 负断言): under the default pointer
  // environment the press-feedback seam is a zero-cost pass-through — the
  // context's `isPressed` never rises, `hitSlop()` stays undefined, `scale`
  // is pinned at 1, `pressOrigin` stays null and the gate reports
  // `enabled: false` — while the press chain, `onAction` and `onClose`
  // behave exactly as on desktop.
  test("M-001 default environment: the feedback seam is inert while the press contract holds", async () => {
    const app = await openMenu("m-seam");

    await app.press("id:row-a");
    const kinds = () => events(app, "a").map((e) => e.kind);
    await app.waitUntil(() => kinds().length >= (isWeb(app) ? 6 : 7));

    // The press contract is intact: down → change → up → end → press in
    // order, with onPressChange's own true → false roundtrip. The web host
    // synthesizes the whole gesture in one turn, so its tail ordering is a
    // host detail; the landed contract is what is asserted (sheet §6).
    if (isWeb(app)) {
      expect(kinds().slice(0, 3)).toEqual(["start", "down", "chg"]);
      expect(kinds()).toContain("up");
      expect(kinds()).toContain("end");
    } else {
      expect(kinds()).toEqual([
        "start",
        "down",
        "chg",
        "chg",
        "up",
        "end",
        "press",
      ]);
    }
    expect(
      events(app, "a")
        .filter((e) => e.kind === "chg")
        .map((e) => e.value),
    ).toEqual([true, false]);
    expect(lastOf<string>(app, "onAction")).toBe("a");
    expect(callsOf(app, "onClose").length).toBeGreaterThan(0);

    // Every ctx-state sample must show the seam at rest — under pointer
    // the gate is closed, so only the mount edge ever fired a sample.
    await app.waitUntil(() => callsOf(app, "ctx-a-state").length > 0);
    // Give the +1500 ms sample a chance to land, then evaluate all.
    await app.wait(1600);
    for (const call of callsOf(app, "ctx-a-state")) {
      const s = call[0] as CtxState;
      expect(s.seamPressed).toBe(false);
      expect(s.pressed).toBeLessThan(0.5);
      expect(s.scale).toBe(1);
      expect(s.highlight).toBe(0);
      expect(s.ripple).toBe(0);
      expect(s.origin).toBeNull();
      expect(s.hitSlop).toBeNull();
      expect(s.enabled).toBe(false);
    }
    expect(
      callsOf(app, "ctx-a-pressed").filter((c) => c[0] === true),
    ).toHaveLength(0);

    // The on-demand channel read after the press: rest values, gate closed.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-a-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-a-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.pressed).toBeLessThan(0.5);
    expect(channels.scale).toBe(1);
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/menu.md M-002 (A-001): injected touch lifts the row's
  // visible hit minimum to 44 pt (`min-h-11` over `min-h-9`); the default
  // environment keeps 36 pt. `density="compact"` tightens the spacing
  // literals one step — the root's padding (`p-0.5` vs `p-1`, read as the
  // first row's x offset) and the inter-row gap (`gap-0.5` vs `gap-1`,
  // read between adjacent row bounds); the uninjected environment resolves
  // `default`, identical to the explicit `density="default"`.
  test("M-002 touch lifts rows to 44pt; compact tightens root padding and row gap one step", async () => {
    const pointer = await openMenu("m-seam");
    expect(lastLayout(pointer, "row-a").height).toBe(36);

    const touch = await openMenu("m-seam", { input: "touch" });
    expect(lastLayout(touch, "row-a").height).toBeGreaterThanOrEqual(44);

    // The narrow row (36 pt wide, w-9): same height rule, and the seam
    // computes slop on the under-width axis only.
    const narrowPointer = await openMenu("m-narrow");
    expect(lastLayout(narrowPointer, "row-n").height).toBe(36);
    const narrowTouch = await openMenu("m-narrow", { input: "touch" });
    expect(lastLayout(narrowTouch, "row-n").height).toBeGreaterThanOrEqual(44);

    // density compact: `p-1`→`p-0.5` (4→2 pt, the first row's x inset) and
    // `gap-1`→`gap-0.5` (4→2 pt between the first two rows). A row's own
    // height stays 36 under pointer because `min-h-9` still binds, so the
    // pitch measurement reads the gap directly.
    const compact = await openMenu("m-seam", { density: "compact" });
    const explicit = await openMenu("m-seam", { density: "default" });

    const inset = (app: App) =>
      lastLayout(app, "row-a").x - lastLayout(app, "menu-root").x;
    const pitch = (app: App) => {
      const a = lastLayout(app, "row-a");
      const b = lastLayout(app, "row-b");
      return b.y - (a.y + a.height);
    };

    expect(inset(explicit)).toBeGreaterThan(inset(compact));
    expect(inset(explicit)).toBe(4);
    expect(inset(compact)).toBe(2);
    expect(pitch(explicit)).toBeGreaterThan(pitch(compact));
    expect(pitch(explicit)).toBe(4);
    expect(pitch(compact)).toBe(2);
    // The bare environment resolves `default` exactly.
    expect(inset(pointer)).toBe(inset(explicit));
    expect(pitch(pointer)).toBe(pitch(explicit));
  }, 120_000);

  // adapt-sheets/menu.md M-003 (A-002): injected touch suppresses the hover
  // channel — handleMouseEnter/Leave neither write `isHovered` nor run
  // `onHover*` nor move `focusedKey`; the raw `onMouseEnter`/`onMouseLeave`
  // prop callbacks still report. `app.hover` is desktop/web-only, so the row
  // (touch suppression + the pointer roundtrip) lives in
  // menu.mobile.web.test.tsx.

  // adapt-sheets/menu.md M-004 (A-003): injected touch engages the seam —
  // `isPressed` completes the true → false roundtrip through
  // `PressableFeedbackContext`, the computed `hitSlop` is non-null for the
  // 36 pt-wide narrow row and `enabled` reads true. A disabled row closes
  // the gate: the host refuses its press and no seam edge runs. The
  // held-press channel sampling is in the headless file.
  test("M-004 touch: the seam press roundtrips, hitSlop pads the narrow row and disabled closes the gate", async () => {
    const app = await openMenu("m-seam", { input: "touch" });

    await app.press("id:row-a");
    await app.waitUntil(
      () => callsOf(app, "ctx-a-pressed").filter((c) => c[0] === true).length > 0,
    );
    await app.waitUntil(() => callsOf(app, "ctx-a-pressed").at(-1)?.[0] === false);
    const edges = callsOf(app, "ctx-a-pressed").map((c) => c[0] as boolean);
    expect(edges[0]).toBe(false);
    expect(edges).toContain(true);
    expect(edges.at(-1)).toBe(false);

    // The environment probe: gate open, the full-width row already meets
    // the 44 pt minimum so no slop is computed.
    const env = lastOf<CtxEnv>(app, "ctx-a-env");
    expect(env.enabled).toBe(true);
    expect(env.hitSlop).toBeNull();
    expect(env.bounds.height).toBeGreaterThanOrEqual(44);

    // The disabled row's gate is closed by the `enabled` predicate itself.
    const cEnv = lastOf<CtxEnv>(app, "ctx-c-env");
    expect(cEnv.enabled).toBe(false);
    await expect(app.press("id:row-c")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(
      callsOf(app, "ctx-c-pressed").filter((c) => c[0] === true),
    ).toHaveLength(0);

    // On-demand read after the presses: channels back at rest, gate open.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-a-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-a-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.enabled).toBe(true);

    // The narrow row (36 pt wide) gets the computed slop: (44 − 36) / 2 = 4
    // on each side, 0 top/bottom since its height already meets 44.
    const narrow = await openMenu("m-narrow", { input: "touch" });
    const narrowEnv = lastOf<CtxEnv>(narrow, "ctx-n-env");
    expect(narrowEnv.enabled).toBe(true);
    expect(narrowEnv.hitSlop).toEqual({ top: 0, right: 4, bottom: 0, left: 4 });

    await narrow.press("id:row-n");
    await narrow.waitUntil(
      () =>
        callsOf(narrow, "ctx-n-pressed").filter((c) => c[0] === true).length > 0,
    );
    await narrow.waitUntil(
      () => callsOf(narrow, "ctx-n-pressed").at(-1)?.[0] === false,
    );
  }, 120_000);

  // adapt-sheets/menu.md M-005 (A-011, 基线): the existing cases under
  // `input="touch"` keep every pointer-observable desktop semantic —
  // `onAction` payloads, `selectionChange` values, the pointer close rule,
  // disabled skipping, controlled selection, render-props and the empty
  // state. The keyboard-only cases (escape / typeahead / keyboard-close)
  // stay with their `.web.` files: the headless host cannot give the root
  // view focus, and the assertions below cover the seam, not focus.
  //
  // The row is split across four tests: every `open()` lives until its own
  // test ends (`nsh/test` closes them then), and a dozen browser engines at
  // once disconnects the web host — each group holds at most six.
  test("M-005 a — existing cases under touch: menu structure, actions and the pointer close rule", async () => {
    for (const params of [{}, { input: "touch" }] as Params[]) {
      // `log` (T-001/T-002 dual): trigger → three rows → action + close.
      const log = await openMenu("log", params);
      await pressTrigger(log);
      expect(menuShows(log)).toBe(true);
      await selectOption(log, "Delete file");
      expect(lastOf<string>(log, "onAction")).toBe("delete-file");
      expect(callsOf(log, "onClose").length).toBeGreaterThan(0);
      await log.waitFor("role:menu", { state: "gone" });

      // `section` (T-004 dual): a sectioned menu still activates its rows.
      const section = await openMenu("section", params);
      await selectOption(section, "Copy link");
      expect(lastOf<string>(section, "onAction")).toBe("copy-link");

      // `empty`: renderEmptyState.
      const empty = await openMenu("empty", params);
      expect(empty.texts()).toContain("No actions");
    }
  }, 240_000);

  test("M-005 b — existing cases under touch: selection payloads and marks", async () => {
    for (const params of [{}, { input: "touch" }] as Params[]) {
      // `single-log` / `multiple-log`: payload parity on press.
      const single = await openMenu("single-log", params);
      await pressSettled(single, "id:item-2");
      expect(lastOf<unknown>(single, "selectionChange")).toEqual(["2"]);
      expect(single.count("text:✓")).toBe(1);

      const multiple = await openMenu("multiple-log", params);
      await pressSettled(multiple, "id:item-1");
      await pressSettled(multiple, "id:item-2");
      expect(lastOf<unknown>(multiple, "selectionChange")).toEqual(["1", "2"]);
      expect(multiple.count("text:✓")).toBe(2);

      // `default-selected`: single mode, {2} preselected.
      const dflt = await openMenu("default-selected", params);
      expect(dflt.count("text:✓")).toBe(1);
    }
  }, 240_000);

  test("M-005 c — existing cases under touch: controlled selection and disabled rows", async () => {
    for (const params of [{}, { input: "touch" }] as Params[]) {
      // `controlled`: the parent ignores the change, `force` rewrites it.
      const controlled = await openMenu("controlled", params);
      await pressSettled(controlled, "id:item-2");
      expect(lastOf<unknown>(controlled, "selectionChange")).toEqual(["2"]);
      expect(controlled.count("text:✓")).toBe(1);
      await controlled.press("id:force");
      await controlled.wait(200);
      expect(controlled.texts()).toContain("Three");
      // The ✓ marker sits on row 3 now (exactly one marker overall).
      expect(controlled.count("text:✓")).toBe(1);

      // `disabled`: row 2 via disabledKeys and row 3 via isDisabled refuse
      // the press; row 1 still activates.
      const disabled = await openMenu("disabled", params);
      await expect(disabled.press("id:item-2")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      await expect(disabled.press("id:item-3")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      await pressSettled(disabled, "id:item-1");
      expect(lastOf<string>(disabled, "onAction")).toBe("1");
    }
  }, 240_000);

  test("M-005 d — existing cases under touch: submenu render-props and id-less keys", async () => {
    for (const params of [{}, { input: "touch" }] as Params[]) {
      // `submenu`: hasSubmenu/isOpen render-prop text.
      const submenu = await openMenu("submenu", params);
      expect(submenu.texts()).toContain("submenu=true open=true");

      // `idless` (X-001 dual): two id-less rows keep two different keys —
      // the marker sits under exactly one row at a time and moves with the
      // selection (the case carries no onSelectionChange probe).
      const idless = await openMenu("idless", params);
      await selectOption(idless, "Alpha", "menuitemradio");
      expect(idless.count("id:item-alpha >> text:✓")).toBe(1);
      expect(idless.count("id:item-beta >> text:✓")).toBe(0);
      await selectOption(idless, "Beta", "menuitemradio");
      expect(idless.count("id:item-beta >> text:✓")).toBe(1);
      expect(idless.count("id:item-alpha >> text:✓")).toBe(0);
    }
  }, 240_000);

  // adapt-sheets/menu.md M-006 (A-005): with `hide=4` the "4" row never
  // mounts, yet the data side holds the complete collection — its key sits
  // in `keys`/`data`, typeahead lands on it, and the mounted side agrees
  // there is no handle for it (list-box M-001/M-003 convention).
  test("M-006 unmounted items stay in the collection and typeahead reaches them", async () => {
    const app = await openMenu("f-items", { hide: "4", probekey: "4" });

    expect(menuRows(app)).toBe(4);

    await pressProbe(app, "keys", "keys");
    expect(lastOf<string[]>(app, "keys")).toEqual(["1", "2", "3", "4", "5"]);

    await app.press("id:data");
    await app.waitUntil(() => callsOf(app, "data").length > 0);
    const data = lastOf<NodeEntry[]>(app, "data");
    expect(data.map((n) => n.key)).toContain("4");
    expect(data.find((n) => n.key === "4")?.textValue).toBe("Delta");

    // No mounted row means no registry handle, yet typeahead still lands
    // on the unmounted key.
    await pressProbe(app, "hasrow", "hasRow");
    expect(lastOf<boolean>(app, "hasRow")).toBe(false);

    await app.press("id:nav-d");
    await pressProbe(app, "focused", "focusedKey");
    expect(lastOf<string | null>(app, "focusedKey")).toBe("4");
  }, 120_000);

  // adapt-sheets/menu.md M-007 (A-005, A-007): `items` + `Section items`
  // expands data sections — keyless sections read back the minted
  // `__nsh:section:{level}:{index}` key as a registered section handle,
  // and collection reads reach inside the section.
  test("M-007 data sections expand and the mounted section reads back its minted key", async () => {
    const app = await openMenu("f-section", { probekey: "d" });

    await pressProbe(app, "keys", "keys");
    expect(lastOf<string[]>(app, "keys")).toEqual([
      "__nsh:section:0:0",
      "a",
      "b",
      "__nsh:section:0:3",
      "c",
      "d",
    ]);

    await pressProbe(app, "node", "node");
    expect(lastOf<Partial<NodeEntry>>(app, "node")).toEqual({
      type: "item",
      key: "d",
      textValue: "Daikon",
      disabled: false,
    });

    // The minted key is also the mounted section's registry handle key.
    const section = await openMenu("f-section", {
      probekey: "__nsh:section:0:0",
    });
    await pressProbe(section, "hasrow", "hasRow");
    expect(lastOf<boolean>(section, "hasRow")).toBe(true);
    await pressProbe(section, "row", "row");
    const handle = lastOf<{ type: string; key: string }>(section, "row");
    expect(handle.type).toBe("section");
    expect(handle.key).toBe("__nsh:section:0:0");
  }, 120_000);

  // adapt-sheets/menu.md M-008 (A-006): a row without `id` resolves the
  // same positional key its datum normalized to; a reorder keeps the
  // datum-to-handle association on `value` identity, so the row follows
  // its datum rather than its mount-time position.
  test("M-008 keyless rows align with the datum key and follow their datum on reorder", async () => {
    const app = await openMenu("f-nokey", { probekey: "0" });

    await pressProbe(app, "keys", "keys");
    expect(lastOf<string[]>(app, "keys")).toEqual(["0", "1"]);

    await pressProbe(app, "hasrow", "hasRow");
    expect(lastOf<boolean>(app, "hasRow")).toBe(true);
    await pressProbe(app, "row", "row");
    expect(lastOf<{ textValue: string | null }>(app, "row").textValue).toBe(
      "Plain A",
    );

    // Reordering the data keeps the claim: datum "Plain A" still owns key
    // "0" (identity claim), it just moved to the tail of the collection.
    await pressProbe(app, "reorder", "reorder");
    await pressProbe(app, "keys", "keys");
    expect(lastOf<string[]>(app, "keys")).toEqual(["1", "0"]);
    await pressProbe(app, "row", "row");
    expect(lastOf<{ textValue: string | null }>(app, "row").textValue).toBe(
      "Plain A",
    );
  }, 120_000);

  // adapt-sheets/menu.md M-009 (A-005): row overrides merge row-first —
  // `textValue` wins while mounted and the datum answers when it never
  // mounted; a row's `isDisabled={false}` clears the datum's `disabled`
  // flag (an override, not a union), while `disabledKeys` still unions on
  // top for mounted and unmounted keys alike.
  test("M-009 row textValue/disabled override merges and disabledKeys still unions", async () => {
    // Mounted: the row's textValue answers, not the nameless datum's "".
    const mounted = await openMenu("f-override", { probekey: "x" });
    await pressProbe(mounted, "node", "node");
    expect(lastOf<NodeEntry>(mounted, "node").textValue).toBe("Xray");
    await mounted.press("id:nav-x");
    await pressProbe(mounted, "focused", "focusedKey");
    expect(lastOf<string | null>(mounted, "focusedKey")).toBe("x");

    // Never mounted: the key stays, the datum's own (empty) textValue answers.
    const unmounted = await openMenu("f-override", {
      hide: "x",
      probekey: "x",
    });
    await pressProbe(unmounted, "node", "node");
    expect(lastOf<NodeEntry>(unmounted, "node").textValue).toBe("");
    await pressProbe(unmounted, "keys", "keys");
    expect(lastOf<string[]>(unmounted, "keys")).toEqual(["x", "y", "z"]);

    // `isDisabled={false}` on the mounted row clears the datum's own flag;
    // unmounted, the datum's `disabled: true` answers.
    const cleared = await openMenu("f-override", { probekey: "y" });
    await pressProbe(cleared, "node", "node");
    expect(lastOf<NodeEntry>(cleared, "node").disabled).toBe(false);
    const datumDisabled = await openMenu("f-override", {
      hide: "y",
      probekey: "y",
    });
    await pressProbe(datumDisabled, "node", "node");
    expect(lastOf<NodeEntry>(datumDisabled, "node").disabled).toBe(true);

    // `disabledKeys` unions on top: "z" is inert whether or not its row
    // mounted — the merged node flag is a mounted-only convenience, the
    // refusal comes from `isDisabledKey` on the activation path.
    const z = await openMenu("f-override", { hide: "z", probekey: "z" });
    await pressProbe(z, "node", "node");
    expect(lastOf<NodeEntry>(z, "node").disabled).toBe(false);
    await pressProbe(z, "focuskey", "focusKey");
    const actions = callsOf(z, "onAction").length;
    await pressProbe(z, "activate-enter", "activate");
    expect(callsOf(z, "onAction")).toHaveLength(actions);
    expect(callsOf(z, "selectionChange")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/menu.md M-010 (A-005): a rendered row whose `id` claims no
  // datum is appended to the collection tail and activates normally; an
  // orphan key colliding with an already-merged key keeps its entry through
  // the `#N` suffix instead of silently colliding (two same-key rows cannot
  // produce it — the registry dedups handles by key, so the collision is
  // row-vs-merged-key: an item named after a section datum's key).
  test("M-010 orphan rows append to the tail and a colliding key keeps a #N entry", async () => {
    const app = await openMenu("f-orphan", { probekey: "orphan" });

    await pressProbe(app, "keys", "keys");
    expect(lastOf<string[]>(app, "keys")).toEqual(["1", "2", "orphan"]);

    // The orphan is a real item handle — it activates through the same
    // path as any mounted row.
    await pressProbe(app, "row", "row");
    const handle = lastOf<{ type: string; hasActivate: boolean }>(app, "row");
    expect(handle.type).toBe("item");
    expect(handle.hasActivate).toBe(true);

    await pressProbe(app, "focuskey", "focusKey");
    await pressProbe(app, "activate-enter", "activate");
    expect(lastOf<string>(app, "onAction")).toBe("orphan");

    // The `#N` half: the "s1" row can never claim the section datum's key,
    // so it lands in the orphan pass and collects `s1#2` — the entry
    // activates through the root-level fallback.
    const dup = await openMenu("f-dup", { probekey: "s1#2" });

    await pressProbe(dup, "keys", "keys");
    expect(lastOf<string[]>(dup, "keys")).toEqual([
      "s1",
      "i1",
      "i2",
      "s1#2",
    ]);
    await pressProbe(dup, "node", "node");
    expect(lastOf<Partial<NodeEntry>>(dup, "node")).toEqual({
      type: "item",
      key: "s1#2",
      textValue: "Dup",
      disabled: false,
    });

    await pressProbe(dup, "focuskey", "focusKey");
    await pressProbe(dup, "activate-enter", "activate");
    expect(lastOf<string>(dup, "onAction")).toBe("s1#2");
  }, 120_000);

  // adapt-sheets/menu.md M-011 (A-005): keyboard activation of a focused
  // key whose row is not mounted replays the selection rules against the
  // manager and applies the root-level close rule — Enter on an unmounted
  // key selects it, fires `onAction` and closes exactly once.
  test("M-011 Enter on an unmounted focused key selects, acts and closes once", async () => {
    const app = await openMenu("f-items", {
      hide: "4",
      probekey: "4",
      mode: "single",
    });

    await pressProbe(app, "focuskey", "focusKey");
    await pressProbe(app, "activate-enter", "activate");

    expect(lastOf<unknown>(app, "selectionChange")).toEqual(["4"]);
    expect(lastOf<string>(app, "onAction")).toBe("4");
    expect(callsOf(app, "onClose")).toHaveLength(1);
  }, 120_000);

  // adapt-sheets/menu.md M-012 (A-005): the SR-focus fallback — the
  // announce path cannot be read back by `nsh/test`, so the assertion
  // reads the fixture probe that mirrors the same source the effect uses
  // (`handle?.textValue() ?? node.textValue`, registered in §6). Page keys
  // on a collection with an unmounted row neither crash nor leave the
  // collection's bounds.
  test("M-012 unmounted keys fall back to the datum text for announce; page keys stay bounded", async () => {
    const app = await openMenu("f-items", { hide: "4", probekey: "4" });
    await pressProbe(app, "announce", "announce");
    expect(lastOf<string | null>(app, "announce")).toBe("Delta");

    const paged = await openMenu("f-paged", { hide: "10", probekey: "1" });
    await pressProbe(paged, "focuskey", "focusKey");
    await paged.press("id:nav-pagedown");
    await pressProbe(paged, "focused", "focusedKey");
    const afterDown = lastOf<string | null>(paged, "focusedKey");
    expect(afterDown).not.toBeNull();

    await pressProbe(paged, "keys", "keys");
    const keys = lastOf<string[]>(paged, "keys");
    expect(keys).toContain(afterDown);

    await paged.press("id:nav-pageup");
    await pressProbe(paged, "focused", "focusedKey");
    const afterUp = lastOf<string | null>(paged, "focusedKey");
    expect(keys).toContain(afterUp);
  }, 120_000);

  // adapt-sheets/menu.md M-013 (A-008, 基线): the standalone Menu keeps a
  // single presentation in both environments — one `role="menu"` container
  // with its rows, the same `onAction`/`onClose` channel and no portal or
  // sheet branch (there is no `presentation` prop to flip).
  test("M-013 standalone Menu shows identical structure and close channel in both environments", async () => {
    for (const params of [{}, { input: "touch" }] as Params[]) {
      const app = await openMenu("log", params);
      await pressTrigger(app);
      expect(menuShows(app)).toBe(true);
      expect(app.count("role:menu")).toBe(1);
      expect(app.count("role:menuitem")).toBe(3);

      await selectOption(app, "New file");
      expect(lastOf<string>(app, "onAction")).toBe("new-file");
      expect(callsOf(app, "onClose").length).toBeGreaterThan(0);
      await app.waitFor("role:menu", { state: "gone" });
    }
  }, 120_000);

  // adapt-sheets/menu.md M-014 (A-005, 基线): the static-children path
  // never reads `items` — generated item keys, rendered order, the
  // section's group selection and `disabledKeys` behave identically in
  // both environments, and the probe pair inside a static menu does not
  // join the collection.
  test("M-014 static children path keeps its collection semantics in both environments", async () => {
    for (const params of [{}, { input: "touch" }] as Params[]) {
      // `keys` on the static `m-seam` menu: only the three rows, in mount
      // order — probe bars are not collection entries.
      const seam = await openMenu("m-seam", params);
      await pressProbe(seam, "keys", "keys");
      expect(lastOf<string[]>(seam, "keys")).toEqual(["a", "b", "c"]);

      // `group-selection`: each Section's manager is independent — moving
      // the text-style selection to italic never touches alignment
      // (both groups start selected, so press the unselected rows).
      const group = await openMenu("group-selection", params);
      await pressSettled(group, "id:item-italic");
      expect(lastOf<unknown>(group, "sectionSelection")).toEqual(["italic"]);
      await pressSettled(group, "id:item-center");
      expect(lastOf<unknown>(group, "sectionSelection")).toEqual(["center"]);

      // `idless`: the two generated keys stay distinct (X-001 baseline) —
      // the marker is scoped to one row at a time and moves with the
      // selection, which a shared key could not produce.
      const idless = await openMenu("idless", params);
      await selectOption(idless, "Alpha", "menuitemradio");
      expect(idless.count("id:item-alpha >> text:✓")).toBe(1);
      expect(idless.count("id:item-beta >> text:✓")).toBe(0);
      await selectOption(idless, "Beta", "menuitemradio");
      expect(idless.count("id:item-beta >> text:✓")).toBe(1);
      expect(idless.count("id:item-alpha >> text:✓")).toBe(0);
    }
  }, 240_000);

  // adapt-sheets/menu.md M-015 (A-004…A-007): the M-006/M-011 scenario
  // under `EnvironmentScope input="touch"` — the collection seam is
  // environment-agnostic, so every observable is identical.
  test("M-015 touch environment: unmounted typeahead and activation are identical", async () => {
    const app = await openMenu("f-items", {
      hide: "4",
      probekey: "4",
      mode: "single",
      input: "touch",
    });

    expect(menuRows(app)).toBe(4);
    await pressProbe(app, "hasrow", "hasRow");
    expect(lastOf<boolean>(app, "hasRow")).toBe(false);

    await app.press("id:nav-d");
    await pressProbe(app, "focused", "focusedKey");
    expect(lastOf<string | null>(app, "focusedKey")).toBe("4");

    await pressProbe(app, "focuskey", "focusKey");
    await pressProbe(app, "activate-enter", "activate");
    expect(lastOf<unknown>(app, "selectionChange")).toEqual(["4"]);
    expect(lastOf<string>(app, "onAction")).toBe("4");
    expect(callsOf(app, "onClose")).toHaveLength(1);
  }, 120_000);

  // adapt-sheets/menu.md M-017 (A-011): the fixture mounts in every
  // environment and answers every probe — the assertion carrier asserts
  // itself first.
  test("M-017 the fixture mounts in every environment and every probe records", async () => {
    for (const params of [{}, { input: "touch" }, { density: "compact" }] as Params[]) {
      const app = await openMenu("m-seam", params);
      expect(app.shows("id:row-a")).toBe(true);
      expect(app.shows("id:keys")).toBe(true);
      expect(app.shows("id:data")).toBe(true);

      const env = lastOf<CtxEnv>(app, "ctx-a-env");
      expect(typeof env.enabled).toBe("boolean");
      expect(lastLayout(app, "row-a").height).toBeGreaterThan(0);

      await app.press("id:row-a");
      await app.waitUntil(
        () => events(app, "a").length >= (isWeb(app) ? 6 : 7),
      );
      expect(lastOf<string>(app, "onAction")).toBe("a");

      await pressProbe(app, "keys", "keys");
      expect(lastOf<string[]>(app, "keys")).toEqual(["a", "b", "c"]);
      await app.press("id:data");
      await app.waitUntil(() => callsOf(app, "data").length > 0);
      expect(lastOf<NodeEntry[]>(app, "data")).toHaveLength(3);

      await app.press("id:ctx-sample");
      await app.waitUntil(() => callsOf(app, "ctx-a-channels").length > 0);
    }

    // The items path: probes ride the render-fn sibling tail.
    const items = await openMenu("f-items", { probekey: "1" });
    await pressProbe(items, "keys", "keys");
    expect(lastOf<string[]>(items, "keys")).toHaveLength(5);
    await pressProbe(items, "hasrow", "hasRow");
    expect(lastOf<boolean>(items, "hasRow")).toBe(true);
  }, 240_000);
});
