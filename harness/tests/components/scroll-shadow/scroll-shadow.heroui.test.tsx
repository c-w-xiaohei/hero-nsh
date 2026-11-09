import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ScrollShadow, per port sheet 4b
 * (T-001, T-003, T-008, T-010, T-012 … T-017, T-019, T-020, T-023 … T-026,
 * T-029 … T-032), plus X-001 … X-005. Every case keeps its upstream file:line
 * above it. X-005 reads the mount mask through harness/scroll-shadow.fixtures.tsx,
 * because a view's `maskImage` is not observable from a scenario.
 *
 * What this host cannot read is stated on the partial ports: the mask string,
 * the BEM classes and the `data-*` state attributes (D18 and no attribute
 * channel), the `--scroll-shadow-*` custom properties (no view-style query)
 * and the continuous fade lengths (only the `onVisibilityChange` projection of
 * the same measurement is observable). The layout box of the root is the one
 * exception: the root forwards `onLayout`, so the `style` height is read as
 * text.
 *
 * Deleted upstream rows, as decided in 4b: T-002, T-004 (BEM / data-slot),
 * T-005, T-006, T-007 (mode attribute), T-009 (layout read count), T-011
 * (`data-*` passthrough), T-018 (continuous fade length), T-021, T-022 (mask
 * string), T-027, T-028 (gradient angle). None has an observable projection in
 * `nsh/test`.
 */

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.test.tsx:86
// `Row 0` is a bare string child on purpose: the content layer has to wrap it
// in a Text or the first row draws nothing, which fails the case.
test("T-001 renders children content", async () => {
  const app = await openScenario("scroll-shadow/vertical");

  expect(app.shows("text:Row 0")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.test.tsx:100
// Partial port (port sheet T-003): the `data-orientation` and
// `scroll-shadow--horizontal` assertions are dropped (no DOM attribute channel,
// D18). Their observable consequence is the horizontal state vocabulary: the
// resting container reports `right`, the end of the range reports `left`. The
// same pair is re-run by T-024 / T-025 in their upstream reading order.
test("T-003 exposes orientation BEM modifier and data attribute", async () => {
  const app = await openScenario("scroll-shadow/horizontal");

  await app.waitFor("text:state:right");
  expect(app.shows("text:state:right")).toBe(true);

  await app.press("role:button[Scroll to end]");
  await app.waitFor("text:state:left");
  expect(app.shows("text:state:left")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.test.tsx:162
// Partial port (port sheet T-008): upstream reads `data-bottom-scroll` false ->
// true after only the content grows. The callback projection carries the same
// measurement: the initial fitting content reports `none` once, and the content
// growth reports `bottom` as the second call, with no scroll or container
// resize in between.
test("T-008 updates the shadow state when content resizes without a scroll or resize event", async () => {
  const app = await openScenario("scroll-shadow/grow");

  await app.waitFor("text:calls:1");
  expect(app.shows("text:state:none")).toBe(true);

  await app.press("role:button[Add rows]");
  await app.waitFor("text:calls:2");
  expect(app.shows("text:state:bottom")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.test.tsx:211
// Partial port (port sheet T-010): the `--scroll-shadow-size` and
// `--scroll-shadow-offset` assertions are dropped (the variables are gone per
// R-002 / R-004 and no view-style query exists). The third assertion stays:
// `style={{height: 240}}` reaches the root's box, read back through the root's
// forwarded `onLayout`.
test("T-010 keeps the shadow size and offset variables when a style prop is supplied", async () => {
  const app = await openScenario("scroll-shadow/style");

  await app.waitFor("text:a-vp:240");
  expect(app.shows("text:a-vp:240")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.test.tsx:235
// Real scrolling replaces the jsdom metric stubs. The first value differs from
// upstream (upstream reads a zero-height box first and reports `none`), because
// the layout already reports the overflowing content here; the three state
// transitions are the same: end edge, both, start edge.
test("T-012 calls onVisibilityChange when the scroll state changes", async () => {
  const app = await openScenario("scroll-shadow/vertical");

  await app.waitFor("text:state:bottom");
  expect(app.shows("text:state:bottom")).toBe(true);

  await app.press("role:button[Scroll to middle]");
  await app.waitFor("text:state:both");
  expect(app.shows("text:state:both")).toBe(true);

  await app.press("role:button[Scroll to end]");
  await app.waitFor("text:state:top");
  expect(app.shows("text:state:top")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.test.tsx:255
test("T-013 does not call onVisibilityChange again while the scroll state is unchanged", async () => {
  const app = await openScenario("scroll-shadow/rerender");

  await app.waitFor("text:calls:1");
  expect(app.shows("text:calls:1")).toBe(true);

  await app.press("role:button[Re-render]");
  await app.press("role:button[Re-render]");
  await app.wait(50);

  expect(app.shows("text:calls:1")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.test.tsx:272
// The callback prop is re-read on every parent update: the readout appends the
// render count the reporter was built with, so a callback captured on mount
// reports `@0` after the scroll and fails the second assertion.
test("T-014 calls the newest callback, not the one captured on mount", async () => {
  const app = await openScenario("scroll-shadow/rerender");

  await app.waitFor("text:state:bottom@0");
  expect(app.shows("text:state:bottom@0")).toBe(true);

  await app.press("role:button[Re-render]");
  await app.press("role:button[Re-render]");
  await app.press("role:button[Scroll to middle]");
  await app.waitFor("text:state:both@2");
  expect(app.shows("text:state:both@2")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:84
// Partial port (port sheet T-015): the `{start: "0px", end: "40px"}` fade pair
// is dropped (upstream polls computed custom properties; no view-style query).
// The retained half is the same measurement on the public callback.
test("T-015 fades only the end edge while resting at the start", async () => {
  const app = await openScenario("scroll-shadow/vertical");

  await app.waitFor("text:state:bottom");
  expect(app.shows("text:state:bottom")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:92
// Partial port (port sheet T-016): the two 40px lengths are dropped.
test("T-016 fades both edges once scrolled into the middle", async () => {
  const app = await openScenario("scroll-shadow/vertical");

  await app.press("role:button[Scroll to middle]");
  await app.waitFor("text:state:both");
  expect(app.shows("text:state:both")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:104
// Partial port (port sheet T-017): the lengths are dropped.
test("T-017 fades only the start edge at the end of the scroll range", async () => {
  const app = await openScenario("scroll-shadow/vertical");

  await app.press("role:button[Scroll to end]");
  await app.waitFor("text:state:top");
  expect(app.shows("text:state:top")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:124
// Partial port (port sheet T-019): both measurements are fade lengths and are
// dropped. The offset threshold is kept: scrolling 40 with `offset={80}` leaves
// the start edge hidden (`bottom`), passing 120 shows it (`both`). The scroll
// count proves the first scroll really happened instead of passing on the
// initial state. On the web target one command arrives as a short eased glide,
// so the count jumps from 0 to several: the waits and checks require at least
// one delivered scroll, never exactly one.
test("T-019 holds the start fade back until the offset is passed", async () => {
  const app = await openScenario("scroll-shadow/offset");

  await app.press("role:button[Scroll 40]");
  await app.waitFor("text:/^scrolls:[1-9]/");
  expect(app.shows("text:state:bottom")).toBe(true);

  await app.press("role:button[Scroll 120]");
  await app.waitFor("text:state:both");
  expect(app.shows("text:state:both")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:141
// Partial port (port sheet T-020): both 0px lengths are dropped.
test("T-020 renders no fade when the content fits", async () => {
  const app = await openScenario("scroll-shadow/fitting");

  await app.waitFor("text:state:none");
  expect(app.shows("text:state:none")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:177
// Partial port (port sheet T-023): as T-010, the second instance's box.
test("T-023 keeps the shadow size and offset when a style prop is supplied", async () => {
  const app = await openScenario("scroll-shadow/style");

  await app.waitFor("text:b-vp:240");
  expect(app.shows("text:b-vp:240")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:189
// Partial port (port sheet T-024): a horizontal container resting at the start
// reports `right`; the fade lengths are dropped.
test("T-024 fades only the end edge while resting at the start", async () => {
  const app = await openScenario("scroll-shadow/horizontal");

  await app.waitFor("text:state:right");
  expect(app.shows("text:state:right")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:197
// Partial port (port sheet T-025): scrolled to the end it reports `left`.
test("T-025 fades only the start edge at the end of the scroll range", async () => {
  const app = await openScenario("scroll-shadow/horizontal");

  await app.press("role:button[Scroll to end]");
  await app.waitFor("text:state:left");
  expect(app.shows("text:state:left")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:207
// Partial port (port sheet T-026): fitting content reports `none`.
test("T-026 renders no fade when the content fits", async () => {
  const app = await openScenario("scroll-shadow/fitting-horizontal");

  await app.waitFor("text:state:none");
  expect(app.shows("text:state:none")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:233
// Partial port (port sheet T-029): the fade pair is dropped; the logical
// projection stays, so an RTL container resting at its start still reports
// `right`. Upstream renders the row inside `<div dir="rtl">`
// (scroll-shadow.browser.test.tsx:52-53), so the direction is inherited from an
// ancestor here too. The mount call count is part of the assertion: the resting
// offset of an overflowing RTL row is `maxScroll`, so a state published before
// the host's first `onScroll` reads x = 0 and reports a false `left`.
test("T-029 still fades only the end edge while resting at the start in RTL", async () => {
  const app = await openScenario("scroll-shadow/horizontal-rtl");

  await app.waitFor("text:state:right");
  await app.wait(50);

  expect(app.shows("text:state:right")).toBe(true);
  expect(app.shows("text:calls:1")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:243
// Partial port (port sheet T-030), vertical example only (the horizontal
// vocabulary is covered by T-024 / T-025). The four upstream `expect(` calls
// read data attributes and the mask; the retained chain is: detected while
// enabled, a scroll while disabled neither notifies nor is lost (the scroll
// count proves it), and re-enabling detects the state again — with no further
// scroll, as upstream re-enables and only polls the attribute (:268-270). The
// scroll that ran while detection was off left the container at y = 200, so the
// state it must re-report is `both`.
//
// The last upstream block (:272-279, the same fixture with `isEnabled={false}`
// and `visibility="both"`) is an unobservable partial port: it asserts the
// explicit `data-*-scroll` attribute and that the mask is not `none`.
// Controlled visibility never notifies, and the mask cannot be read here. It is
// NOT covered by T-032, which runs with detection enabled and only proves that a
// controlled `visibility` suppresses the callback.
test("T-030 supports disabling and re-enabling an overflowing vertical container", async () => {
  const app = await openScenario("scroll-shadow/toggle");

  await app.waitFor("text:state:bottom");
  expect(app.shows("text:state:bottom")).toBe(true);

  await app.press("role:button[Toggle enabled]");
  await app.press("role:button[Scroll]");
  await app.waitFor("text:/^scrolls:[1-9]/");
  await app.wait(50);
  expect(app.shows("text:calls:1")).toBe(true);
  expect(app.shows("text:/^scrolls:[1-9]/")).toBe(true);

  await app.press("role:button[Toggle enabled]");
  await app.waitFor("text:calls:2");
  expect(app.shows("text:state:both")).toBe(true);
  expect(app.shows("text:calls:2")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:283
// Partial port (port sheet T-031): the mode attribute and `mask-image: none`
// are dropped. One half stays: with detection off, a real scroll never calls
// the callback.
test("T-031 renders no fade when detection is turned off", async () => {
  const app = await openScenario("scroll-shadow/disabled");

  await app.press("role:button[Scroll]");
  await app.waitFor("text:/^scrolls:[1-9]/");
  await app.wait(50);

  expect(app.shows("text:calls:0")).toBe(true);
});

// heroui/packages/react/tests/components/scroll-shadow/scroll-shadow.browser.test.tsx:306
// Partial port (port sheet T-032): the mode attribute and the mask string are
// dropped. The retained half: a controlled `visibility="both"` turns automatic
// detection off, so scrolling never calls the callback. This does not stand in
// for T-030's controlled-and-disabled block (:272-279): both assert the drawn
// mask, which is unreadable here.
test("T-032 keeps using the attribute-driven mask", async () => {
  const app = await openScenario("scroll-shadow/controlled");

  await app.press("role:button[Scroll]");
  await app.waitFor("text:/^scrolls:[1-9]/");
  await app.wait(50);

  expect(app.shows("text:calls:0")).toBe(true);
});

/* -------------------------------------------------------------------------------------------------
 * X cases: behaviour the port sheet pins down and no upstream HeroUI test
 * covers.
 * -----------------------------------------------------------------------------------------------*/

// X-001: src/primitives/create-scroll-shadow/create-scroll-shadow.ts:283 (the
// hasContentSize gate) and :304-310 (onScroll);
// src/components/scroll-shadow/scroll-shadow.tsx:201-206,287-300 (direction probe).
// The resting offset of an overflowing horizontal RTL container is `maxScroll`
// (x = 896 for 1152 content in a 256 viewport), not 0. Computing the auto state
// on the first content-layout event read x = 0 and published the start edge
// (`left`) before the host's first `onScroll` corrected it to `right`: history
// `->left>right` and 3 calls with the inherited direction (the probe adds a
// layout pass). Mount must notify once, with `right`, and never publish the
// false start-edge state; this is the inherited-direction path upstream uses
// (scroll-shadow.browser.test.tsx:52-53, :233).
test("X-001 reports a resting RTL row once, at its start edge", async () => {
  const app = await openScenario("scroll-shadow/horizontal-rtl");

  await app.waitFor("text:state:right");
  await app.wait(50);

  expect(app.shows("text:calls:1")).toBe(true);
  expect(app.shows("text:history:->right")).toBe(true);
});

// X-002: src/components/scroll-shadow/scroll-shadow.tsx:287-300 (own `dir` path).
// `dir="rtl"` resolves the direction without the inherited probe, but the first
// content-layout event still ran with the unseeded x = 0: history
// `->left>right`, 2 calls. Both ways of knowing the direction must gate the
// first publish on the settled axis offset.
test("X-002 reports a resting RTL row once when the direction comes from the dir prop", async () => {
  const app = await openScenario("scroll-shadow/horizontal-rtl-dir");

  await app.waitFor("text:state:right");
  await app.wait(50);

  expect(app.shows("text:calls:1")).toBe(true);
  expect(app.shows("text:history:->right")).toBe(true);
});

/**
 * The `calls:<n>` readout, as a number. The web target delivers one command as
 * a short eased glide, so a single scroll can pass through an intermediate state
 * (`bottom` -> `both` -> `top`) and add more than one call; comparisons are made
 * against the count read before the step, never against a fixed number.
 */
function callsNow(app: App): number {
  const line = app.texts().find((text) => /^calls:\d+$/.test(text));

  if (!line) throw new Error(`no calls readout; on screen: ${app.texts().join(" | ")}`);

  return Number(line.slice("calls:".length));
}

// X-003: src/primitives/create-scroll-shadow/create-scroll-shadow.ts:191-201,335-356
// Upstream reads the live, host-clamped offset on every check
// (tmp/vendor/heroui/packages/react/src/components/scroll-shadow/use-scroll-shadow.ts:44-49)
// and re-runs that check after content and viewport changes (same file:136-154).
// Here the offset is written only by `onScroll`, so after the content shrinks
// under the viewport the host clamps its own position to 0 and draws the first
// rows, while the cached offset leaves the state machine at `top`. The shrink
// scenario has 20 rows of 40pt (800pt) in a 160pt box and then drops to 2 rows
// (80pt): the state has to reach `none` and the shrink must notify again, while
// the bug leaves both the state and the count where the scroll left them.
test("X-003 clamps the offset when the content shrinks under the viewport", async () => {
  const app = await openScenario("scroll-shadow/shrink");

  await app.press("role:button[Scroll to end]");
  await app.waitFor("text:state:top");
  const settled = callsNow(app);

  expect(settled).toBeGreaterThanOrEqual(2);

  await app.press("role:button[Shrink rows]");
  await app.waitFor("text:state:none");
  expect(callsNow(app)).toBeGreaterThan(settled);
});

// X-004: src/primitives/create-scroll-shadow/create-scroll-shadow.ts:191-201,343-356
// The same missing re-clamp on the other measurement: upstream's ResizeObserver
// re-runs the check when the container's own box changes
// (tmp/vendor/heroui/packages/react/src/components/scroll-shadow/use-scroll-shadow.ts:136-139).
// Content is 320pt in a 160pt viewport, scrolled to its end; growing the viewport
// to 400pt leaves nothing to scroll. The host clamps the offset to 0, so the
// state has to be `none` and the growth has to notify again; the cached offset of
// 160 keeps reporting `top` with no further call.
test("X-004 clamps the offset when the viewport grows over the content", async () => {
  const app = await openScenario("scroll-shadow/grow-viewport");

  await app.press("role:button[Scroll to end]");
  await app.waitFor("text:state:top");
  const settled = callsNow(app);

  expect(settled).toBeGreaterThanOrEqual(2);

  await app.press("role:button[Grow viewport]");
  await app.waitFor("text:state:none");
  expect(callsNow(app)).toBeGreaterThan(settled);
});

/**
 * A point-based mask is wrong before the first measurement: the axis extent is
 * still 0 (`create-scroll-shadow.ts:143`), so its stops cannot describe a box
 * that already has a size. In auto mode every stop collapses to 0px and the
 * whole root is transparent; in controlled mode the 40px stops fall outside the
 * box. Only an absent mask, or a percentage-based one (opaque at any length),
 * leaves the content visible.
 */
function masksBeforeMeasuring(mask: string | undefined): boolean {
  if (!mask) return false;

  return !mask.includes("%");
}

function mountMaskOf(app: App, name: string): string | undefined {
  const prefix = `mask:${name}:`;
  const line = app.texts().find((text) => text.startsWith(prefix));

  if (!line) throw new Error(`no ${name} mask readout; on screen: ${app.texts().join(" | ")}`);

  const mask = line.slice(prefix.length);

  return mask === "none" ? undefined : mask;
}

// X-005: src/primitives/create-scroll-shadow/create-scroll-shadow.ts:241-260 and
// src/components/scroll-shadow/scroll-shadow.tsx:239-247.
// The viewport snapshot starts at `{0,0}` (`create-scroll-shadow.ts:143`) but
// auto mode returns a gradient anyway; at length 0 every stop is 0px
// (`fadeGradient`, :109-119) and NSH draws a view only where its mask is opaque
// (harness/.nsh/types/nsh/types.d.ts:345-346), so the scroll box is transparent
// until the first `onLayout` delivers a size. Upstream's auto gradient uses
// percentage stops (tmp/vendor/heroui/packages/styles/components/scroll-shadow.css:185-188),
// which is opaque on the first paint. The fixture prints the primitive's mount
// mask in both auto and controlled mode; neither may be point-based.
test("X-005 keeps the content unmasked until the first measurement", async () => {
  const app = await open("../../../scroll-shadow.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
  });

  const auto = mountMaskOf(app, "auto");
  const controlled = mountMaskOf(app, "controlled");

  expect(masksBeforeMeasuring(auto)).toBe(false);
  expect(masksBeforeMeasuring(controlled)).toBe(false);
});
