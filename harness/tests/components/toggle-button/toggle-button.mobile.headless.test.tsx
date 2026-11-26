import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the toggle-button adapt unit — the three
 * rows of adapt-sheets/toggle-button.md §4 that need steps only the
 * headless engine provides:
 *
 *   M-011  `open({platform:"ios"})` host derivation — no `EnvironmentScope`,
 *          the platform reports `input()==="touch"` and the seam engages.
 *   M-012  `dragAndHold`/`app.drag` held-press + cancel — the only steps
 *          that keep a press down while the test reads the screen, and the
 *          only way to observe the cancel=release reset path.
 *   M-013  headless baseline dual — one press commits `change` exactly
 *          once with the pressed edge round-tripping, and an
 *          `excludeFromTabOrder` group member stays unfocused under
 *          `ViewRef.focus()` (the fixture's `focus-<id>` triggers).
 *
 * The fixture is `harness/toggle-button.fixtures.tsx`, opened by
 * `host.params`: `case`, `scope` ("" = the host's default pointer
 * environment — the desktop-parity half — or "touch" through
 * `EnvironmentScope`), `probe` ("1" mounts CtxProbe + `ctx-sample`).
 * `events` records down → up → change → press; `focus` records group
 * members' `onFocusChange` as `{id, focused}`.
 */

type Params = Record<string, string>;

function openFixture(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../toggle-button.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
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

/** `ctx-state` samples that ran while the seam's press was held. */
function heldSamples(app: App): CtxState[] {
  return callsOf(app, "ctx-state")
    .map((c) => c[0] as CtxState)
    .filter((s) => s.isPressed === true);
}

describe("toggle-button mobile (headless)", () => {
  // adapt-sheets/toggle-button.md M-011 (A-003): with no EnvironmentScope an
  // ios host derives `input()==="touch"`, so the seam's `enabled` gate holds
  // and a real press produces the full pressed round-trip — the
  // host-derivation half of M-002. Headless only: `--target web` rejects a
  // `platform` option.
  test("M-011 ios host derivation: the seam engages without an EnvironmentScope", async () => {
    const app = await openFixture(
      "basic",
      { probe: "1" },
      { platform: "ios", width: 390, height: 844 },
    );

    await app.waitUntil(() => callsOf(app, "ctx-env").length > 0);
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);

    await app.press("id:tb");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([[true]]);
    expect(eventKinds(app)).toEqual(["down", "up", "change", "press"]);

    // The seam's edge round-trip on the host-derived touch environment:
    // engaged on the way down, reset on release.
    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
    expect(edges).toContain(true);
    await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);
  }, 120_000);

  // adapt-sheets/toggle-button.md M-012 (A-003): a held press under touch
  // engages the seam — `isPressed` true, `scale` down at its ≈0.97 end,
  // `origin` recorded — and `app.drag` cancels it through the same
  // `pressUp` path a release takes (cancel = end, sheet §6): `onPressUp`
  // fires, `isPressed`/`scale`/`origin` return to rest.
  test("M-012 dragAndHold holds scale below 1; app.drag cancels through the shared release path", async () => {
    const app = await openFixture("basic", { scope: "touch", probe: "1" });

    await app.dragAndHold("id:tb", { x: 0, y: 0 });
    await app.waitUntil(() =>
      callsOf(app, "ctx-pressed").some((c) => c[0] === true),
    );
    await app.waitUntil(() => heldSamples(app).length >= 1);
    const held = heldSamples(app).at(-1)!;
    expect(held.isPressed).toBe(true);
    expect(held.scale).toBeLessThan(1);
    expect(held.scale).toBeGreaterThan(0.9);
    expect(held.origin).not.toBeNull();
    expect(held.enabled).toBe(true);

    // `app.drag` moves the held finger off: the host reports `onPressUp`
    // (cancel and release share the canonical path), the seam flag drops
    // and every channel settles back — `scale` is an AnimatedValue timing
    // run, so the settled read is awaited, not sampled once.
    await app.drag("id:tb", { x: 40, y: 0 });
    await app.waitUntil(() => eventKinds(app).includes("up"));
    await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);
    await app.waitUntil(() => {
      const last = callsOf(app, "ctx-state").at(-1)?.[0] as CtxState | undefined;
      return last !== undefined && !last.isPressed && last.scale === 1;
    });
    const settled = callsOf(app, "ctx-state").at(-1)?.[0] as CtxState;
    expect(settled.isPressed).toBe(false);
    expect(settled.scale).toBe(1);
    expect(settled.origin).toBeNull();
  }, 120_000);

  // adapt-sheets/toggle-button.md M-013 (基线): headless baseline dual —
  // under the default environment one press commits `change` exactly once
  // with the pressed edge round-tripping (`onPressChange` [true, false])
  // and the selection marker flipping; and an `excludeFromTabOrder` group
  // member stays unfocused: `ViewRef.focus()` — the same call
  // `autoFocus`/`focusField` issue — leaves a `focusable={false}` view
  // unfocused while normal members take it. (`focusable` itself has no
  // nsh/test query; the observable half is the focus edge, per the
  // control-field headless precedent that `ViewRef.focus()` lands on this
  // host.)
  test("M-013 headless baseline: one press commits once; excludeFromTabOrder member stays unfocused", async () => {
    const app = await openFixture("basic");
    await app.press("id:tb");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([[true]]);
    expect(eventKinds(app)).toEqual(["down", "up", "change", "press"]);
    expect(callsOf(app, "onPressChange")).toEqual([[true], [false]]);
    expect(app.shows("text:On")).toBe(true);

    await app.press("id:tb");
    await app.waitUntil(() => callsOf(app, "onChange").length === 2);
    expect(callsOf(app, "onChange")[1]).toEqual([false]);
    expect(app.shows("text:Off")).toBe(true);

    // `group-excluded`: member two sets `excludeFromTabOrder` — its root
    // View is `focusable={false}` — while one and three stay focusable.
    const group = await openFixture("group-excluded");
    await group.press("id:focus-one");
    await group.waitUntil(() => focusIds(group).includes("one"));

    await group.press("id:focus-two");
    await group.wait(150);
    expect(focusIds(group)).not.toContain("two");

    await group.press("id:focus-three");
    await group.waitUntil(() => focusIds(group).includes("three"));
    expect(focusIds(group)).not.toContain("two");

    // `excludeFromTabOrder` is not `isDisabled`: the member still toggles.
    await group.press("id:tb-two");
    await group.waitUntil(() => callsOf(group, "onSelectionChange").length === 1);
    expect(callsOf(group, "onSelectionChange")).toEqual([["two"]]);
    expect(group.shows("text:Two:on")).toBe(true);
  }, 120_000);
});
