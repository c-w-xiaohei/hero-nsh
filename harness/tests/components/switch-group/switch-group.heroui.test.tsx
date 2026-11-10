import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for SwitchGroup, per port sheet 4b
 * (T-001 … T-005). Every case keeps its upstream file:line above it and its
 * title starts with the port-sheet id. The assertions follow SOP 3.2: what NSH
 * cannot read (data-slot, BEM classes, DOM class lists, an input's checked
 * state) is replaced by the visible effect, never dropped silently.
 *
 * T-001 drops two of the three upstream assertions (both data-slot attributes
 * and the root's BEM block name, D18) and keeps two facts: the root exists, and
 * the internal `items` wrapper exists. The wrapper's observable result in the
 * default vertical layout is the 16pt gap between the two switches (its
 * gap-4); with the switches directly under the root, that gap would be the
 * root's gap-6 (24pt).
 *
 * T-002 and T-003 drop the `switch-group--vertical` / `--horizontal` class
 * names and keep the layout each one stands for. The layout cases run on the
 * NSH-only fixture (`harness/switch-group.fixtures.tsx`) because it measures
 * geometry with onLayout probes; the shared scenarios keep the stories.
 */

type LayoutCall = {
  name: "group" | "wifi" | "bluetooth";
  x: number;
  y: number;
  width: number;
  height: number;
};

function openCase(params: Record<string, string | number | boolean> = {}): Promise<App> {
  return open("../../../switch-group.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: "layout", ...params } },
  });
}

function lastLayout(app: App, name: LayoutCall["name"]): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

function expectClose(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(0.6);
}

/* -------------------------------------------------------------------------------------------------
 * HeroUI unit cases
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/switch-group/switch-group.test.tsx:27
// Partial port (port sheet T-001): the two data-slot attributes and the root's
// `switch-group` block name have no NSH channel (D18). The root is named with
// testID instead, and the items wrapper is proven by the 16pt gap between the
// two switches.
test("T-001 exposes the group root and its items wrapper", async () => {
  const app = await openCase();
  const wifi = lastLayout(app, "wifi");
  const bluetooth = lastLayout(app, "bluetooth");

  expect(app.shows("id:group")).toBe(true);
  expectClose(bluetooth.y - (wifi.y + wifi.height), 16);
});

// heroui/packages/react/tests/components/switch-group/switch-group.test.tsx:41
// Partial port (port sheet T-002): `switch-group--vertical` has no NSH channel
// (D18). Its visible consequence remains: without an orientation prop the two
// switches stack in one column, same x, 16pt apart.
test("T-002 stacks the switches vertically by default", async () => {
  const app = await openCase();
  const wifi = lastLayout(app, "wifi");
  const bluetooth = lastLayout(app, "bluetooth");

  expectClose(bluetooth.x, wifi.x);
  expectClose(bluetooth.y, wifi.y + wifi.height + 16);
});

// heroui/packages/react/tests/components/switch-group/switch-group.test.tsx:53
// Partial port (port sheet T-003): `switch-group--horizontal` has no NSH
// channel (D18). Its visible consequence remains: with orientation
// "horizontal" the two switches share a row, 16pt apart. It can only catch a
// horizontal branch wrongly laid out as a column, because the items base class
// is already a row — that is exactly what the upstream rule means.
test("T-003 lays the switches out horizontally", async () => {
  const app = await openCase({ orientation: "horizontal" });
  const wifi = lastLayout(app, "wifi");
  const bluetooth = lastLayout(app, "bluetooth");

  expectClose(bluetooth.y, wifi.y);
  expectClose(bluetooth.x, wifi.x + wifi.width + 16);
});

// heroui/packages/react/tests/components/switch-group/switch-group.test.tsx:65
test("T-004 renders children switches", async () => {
  const app = await openScenario("switch-group/with-label");

  expect(app.shows("role:switch[Wifi]")).toBe(true);
  expect(app.shows("role:switch[Bluetooth]")).toBe(true);
});

// heroui/packages/react/tests/components/switch-group/switch-group.test.tsx:77
// Rewritten port (port sheet T-005): toBeChecked() reads the hidden input's DOM
// property, which NSH has no channel for. The fixture writes each switch's own
// state into its content text instead, so pressing one switch shows the toggle
// took effect and the sibling stayed off.
test("T-005 supports independent switch toggles", async () => {
  const app = await openCase({ case: "independent" });

  await app.press("role:switch[Wifi]");

  expect(app.texts()).toContain("Wifi On");
  expect(app.texts()).toContain("Bluetooth Off");
});

/* -------------------------------------------------------------------------------------------------
 * Review regressions
 * -----------------------------------------------------------------------------------------------*/

// Regression X-001, evidence: src/components/switch-group/switch-group.tsx:93-95
// HeroUI merges the caller class at the base slot
// (heroui/packages/react/src/components/switch-group/switch-group.tsx:34:
// slots.base({ className })). The implementation instead passed className to
// switchGroupVariants({ orientation, className }), and tailwind-variants 4.0.1
// ignores a root-level className on a slots tv: v({orientation:'vertical',
// className:'gap-2'}).base() returns "flex flex-col gap-6", while
// v({orientation:'vertical'}).base({className:'gap-2'}) returns
// "flex flex-col gap-2". So the public prop had no effect at all.
//
// The class used here is w-40 (160pt). Without it the root is as wide as its
// widest child, the w-20 (80pt) switch, so the two cases tell a dropped class
// from an applied one.
test("X-001 applies the caller className to the group root", async () => {
  const plain = await openCase();
  const withClass = await openCase({ case: "class-name" });

  expectClose(lastLayout(plain, "group").width, 80);
  expectClose(lastLayout(withClass, "group").width, 160);
});
