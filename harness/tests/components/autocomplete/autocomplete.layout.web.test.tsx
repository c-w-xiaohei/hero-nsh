import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Port sheet 4c geometry case G-001 for Autocomplete: the popover matches the
 * trigger's width, sits below it, holds the filter above the list, and the list
 * grows with its options up to the room the overlay has.
 *
 * Measured through `onLayout` and `measure()` probes on the NSH-only fixture
 * (`harness/autocomplete.fixtures.tsx`), not hard-coded pixels: every assertion
 * is a relation between parts. The reference page
 * (`tmp/reference-static/autocomplete-G-001.html`) reports trigger 256×36 at
 * x=24, popover x=24 width 256 below it, SearchField at y=72 and the list at
 * y=100 width 256, which is the shape these relations encode.
 *
 * Two coordinate spaces are involved, and the fixture keeps them apart: the
 * trigger and the popover report page boxes (through `measure()`), while the
 * filter and the list report their `onLayout` boxes, which inside the overlay's
 * `Scroll` are the scroll content's own coordinates. Widths and the stacking
 * order compare across both; a child's y is not a page y.
 *
 * Runs on `--target web`: the reference measurements are compared there, and a
 * popover is placed and measured on a real host.
 */

type LayoutCall = {
  name: "trigger" | "popover" | "search" | "list";
  x: number;
  y: number;
  width: number;
  height: number;
};

function layoutCalls(app: App): LayoutCall[] {
  return callsOf(app, "layout").map((args) => args[0] as LayoutCall);
}

function layout(app: App, name: LayoutCall["name"]): LayoutCall {
  const calls = layoutCalls(app).filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

function openLayout(caseName: string): Promise<App> {
  return open(
    "../../../autocomplete.fixtures.tsx",
    {
      platform: "web",
      width: 1024,
      height: 768,
      host: { params: { case: caseName } },
    },
  );
}

async function waitForLayout(app: App): Promise<void> {
  await app.waitFor("role:listbox");

  // The four probes arrive over several frames: the trigger and the popover are
  // measured once they are placed, the filter and the list when they lay out.
  // The popover's width is written from the trigger's own measurement, so equal
  // widths mean the overlay has settled.
  await app.waitUntil(() => {
    const calls = layoutCalls(app);
    const names = new Set(calls.map((call) => call.name));

    if (names.size < 4) {
      return false;
    }

    const trigger = layout(app, "trigger");
    const popover = layout(app, "popover");

    return popover.width > 0 && Math.abs(popover.width - trigger.width) < 0.6;
  });
}

function expectClose(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(0.6);
}

// port sheet 4c, G-001
test("G-001 the popover matches the trigger width and stacks filter and list below it", async () => {
  const app = await openLayout("layout");

  await waitForLayout(app);

  const trigger = layout(app, "trigger");
  const popover = layout(app, "popover");
  const search = layout(app, "search");
  const list = layout(app, "list");

  // The reference trigger is 256 wide (`w-[256px]` in the shape) and 36 tall.
  expectClose(trigger.width, 256);
  expect(trigger.height).toBeGreaterThan(30);

  // The overlay takes the trigger's measured width (`--trigger-width` becomes
  // the popover's width and max-width) and opens on the trigger's column.
  expectClose(popover.width, trigger.width);
  expectClose(popover.x, trigger.x);

  // Below the trigger, not over it: the trigger's bottom edge plus the 8pt gap.
  expect(popover.y).toBeGreaterThanOrEqual(trigger.y + trigger.height);

  // The filter and the list fill the popover, the filter first.
  expectClose(search.width, popover.width);
  expectClose(list.width, popover.width);
  expect(list.y).toBeGreaterThanOrEqual(search.y + search.height);
});

// port sheet 4c, G-001 ("Popover 高度随 List 增长，List 在 320px 上限内滚动")
test("G-001 the popover grows with its options and stops at the room it has", async () => {
  const short = await openLayout("layout");

  await waitForLayout(short);

  const shortPopover = layout(short, "popover");
  const shortList = layout(short, "list");

  const long = await openLayout("layout-scroll");

  await waitForLayout(long);

  const longPopover = layout(long, "popover");
  const longList = layout(long, "list");

  // A forty-row collection lays out taller than a three-row one.
  expect(longList.height).toBeGreaterThan(shortList.height);

  // The popover grows with it, and stops at the room the overlay reports
  // instead of running off the view (12pt margin kept at the bottom).
  expect(longPopover.height).toBeGreaterThan(shortPopover.height);
  expect(longPopover.y + longPopover.height).toBeLessThanOrEqual(768 - 12);

  // Upstream scrolls the list itself inside a 320pt cap; NSH cannot (a ListBox
  // is a plain view, so the popover's one `Scroll` wraps the filter and the
  // list, port sheet §6.3 and §8). What must hold here is that the options past
  // the cap are reachable: the list content is taller than the viewport, so the
  // overlay's `Scroll` scrolls.
  expect(longList.height).toBeGreaterThan(longPopover.height);
  expect(longList.width).toBeGreaterThan(0);
});
