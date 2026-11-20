import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the pressable-feedback mechanism unit.
 *
 * `open`'s `platform: "ios"`/`"android"` simulates a touch host — headless
 * only (`--target web` rejects with ERR_NSH_TEST_UNSUPPORTED), so the
 * host-derivation half of M-011 lives here, as does M-012's drag-cancel path
 * (`app.drag`, unreliable on web per the sheet) and every assertion that
 * needs a press HELD while the test reads the screen: `dragAndHold`/`drop`
 * only run headless (same reason `button.heroui.headless.test.tsx` exists).
 *
 * The shared file `pressable.mobile.test.tsx` covers the rest; the
 * held-press assertions below are the pressed-end halves of M-005, M-006
 * and M-007 that need `dragAndHold`/`drop` — the only step that keeps a
 * press down while the test reads the screen.
 */

function openPressable(
  caseName: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../pressable.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

describe("pressable-feedback headless", () => {
  // adapt-sheets/pressable-feedback.md M-011 (A-010): with no EnvironmentScope
  // an ios host derives input=touch, so the root's default `enabled` holds
  // and a real press produces the full pressed roundtrip — the host-export
  // half of M-002.
  test("M-011 ios host derivation: enabled defaults to touch and the press roundtrips", async () => {
    const app = await openPressable(
      "component",
      {},
      { platform: "ios", width: 390, height: 844 },
    );

    await app.press("id:root");
    await app.waitUntil(
      () => callsOf(app, "ctx-pressed").filter((c) => c[0] === true).length > 0,
    );
    await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);
    expect(
      callsOf(app, "events").some((c) => (c[0] as { kind: string }).kind === "press"),
    ).toBe(true);
  });

  // adapt-sheets/pressable-feedback.md M-012 (A-010): a drag that becomes a
  // scroll cancels the press — the host still reports onPressUp (cancel and
  // release share the canonical path), isPressed returns to false and the
  // pressed channel settles back to 0.
  test("M-012 drag cancels the press: onPressUp fires and pressed returns to rest", async () => {
    const app = await openPressable("component", { scope: "touch" });

    await app.drag("id:root", { x: 40, y: 0 });

    await app.waitUntil(() =>
      callsOf(app, "events").some((c) => (c[0] as { kind: string }).kind === "up"),
    );
    await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);

    // The ctx-state sample scheduled at press-down reads the channels after
    // the cancel: the canonical flag is down and `pressed` is back at 0.
    await app.waitUntil(() => callsOf(app, "ctx-state").length > 0);
    const s = callsOf(app, "ctx-state").at(-1)?.[0] as {
      isPressed: boolean;
      pressed: number;
    };
    expect(s.isPressed).toBe(false);
    expect(s.pressed).toBeLessThan(0.5);
  });

  // adapt-sheets/pressable-feedback.md M-005 (A-004): the Highlight part's
  // pressed end is opacity 0.1 and it returns to 0 on release. `viewStyle`
  // cannot resolve the part's AnimatedValue-bound opacity (measured: it
  // reports the static 1 even mid-hold), and the channel is internal to the
  // part — so the observable half is that the press engages the canonical
  // channel with the Highlight mounted and the hold completes the roundtrip.
  // The opacity end value itself degrades to the sheet §5 real-device check.
  test("M-005 injected touch hold: the press engages with Highlight mounted and roundtrips on release", async () => {
    const app = await openPressable("component", { scope: "touch" });

    expect(app.shows("id:highlight")).toBe(true);

    await app.dragAndHold("id:root", { x: 0, y: 0 });
    await app.waitUntil(
      () => callsOf(app, "ctx-pressed").filter((c) => c[0] === true).length > 0,
    );
    // Mid-hold the canonical channel is engaged — the Highlight's opacity
    // channel derives from this same isPressed edge.
    await app.waitUntil(() => callsOf(app, "ctx-state").length > 0);
    const held = callsOf(app, "ctx-state").at(-1)?.[0] as {
      isPressed: boolean;
      pressed: number;
      enabled: boolean;
    };
    expect(held.isPressed).toBe(true);
    expect(held.pressed).toBeGreaterThan(0.99);
    expect(held.enabled).toBe(true);

    await app.drop();
    await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);
  });

  // adapt-sheets/pressable-feedback.md M-007/M-017 held-press halves: under
  // `animation="disable-all"` the cascade flag reaches the context while the
  // canonical press still engages and completes; under the default pointer
  // environment a held press never engages the seam at all. The parts'
  // animated stillness itself is unobservable through `nsh/test` (the
  // `viewStyle` opacity gap above) — these assertions cover the canonical
  // edges the parts derive from.
  test("hold-state: disable-all still roundtrips the canonical press; the default environment never engages", async () => {
    const disabled = await openPressable("component", {
      scope: "touch",
      anim: "disable-all",
    });
    expect(callsOf(disabled, "ctx-env").at(-1)?.[0]).toMatchObject({
      allDisabled: true,
      enabled: true,
    });

    await disabled.dragAndHold("id:root", { x: 0, y: 0 });
    await disabled.waitUntil(
      () => callsOf(disabled, "ctx-pressed").filter((c) => c[0] === true).length > 0,
    );
    await disabled.drop();
    await disabled.waitUntil(
      () => callsOf(disabled, "ctx-pressed").at(-1)?.[0] === false,
    );

    const pointer = await openPressable("component");
    expect(callsOf(pointer, "ctx-env").at(-1)?.[0]).toMatchObject({
      enabled: false,
    });

    await pointer.dragAndHold("id:root", { x: 0, y: 0 });
    await pointer.wait(400);
    await pointer.drop();
    expect(
      callsOf(pointer, "ctx-pressed").filter((c) => c[0] === true),
    ).toHaveLength(0);
  });
});
