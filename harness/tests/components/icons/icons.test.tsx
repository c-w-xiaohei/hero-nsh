import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * NSH-only geometry cases for the shared icon set, per port sheet 4b.2
 * (S-001 … S-005). HeroUI has no icons tests and Kobalte has no shared icon
 * module, so there is no upstream case to translate; these assertions cover
 * what the host can read: the identity each icon carries and the box it lays
 * out. Shape and color are checked by the `icons/all` and `icons/colors`
 * screenshots (port sheet §5), because `nsh test` cannot read canvas pixels or
 * view styles.
 *
 * Every case runs on the default headless windows platform.
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function lastLayout(app: App, name: string): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

function openIconFixture(name: string): Promise<App> {
  return open("../../../icons.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: name } },
  });
}

// heroui/packages/react/src/components/icons.tsx:18 (all fifteen exports)
// S-001: every icon renders under the testID the port assigns it (port sheet
// §3). A missing export, a missing default testID or a typo in the table fails
// this case; the count checks make a duplicated icon visible too.
test("S-001 renders all fifteen icons", async () => {
  const app = await openScenario("icons/all", { locale: "en-US" });

  const ids = [
    "icon-chevron-down",
    "icon-chevron-up",
    "icon-chevron-left",
    "icon-chevron-right",
    "icon-external-link",
    "icon-circle-dashed",
    "icon-close",
    "icon-info",
    "icon-warning",
    "icon-danger",
    "icon-success",
    "icon-minus",
    "icon-plus",
    "icon-search",
    "icon-calendar",
  ];

  for (const id of ids) {
    expect(app.shows(`id:${id}`)).toBe(true);
    expect(app.count(`id:${id}`)).toBe(1);
  }
});

// heroui/packages/react/src/components/icons.tsx:9 (width={16} height={16});
// heroui/packages/react/src/components/icons.tsx:88 (9 × 9);
// heroui/packages/react/src/components/icons.tsx:286 (1em, ported as 16)
// S-002: the default size classes lay out the SVG's width and height: 16
// points for thirteen icons, 9 for ExternalLinkIcon, and 16 for IconCalendar,
// whose upstream `1em` has no NSH equivalent (R-001 … R-003). A lost default
// class yields 0 or a full-width box, and a wrong table entry shows up here.
test("S-002 uses the upstream default sizes", async () => {
  const app = await openIconFixture("defaults");

  const expected: [string, number][] = [
    ["icon-chevron-down", 16],
    ["icon-chevron-up", 16],
    ["icon-chevron-left", 16],
    ["icon-chevron-right", 16],
    ["icon-external-link", 9],
    ["icon-circle-dashed", 16],
    ["icon-close", 16],
    ["icon-info", 16],
    ["icon-warning", 16],
    ["icon-danger", 16],
    ["icon-success", 16],
    ["icon-minus", 16],
    ["icon-plus", 16],
    ["icon-search", 16],
    ["icon-calendar", 16],
  ];

  for (const [name, size] of expected) {
    const layout = lastLayout(app, name);

    expect(layout.width).toBe(size);
    expect(layout.height).toBe(size);
  }
});

// heroui/packages/react/src/components/icons.tsx:88-98 (height / width defaults)
// S-003: `width` and `height` props become the box, as SVG presentation
// attributes do upstream (R-015). The case gives an uneven 24 × 12 so a
// swapped pair or a fallback to the default 16 fails, and names the geometry
// only: the aspect-preserving drawing itself is the `icons/all` screenshot.
test("S-003 applies width and height props", async () => {
  const app = await openIconFixture("size");

  const layout = lastLayout(app, "size-props");

  expect(layout.width).toBe(24);
  expect(layout.height).toBe(12);
});

// heroui/packages/react/src/components/icons.tsx:9-26 (the root `<svg>`, no
// class of its own upstream; the consumer applies the size)
// S-004: the caller's `className` follows the default size classes, and later
// classes win (R-013). `size-3` is 12 points, so reversed order or a dropped
// class would leave the icon at its default 16.
test("S-004 lets className override the default size", async () => {
  const app = await openIconFixture("class-name");

  const layout = lastLayout(app, "class-name");

  expect(layout.width).toBe(12);
  expect(layout.height).toBe(12);
});

// heroui/packages/react/src/components/icons.tsx:9 (aria-hidden="true"),
// heroui/packages/react/src/components/icons.tsx:14 (the root spreads props)
// S-005: a caller's `testID` replaces the default identity, and
// `aria-hidden={false}` is accepted without breaking the icon (R-009). The
// hidden flag itself is not readable through `nsh test`; exposing the icon
// must at least leave it rendering.
test("S-005 overrides testID and accepts aria-hidden false", async () => {
  const app = await openIconFixture("test-id");

  expect(app.shows("id:custom-close")).toBe(true);
  expect(app.count("id:custom-close")).toBe(1);
  expect(app.shows("id:icon-close")).toBe(false);
});
