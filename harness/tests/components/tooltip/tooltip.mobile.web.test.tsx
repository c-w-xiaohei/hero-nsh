import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target half of the tooltip M-007 focus assertion: adapt-sheets/
 * tooltip.md M-007 (A-004, 基线) — the keyboard-focus channel is untouched
 * by the `input` axis. `platform:"web"` is the focus-capable host here
 * (Tab moves focus on the web target and on macOS headless, not on
 * headless windows — the registered host gap; the headless half of the
 * same row lives in tooltip.mobile.headless.test.tsx).
 *
 * Under `trigger="focus"` a `Tooltip.Trigger` is the first Tab stop: focus
 * opens the tip at once through `focusStart` → `show`, and the next Tab
 * moving focus to the `away` Button blurs it closed through `focusEnd` →
 * `hide(true)`. Both run under the default environment and under an
 * injected `EnvironmentScope input="touch"` — a touch device with a
 * keyboard keeps the focus semantics (A-004). The pointer/hover negatives
 * of the same row live in tooltip.mobile.test.tsx.
 */

const MOBILE_TIP = "text:Mobile tip";
const CLOSABLE_TIP = "text:Closable tip";
const CONTENT_TIP = "text:Content hover tip";

type Params = Record<string, string>;

function openTooltip(
  caseName: string,
  params: Params = {},
): Promise<App> {
  return open("../../../tooltip.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, scope: "pointer", ...params } },
  });
}

function openChanges(app: App): boolean[] {
  return callsOf(app, "openChange").map((c) => c[0] as boolean);
}

function contentChanges(app: App): boolean[] {
  return callsOf(app, "contentOpenChange").map((c) => c[0] as boolean);
}

describe("tooltip mobile (web)", () => {
  // adapt-sheets/tooltip.md M-007 (A-004): Tab focus opens a
  // `trigger="focus"` tip and blur closes it, identically under pointer
  // and injected touch.
  test("M-007 web focus channel: Tab opens the focus-only tip, blur closes it, in both environments", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await open("../../../tooltip.fixtures.tsx", {
        platform: "web",
        width: 1024,
        height: 768,
        host: {
          params: {
            case: "mobile",
            focusOnly: "1",
            ...(scope ? { scope } : {}),
          },
        },
      });

      // First Tab stop is the trigger; focus opens the tip at once.
      await app.keyboard.press("tab");
      await app.waitFor(MOBILE_TIP);
      expect(openChanges(app)).toContain(true);

      // The next Tab moves focus to the `away` Button: the trigger's blur
      // closes the tip through `focusEnd` → `hide(true)`.
      await app.keyboard.press("tab");
      await app.waitUntil(() => openChanges(app).includes(false));
      await app.waitUntil(() => app.count(MOBILE_TIP) === 0);
    }
  }, 120_000);

  // adapt-sheets/tooltip.md M-006 (A-003): the `input` axis gates the hover
  // channel on the Tooltip.Trigger — under touch a synthesized `app.hover`
  // (web sticky hover is the measured real case) opens nothing and a
  // following press opens nothing either; once the tip is up via
  // long-press, hovering the tip and leaving schedules no close (the
  // content-hover keep-alive/leave pair is gated with it), and only an
  // outside press closes. The pointer half is the desktop-parity assertion:
  // `app.hover` opens after `delay`, leaving closes after `closeDelay`.
  // `app.hover` is desktop/web-only, so the whole row lives in this file.
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
  // (tooltip.mobile.headless.test.tsx) and `platform:"web"` here; headless
  // windows cannot focus a view by Tab (registered host gap). The pointer/
  // hover negatives need `app.hover`, which is desktop/web-only, so they
  // share this file.
  test("M-007 focus channel: trigger=focus ignores pointer press and hover in both environments", async () => {
    for (const scope of ["pointer", "touch"] as const) {
      const app = await openTooltip("mobile", {
        focusOnly: "1",
        scope,
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
  // leave-close; position-props mounting its arrow and tip. Moved here
  // with the other `app.hover` rows.
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
