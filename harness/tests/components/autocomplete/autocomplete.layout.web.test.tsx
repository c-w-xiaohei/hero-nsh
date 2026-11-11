import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Port sheet 4c geometry case G-001 for Autocomplete: the popover matches the
 * trigger's width, sits below it, holds the filter above the list, and the list
 * grows only up to its 320pt cap.
 *
 * Measured through `onLayout` probes on the NSH-only fixture
 * (`harness/autocomplete.fixtures.tsx`), not hard-coded pixels: every assertion
 * is a relation between parts. The reference page
 * (`tmp/reference-static/autocomplete-G-001.html`) reports trigger 256×36 at
 * x=24, popover x=24 width 256 below it, SearchField at y=72 and the list at
 * y=100 width 256, which is the shape these relations encode.
 *
 * Runs on `--target web` because that is where the layout file's measurements
 * are compared; the numbers come from the app's own model, so the same
 * relations hold headless.
 */

type LayoutCall = {
  name: "trigger" | "search" | "list";
  x: number;
  y: number;
  width: number;
  height: number;
};

function layout(app: App, name: LayoutCall["name"]): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
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
  await app.waitUntil(() => callsOf(app, "layout").length >= 3);
}

function expectClose(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(0.6);
}

// port sheet 4c, G-001
test("G-001 the popover matches the trigger width and stacks filter and list below it", async () => {
  const app = await openLayout("layout");

  await waitForLayout(app);

  const trigger = layout(app, "trigger");
  const search = layout(app, "search");
  const list = layout(app, "list");

  // The reference trigger is 256 wide (`w-[256px]` in the shape) and 36 tall.
  expectClose(trigger.width, 256);
  expect(trigger.height).toBeGreaterThan(30);

  // The popover takes the trigger's measured width, so the filter and the list
  // inside it are that wide too.
  expectClose(search.width, trigger.width);
  expectClose(list.width, trigger.width);
  expectClose(search.x, trigger.x);
  expectClose(list.x, trigger.x);

  // Popover below the trigger; the list below the filter in the popover's column.
  expect(search.y).toBeGreaterThanOrEqual(trigger.y + trigger.height);
  expect(list.y).toBeGreaterThanOrEqual(search.y + search.height);
});

// port sheet 4c, G-001 ("Popover 高度随 List 增长，List 在 320px 上限内滚动")
test("G-001 the list grows with its options up to its 320pt cap", async () => {
  const short = await openLayout("layout");

  await waitForLayout(short);

  const shortList = layout(short, "list");

  const long = await openLayout("layout-scroll");

  await waitForLayout(long);

  const longList = layout(long, "list");

  // A forty-row list is taller than a three-row one, and stops at the cap.
  expect(longList.height).toBeGreaterThan(shortList.height);
  expect(longList.height).toBeLessThanOrEqual(320.6);
  expect(longList.width).toBeGreaterThan(0);
});
