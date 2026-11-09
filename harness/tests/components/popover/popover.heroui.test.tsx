import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf, calls } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Popover, per port sheet 4b (T-004, T-005,
 * T-010 … T-014, T-016 … T-018) plus X-001.
 *
 * Deleted rows are not repeated here: T-001 … T-003 are React callback-ref
 * lifecycle, T-006 … T-009 assert accessible names / `render` results that NSH
 * cannot observe, T-015 and T-020 assert CSS animation names and computed
 * styles, and T-019 belongs to Dropdown.
 *
 * Presence is asserted on a manual clock because the exit hold keeps the
 * content mounted for 100 ms: a presence assertion taken right after closing
 * would pass even when the close went down the wrong path.
 */

const CONTENT = "text:This is the popover content";

function openFixture(name: string): Promise<App> {
  return open("../../../popover.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    clock: {},
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/popover/popover.test.tsx:100
// Rewritten port (port sheet T-004): the data-slot and `popover__dialog` class
// assertions are D18 deletions; the behavior chain a Dialog tester really
// verifies is kept: closed at first, shown after a trigger press, gone after
// closing again.
test("T-004 opens the content on trigger press and unmounts it after closing", async () => {
  const app = await openScenario("popover/basic", { clock: {} });

  expect(app.count(CONTENT)).toBe(0);

  await app.press("role:button[Open popover]");
  expect(app.shows(CONTENT)).toBe(true);

  await app.press("role:button[Open popover]");
  await app.clock!.runFor(120);

  expect(app.count(CONTENT)).toBe(0);
});

// heroui/packages/react/tests/components/popover/popover.test.tsx:127
test("T-005 supports Escape dismiss", async () => {
  const app = await openScenario("popover/default-open", { clock: {} });

  expect(app.shows(CONTENT)).toBe(true);

  await app.keyboard.press("escape");

  const closes = callsOf(app, "openChange").filter((args) => args[0] === false);

  expect(closes).toEqual([[false]]);

  await app.clock!.runFor(120);
  expect(app.count(CONTENT)).toBe(0);
});

// heroui/packages/react/tests/components/popover/popover.test.tsx:221
// Rewritten port (port sheet T-010): the svg and data-slot assertions become
// the default arrow's testID, which the implementation adds only when the
// caller passes one (the fixture passes testID="arrow").
test("T-010 renders a default arrow when no child is provided", async () => {
  const app = await openScenario("popover/arrow");

  expect(app.shows("text:Content")).toBe(true);
  expect(app.shows("id:arrow-default")).toBe(true);
});

// heroui/packages/react/tests/components/popover/popover.test.tsx:238
// Rewritten port (port sheet T-011): the custom child replaces the default
// arrow. The text proves the child renders; the count proves the default one
// did not survive next to it.
test("T-011 tags a custom arrow child with the arrow slot", async () => {
  const app = await openScenario("popover/arrow-custom");

  expect(app.shows("text:Content")).toBe(true);
  expect(app.shows("text:▲")).toBe(true);
  expect(app.count("id:arrow-default")).toBe(0);
});

// heroui/packages/react/tests/components/popover/popover.test.tsx:261
// Rewritten port (port sheet T-012): the data-slot and `popover__trigger`
// class assertions are D18 deletions; the press behavior is kept.
test("T-012 exposes the trigger slot and opens the popover on press", async () => {
  const app = await openScenario("popover/trigger");

  expect(app.shows("role:button[Open]")).toBe(true);

  await app.press("role:button[Open]");
  expect(app.shows("text:Trigger content")).toBe(true);
});

// heroui/packages/react/tests/components/popover/popover.test.tsx:283
// Rewritten port (port sheet T-013): the class assertion becomes the visible
// effect of `font-medium` (R-016), read from the resolved span style.
test("T-013 exposes heading slot", async () => {
  const app = await openScenario("popover/default-open");

  expect(app.shows("text:Popover heading")).toBe(true);
  expect(app.spanStyle("text:Popover heading").fontWeight).toBe(500);
});

// heroui/packages/react/tests/components/popover/popover.browser.test.tsx:13
// Rewritten port (port sheet T-014): the DOM containment check becomes "the
// Dialog itself received focus". Focus must end on the trigger: a trigger that
// is focused and then blurred would still satisfy a presence count, so the
// last of the trigger's focus events has to be onFocus.
test("T-014 supports focus move into dialog and Escape restore", async () => {
  const app = await openScenario("popover/basic", { platform: "web", clock: {} });

  expect(callsOf(app, "triggerFocus")).toHaveLength(0);

  await app.press("role:button[Open popover]");

  expect(app.shows(CONTENT)).toBe(true);
  expect(callsOf(app, "dialogFocus").length).toBeGreaterThan(0);

  await app.keyboard.press("escape");
  await app.clock!.runFor(120);

  expect(app.count(CONTENT)).toBe(0);

  const focusEvents = calls(app)
    .filter((call) => call.name === "triggerFocus" || call.name === "triggerBlur")
    .map((call) => call.name);

  expect(focusEvents[focusEvents.length - 1]).toBe("triggerFocus");
});

// heroui/packages/react/tests/components/popover/popover.browser.test.tsx:48
// Rewritten port (port sheet T-016): `data-exiting`, the animation name and
// the animated properties have no NSH query. Count-only presence passes even
// when the close rebuilds the content, so the stateful counter is mutated
// while open: the same subtree must still show it during the hold and go with
// the hold.
test("T-016 stays mounted through its close animation", async () => {
  const app = await openFixture("auto");

  expect(app.shows("text:Count 0")).toBe(true);

  await app.press("id:counter");
  expect(app.shows("text:Count 1")).toBe(true);

  await app.keyboard.press("escape");
  expect(app.shows("text:Count 1")).toBe(true);

  await app.clock!.runFor(120);
  expect(app.count("text:Count 1")).toBe(0);
  expect(app.count("text:Retained content")).toBe(0);
});

// heroui/packages/react/tests/components/popover/popover-animation.browser.test.tsx:15
// Partial port (port sheet T-017): the inline opacity and DOM node identity
// assertions are dropped. The retained subtree is observed through its own
// counter: a rebuild on reopen resets it to 0.
test("T-017 supports reopening retained content", async () => {
  const app = await openFixture("retained");

  expect(app.shows("text:Count 0")).toBe(true);

  await app.press("id:counter");
  expect(app.shows("text:Count 1")).toBe(true);

  await app.host.send("popover.close");
  expect(app.shows("text:Retained content")).toBe(true);
  expect(app.shows("text:Count 1")).toBe(true);

  await app.host.send("popover.reopen");
  expect(app.shows("text:Count 1")).toBe(true);
});

// heroui/packages/react/tests/components/popover/popover-animation.browser.test.tsx:47
// Partial port (port sheet T-018), `prop` parameter: shouldSkipAnimation skips
// the hold, so the content is gone as soon as the close settles.
test("T-018 skips the exit hold when shouldSkipAnimation is true", async () => {
  const app = await openFixture("skip");

  expect(app.shows("text:Retained content")).toBe(true);

  await app.host.send("popover.close");

  expect(app.count("text:Retained content")).toBe(0);
});

// heroui/packages/react/tests/components/popover/popover-animation.browser.test.tsx:47
// Partial port (port sheet T-018), `override` parameter: an explicit false
// wins, so the exit hold still runs (the context parameter is not public API).
test("T-018 keeps the exit hold when shouldSkipAnimation is explicitly false", async () => {
  const app = await openFixture("override-false");

  expect(app.shows("text:Retained content")).toBe(true);

  await app.host.send("popover.close");

  expect(app.shows("text:Retained content")).toBe(true);

  await app.clock!.runFor(120);
  expect(app.count("text:Retained content")).toBe(0);
});

// heroui/packages/react/tests/components/popover/fixtures.tsx:13-18
// X-001: the fixture puts an `Inside action` Button in Popover.Content. The
// content scope must hand it a no-op trigger context; if the press toggles the
// popover, the 100 ms exit hold hides the failure from an immediate check, so
// the clock runs past it and the root callback is checked as well.
test("X-001 pressing a Button inside Popover.Content does not toggle the popover", async () => {
  const app = await openScenario("popover/basic", { clock: {} });

  await app.press("role:button[Open popover]");
  expect(app.shows(CONTENT)).toBe(true);

  await app.press("role:button[Inside action]");
  await app.clock!.runFor(120);

  expect(callsOf(app, "insideAction")).toHaveLength(1);
  expect(app.count(CONTENT)).toBe(1);

  const closes = callsOf(app, "openChange").filter((args) => args[0] === false);

  expect(closes).toHaveLength(0);
});

// heroui/packages/react/tests/components/popover/popover-animation.browser.test.tsx:15
// X-002: reopening inside the 100 ms exit hold must cancel the pending
// removal, not remount later. The counter mutated before Escape is still
// there, and stays there once the clock passes the hold.
test("X-002 reopening during the exit hold keeps the content state", async () => {
  const app = await openFixture("auto");

  await app.press("id:counter");
  expect(app.shows("text:Count 1")).toBe(true);

  await app.keyboard.press("escape");
  expect(app.shows("text:Count 1")).toBe(true);

  await app.press("role:button[Open popover]");
  expect(app.shows("text:Count 1")).toBe(true);

  await app.clock!.runFor(120);
  expect(app.count("text:Count 1")).toBe(1);
});

// react-aria-components/src/Popover.tsx:377
// X-003: the underlay mounts only while `state.isOpen`, so it is gone as soon
// as the close starts. During the exit hold the trigger is reachable and a
// press on it reopens the popover, which then survives the hold.
test("X-003 the underlay is gone immediately on close, so the trigger reopens during the hold", async () => {
  const app = await openScenario("popover/basic", { clock: {} });

  await app.press("role:button[Open popover]");
  expect(app.shows(CONTENT)).toBe(true);

  await app.keyboard.press("escape");
  expect(app.count(CONTENT)).toBe(1);

  await app.press("role:button[Open popover]");
  await app.clock!.runFor(120);

  expect(app.count(CONTENT)).toBe(1);
});
