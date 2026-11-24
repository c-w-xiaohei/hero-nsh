import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the button adapt unit, one test per row of
 * adapt-sheets/button.md §4 (M-001…M-010) on every target this file can
 * reach — native ios/android included.
 *
 * The fixture is `harness/button.fixtures.tsx`, opened by `host.params`:
 * `case` (basic/form/overlay/hover/matrix), `testInput` ("pointer"/"touch"
 * through an outer `EnvironmentScope`), `size`, `icon`, `variant`, `preset`,
 * `anim`, `animatedstyle`, `pending`, `disabled`, `channel`. Every
 * assertion reads what `nsh/test` can observe — `shows()`, `texts()`,
 * `enabled()`, `viewStyle().backgroundColor`, `onLayout` bounds and the
 * `@scenario/probe` calls in `app.storage()` (`events`, `press-change`,
 * `layout`, `ctx-pressed`, `ctx-state`, `ctx-env`, `ctx-origin`,
 * `ctx-channels`, `form.submit`, `overlay`).
 *
 * `viewStyle` cannot resolve `AnimatedValue`-bound `opacity`/`scale`
 * (measured: it reports the static value), so the seam's channels are
 * asserted through the context `getValue()` probes — the same degradation
 * the pressable-feedback and e-parts sheets register.
 *
 * The environment is always explicit: `testInput:"pointer"` is the
 * desktop-parity baseline and `testInput:"touch"` the injected touch side,
 * because the host-derived default differs per target (touch on native
 * phones, pointer on desktop/web). Native hosts fill the device screen and
 * reject the `platform`/`width`/`height` open options, so this file carries
 * none; the M-007 web-only Tab half lives in `button.mobile.web.test.tsx`
 * and M-009's hover-trigger half in `button.mobile.headless.test.tsx`
 * (`app.hover` needs a mouse).
 */

type Params = Record<string, string>;

function openButton(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../button.fixtures.tsx", {
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type CtxState = {
  pressed: number;
  scale: number;
  highlight: number;
  ripple: number;
  isPressed: boolean;
  hitSlop: Edges | null;
  origin: { x: number; y: number } | null;
  bounds: { width: number; height: number };
  enabled: boolean;
  allDisabled: boolean;
};

type CtxChannels = Omit<CtxState, "hitSlop" | "bounds">;

type CtxEnv = {
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  allDisabled: boolean;
};

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

function kinds(app: App): string[] {
  return callsOf(app, "events").map((c) => (c[0] as { kind: string }).kind);
}

function heldSamples(app: App): CtxState[] {
  return callsOf(app, "ctx-state")
    .map((c) => c[0] as CtxState)
    .filter((s) => s.isPressed === true);
}

describe("button mobile", () => {
  // adapt-sheets/button.md M-001 (A-003, A-004, A-005, 负断言): under the
  // default pointer environment the seam is a zero-cost pass-through — the
  // context's `isPressed` never rises, `hitSlop()` stays undefined, `scale`
  // is pinned at 1, no press origin is recorded and the part channels hold
  // their rest values — while `onPress`/`onPressDown`/`onPressUp`/
  // `onPressChange` still fire in order (desktop zero change).
  test("M-001 pointer baseline: the feedback seam is inert while the press contract holds", async () => {
    const app = await openButton("basic", { testInput: "pointer" });

    await app.press("id:btn");
    await app.waitUntil(() => callsOf(app, "press-change").length === 2);

    // The press contract is intact: down → up → press, and onPressChange
    // reports the render-prop flag's own roundtrip (true on down, false on
    // up) — the seam's flag is a parallel private channel.
    expect(kinds(app)).toEqual(["down", "up", "press"]);
    expect(callsOf(app, "press-change")).toEqual([[true], [false]]);

    // Every ctx-state sample (fired on the seam's isPressed edges — none
    // under pointer, so these are the mount-time and delayed reads) must
    // show the seam at rest.
    await app.waitUntil(() => callsOf(app, "ctx-state").length > 0);
    for (const call of callsOf(app, "ctx-state")) {
      const s = call[0] as CtxState;
      expect(s.isPressed).toBe(false);
      expect(s.pressed).toBeLessThan(0.5);
      expect(s.scale).toBe(1);
      expect(s.highlight).toBe(0);
      expect(s.ripple).toBe(0);
      expect(s.hitSlop).toBeNull();
      expect(s.origin).toBeNull();
      expect(s.enabled).toBe(false);
    }

    // The on-demand read after the press: no origin recorded (it is the
    // ripple's only trigger), part channels at rest, gate closed.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.isPressed).toBe(false);
    expect(channels.pressed).toBeLessThan(0.5);
    expect(channels.scale).toBe(1);
    expect(channels.highlight).toBe(0);
    expect(channels.ripple).toBe(0);
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/button.md M-002 (A-003): injected touch — the seam's
  // `isPressed` completes the true→false roundtrip and the user-visible
  // event order (down → up → press) matches the desktop one.
  test("M-002 injected touch: the seam press roundtrips and the event order is unchanged", async () => {
    const app = await openButton("basic", { testInput: "touch" });

    await app.press("id:btn");
    await app.waitUntil(() => callsOf(app, "press-change").length === 2);

    expect(kinds(app)).toEqual(["down", "up", "press"]);
    expect(callsOf(app, "press-change")).toEqual([[true], [false]]);

    // The seam's own flag round-tripped through the context probe.
    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
    expect(edges).toContain(true);
    expect(edges.at(-1)).toBe(false);

    // And the environment probe reports the gate open.
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);
  }, 120_000);

  // adapt-sheets/button.md M-003 (A-004): the computed `hitSlop` pads each
  // side by (44 − side) / 2 while a side is under the 44 pt minimum target —
  // an icon-only sm button on touch is 40 pt tall, so it gets 2 pt of slop
  // top and bottom; a md button at 48 pt is already over the target and
  // reports undefined.
  test("M-003 injected touch: hitSlop pads a 40pt icon-only sm by 2pt and stays empty at 48pt", async () => {
    const small = await openButton("basic", {
      testInput: "touch",
      size: "sm",
      icon: "1",
    });
    await small.waitUntil(() => callsOf(small, "ctx-env").length > 0);
    const smallEnv = lastOf<CtxEnv>(small, "ctx-env");
    expect(smallEnv.hitSlop).toEqual({
      top: 2,
      right: 2,
      bottom: 2,
      left: 2,
    });

    const medium = await openButton("basic", { testInput: "touch", size: "md" });
    await medium.waitUntil(() => callsOf(medium, "ctx-env").length > 0);
    const mediumEnv = lastOf<CtxEnv>(medium, "ctx-env");
    expect(mediumEnv.hitSlop).toBeNull();
  }, 120_000);

  // adapt-sheets/button.md M-004 (A-005): the preset matrix under touch —
  // `scale-highlight` (and `auto`, which resolves to it on touch) drives
  // `highlightOpacity` to its 0.1 pressed end and back to 0; `scale-ripple`
  // runs `rippleProgress` 0→1→2 with `pressOrigin` at the press point;
  // `scale` mounts no overlay channel; `none` leaves every channel at rest.
  test("M-004 injected touch: preset matrix drives highlight, ripple, scale-only and none channels", async () => {
    // scale-highlight: highlightOpacity reaches its 0.1 end mid-hold.
    const highlight = await openButton("basic", {
      testInput: "touch",
      preset: "scale-highlight",
    });
    await highlight.longPress("id:btn");
    await highlight.waitUntil(() => heldSamples(highlight).length >= 1);
    const heldHighlight = heldSamples(highlight).at(-1)!;
    expect(heldHighlight.isPressed).toBe(true);
    expect(heldHighlight.highlight).toBeGreaterThan(0.09);
    expect(heldHighlight.highlight).toBeLessThanOrEqual(0.11);
    expect(heldHighlight.origin).not.toBeNull();

    // auto resolves to scale-highlight on touch: same channel, same end.
    // Native relaunches the single host per open(): every held sample is
    // asserted before the next app opens — an older handle is dead after.
    const auto = await openButton("basic", { testInput: "touch", preset: "auto" });
    await auto.longPress("id:btn");
    await auto.waitUntil(() => heldSamples(auto).length >= 1);
    const heldAuto = heldSamples(auto).at(-1)!;
    expect(heldAuto.highlight).toBeGreaterThan(0.09);
    expect(heldAuto.highlight).toBeLessThanOrEqual(0.11);

    // scale-ripple: rippleProgress runs 0→1 while held; pressOrigin is the
    // press point. The →2 completion segment is asserted in the headless
    // file where `dragAndHold`/`drop` can hold the press open.
    const ripple = await openButton("basic", {
      testInput: "touch",
      preset: "scale-ripple",
    });
    await ripple.longPress("id:btn");
    await ripple.waitUntil(() => heldSamples(ripple).length >= 1);
    const heldRipple = heldSamples(ripple).at(-1)!;
    expect(heldRipple.isPressed).toBe(true);
    expect(heldRipple.ripple).toBeGreaterThan(0);
    expect(heldRipple.ripple).toBeLessThanOrEqual(1);
    expect(heldRipple.origin).not.toBeNull();

    // scale: no overlay channels move — highlight and ripple stay at
    // rest. The scale end itself follows the host's motion preference:
    // Android CI runs with `animator_duration_scale 0.0`, which the host
    // reports as reduce-motion (`env` probe) and `createPressFeedback`
    // honors by pinning the channel at 1 (`press-feedback.ts:197` —
    // contract behavior, not a dropped press: `isPressed` and `pressed`
    // still record the hold). Where the host animates, the held value
    // must drop below 1 as before.
    const scaleOnly = await openButton("basic", {
      testInput: "touch",
      preset: "scale",
    });
    await scaleOnly.longPress("id:btn");
    await scaleOnly.waitUntil(() => heldSamples(scaleOnly).length >= 1);
    const heldScale = heldSamples(scaleOnly).at(-1)!;
    const scaleEnv = lastOf<{ reduceMotion: boolean }>(scaleOnly, "env");
    expect(heldScale.isPressed).toBe(true);
    expect(heldScale.pressed).toBeGreaterThan(0.5);
    if (scaleEnv.reduceMotion) {
      expect(heldScale.scale).toBe(1);
    } else {
      expect(heldScale.scale).toBeLessThan(1);
    }
    expect(heldScale.highlight).toBe(0);
    expect(heldScale.ripple).toBe(0);

    // none: the seam's gate is closed — no press edge, no origin, every
    // channel at rest, while onPress still fires.
    const none = await openButton("basic", { testInput: "touch", preset: "none" });
    await none.press("id:btn");
    await none.waitUntil(() => callsOf(none, "press-change").length === 2);
    expect(kinds(none)).toEqual(["down", "up", "press"]);
    await none.press("id:ctx-sample");
    await none.waitUntil(() => callsOf(none, "ctx-channels").length > 0);
    const noneChannels = lastOf<CtxChannels>(none, "ctx-channels");
    expect(noneChannels.isPressed).toBe(false);
    expect(noneChannels.origin).toBeNull();
    expect(noneChannels.enabled).toBe(false);
    expect(noneChannels.highlight).toBe(0);
    expect(noneChannels.ripple).toBe(0);
    expect(noneChannels.scale).toBe(1);
  }, 120_000);

  // adapt-sheets/button.md M-005 (A-001, A-002): under touch the `input`
  // axis suppresses the `hover:`/`active:` pseudo-state classes, so a press
  // cannot leave the variant's hover background pinned (web sticky hover)
  // and the transform channel belongs to the `scale` AnimatedValue alone.
  // The observable half: `viewStyle().backgroundColor` stays the variant's
  // base color through a press — never the hover color.
  test("M-005 injected touch: a press keeps the variant base color, never the hover color", async () => {
    const app = await openButton("basic", {
      testInput: "touch",
      variant: "primary",
    });

    const base = app.viewStyle("id:btn")?.backgroundColor;
    expect(base).toBeDefined();

    await app.longPress("id:btn");
    await app.waitUntil(() => heldSamples(app).length >= 1);

    // Mid-hold the root's background is still the base variant color — the
    // touch cell emits no `hover:`/`active:` class, so nothing can paint the
    // hover background over it.
    const held = app.viewStyle("id:btn")?.backgroundColor;
    expect(held).toBe(base);
  }, 120_000);

  // adapt-sheets/button.md M-006 (A-006): the props surface — every
  // `feedbackVariant` value and every `animation` tier mounts and shows its
  // root view; `"disable-all"` cascades to the part channels while the
  // canonical press still round-trips.
  test("M-006 props surface: every feedbackVariant and animation tier mounts; disable-all rests the part channels", async () => {
    // The matrix case mounts all 5 presets × 7 animation tiers in one app.
    const matrix = await openButton("matrix", { testInput: "touch" });
    for (const preset of [
      "auto",
      "scale-highlight",
      "scale-ripple",
      "scale",
      "none",
    ]) {
      for (const anim of ["", "true", "disabled", "disable-all", "object", "state-off", "state-all"]) {
        expect(matrix.shows(`id:m-${preset}-${anim || "def"}`)).toBe(true);
      }
    }

    // "disable-all" under touch: the cascade flag reaches the context, the
    // canonical `pressed` channel still completes its run, and the part
    // channels (`highlightOpacity`/`rippleProgress`) hold their rest values.
    const disabled = await openButton("basic", {
      testInput: "touch",
      anim: "disable-all",
    });
    expect(lastOf<CtxEnv>(disabled, "ctx-env").allDisabled).toBe(true);

    await disabled.longPress("id:btn");
    await disabled.waitUntil(() => heldSamples(disabled).length >= 1);
    const held = heldSamples(disabled).at(-1)!;
    expect(held.allDisabled).toBe(true);
    expect(held.isPressed).toBe(true);
    expect(held.pressed).toBeGreaterThan(0.9);
    expect(held.scale).toBe(1);
    expect(held.highlight).toBe(0);
    expect(held.ripple).toBe(0);
  }, 120_000);

  // adapt-sheets/button.md M-007 (基线): default-environment zero drift —
  // the render-prop `isPressed`/`isHovered` edges, the `onPress*`/`onHover*`/
  // `onPressChange` callback set and order, the focus-visible ring and
  // `preventFocusOnPress` all behave exactly as the existing
  // `button.heroui.test.tsx` pins. This row asserts the contract surface
  // the adapt unit must not move: a plain press still produces the same
  // down → up → press sequence and the same `onPressChange` roundtrip.
  test("M-007 baseline: render-prop press state, callback order and focus behavior are unchanged", async () => {
    const app = await openButton("basic", { testInput: "pointer" });

    // The render-prop `isPressed` edge is the Button's own signal — it
    // round-trips through `onPressChange` exactly as before the seam.
    await app.press("id:btn");
    await app.waitUntil(() => callsOf(app, "press-change").length === 2);
    expect(callsOf(app, "press-change")).toEqual([[true], [false]]);
    expect(kinds(app)).toEqual(["down", "up", "press"]);

    // The web-only Tab half (focus-visible is a keyboard-modality concern,
    // untouched by the seam) lives in `button.mobile.web.test.tsx`.
  }, 120_000);

  // adapt-sheets/button.md M-008 (基线): `isPending`/`isDisabled` block
  // `onPress` in both environments, and under touch + pending the seam's
  // `isPressed` produces no edge either — the two channels are parallel.
  test("M-008 isPending and isDisabled block onPress; touch+pending leaves the seam inert too", async () => {
    for (const testInput of ["pointer", "touch"] as const) {
      const pending = await openButton("basic", {
        testInput,
        pending: "1",
      });
      await expect(pending.press("id:btn")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(pending, "events")).toHaveLength(0);
      expect(callsOf(pending, "press-change")).toHaveLength(0);
      expect(callsOf(pending, "ctx-pressed").filter((c) => c[0] === true)).toHaveLength(0);

      const disabled = await openButton("basic", {
        testInput,
        disabled: "1",
      });
      expect(disabled.enabled("id:btn")).toBe(false);
      await expect(disabled.press("id:btn")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(disabled, "events")).toHaveLength(0);
      expect(callsOf(disabled, "press-change")).toHaveLength(0);
      expect(callsOf(disabled, "ctx-pressed").filter((c) => c[0] === true)).toHaveLength(0);
    }
  }, 120_000);

  // adapt-sheets/button.md M-009 (基线): `type="submit"` inside a `Form`
  // calls `form.submit`; inside an `OverlayTriggerContext` a press calls
  // `triggerPress`/`toggle` and a long press calls `triggerLongPress`. The
  // `HoverTriggerContext` hover/press/focus half lives in
  // `button.mobile.headless.test.tsx` — `app.hover` needs a mouse.
  test("M-009 form submit and overlay trigger channels are unchanged", async () => {
    // Form: `type="submit"` reaches `FormContext.submit()` → `onSubmit`.
    const form = await openButton("form", { testInput: "pointer" });
    await form.press("id:submit");
    await form.waitUntil(() => callsOf(form, "form.submit").length === 1);
    expect(callsOf(form, "form.submit")).toHaveLength(1);
    expect(kinds(form)).toContain("press");

    // Overlay trigger with the custom channel: press → triggerPress,
    // longPress → triggerLongPress, and the user's onPress still fires.
    const overlay = await openButton("overlay", {
      testInput: "pointer",
      channel: "custom",
    });
    await overlay.press("id:trigger");
    await overlay.waitUntil(() => callsOf(overlay, "overlay").length === 1);
    expect(callsOf(overlay, "overlay")).toEqual([
      [{ kind: "triggerPress", source: "pointer" }],
    ]);
    expect(kinds(overlay)).toContain("press");

    await overlay.longPress("id:trigger");
    await overlay.waitUntil(() => callsOf(overlay, "overlay").length === 2);
    expect(callsOf(overlay, "overlay")[1]).toEqual([
      { kind: "triggerLongPress" },
    ]);

    // Overlay trigger with no custom channel: press → toggle().
    const toggle = await openButton("overlay", {
      testInput: "pointer",
      channel: "toggle",
    });
    await toggle.press("id:trigger");
    await toggle.waitUntil(() => callsOf(toggle, "events").length > 0);
    // `toggle` flips the disclosure state — observable through `isOpen` on
    // the context, which the fixture does not probe; the contract half is
    // that the press still reaches the user's onPress.
    expect(kinds(toggle)).toContain("press");
  }, 120_000);

  // adapt-sheets/button.md M-010 (A-009): the fixture's own dual-environment
  // structure — `basic` under injected pointer and under
  // `EnvironmentScope input="touch"` — mounts and answers every probe.
  test("M-010 the fixture opens in both environments and every probe records", async () => {
    for (const testInput of ["pointer", "touch"] as const) {
      const app = await openButton("basic", { testInput });
      expect(app.shows("id:btn")).toBe(true);
      expect(app.shows("id:ctx-sample")).toBe(true);

      await app.press("id:btn");
      await app.waitUntil(() => callsOf(app, "press-change").length === 2);
      expect(kinds(app)).toEqual(["down", "up", "press"]);

      await app.press("id:ctx-sample");
      await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
      const channels = lastOf<CtxChannels>(app, "ctx-channels");
      expect(typeof channels.pressed).toBe("number");
      expect(typeof channels.scale).toBe("number");
      expect(typeof channels.isPressed).toBe("boolean");
      expect(typeof channels.enabled).toBe("boolean");
    }
  }, 120_000);
});
