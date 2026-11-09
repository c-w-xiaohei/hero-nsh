import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ProgressBar, per port sheet 4b
 * (T-001, T-004 ... T-006). Every case keeps its upstream file:line above it
 * and its title starts with the port-sheet id. The assertions follow SOP 3.2:
 * what NSH cannot read (role and aria properties as DOM attributes, data-slot,
 * BEM classes, view computed styles) is replaced by the visible effect — the
 * accessibility name, the Output's text, a testID on the real part, the Fill's
 * measured width. The partial ports say which assertions stay unread.
 *
 * T-002 (BEM block / data-slot) is deleted by D18 and T-003 (color modifier)
 * becomes a `--target web` screenshot of progress-bar/colors; this acceptance
 * does not run screenshots (port sheet §5).
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

function openGeometry(params: Record<string, string | number | boolean> = {}): Promise<App> {
  return open("../../../progress-bar.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: "geometry", ...params } },
  });
}

// heroui/packages/react/tests/components/progress-bar/progress-bar.test.tsx:7
test("T-001 renders with progressbar role and accessible name", async () => {
  const app = await openScenario("progress-bar/default", { locale: "en-US" });

  // Both halves matter: the role query carries the name, and `label:` proves
  // the Label registered its text instead of the name falling back to the
  // rendered texts inside the bar.
  expect(app.shows("role:progressbar[Loading]") && app.shows("label:Loading")).toBe(true);
});

// heroui/packages/react/tests/components/progress-bar/progress-bar.test.tsx:49
// Partial port (port sheet T-004): `data-testid` and arbitrary `data-*` have no
// NSH channel (D18), so `data-foo` is dropped. The capability that remains is
// testID passthrough: it must land on the root, and the root must still carry
// the progressbar role and its name.
test("T-004 supports data attribute passthrough", async () => {
  const app = await openScenario("progress-bar/test-id");

  expect(app.shows("id:progress-bar")).toBe(true);
  expect(app.shows("role:progressbar[Loading]")).toBe(true);
});

// heroui/packages/react/tests/components/progress-bar/progress-bar.test.tsx:61
// Rewritten port (port sheet T-005): upstream asserts aria-valuenow is absent.
// `nsh/test` cannot read aria attributes, so the same state is read from its two
// visible facts: the Output renders no text (valueText is undefined, leaving
// only the Label), and the indeterminate Fill is 40% of a 200-point Track.
test("T-005 supports the indeterminate state", async () => {
  const app = await openGeometry({ indeterminate: true });

  expect(app.texts().filter((text) => text.trim() !== "")).toEqual(["Progress Bar"]);
  expect(app.shows("role:progressbar[Progress Bar]")).toBe(true);
  expect(Math.abs(lastLayout(app, "fill").width - 80)).toBeLessThan(0.6);
});

// heroui/packages/react/tests/components/progress-bar/progress-bar.test.tsx:74
// Partial port (port sheet T-006): the three `data-slot` assertions have no NSH
// attribute channel (D18). The three parts still exist as real components, so
// each testID must find its own view; the last selector also proves Fill is
// composed inside Track rather than rendered as a sibling.
test("T-006 exposes data-slot on each sub-part", async () => {
  const app = await openScenario("progress-bar/composition");

  expect(app.shows("id:output")).toBe(true);
  expect(app.shows("id:track")).toBe(true);
  expect(app.shows("id:track >> id:fill")).toBe(true);
});
