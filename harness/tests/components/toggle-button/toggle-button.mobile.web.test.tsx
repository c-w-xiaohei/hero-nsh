import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web mobile assertions for the toggle-button adapt unit — one test per row
 * of adapt-sheets/toggle-button.md §4 (M-001…M-010). `platform:"web"` is
 * pinned so the hover and Tab halves run; the touch environment is injected
 * per case through `scope="touch"` (`EnvironmentScope input="touch"`), and
 * its absence is the default pointer environment — the desktop-parity half
 * every adapted row is asserted against.
 *
 * Fixture: `harness/toggle-button.fixtures.tsx`, opened by `host.params`:
 * `case` (basic/selected/controlled/disabled/sizes/icon-only/group-*),
 * `scope` ("" pointer or "touch"), `probe` ("1" mounts the CtxProbe seam
 * surface — `ctx-env`/`ctx-pressed`/`ctx-state` — plus the `ctx-sample`
 * on-demand reader). `events` records the press sequence; the component's
 * real order is down → up → change → press (`onChange` fires inside
 * `handlePress` before the `onPress` callback — adapt sheet §7 自决①, the
 * "与桌面同序" half of M-002), identical in both environments. Group cases
 * add `press:<id>`/`selection` event kinds, the `onSelectionChange` sorted
 * key string, member `onChange` `{id,isSelected}` payloads, `layout` bounds
 * and `focus` `{id, focused}` member-focus edges.
 */

type Params = Record<string, string>;

function openFixture(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../toggle-button.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };
type Point = { x: number; y: number };

type CtxEnv = {
  tag?: string;
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
};

type CtxState = {
  tag?: string;
  pressed: number;
  scale: number;
  isPressed: boolean;
  hitSlop: Edges | null;
  origin: Point | null;
  bounds: { width: number; height: number };
  enabled: boolean;
};

type CtxChannels = Omit<CtxState, "tag">;

type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

/** The `events` probe's string payloads, in record order. */
function eventKinds(app: App): string[] {
  return callsOf(app, "events").map((c) => String(c[0]));
}

/** Member ids whose `focus` probe last reported `focused: true`, in order. */
function focusIds(app: App): string[] {
  return callsOf(app, "focus")
    .map((c) => c[0] as { id: string; focused: boolean })
    .filter((f) => f.focused)
    .map((f) => f.id);
}

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

describe("toggle-button mobile (web)", () => {
  // adapt-sheets/toggle-button.md M-001 (A-003, A-004, 负断言): under the
  // default pointer environment the touch-gated seam is a physical no-op —
  // `ctx-pressed` only ever records false, every `ctx-state` sample and the
  // on-demand `ctx-channels` read show the channels at rest, `hitSlop`
  // stays null, `enabled` reports false — while the press contract works
  // unchanged: one `onChange`, the full down → up → change → press order.
  test("M-001 default environment: the seam stays inert while the press contract works", async () => {
    const app = await openFixture("basic", { probe: "1" });
    await app.waitUntil(() => callsOf(app, "ctx-env").length > 0);

    await app.press("id:tb");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([[true]]);
    expect(eventKinds(app)).toEqual(["down", "up", "change", "press"]);

    // The seam's flag never rose: every edge is false.
    expect(callsOf(app, "ctx-pressed").every((c) => c[0] === false)).toBe(true);
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(false);
    expect(lastOf<CtxEnv>(app, "ctx-env").hitSlop).toBeNull();

    // The deferred samples (+600/+1500 ms) are the only ctx-state reads a
    // gated press schedules — all must sit at rest, gate closed.
    await app.waitUntil(() => callsOf(app, "ctx-state").length >= 2);
    for (const call of callsOf(app, "ctx-state")) {
      const s = call[0] as CtxState;
      expect(s.isPressed).toBe(false);
      expect(s.pressed).toBeLessThan(0.5);
      expect(s.scale).toBe(1);
      expect(s.hitSlop).toBeNull();
      expect(s.origin).toBeNull();
      expect(s.enabled).toBe(false);
    }

    // A fresh post-press on-demand read shows the same rest state.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.isPressed).toBe(false);
    expect(channels.scale).toBe(1);
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/toggle-button.md M-002 (A-003, A-004): injected touch — the
  // press sequence is the desktop one, and the seam round-trips: a hold is
  // caught mid-press by the probe's 200 ms sampler (`isPressed` true,
  // `scale` below 1, `origin` recorded — web batches the press edges into
  // one tick, so the held read comes from `ctx-state`, the settled read
  // from `ctx-channels`).
  test("M-002 injected touch: press sequence identical to pointer, seam round-trips on hold", async () => {
    // The pointer half — the order the touch run must match.
    const pointer = await openFixture("basic");
    await pointer.press("id:tb");
    await pointer.waitUntil(() => callsOf(pointer, "onChange").length === 1);
    const pointerEvents = eventKinds(pointer);

    const app = await openFixture("basic", { scope: "touch", probe: "1" });
    await app.waitUntil(() => callsOf(app, "ctx-env").length > 0);
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);

    await app.press("id:tb");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(eventKinds(app)).toEqual(["down", "up", "change", "press"]);
    expect(eventKinds(app)).toEqual(pointerEvents);

    // A hold: the polling sampler catches the seam flag mid-press and
    // reports the engaged channels — scale animating toward its 0.97 end.
    await app.longPress("id:tb");
    await app.waitUntil(() =>
      callsOf(app, "ctx-state").some((c) => (c[0] as CtxState).isPressed),
    );
    const held = callsOf(app, "ctx-state")
      .map((c) => c[0] as CtxState)
      .filter((s) => s.isPressed);
    expect(held.length).toBeGreaterThan(0);
    expect(held.some((s) => s.scale < 1)).toBe(true);
    expect(held.some((s) => s.origin !== null)).toBe(true);

    // Post-press settle through the on-demand sampler: back to rest, gate
    // still open.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const settled = lastOf<CtxChannels>(app, "ctx-channels");
    expect(settled.isPressed).toBe(false);
    expect(settled.scale).toBe(1);
    expect(settled.origin).toBeNull();
    expect(settled.enabled).toBe(true);
  }, 120_000);

  // adapt-sheets/toggle-button.md M-003 (A-004): under touch the seam's
  // invisible half pads under-target faces to the 44 pt floor — the 40 pt
  // icon-only sm reports `{top/right/bottom/left: 2}` while the 48 pt md
  // and 56 pt lg already clear it and report no slop. `hitSlop` is a view
  // prop with no read-out (sheet §6), so the assertion reads the seam's
  // own accessor through the tagged `ctx-state` samples.
  test("M-003 injected touch: 40pt icon-only sm reports hitSlop 2, md/lg report none", async () => {
    const app = await openFixture("icon-only", { scope: "touch", probe: "1" });

    // Every member's probe must have a post-layout sample before the
    // per-tag reads mean anything (the +600 ms sample lands after onLayout).
    await app.waitUntil(() => {
      const tags = new Set(
        callsOf(app, "ctx-state")
          .map((c) => (c[0] as CtxState).tag)
          .filter((t): t is string => typeof t === "string"),
      );
      return tags.has("sm") && tags.has("md") && tags.has("lg");
    });

    const lastFor = (tag: string) =>
      callsOf(app, "ctx-state")
        .map((c) => c[0] as CtxState)
        .filter((s) => s.tag === tag)
        .at(-1)!;

    const sm = lastFor("sm");
    const md = lastFor("md");
    const lg = lastFor("lg");
    expect(sm.bounds.width).toBe(40);
    expect(md.bounds.width).toBe(48);
    expect(lg.bounds.width).toBe(56);
    expect(sm.hitSlop).toEqual({ top: 2, right: 2, bottom: 2, left: 2 });
    expect(md.hitSlop).toBeNull();
    expect(lg.hitSlop).toBeNull();
    for (const s of [sm, md, lg]) {
      expect(s.enabled).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/toggle-button.md M-004 (A-001, A-002): under touch the
  // `input` axis lifts the visible hit area to 40/48/56 pt and strips every
  // `hover:`/`active:` class — a hover and a press leave
  // `viewStyle().backgroundColor` at the variant's base color (the web
  // sticky-hover residue has nothing to pin). The default environment keeps
  // the desktop tiers (32/36/40 pt) and the hover repaint.
  test("M-004 injected touch: 40/48/56pt sizes, no hover or press background; pointer keeps desktop sizes and hover paint", async () => {
    const touch = await openFixture("sizes", { scope: "touch" });
    await touch.waitUntil(() => callsOf(touch, "layout").length >= 3);
    expect(layoutFor(touch, "tb-sm").height).toBe(40);
    expect(layoutFor(touch, "tb-md").height).toBe(48);
    expect(layoutFor(touch, "tb-lg").height).toBe(56);

    const pointer = await openFixture("sizes");
    await pointer.waitUntil(() => callsOf(pointer, "layout").length >= 3);
    expect(layoutFor(pointer, "tb-sm").height).toBe(32);
    expect(layoutFor(pointer, "tb-md").height).toBe(36);
    expect(layoutFor(pointer, "tb-lg").height).toBe(40);

    // Background half on the default-variant standalone. A press toggles
    // the button on, so the honest reads are: unselected base → hover
    // changes nothing → press lands on the `aria-pressed` selected base
    // (kept env-free, R-012) — never the hover color, which only the
    // pointer compound can emit.
    const app = await openFixture("basic", { scope: "touch" });
    const base = app.viewStyle("id:tb")?.backgroundColor;
    expect(base).toBeDefined();

    await app.hover("id:tb");
    await app.wait(100);
    expect(app.viewStyle("id:tb")?.backgroundColor).toBe(base);

    const sel = await openFixture("selected", { scope: "touch" });
    const selectedBg = sel.viewStyle("id:tb")?.backgroundColor;
    expect(selectedBg).toBeDefined();
    expect(selectedBg).not.toBe(base);

    await app.press("id:tb");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    await app.wait(100);
    const afterPress = app.viewStyle("id:tb")?.backgroundColor;
    expect(afterPress).toBe(selectedBg);

    // Pointer control: the same hover must repaint — and to a color that
    // is neither the base nor the selected base, so the touch reads above
    // cannot be hover paint.
    const ptr = await openFixture("basic");
    const ptrBase = ptr.viewStyle("id:tb")?.backgroundColor;
    expect(ptrBase).toBeDefined();
    await ptr.hover("id:tb");
    await ptr.waitUntil(
      () => ptr.viewStyle("id:tb")?.backgroundColor !== ptrBase,
    );
    const hoverBg = ptr.viewStyle("id:tb")?.backgroundColor;
    expect(hoverBg).not.toBe(ptrBase);
    expect(hoverBg).not.toBe(selectedBg);
    expect(afterPress).not.toBe(hoverBg);
  }, 120_000);

  // adapt-sheets/toggle-button.md M-005 (A-001, A-003): `isDisabled` closes
  // the seam's inline gate and the press path alike, in both environments —
  // `app.enabled` false, the press refused before dispatch, no events, no
  // `onChange`, every sampled channel at rest.
  test("M-005 isDisabled: inert in both environments — no feedback, no toggle, no callbacks", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openFixture(
        "disabled",
        { ...(scope ? { scope } : {}), probe: "1" },
      );

      expect(app.enabled("id:tb")).toBe(false);
      await expect(app.press("id:tb")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(app, "events")).toHaveLength(0);
      expect(callsOf(app, "onChange")).toHaveLength(0);
      expect(callsOf(app, "onPressChange")).toHaveLength(0);
      expect(app.shows("text:Off")).toBe(true);

      expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(false);
      expect(callsOf(app, "ctx-pressed").every((c) => c[0] === false)).toBe(true);

      await app.waitUntil(() => callsOf(app, "ctx-state").length >= 2);
      for (const call of callsOf(app, "ctx-state")) {
        const s = call[0] as CtxState;
        expect(s.isPressed).toBe(false);
        expect(s.scale).toBe(1);
        expect(s.enabled).toBe(false);
      }
    }
  }, 120_000);

  // adapt-sheets/toggle-button.md M-006 (基线): default-environment zero
  // drift — uncontrolled `defaultSelected` round-trips, controlled
  // `isSelected` holds until the parent writes, the render-prop markers
  // (`On/Off`, `Hovered/Idle`, `FocusRing/NoRing`, the `onPressChange`
  // pressed edge) behave exactly as the heroui suite pins.
  test("M-006 default environment baseline: uncontrolled/controlled toggle, render-prop markers, focus-visible", async () => {
    const app = await openFixture("basic", { probe: "1" });

    // Uncontrolled round-trip with the pressed edge probed.
    await app.press("id:tb");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([[true]]);
    expect(app.shows("text:On")).toBe(true);
    await app.press("id:tb");
    await app.waitUntil(() => callsOf(app, "onChange").length === 2);
    expect(callsOf(app, "onChange")[1]).toEqual([false]);
    expect(app.shows("text:Off")).toBe(true);
    expect(callsOf(app, "onPressChange")).toEqual([
      [true],
      [false],
      [true],
      [false],
    ]);

    // `defaultSelected` starts on.
    const sel = await openFixture("selected");
    expect(sel.shows("text:On")).toBe(true);

    // Controlled: the press reports `onChange` but the parent ignores it —
    // the marker stays Off until `force` writes the signal.
    const ctl = await openFixture("controlled");
    await ctl.press("id:tb");
    await ctl.waitUntil(() => callsOf(ctl, "onChange").length === 1);
    expect(ctl.shows("text:Off")).toBe(true);
    await ctl.press("id:force");
    await ctl.waitUntil(() => ctl.shows("text:On"));

    // Hover and keyboard-focus markers (web carries both).
    const mark = await openFixture("basic");
    await mark.hover("id:tb");
    expect(mark.shows("text:Hovered")).toBe(true);
    await mark.hover("id:away");
    await mark.waitFor("text:Idle");
    await mark.keyboard.press("tab");
    await mark.waitUntil(() => mark.shows("text:FocusRing"));
  }, 120_000);

  // adapt-sheets/toggle-button.md M-007 (基线): group selection preserved in
  // both environments — single mode replaces through the selection manager
  // (members are `role:radio` inside `role:radiogroup`), multiple mode
  // accumulates inside `role:toolbar`, `disallowEmptySelection` refuses the
  // last deselect, `onSelectionChange` reports the key `Set`, group
  // `isDisabled` propagates — and inside a `Toolbar` the members still walk
  // the shared arrow-key registry.
  test("M-007 group selection preserved in both environments; toolbar arrow registration intact", async () => {
    for (const scope of ["", "touch"] as const) {
      const params: Params = scope ? { scope } : {};

      const single = await openFixture("group", params);
      expect(single.shows("role:radiogroup")).toBe(true);
      expect(single.count("role:radio")).toBe(3);
      await single.press("id:tb-one");
      await single.waitUntil(() => callsOf(single, "onSelectionChange").length === 1);
      expect(callsOf(single, "onSelectionChange")).toEqual([["one"]]);
      expect(single.shows("text:One:on")).toBe(true);
      // Single mode replaces: pressing two drops one.
      await single.press("id:tb-two");
      await single.waitUntil(() => callsOf(single, "onSelectionChange").length === 2);
      expect(callsOf(single, "onSelectionChange")[1]).toEqual(["two"]);
      expect(single.shows("text:One:off")).toBe(true);
      expect(single.shows("text:Two:on")).toBe(true);

      const multi = await openFixture("group-multi", params);
      expect(multi.shows("role:toolbar")).toBe(true);
      await multi.press("id:tb-one");
      await multi.waitUntil(() => callsOf(multi, "onSelectionChange").length === 1);
      await multi.press("id:tb-two");
      await multi.waitUntil(() => callsOf(multi, "onSelectionChange").length === 2);
      expect(callsOf(multi, "onSelectionChange")[1]).toEqual(["one,two"]);
      // Toggling a member off removes only its key.
      await multi.press("id:tb-one");
      await multi.waitUntil(() => callsOf(multi, "onSelectionChange").length === 3);
      expect(callsOf(multi, "onSelectionChange")[2]).toEqual(["two"]);

      const disallow = await openFixture("group-disallow", params);
      await disallow.press("id:tb-one");
      await disallow.waitUntil(() => callsOf(disallow, "onSelectionChange").length === 1);
      await disallow.press("id:tb-one");
      await disallow.wait(100);
      // The last deselect was refused: no second selection report, member
      // stays on, and no second `selection` event kind either.
      expect(callsOf(disallow, "onSelectionChange")).toHaveLength(1);
      expect(eventKinds(disallow).filter((k) => k === "selection")).toHaveLength(1);
      expect(disallow.shows("text:One:on")).toBe(true);

      const disabledGroup = await openFixture("group-disabled", params);
      expect(disabledGroup.enabled("id:tb-one")).toBe(false);
      expect(disabledGroup.enabled("id:tb-two")).toBe(false);
      await expect(disabledGroup.press("id:tb-one")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(disabledGroup, "onSelectionChange")).toHaveLength(0);
    }

    // Toolbar half (web keyboard): Tab reaches the first member and the
    // arrows walk the shared registry member → member — the group's own
    // scopes yield to the toolbar's (`if (!toolbar)`).
    const tb = await openFixture("group-toolbar");
    await tb.keyboard.press("tab");
    await tb.waitUntil(() => focusIds(tb).length >= 1);
    expect(focusIds(tb)).toEqual(["one"]);
    await tb.keyboard.press("arrowright");
    await tb.waitUntil(() => focusIds(tb).length >= 2);
    expect(focusIds(tb)).toEqual(["one", "two"]);
    await tb.keyboard.press("arrowright");
    await tb.waitUntil(() => focusIds(tb).length >= 3);
    expect(focusIds(tb)).toEqual(["one", "two", "three"]);
  }, 120_000);

  // adapt-sheets/toggle-button.md M-008 (基线): members without `id` keep
  // their own toggle inside the group — the press flips the render-prop
  // marker, never reaches `selectedKeys`/`onSelectionChange` — while still
  // registering for the arrow-key order (the group's own horizontal scope,
  // web keyboard).
  test("M-008 idless members toggle independently and stay in the arrow-key order", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openFixture("group-idless", scope ? { scope } : {});

      await app.press("id:tb-one");
      await app.waitUntil(() => app.shows("text:One:on"));
      await app.press("id:tb-three");
      await app.waitUntil(() => app.shows("text:Three:on"));
      // Both idless presses stayed local: no selection report at all.
      expect(callsOf(app, "onSelectionChange")).toHaveLength(0);
      expect(eventKinds(app).filter((k) => k === "selection")).toHaveLength(0);

      // The `id` member selects normally beside them.
      await app.press("id:tb-two");
      await app.waitUntil(() => callsOf(app, "onSelectionChange").length === 1);
      expect(callsOf(app, "onSelectionChange")).toEqual([["two"]]);
      expect(eventKinds(app)).toContain("press:one");
      expect(eventKinds(app)).toContain("press:three");
      expect(eventKinds(app)).toContain("press:two");
    }

    // Arrow order includes the idless members: one (idless) → two →
    // three (idless), through the group's own keymap scope.
    const app = await openFixture("group-idless");
    await app.keyboard.press("tab");
    await app.waitUntil(() => focusIds(app).length >= 1);
    expect(focusIds(app)).toEqual(["one"]);
    await app.keyboard.press("arrowright");
    await app.waitUntil(() => focusIds(app).length >= 2);
    expect(focusIds(app)).toEqual(["one", "two"]);
    await app.keyboard.press("arrowright");
    await app.waitUntil(() => focusIds(app).length >= 3);
    expect(focusIds(app)).toEqual(["one", "two", "three"]);
  }, 120_000);

  // adapt-sheets/toggle-button.md M-009 (A-007): the fixture itself is the
  // assertion carrier — it mounts in both environments, the contract probes
  // record, and every seam probe answers (`ctx-env` reports the gate the
  // scope implies).
  test("M-009 the fixture mounts in both environments and every probe records", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openFixture(
        "basic",
        { ...(scope ? { scope } : {}), probe: "1" },
      );
      expect(app.shows("id:tb")).toBe(true);

      await app.press("id:tb");
      await app.waitUntil(() => callsOf(app, "onChange").length === 1);
      expect(eventKinds(app)).toEqual(["down", "up", "change", "press"]);

      expect(callsOf(app, "layout").length).toBeGreaterThan(0);
      expect(callsOf(app, "ctx-env").length).toBeGreaterThan(0);
      expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(scope === "touch");

      await app.waitUntil(() => callsOf(app, "ctx-state").length > 0);
      await app.waitUntil(() => callsOf(app, "ctx-pressed").length > 0);

      await app.press("id:ctx-sample");
      await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    }
  }, 120_000);

  // adapt-sheets/toggle-button.md M-010 (A-005): the group container is not
  // a press surface — pressing the detached vertical root's center (the
  // 4pt gap between its two members) produces no `onPress`/`onChange` in
  // either environment. `nsh/test` presses the nearest view around a
  // non-pressable match only through an ancestor that hears presses; the
  // group root has none, so the step either reports
  // `ERR_NSH_TEST_NOT_FOUND` (the disclosure-group precedent) or resolves
  // as a no-op — the assertion that matters is that nothing was recorded.
  test("M-010 the group container is not a press surface in either environment", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openFixture("group-gap", scope ? { scope } : {});
      expect(app.shows("id:tb-group")).toBe(true);

      await app.press("id:tb-group").catch(() => undefined);
      expect(callsOf(app, "events")).toHaveLength(0);
      expect(callsOf(app, "onSelectionChange")).toHaveLength(0);

      // The container's inertness did not spread: a member still presses.
      await app.press("id:tb-one");
      await app.waitUntil(() => callsOf(app, "onSelectionChange").length === 1);
      expect(callsOf(app, "onSelectionChange")).toEqual([["one"]]);
    }
  }, 120_000);
});
