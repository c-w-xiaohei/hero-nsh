import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the tooltip adapt unit (action B: touch long-press
 * show entry + difference record, no sheet presentation), one test per row
 * of adapt-sheets/tooltip.md §4 (M-001…M-005; M-006/M-007/M-008 hover
 * halves live in tooltip.mobile.web.test.tsx because `app.hover` is
 * desktop/web-only, M-009 in tooltip.mobile.headless.test.tsx because
 * `open({platform:"ios"})` is headless-only).
 *
 * The fixture is `harness/tooltip.fixtures.tsx`, opened by `host.params`:
 * `case` (mobile for the seam rows), `scope` ("pointer" default — the
 * desktop-parity environment, injected through `EnvironmentScope`; "touch"
 * for the injected mobile half), `focusOnly`/`disabled`/`owns` for the
 * mobile case's Root/Content variants. The `scope:"pointer"` default
 * replaces the old `platform:"windows"` pin: open() platform/width options
 * are rejected on the ios/android targets, so the pointer baseline is now
 * injected per test through the fixture.
 *
 * Probe payloads (all in `app.storage()`): `openChange` (Root
 * `onOpenChange`), `contentOpenChange` (ownsState Content's own),
 * `longPress`/`press` (the Trigger's caller callbacks). The tip's presence
 * is read through `shows`/`count` on its text; the 100 ms exit hold means a
 * closed tip stays mounted briefly, so disappearance is awaited on
 * `count(...) === 0`, never asserted right after the close.
 *
 * Real timers throughout: `app.longPress` holds the 500 ms default and the
 * closeDelay/exit-hold waits are real milliseconds — no manual clock.
 */

type Params = Record<string, string>;

function openTooltip(
  caseName: string,
  params: Params = {},
): Promise<App> {
  return open("../../../tooltip.fixtures.tsx", {
    host: { params: { case: caseName, scope: "pointer", ...params } },
  });
}

const MOBILE_TIP = "text:Mobile tip";
const HOVER_TIP = "text:Hover tip";

function openChanges(app: App): boolean[] {
  return callsOf(app, "openChange").map((c) => c[0] as boolean);
}

function contentChanges(app: App): boolean[] {
  return callsOf(app, "contentOpenChange").map((c) => c[0] as boolean);
}

/**
 * The OS the app itself reports through the fixture's `platform` probe
 * (`probe("platform")(platform.os)` — the table/tabs convention). `""` when
 * the fixture records nothing. Only the iOS-degraded branches read it.
 */
function hostOs(app: App): string {
  return String(callsOf(app, "platform").at(-1)?.[0] ?? "");
}

describe("tooltip mobile", () => {
  // adapt-sheets/tooltip.md M-001 (A-001, 负断言): under the default pointer
  // environment the touch long-press entry does not exist — `app.longPress`
  // on the trigger leaves no tip open and the caller's own `onLongPress`
  // still fires once (the callback surface is unchanged; only the root
  // channel is gated). On the web target the synthesized hold moves the
  // mouse over the trigger first, so the legitimate hover channel opens
  // the tip and the trailing press closes it (`openChange` reads
  // [true,false] there, [] on headless) — the assertion is the settled
  // state: no tip on screen and no dangling open report.
  test("M-001 default environment: long-press leaves no tip open, caller onLongPress still fires", async () => {
    const app = await openTooltip("mobile");

    // The resolved environment is the pointer host the pin buys.
    expect(app.texts()).toContain("env-input=pointer");

    await app.longPress("id:trigger");
    await app.wait(300);

    expect(app.shows(MOBILE_TIP)).toBe(false);
    expect(app.count(MOBILE_TIP)).toBe(0);
    expect(openChanges(app).at(-1)).not.toBe(true);
    expect(callsOf(app, "longPress")).toEqual([["trigger"]]);
  }, 120_000);

  // adapt-sheets/tooltip.md M-002 (A-001): under an injected touch
  // environment `app.longPress` opens the tip at once through the same
  // `show` a warm hover takes — `onOpenChange` records true, the tip stays
  // up after the hold releases (the one-shot `longPressShown` flag
  // suppresses the press the host may still dispatch), and a following
  // `app.press` on the trigger closes it through `shouldCloseOnPress`
  // (default true) — the tap-after-hold mobile semantics.
  test("M-002 injected touch: long-press opens the tip, release keeps it, tap closes", async () => {
    const app = await openTooltip("mobile", { scope: "touch" });

    await app.longPress("id:trigger");
    await app.waitUntil(() => openChanges(app).includes(true));
    // The probe records inside the state update; the view commits a frame
    // later — `waitFor` bridges that on the slower web target.
    await app.waitFor(MOBILE_TIP);

    if (hostOs(app) === "ios") {
      // iOS degraded acceptance (registered gap, pass2 E-4): the
      // synthesized long-press dispatches a redundant open/close cycle
      // before the final open — `openChanges` reads [true,false,true]
      // (run 45344508005). The physical event stream is the driver's, not
      // the component's, so the degraded contract asserts only the final
      // observable state: tip shown, last transition open, caller's
      // `onLongPress` fired exactly once. `platform.os` cannot tell the
      // UIKit host from headless (both report "ios"), so this arm runs on
      // headless too — where the stream is clean — while the strict stream
      // equality stays proven by the verbatim copy in
      // tooltip.mobile.headless.test.tsx.
      expect(openChanges(app).at(-1)).toBe(true);
      expect(app.shows(MOBILE_TIP)).toBe(true);
      expect(callsOf(app, "longPress")).toEqual([["trigger"]]);

      await app.press("id:trigger");
      await app.waitUntil(() => app.count(MOBILE_TIP) === 0);
      expect(openChanges(app).at(-1)).toBe(false);
    } else {
      expect(openChanges(app)).toEqual([true]);
      expect(app.shows(MOBILE_TIP)).toBe(true);
      expect(callsOf(app, "longPress")).toEqual([["trigger"]]);

      // The hold already released inside `app.longPress`; the tip is still
      // open — the trailing press (if the host dispatched one) was consumed.
      await app.press("id:trigger");
      await app.waitUntil(() => openChanges(app).includes(false));
      await app.waitUntil(() => app.count(MOBILE_TIP) === 0);

      expect(openChanges(app)).toEqual([true, false]);
    }
  }, 120_000);

  // adapt-sheets/tooltip.md M-003 (A-001): the entry's gates — Root
  // `isDisabled` and `trigger="focus"` both keep `app.longPress` from
  // opening the tip under touch, while the caller's `onLongPress` still
  // forwards (the gate lives in the root channel, not the trigger's
  // callback).
  test("M-003 injected touch: isDisabled and trigger=focus both refuse the long-press open", async () => {
    const disabled = await openTooltip("mobile", {
      scope: "touch",
      disabled: "1",
    });
    await disabled.longPress("id:trigger");
    await disabled.wait(200);
    if (hostOs(disabled) === "ios") {
      // iOS degraded acceptance (registered gap, pass2 E-4): the
      // synthesized long-press can dispatch a redundant open/close cycle —
      // the stream may contain a `true` the gate never produced. The
      // degraded contract is the final observable state: nothing stays
      // open and the last transition is not an open. `platform.os` cannot
      // tell the UIKit host from headless (both report "ios"), so this arm
      // runs on headless too — the strict "never a `true`" stays proven by
      // the verbatim copy in tooltip.mobile.headless.test.tsx.
      expect(disabled.shows(MOBILE_TIP)).toBe(false);
      expect(openChanges(disabled).at(-1) ?? false).not.toBe(true);
    } else {
      expect(disabled.shows(MOBILE_TIP)).toBe(false);
      expect(openChanges(disabled)).not.toContain(true);
    }
    expect(callsOf(disabled, "longPress")).toEqual([["trigger"]]);

    const focusOnly = await openTooltip("mobile", {
      scope: "touch",
      focusOnly: "1",
    });
    await focusOnly.longPress("id:trigger");
    await focusOnly.wait(200);
    if (hostOs(focusOnly) === "ios") {
      // Same E-4 extra-cycle gap, same degraded acceptance as above —
      // run 45344508005 logged `[true,false]` here while the gate held
      // (the tip closed and stayed closed). The strict stream copy lives
      // in tooltip.mobile.headless.test.tsx.
      expect(focusOnly.shows(MOBILE_TIP)).toBe(false);
      expect(openChanges(focusOnly).at(-1) ?? false).not.toBe(true);
    } else {
      expect(focusOnly.shows(MOBILE_TIP)).toBe(false);
      expect(openChanges(focusOnly)).not.toContain(true);
    }
    expect(callsOf(focusOnly, "longPress")).toEqual([["trigger"]]);
  }, 120_000);

  // adapt-sheets/tooltip.md M-004 (A-002, 负断言): under the default pointer
  // environment `onPressOutside` is absent — a press on the `away` Button
  // while the `defaultOpen` tip is up closes nothing (the desktop "pressing
  // elsewhere leaves the tip alone" semantics, zero drift).
  test("M-004 default environment: outside press does not close an open tip", async () => {
    const app = await openTooltip("default-open");
    expect(app.shows(HOVER_TIP)).toBe(true);

    await app.press("id:away");
    await app.wait(300);

    expect(app.shows(HOVER_TIP)).toBe(true);
    expect(openChanges(app)).not.toContain(false);
  }, 120_000);

  // adapt-sheets/tooltip.md M-005 (A-002): under touch a press outside the
  // tip closes it — for the root-driven `defaultOpen` case through
  // `state.close` → `onOpenChange(false)`, and for the ownsState Content
  // (controlled `isOpen` branch) through `setOwnIsOpen` → the Content's own
  // `onOpenChange`, leaving the Root's probe silent. The pointer half of
  // the ownsState case asserts the same prop stays absent there (desktop
  // zero drift for the ownsState branch too).
  test("M-005 injected touch: outside press closes root and ownsState tips; pointer keeps both", async () => {
    const app = await openTooltip("default-open", { scope: "touch" });
    expect(app.shows(HOVER_TIP)).toBe(true);

    await app.press("id:away");
    await app.waitUntil(() => openChanges(app).includes(false));
    await app.waitUntil(() => app.count(HOVER_TIP) === 0);
    expect(openChanges(app)).toEqual([false]);

    const owns = await openTooltip("mobile-owns", { scope: "touch" });
    await owns.waitFor(MOBILE_TIP);
    expect(owns.shows(MOBILE_TIP)).toBe(true);

    await owns.press("id:away");
    await owns.waitUntil(() => contentChanges(owns).includes(false));
    await owns.waitUntil(() => owns.count(MOBILE_TIP) === 0);
    expect(contentChanges(owns)).toEqual([false]);
    // The ownsState branch never touches the Root's open state.
    expect(openChanges(owns)).toHaveLength(0);

    const ownsPointer = await openTooltip("mobile-owns");
    await ownsPointer.waitFor(MOBILE_TIP);
    await ownsPointer.press("id:away");
    await ownsPointer.wait(300);
    expect(ownsPointer.shows(MOBILE_TIP)).toBe(true);
    expect(contentChanges(ownsPointer)).toHaveLength(0);
  }, 120_000);
});
