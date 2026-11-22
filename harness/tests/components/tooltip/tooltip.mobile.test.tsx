import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the tooltip adapt unit (action B: touch long-press
 * show entry + difference record, no sheet presentation), one test per row
 * of adapt-sheets/tooltip.md §4 (M-001…M-008; M-009 lives in
 * tooltip.mobile.headless.test.tsx because `open({platform:"ios"})` is
 * headless-only).
 *
 * The fixture is `harness/tooltip.fixtures.tsx`, opened by `host.params`:
 * `case` (mobile for the seam rows, the heroui-suite cases for the M-006 /
 * M-008 desktop-parity halves), `scope` ("" host default or "touch" through
 * `EnvironmentScope`), `focusOnly`/`disabled`/`owns` for the mobile case's
 * Root/Content variants. `platform:"windows"` pins the pointer host on both
 * targets — the desktop-parity baseline. M-007's Tab-focus half is
 * host-split: `platform:"macos"` on headless
 * (tooltip.mobile.headless.test.tsx) and `platform:"web"` on the web
 * target (tooltip.mobile.web.test.tsx), because headless windows cannot
 * move focus by Tab (registered host gap).
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
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../tooltip.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

const MOBILE_TIP = "text:Mobile tip";
const HOVER_TIP = "text:Hover tip";
const CLOSABLE_TIP = "text:Closable tip";
const CONTENT_TIP = "text:Content hover tip";

function openChanges(app: App): boolean[] {
  return callsOf(app, "openChange").map((c) => c[0] as boolean);
}

function contentChanges(app: App): boolean[] {
  return callsOf(app, "contentOpenChange").map((c) => c[0] as boolean);
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

    expect(openChanges(app)).toEqual([true]);
    expect(app.shows(MOBILE_TIP)).toBe(true);
    expect(callsOf(app, "longPress")).toEqual([["trigger"]]);

    // The hold already released inside `app.longPress`; the tip is still
    // open — the trailing press (if the host dispatched one) was consumed.
    await app.press("id:trigger");
    await app.waitUntil(() => openChanges(app).includes(false));
    await app.waitUntil(() => app.count(MOBILE_TIP) === 0);

    expect(openChanges(app)).toEqual([true, false]);
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
    expect(disabled.shows(MOBILE_TIP)).toBe(false);
    expect(openChanges(disabled)).not.toContain(true);
    expect(callsOf(disabled, "longPress")).toEqual([["trigger"]]);

    const focusOnly = await openTooltip("mobile", {
      scope: "touch",
      focusOnly: "1",
    });
    await focusOnly.longPress("id:trigger");
    await focusOnly.wait(200);
    expect(focusOnly.shows(MOBILE_TIP)).toBe(false);
    expect(openChanges(focusOnly)).not.toContain(true);
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

  // adapt-sheets/tooltip.md M-006 (A-003): the `input` axis gates the hover
  // channel on the Tooltip.Trigger — under touch a synthesized `app.hover`
  // (web sticky hover is the measured real case) opens nothing and a
  // following press opens nothing either; once the tip is up via
  // long-press, hovering the tip and leaving schedules no close (the
  // content-hover keep-alive/leave pair is gated with it), and only an
  // outside press closes. The pointer half is the desktop-parity assertion:
  // `app.hover` opens after `delay`, leaving closes after `closeDelay`.
  test("M-006 injected touch gates hover open and content-hover; pointer hover still opens and closes", async () => {
    const touch = await openTooltip("mobile", { scope: "touch" });

    await touch.hover("id:trigger");
    await touch.wait(400);
    expect(touch.shows(MOBILE_TIP)).toBe(false);
    expect(openChanges(touch)).not.toContain(true);

    await touch.press("id:trigger");
    await touch.wait(200);
    expect(touch.shows(MOBILE_TIP)).toBe(false);
    expect(openChanges(touch)).not.toContain(true);

    // Long-press opens it; hovering the tip and leaving must not schedule
    // a close — under pointer semantics the content-hover leave starts the
    // 300 ms closeDelay, under touch the channel is gated entirely.
    await touch.longPress("id:trigger");
    await touch.waitUntil(() => openChanges(touch).includes(true));
    await touch.waitFor(MOBILE_TIP);
    await touch.hover(MOBILE_TIP);
    await touch.hover("id:away");
    await touch.wait(500);
    expect(touch.shows(MOBILE_TIP)).toBe(true);

    await touch.press("id:away");
    await touch.waitUntil(() => touch.count(MOBILE_TIP) === 0);

    // Desktop parity: the same fixture shape under pointer — hover opens,
    // leaving closes after closeDelay (the close-delay case's T-003 shape).
    const pointer = await openTooltip("close-delay");
    await pointer.hover("role:button[Hover me]");
    await pointer.waitFor(CLOSABLE_TIP);
    expect(openChanges(pointer)).toContain(true);

    await pointer.hover("id:away");
    await pointer.wait(500);
    expect(pointer.count(CLOSABLE_TIP)).toBe(0);
    expect(openChanges(pointer)).toEqual([true, false]);
  }, 120_000);

  // adapt-sheets/tooltip.md M-007 (A-004, 基线): the keyboard-focus channel
  // is untouched by the `input` axis — a `trigger="focus"` tip ignores
  // pointer press and hover in both environments. The Tab-focus half lives
  // in the host-split files: `platform:"macos"` moves focus on headless
  // (tooltip.mobile.headless.test.tsx) and `platform:"web"` on the web
  // target (tooltip.mobile.web.test.tsx); headless windows cannot focus a
  // view by Tab (registered host gap), which is why this file pins
  // `platform:"windows"` only for the pointer/hover negatives.
  test("M-007 focus channel: trigger=focus ignores pointer press and hover in both environments", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openTooltip("mobile", {
        focusOnly: "1",
        ...(scope ? { scope } : {}),
      });
      await app.press("id:trigger");
      await app.hover("id:trigger");
      await app.wait(200);
      expect(app.shows(MOBILE_TIP)).toBe(false);
      expect(openChanges(app)).not.toContain(true);
    }
  }, 120_000);

  // adapt-sheets/tooltip.md M-008 (基线): default-environment zero drift —
  // the existing cases answer exactly what tooltip.heroui.test.tsx pins,
  // asserted at headline-observable depth (not a full re-port): close-delay
  // hover→leave→closeDelay→close with the openChange pair; warm-swap's
  // warm reopen and one-open-at-a-time; content-hover's keep-alive and
  // leave-close; position-props mounting its arrow and tip.
  test("M-008 baseline: default-environment hover, close, warm swap, content hover and position hold", async () => {
    // close-delay: hover opens, leaving closes after closeDelay — T-003.
    const closeDelay = await openTooltip("close-delay");
    await closeDelay.hover("role:button[Hover me]");
    await closeDelay.waitFor(CLOSABLE_TIP);
    await closeDelay.hover("id:away");
    await closeDelay.wait(500);
    expect(closeDelay.count(CLOSABLE_TIP)).toBe(0);
    expect(openChanges(closeDelay)).toEqual([true, false]);

    // warm-swap: warm reopen is immediate and only one tip is open at a
    // time — the swap closes the previous tip (X-001/X-002's shape).
    const warm = await openTooltip("warm-swap");
    await warm.hover("role:button[Warmup]");
    await warm.waitFor("text:Warm tip");
    await warm.hover("role:button[First]");
    await warm.waitFor("text:First tip");
    await warm.hover("role:button[Second]");
    await warm.waitFor("text:Second tip");
    await warm.wait(600);
    expect(warm.count("text:First tip")).toBe(0);
    expect(warm.shows("text:Second tip")).toBe(true);

    // content-hover: hovering the tip keeps it open past closeDelay;
    // leaving it closes after closeDelay + the exit hold — X-004.
    const content = await openTooltip("content-hover");
    await content.hover("role:button[Hover me]");
    await content.waitFor(CONTENT_TIP);
    await content.hover(CONTENT_TIP);
    await content.wait(500);
    expect(content.shows(CONTENT_TIP)).toBe(true);
    await content.hover("id:away");
    await content.wait(600);
    expect(content.count(CONTENT_TIP)).toBe(0);

    // position-props: defaultOpen mounts the tip with its arrow — the
    // placement/offset geometry itself is covered by the web screenshot
    // rows (X-006/X-007); what remains assertable here is presence.
    const position = await openTooltip("position-props");
    await position.waitFor("text:Position tip");
    expect(position.shows("text:Position tip")).toBe(true);
    expect(position.shows("id:position-arrow")).toBe(true);
  }, 120_000);
});
