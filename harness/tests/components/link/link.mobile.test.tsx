import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the link adapt unit, one test per row of
 * adapt-sheets/link.md §4 (M-001…M-006). The fixture is
 * `harness/link.fixtures.tsx` — `case` picks the link shape (`basic` is an
 * absolute-URL single-line link under 44 pt tall, `relative`/`anchor` the
 * non-navigating hrefs, `disabled` the refused link, `nav` all three hrefs
 * in one mount) and `scope` picks the environment (`"touch"` mounts
 * `EnvironmentScope input="touch"`; absent is the host default, pointer —
 * the desktop-parity baseline).
 *
 * The observation channel is what `nsh/test` sees plus the fixture's
 * `probe()` records in `app.storage()`: `hitSlop` is the press-feedback
 * seam's computed `Edges`/`null` published on `LinkContext` (a view prop has
 * no read-back — sheet §6's registered degradation), `onPress`/`onClick`
 * carry the press payload, `onHover` the hover roundtrip, `nav` the per-link
 * press/click order. `app.openedUrls()` is the `openUrl` probe; `spanStyle`
 * reads the resolved underline for the sticky-hover assertion.
 *
 * Both environments are covered in the same file: the default (pointer)
 * and the injected touch one. `app.press`/`app.hover`/`spanStyle` behave
 * the same on headless and web, so this is a dual-target `.mobile.test.tsx`.
 */

type Edges = { top: number; right: number; bottom: number; left: number };

// `open` resolves its entry against the test file; this file sits three
// levels below harness/, same as every other component test.
function openLink(caseName: string, scope?: "touch"): Promise<App> {
  return open("../../../link.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...(scope ? { scope } : {}) } },
  });
}

/** Every `hitSlop` report the seam probe recorded, in order (`null` = undefined). */
function hitSlopReports(app: App): (Edges | null)[] {
  return callsOf(app, "hitSlop").map((args) => args[0] as Edges | null);
}

function lastHitSlop(app: App): Edges | null {
  const reports = hitSlopReports(app);

  return reports.length === 0 ? null : reports[reports.length - 1];
}

/** The `press`/`click` events the `nav` case recorded for one link, in order. */
function navEvents(app: App, id: string): string[] {
  return callsOf(app, "nav")
    .filter((args) => args[0] === id)
    .map((args) => args[1] as string);
}

describe("link", () => {
  // adapt-sheets/link.md M-001 (A-002): under the injected touch environment
  // the link mounts and shows normally, and a completed press still runs the
  // `onPress`/`onClick` roundtrip through to `openUrl`.
  test("M-001 injected touch: link mounts, press completes onPress/onClick and navigation", async () => {
    const app = await openLink("basic", "touch");

    expect(app.shows("id:link-under-test")).toBe(true);
    expect(app.texts()).toContain("Link label");

    await app.press("id:link-under-test");

    expect(callsOf(app, "onPress")).toHaveLength(1);
    expect(callsOf(app, "onClick")).toHaveLength(1);
    expect(app.openedUrls()).toEqual(["https://example.com"]);
  }, 120_000);

  // adapt-sheets/link.md M-002 (A-003): under touch the seam's `hitSlop`
  // accessor reports a non-empty `Edges` padding for the sub-44 pt link —
  // the single-line text box is shorter than the 44 pt minimum, so the
  // vertical pads are positive while the already-wide-enough horizontal
  // pads stay at their ≥0 floor. While `isDisabled` folds `enabled` off,
  // the accessor stays `undefined` (reported `null`) on every change.
  test("M-002 injected touch: hitSlop pads the small link, and stays empty while disabled", async () => {
    const app = await openLink("basic", "touch");

    await app.waitUntil(() => hitSlopReports(app).some((slop) => slop !== null));

    const slop = lastHitSlop(app);

    if (slop === null) {
      throw new Error("hitSlop never reported a padding under touch");
    }

    expect(slop.top).toBeGreaterThan(0);
    expect(slop.bottom).toBeGreaterThan(0);
    expect(slop.left).toBeGreaterThanOrEqual(0);
    expect(slop.right).toBeGreaterThanOrEqual(0);

    const disabled = await openLink("disabled", "touch");
    await disabled.wait(100);

    expect(disabled.enabled("id:link-under-test")).toBe(false);
    expect(hitSlopReports(disabled).length).toBeGreaterThan(0);
    expect(hitSlopReports(disabled).every((slop) => slop === null)).toBe(true);
  }, 120_000);

  // adapt-sheets/link.md M-003 (基线, A-001, A-002): the default pointer
  // environment is the desktop-parity baseline — hover underline, press
  // callbacks and the disabled refusal match the existing desktop
  // assertions (T-004/T-006/T-007), the seam reports `hitSlop` undefined on
  // every change, and no touch feedback path appears.
  test("M-003 default pointer environment: desktop parity — hover, press, disabled, no hitSlop", async () => {
    const app = await openLink("basic");

    // The seam is gated off: every report is `null` (undefined).
    expect(hitSlopReports(app).length).toBeGreaterThan(0);
    expect(hitSlopReports(app).every((slop) => slop === null)).toBe(true);

    // T-004 parity: hover still raises the underline.
    await app.hover("id:link-under-test");
    expect(callsOf(app, "onHover")).toContainEqual(["start"]);
    expect(
      app.spanStyle("id:link-under-test >> text:Link label").underline,
    ).toBe(true);

    // T-006 parity plus navigation: one press, both callbacks, one openUrl.
    await app.press("id:link-under-test");
    expect(callsOf(app, "onPress")).toHaveLength(1);
    expect(callsOf(app, "onClick")).toHaveLength(1);
    expect(app.openedUrls()).toEqual(["https://example.com"]);

    // T-007 parity: the disabled link takes no input and fires nothing.
    const disabled = await openLink("disabled");
    expect(disabled.enabled("id:link-under-test")).toBe(false);
    await expect(disabled.press("id:link-under-test")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(disabled, "onPress")).toHaveLength(0);
    expect(callsOf(disabled, "onClick")).toHaveLength(0);
    expect(hitSlopReports(disabled).every((slop) => slop === null)).toBe(true);
  }, 120_000);

  // adapt-sheets/link.md M-004 (A-001): under touch the `input` axis drops
  // the hover classes, so a hover — whose callbacks still fire, the contract
  // is unchanged — paints no underline, and nothing lingers after a press
  // (the sticky-hover regression the axis exists to prevent). Under pointer
  // the same case keeps the desktop hover style.
  test("M-004 touch suppresses the hover underline; pointer keeps it", async () => {
    const touch = await openLink("basic", "touch");

    await touch.hover("id:link-under-test");
    expect(callsOf(touch, "onHover")).toContainEqual(["start"]);
    expect(
      touch.spanStyle("id:link-under-test >> text:Link label").underline,
    ).toBe(false);

    // A completed press leaves no hover decoration behind either: `active:`
    // is gone once the press resolves and no `hover:` class exists to stick.
    await touch.press("id:link-under-test");
    expect(
      touch.spanStyle("id:link-under-test >> text:Link label").underline,
    ).toBe(false);

    const pointer = await openLink("basic");
    await pointer.hover("id:link-under-test");
    expect(
      pointer.spanStyle("id:link-under-test >> text:Link label").underline,
    ).toBe(true);
  }, 120_000);

  // adapt-sheets/link.md M-005 (基线, A-004): navigation semantics are
  // environment-independent — an absolute URL reaches `openUrl` exactly
  // once with the unchanged argument, a relative path and a `#anchor` only
  // run `onPress`/`onClick` (in that order), in both environments.
  test("M-005 baseline navigation: absolute URL opens once, relative and anchor stay callback-only, in both environments", async () => {
    for (const scope of [undefined, "touch"] as const) {
      const app = await openLink("nav", scope);

      await app.press("id:link-nav-abs");
      expect(app.openedUrls()).toEqual(["https://example.com/nav"]);
      expect(navEvents(app, "link-nav-abs")).toEqual(["press", "click"]);

      await app.press("id:link-nav-rel");
      expect(app.openedUrls()).toEqual(["https://example.com/nav"]);
      expect(navEvents(app, "link-nav-rel")).toEqual(["press", "click"]);

      await app.press("id:link-nav-anchor");
      expect(app.openedUrls()).toEqual(["https://example.com/nav"]);
      expect(navEvents(app, "link-nav-anchor")).toEqual(["press", "click"]);
    }
  }, 120_000);

  // adapt-sheets/link.md M-006 (A-002, A-003): the fixture itself mounts
  // `Link` and `EnvironmentScope` through the `@heroui/react` entry, and both
  // parameter paths — `scope="touch"` and the default — open and render.
  test("M-006 fixture entry: Link and EnvironmentScope mount through @heroui/react in both scopes", async () => {
    for (const scope of [undefined, "touch"] as const) {
      const app = await openLink("basic", scope);

      expect(app.shows("id:link-under-test")).toBe(true);
      expect(app.texts()).toContain("Link label");
    }
  }, 120_000);
});
