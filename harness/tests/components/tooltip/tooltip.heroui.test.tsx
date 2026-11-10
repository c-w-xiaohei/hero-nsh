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
