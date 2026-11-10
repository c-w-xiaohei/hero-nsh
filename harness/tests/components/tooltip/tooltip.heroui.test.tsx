import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Tooltip, per port sheet 4b (T-002 … T-006,
 * T-008). T-001 is deleted: it asserts a `data-slot` attribute, which D18 does
 * not port. T-007 needs Tab to move focus, which the Windows host does not do
 * (loop brief, "Windows keyboard focus"), so it lives in
 * tooltip.heroui.web.test.tsx.
 *
 * Every case runs on a desktop platform with a manual clock. Opening is a
 * hover (`delay={0}`), and a close keeps the content mounted for the 100 ms
 * exit hold (port sheet §5.5), so presence is counted after the clock passes
 * the hold instead of right after the close.
 */

const TIP = "text:Hover tip";

function openFixture(name: string): Promise<App> {
  return open("../../../tooltip.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    clock: {},
    host: { params: { case: name } },
  });
}

function closedCalls(app: App): unknown[][] {
  return callsOf(app, "openChange").filter((args) => args[0] === false);
}

// heroui/packages/react/tests/components/tooltip/tooltip.test.tsx:51
// Partial port (port sheet T-002): the `className` assertion is a D18
// deletion. What a user observes stays: the hover mounts the content and the
// content reads its text.
test("T-002 renders content on hover", async () => {
  const app = await openScenario("tooltip/basic", { clock: {} });

  await app.hover("role:button[Hover me]");
  await app.clock!.runFor(20);

  expect(app.shows(TIP)).toBe(true);
  expect(app.count(TIP)).toBe(1);
});

// heroui/packages/react/tests/components/tooltip/tooltip.test.tsx:70
// Ported with the closeDelay boundary measured from the pointer leaving the
// trigger: the uncontrolled tooltip reports `false` only after its 300 ms
// timer, and the content then stays for the 100 ms exit hold (port sheet
// §5.5). A step settles a frame or two on the manual clock, so the timer is
// bracketed with a margin (250 / 350) instead of exactly 299 / 300.
test("T-003 supports hiding content after closeDelay on unhover", async () => {
  const app = await openFixture("close-delay");
  const tip = "text:Closable tip";

  await app.hover("role:button[Hover me]");
  await app.clock!.runFor(20);
  expect(app.shows(tip)).toBe(true);

  await app.hover("id:away");
  expect(app.shows(tip)).toBe(true);

  await app.clock!.runFor(250);
  expect(app.count(tip)).toBe(1);
  expect(closedCalls(app)).toHaveLength(0);

  await app.clock!.runFor(100);
  expect(closedCalls(app)).toEqual([[false]]);

  // Still mounted: the close begins the 100 ms exit hold, it does not unmount.
  expect(app.count(tip)).toBe(1);

  await app.clock!.runFor(120);
  expect(app.count(tip)).toBe(0);
});

// heroui/packages/react/tests/components/tooltip/tooltip.test.tsx:97
test("T-004 supports isDisabled without showing content", async () => {
  const app = await openScenario("tooltip/disabled", { clock: {} });

  await app.hover("role:button[Hover me]");
  await app.clock!.runFor(20);

  expect(app.count("text:Should not appear")).toBe(0);
});

// heroui/packages/react/tests/components/tooltip/tooltip.test.tsx:113
// Partial port (port sheet T-005): the `[data-slot="tooltip-arrow"]` lookup is
// a D18 deletion. The composed arrow is observed through the testID the
// implementation derives for the default arrow (`arrow-default`), and the
// content is still there next to it.
test("T-005 renders arrow slot when composed", async () => {
  const app = await openScenario("tooltip/arrow", { clock: {} });

  await app.hover("role:button[Hover me]");
  await app.clock!.runFor(20);

  expect(app.shows("text:Arrow tip")).toBe(true);
  expect(app.shows("id:arrow-default")).toBe(true);
});

// heroui/packages/react/tests/components/tooltip/tooltip.browser.test.tsx:12
test("T-006 shows content when open and dismisses with Escape", async () => {
  const app = await openFixture("default-open");

  expect(app.shows(TIP)).toBe(true);

  await app.keyboard.press("escape");

  await app.clock!.runFor(120);
  expect(app.count(TIP)).toBe(0);
});

// heroui/packages/react/tests/components/tooltip/tooltip.browser.test.tsx:50
// Partial port (port sheet T-008): `data-exiting`, the animation name, the
// fill mode and the animated properties have no NSH query. What is left is the
// timing: after Escape the content is still mounted, and it unmounts only once
// the 100 ms exit hold has passed.
test("T-008 closes with an exit hold instead of unmounting at once", async () => {
  const app = await openFixture("default-open");

  expect(app.shows(TIP)).toBe(true);

  await app.keyboard.press("escape");
  expect(app.count(TIP)).toBe(1);

  await app.clock!.runFor(120);
  expect(app.count(TIP)).toBe(0);
});

/*
 * Follow-up round, the review's findings. The warmup and swap cases run the
 * `warm-swap` fixture (delay 50, closeDelay 200); each case states the behavior
 * the fix must reach, not the current one.
 */

// src/components/tooltip/tooltip-content.tsx:173-191, 308, 318
// HeroUI's `TooltipAnimationScope` clears React Aria's warmup
// `shouldSkipAnimation` for the descendants unless the Root prop is true
// (heroui/packages/react/src/components/tooltip/tooltip.tsx:41-54), and
// `TooltipContent` turns its exit hold on from that cleared value
// (tooltip.tsx:128-131, utils/use-overlay-exit-hold.ts:88,99, `enabled`
// defaults to true). Gating the hold on the RAC flag alone therefore drops the
// 100 ms fade on every close once the family is warm. The behavior: the default
// holds, and only `shouldSkipAnimation` on the Root removes the hold.
test("X-001 keeps the 100ms exit hold on a close after a warm open", async () => {
  const app = await openFixture("warm-swap");
  const tip = "text:Warm tip";

  // Cold open: the 50 ms warmup timer runs, so `show(false)` marks the open
  // as not skipping the animation.
  await app.hover("role:button[Warmup]");
  await app.clock!.runFor(80);
  expect(app.shows(tip)).toBe(true);

  // Close it (closeDelay 200) and let the 100 ms exit hold pass: the family
  // stays warm for the 500 ms cooldown.
  await app.hover("id:away");
  await app.clock!.runFor(340);
  expect(app.count(tip)).toBe(0);

  // Warm reopen within the cooldown: HeroUI opens it at once, and RAC marks
  // this open as `shouldSkipAnimation` — which HeroUI clears for the content.
  await app.hover("role:button[Warmup]");
  await app.clock!.runFor(20);
  expect(app.shows(tip)).toBe(true);

  // Close again. The closeDelay has run out just before the assertion; the
  // content is in its 100 ms exit hold and has not unmounted.
  await app.hover("id:away");
  await app.clock!.runFor(220);
  expect(app.count(tip)).toBe(1);

  await app.clock!.runFor(120);
  expect(app.count(tip)).toBe(0);
});

// src/components/tooltip/tooltip-content.tsx:190-191, 308, 318
// A target swap closes the previous tooltip through `closeOtherTooltips`,
// which is the one path that sets `skipAnimation` on purpose (port sheet §6
// deviation 4). HeroUI still fades the closed tip out: `data-exiting` comes
// from the content's own flag, not from RAC's warmup flag. The closed tip has
// to stay mounted for the 100 ms hold, next to the newly opened one.
test("X-002 keeps the closed tip for the 100ms exit hold on a target swap", async () => {
  const app = await openFixture("warm-swap");
  const first = "text:First tip";
  const second = "text:Second tip";

  // Warm the family with a separate instance, as upstream's
  // `primeTooltipWarmup` does, so the swapped-in tooltip opens without the
  // 50 ms delay.
  await app.hover("role:button[Warmup]");
  await app.clock!.runFor(80);
  await app.hover("id:away");
  await app.clock!.runFor(340);

  await app.hover("role:button[First]");
  await app.clock!.runFor(20);
  expect(app.shows(first)).toBe(true);

  // Move the pointer to the other trigger: First closes (immediately through
  // the open of Second, or after its closeDelay), Second opens at once.
  await app.hover("role:button[Second]");
  await app.clock!.runFor(20);
  expect(app.shows(second)).toBe(true);
  expect(app.count(first)).toBe(1);

  // The hold ends long before this, whether First closed at once or after its
  // 200 ms closeDelay; Second stays open.
  await app.clock!.runFor(500);
  expect(app.count(first)).toBe(0);
  expect(app.shows(second)).toBe(true);
});

// No upstream row: the finding that every case used a `Button` trigger, so the
// `Tooltip.Trigger` part — the second trigger form HeroUI exports — was only
// covered by the screenshot scenario. It is a hover source like the Button.
test("X-003 opens from the Tooltip.Trigger part on hover", async () => {
  const app = await openScenario("tooltip/trigger", { clock: {} });

  await app.hover("role:button[Hover me]");
  await app.clock!.runFor(20);

  expect(app.shows("text:Trigger tip")).toBe(true);
});

// No upstream row: the finding that the port sheet §5.10 promises a
// `content-hover` fixture and nothing covered content hover. HeroUI keeps the
// tooltip open while the pointer is over the content: entering the content
// cancels the closeDelay that the trigger's leave started.
test("X-004 stays open while the pointer is over the content", async () => {
  const app = await openFixture("content-hover");
  const tip = "text:Content hover tip";

  await app.hover("role:button[Hover me]");
  await app.clock!.runFor(20);
  expect(app.shows(tip)).toBe(true);

  await app.hover(tip);
  await app.clock!.runFor(500);
  expect(app.shows(tip)).toBe(true);

  // Leaving the content starts the 300 ms closeDelay, then the 100 ms hold.
  await app.hover("id:away");
  await app.clock!.runFor(500);
  expect(app.count(tip)).toBe(0);
});
