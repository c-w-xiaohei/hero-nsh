import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the button adapt unit — the two rows
 * of adapt-sheets/button.md §4 that need steps only the headless engine
 * provides:
 *
 *   M-011  `open({platform:"ios"})` host derivation — no `EnvironmentScope`,
 *          the platform reports `input()==="touch"` and the seam engages.
 *   M-012  `dragAndHold`/`drop` held-press + `app.drag` cancellation — the
 *          only steps that keep a press down while the test reads the
 *          screen, and the only way to observe the cancel=release path.
 *
 * The shared file `button.mobile.test.tsx` covers M-001…M-010; the
 * held-press channel assertions below are the pressed-end halves of
 * M-004/M-005/M-006 that need `dragAndHold` — the only step that keeps a
 * press down while the test reads the screen.
 */

function openButton(
  caseName: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../button.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type CtxState = {
  pressed: number;
  scale: number;
  highlight: number;
  ripple: number;
  isPressed: boolean;
  hitSlop: { top: number; right: number; bottom: number; left: number } | null;
  origin: { x: number; y: number } | null;
  bounds: { width: number; height: number };
  enabled: boolean;
  allDisabled: boolean;
};

function heldSamples(app: App): CtxState[] {
  return callsOf(app, "ctx-state")
    .map((c) => c[0] as CtxState)
    .filter((s) => s.isPressed === true);
}

describe("button mobile (headless)", () => {
  test("mounted button switches from highlight to ripple", async () => {
    const app = await openButton("basic", {
      scope: "touch",
      preset: "scale-highlight",
      switchPreset: "1",
    });

    await app.dragAndHold("id:btn", { x: 0, y: 0 });
    await app.waitUntil(() => heldSamples(app).length > 0);
    expect(heldSamples(app).at(-1)!.highlight).toBeGreaterThan(0);
    const samples = heldSamples(app).length;
    await app.drop();

    await app.press("id:switch-preset");
    await app.dragAndHold("id:btn", { x: 0, y: 0 });
    await app.waitUntil(() => heldSamples(app).length > samples);
    expect(heldSamples(app).at(-1)!.ripple).toBeGreaterThan(0);
    await app.drop();
  });

  // adapt-sheets/button.md M-011 (A-003, A-004): with no EnvironmentScope an
  // ios host derives `input()==="touch"`, so the seam's `enabled` gate holds
  // and a real press produces the full pressed roundtrip — the
  // host-derivation half of M-002.
  test("M-011 ios host derivation: the seam engages without an EnvironmentScope", async () => {
    const app = await openButton(
      "basic",
      {},
      { platform: "ios", width: 390, height: 844 },
    );

    await app.press("id:btn");
    await app.waitUntil(
      () => callsOf(app, "ctx-pressed").filter((c) => c[0] === true).length > 0,
    );
    await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);
    expect(
      callsOf(app, "events").some((c) => (c[0] as { kind: string }).kind === "press"),
    ).toBe(true);
  }, 120_000);

  // adapt-sheets/button.md M-012 (A-003, A-005): a held press under touch
  // engages the seam — `scale` drops below 1, `highlightOpacity` rises above
  // 0 — and `app.drag` cancels it through the same `onPressUp` path a
  // release takes: `onPressUp` fires, `isPressed` returns to false and every
  // channel settles back to rest.
  test("M-012 drag cancels the press: channels reset through the shared release path", async () => {
    const app = await openButton("basic", { scope: "touch" });

    await app.dragAndHold("id:btn", { x: 0, y: 0 });
    await app.waitUntil(
      () => callsOf(app, "ctx-pressed").filter((c) => c[0] === true).length > 0,
    );
    await app.waitUntil(() => heldSamples(app).length >= 1);
    const held = heldSamples(app).at(-1)!;
    expect(held.isPressed).toBe(true);
    expect(held.scale).toBeLessThan(1);
    expect(held.highlight).toBeGreaterThan(0);
    expect(held.origin).not.toBeNull();

    // `app.drag` cancels the press: the host reports `onPressUp` (cancel and
    // release share the canonical path), `isPressed` returns to false and
    // the channels reset.
    await app.drag("id:btn", { x: 40, y: 0 });
    await app.waitUntil(() =>
      callsOf(app, "events").some((c) => (c[0] as { kind: string }).kind === "up"),
    );
    await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);

    await app.waitUntil(() => callsOf(app, "ctx-state").length > 0);
    const released = callsOf(app, "ctx-state").at(-1)?.[0] as CtxState;
    expect(released.isPressed).toBe(false);
    expect(released.pressed).toBeLessThanOrEqual(0.6);
    // `scale` is still animating back to 1 when the sample lands — the
    // cancel shares `onPressUp`, which only flips the target; the channel
    // itself is an AnimatedValue timing run. Wait for the settled read.
    await app.waitUntil(() => {
      const last = callsOf(app, "ctx-state").at(-1)?.[0] as CtxState | undefined;
      return last !== undefined && !last.isPressed && last.scale === 1;
    });
    const settled = callsOf(app, "ctx-state").at(-1)?.[0] as CtxState;
    expect(settled.isPressed).toBe(false);
    expect(settled.scale).toBe(1);
    expect(settled.highlight).toBe(0);
    expect(settled.origin).toBeNull();
  }, 120_000);
});
