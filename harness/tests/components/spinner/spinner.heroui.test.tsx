import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Spinner, per port sheet 4b
 * (T-001 … T-004). Every case keeps its upstream file:line; the assertions
 * follow SOP 3.2. What this host cannot read is stated on the partial ports:
 * BEM class names and `data-slot` (D18), the `danger` text color (no text node
 * and no view color query).
 */

// heroui/packages/react/tests/components/spinner/spinner.test.tsx:6
// Rewritten port (port sheet T-001): NSH's AccessibilityRole has no `status`
// (nsh_a11y.md:63), so the root is `role="progressbar"` with the same default
// accessible name "Loading". The selector checks the role and the name, and
// either one being wrong fails it. The Android live region that approximates
// `status` is not readable from here.
test("T-001 renders with the status role and default accessible name", async () => {
  const app = await openScenario("spinner/basic");
  expect(app.shows("role:progressbar[Loading]")).toBe(true);
});

// heroui/packages/react/tests/components/spinner/spinner.test.tsx:12
// Partial port (port sheet T-002): the upstream case asserts `data-slot="spinner"`,
// the BEM `spinner` block class and the icon's `data-slot="spinner-icon"`.
// D18 drops the two data-slot and BEM assertions; the icon sub-part stays as a
// visible assertion through its own testID, scoped to the spinner root as
// upstream's `spinner.querySelector('[data-slot="spinner-icon"]')` is: an icon
// rendered outside the root fails it.
test("T-002 exposes the icon sub-part", async () => {
  const app = await openScenario("spinner/basic");
  expect(app.shows("role:progressbar[Loading] >> id:spinner-icon")).toBe(true);
});

// heroui/packages/react/tests/components/spinner/spinner.test.tsx:21
// Rewritten port (port sheet T-003): the upstream case looks the spinner up by
// the `status` role and the overridden name; the role is rewritten as in T-001
// and the name override is unchanged. A name that is not overridden fails it.
test("T-003 supports overriding aria-label", async () => {
  const app = await openScenario("spinner/label");
  expect(app.shows("role:progressbar[Saving changes]")).toBe(true);
});

// heroui/packages/react/tests/components/spinner/spinner.test.tsx:27
// Partial port (port sheet T-004): both upstream assertions read BEM modifier
// class names. The `lg` half becomes its visible effect, the root's 32×32 box,
// next to the default `md` box (24×24) as the control; a size that does not
// reach the root or does not apply fails it. The `danger` half is dropped: the
// color lands on the root's text color, and there is no text span (spanStyle)
// and no view color query, so nothing can read it.
type LayoutCall = { name: "lg" | "md"; width: number; height: number };

function lastLayout(app: App, name: "lg" | "md"): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

test("T-004 exposes the large size as a 32pt box", async () => {
  const app = await open("../../../spinner.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: "layout" } },
  });

  const lg = lastLayout(app, "lg");
  const md = lastLayout(app, "md");

  expect(lg.width).toBe(32);
  expect(lg.height).toBe(32);
  expect(md.width).toBe(24);
  expect(md.height).toBe(24);
});

// src/components/spinner/spinner.tsx:63,70
// Upstream keeps both gradient stops at currentColor and fades only
// stop-opacity, 1 -> 0.55 and 0 -> 0.55
// (heroui/packages/react/src/components/spinner/spinner.tsx:32-33,42-43). The
// port put the named `transparent` in the canvas gradient; canvas interpolates
// it as black at alpha 0, so the arc darkened toward black instead of keeping
// the paint's hue. Each arc records four stops here: the paint at full alpha
// and the same paint (same RGB) at alpha 0.
type GradientStop = { offset: number; color: string };

test("X-001 fades each arc toward its own color, not toward black", async () => {
  const app = await open("../../../spinner.fixtures.tsx", {
    platform: "windows",
    width: 240,
    height: 240,
    host: { params: { case: "gradient" } },
  });

  const stops = callsOf(app, "gradient-stop").map((args) => args[0] as GradientStop);

  expect(stops).toHaveLength(8);

  const gradients = [stops.slice(0, 4), stops.slice(4, 8)];
  const hues = gradients.map((gradient) => gradient[0].color.slice(0, 7));

  // The two spinners carry different colors, so a constant paint fails this.
  expect(new Set(hues).size).toBe(2);

  for (const [index, gradient] of gradients.entries()) {
    const hue = hues[index];

    expect(gradient.map((stop) => stop.color)).toEqual([
      `${hue}ff`,
      `${hue}00`,
      `${hue}00`,
      `${hue}ff`,
    ]);
    expect(gradient.map((stop) => stop.offset)).toEqual([0.05271, 0.91793, 0.1524, 0.8715]);
  }
});

// Ref forwarding regression: this scenario passes no ref to Spinner. A plain
// `ref={local.ref}` with an undefined value is a ref store to NSH, which throws
// at mount on the web target and renders an empty page. The callback ref keeps
// the progressbar on screen on every target.
test("X-002 renders a ref-less Spinner on a real engine", async () => {
  const app = await openScenario("spinner/basic");

  expect(app.shows("role:progressbar")).toBe(true);
});
