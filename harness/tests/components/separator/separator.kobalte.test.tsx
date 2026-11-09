import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 regression cases for Separator, per port sheet 4b
 * (T-017, T-019, T-020). Kobalte asserts aria-orientation and data-orientation;
 * NSH has no aria channel and no data attributes, so each case is rewritten to
 * the orientation's visible consequence, read through onLayout. The port sheet
 * splits the two consequences across cases: T-017 and T-019 check the line's
 * own axis, T-020 checks that a vertical line stretches to the row height.
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

// kobalte/packages/core/src/separator/separator.test.tsx:40
// Partial port (port sheet T-017): the upstream case asserts
// aria-orientation="vertical", which NSH cannot express or read. What survives
// is that the line is one point wide; a horizontal one would be 300 points wide.
test("T-017 lays a vertical divider out one point wide", async () => {
  const app = await openScenario("separator/vertical");

  expect(lastLayout(app, "vertical").width).toBe(1);
});

// kobalte/packages/core/src/separator/separator.test.tsx:59
// Rewritten port (port sheet T-019): upstream asserts
// data-orientation="horizontal", which NSH does not emit. The default
// orientation's visible consequence inside the 300-point stage column is a
// one-point-tall full-width line; the horizontal variant missing would leave the
// vertical geometry (width 1, stretched height).
test("T-019 lays the default divider out as a one-point line across its container", async () => {
  const app = await openScenario("separator/default");
  const divider = lastLayout(app, "horizontal");

  expect(divider.height).toBe(1);
  expect(divider.width).toBe(300);
});

// kobalte/packages/core/src/separator/separator.test.tsx:69
// Partial port (port sheet T-020): upstream asserts data-orientation="vertical",
// which NSH does not emit. What survives is the other half of the vertical
// geometry: self-stretch takes the line to the full 20-point row height. T-017
// covers the width so this pair does not repeat one measurement twice.
test("T-020 stretches a vertical divider to the row height", async () => {
  const app = await openScenario("separator/vertical");

  expect(lastLayout(app, "vertical").height).toBe(20);
});
