import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 and Kobalte 0.13.14 regression cases for Disclosure, per port
 * sheet 4b (T-001 … T-007, T-029 … T-032). Every case keeps its upstream
 * file:line above it and its title starts with the port-sheet id.
 *
 * The assertions follow SOP 3.2. `nsh test` has no DOM attribute channel, so
 * every `aria-expanded` / `data-expanded` / `data-slot` assertion is dropped as
 * a partial port (the sheet names which), and "expanded" is read as the one
 * visible effect it has: the panel body is clipped away at `h-0` when closed
 * and shows when open.
 *
 * Measured: `texts()` lists on-screen text only, so a closed panel's body is
 * invisible to both `shows` and `texts`; T-001 therefore reads the body with
 * the panel open. Whether a closed panel keeps the body mounted (port sheet §5
 * and the registered difference) has no NSH channel at all, since an unmounted
 * body and a clipped one are equally invisible.
 *
 * The keyboard case lives in `disclosure.heroui.web.test.tsx` (Tab).
 */

const BODY = "Hidden content revealed on expand.";
const TRIGGER = "role:button[Toggle content]";

function openCase(params: Record<string, string | number | boolean> = {}): Promise<App> {
  return open("../../../disclosure.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: "default", ...params } },
  });
}

/* -------------------------------------------------------------------------------------------------
 * HeroUI unit cases
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/disclosure/disclosure.test.tsx:29
// Partial port (port sheet T-001): the root `data-slot`, the root's BEM block
// name and the four `querySelector('[data-slot=…]')` checks have no NSH channel
// (D18). Kept: the root (named by testID), the heading, the trigger, the body
// text and the default indicator. The fixture opens the panel
// (`defaultExpanded`), because a clipped body is outside `shows` and `texts`
// (measured), and this case is about the parts existing, not about the
// collapsed state.
test("T-001 exposes the root and the five rendered parts", async () => {
  const app = await openCase({ case: "default-expanded" });

  expect(app.shows("id:disclosure")).toBe(true);
  expect(app.shows("role:header[Toggle content]")).toBe(true);
  expect(app.shows(TRIGGER)).toBe(true);
  expect(app.shows(`text:${BODY}`)).toBe(true);
  expect(app.shows("id:icon-chevron-down")).toBe(true);
});

// heroui/packages/react/tests/components/disclosure/disclosure.test.tsx:42
// Partial port (port sheet T-002): the three `aria-expanded` assertions are
// dropped (no attribute channel). The three visibility assertions remain: the
// panel is clipped, then shown, then clipped again.
test("T-002 supports expanding via the trigger", async () => {
  const app = await openScenario("disclosure/default");

  expect(app.shows(`text:${BODY}`)).toBe(false);

  await app.press(TRIGGER);
  expect(app.shows(`text:${BODY}`)).toBe(true);

  await app.press(TRIGGER);
  expect(app.shows(`text:${BODY}`)).toBe(false);
});

// heroui/packages/react/tests/components/disclosure/disclosure.test.tsx:77
// Partial port (port sheet T-004): the `aria-expanded` assertion is dropped;
// the body being in the document from the start is kept as "it shows".
test("T-004 supports defaultExpanded", async () => {
  const app = await openScenario("disclosure/expanded");

  expect(app.shows(`text:${BODY}`)).toBe(true);
});

// heroui/packages/react/tests/components/disclosure/disclosure.test.tsx:87
// Rewritten port (port sheet T-005): `onExpandedChange` gets `true` (the probe
// writes it to Storage) and the controlled `isExpanded={false}` does not follow
// the press, so the body stays clipped.
test("T-005 supports controlled isExpanded and onExpandedChange", async () => {
  const app = await openCase({ case: "controlled" });

  await app.press(TRIGGER);

  expect(callsOf(app, "onExpandedChange")).toEqual([[true]]);
  expect(app.shows(`text:${BODY}`)).toBe(false);
});

// heroui/packages/react/tests/components/disclosure/disclosure.test.tsx:98
// Rewritten port (port sheet T-006): `toBeDisabled()` becomes
// `app.enabled(...) === false`, and the press itself is refused
// (ERR_NSH_TEST_DISABLED). The old `aria-expanded="false"` assertion becomes the
// body staying clipped.
test("T-006 supports disabled state without toggling", async () => {
  const app = await openCase({ case: "disabled" });

  expect(app.enabled(TRIGGER)).toBe(false);
  await expect(app.press(TRIGGER)).rejects.toMatchObject({ code: "ERR_NSH_TEST_DISABLED" });
  expect(app.shows(`text:${BODY}`)).toBe(false);
});

// heroui/packages/react/tests/components/disclosure/disclosure.test.tsx:110
// Partial port (port sheet T-007): the two `data-expanded` assertions and the
// rotation itself have no readable channel (rotation is a transform, and
// `nsh test` reads text styles only). Kept: the indicator exists and survives a
// toggle.
test("T-007 keeps the indicator mounted across a toggle", async () => {
  const app = await openScenario("disclosure/default");

  expect(app.shows("id:icon-chevron-down")).toBe(true);

  await app.press(TRIGGER);

  expect(app.shows("id:icon-chevron-down")).toBe(true);
});

/* -------------------------------------------------------------------------------------------------
 * Kobalte cases (collapsible)
 * -----------------------------------------------------------------------------------------------*/

// kobalte/packages/core/src/collapsible/collapsible.test.tsx:29
// `toBeVisible()` and the source's commented-out `not.toBeVisible()` both land
// here: press shows the body, the second press clips it again.
test("T-029 toggles the content between open and closed when pressing the trigger", async () => {
  const app = await openScenario("disclosure/default");

  await app.press(TRIGGER);
  expect(app.shows(`text:${BODY}`)).toBe(true);

  await app.press(TRIGGER);
  expect(app.shows(`text:${BODY}`)).toBe(false);
});

// kobalte/packages/core/src/collapsible/collapsible.test.tsx:46
// The upstream assertion is "the content is not in the tree". A clipped panel
// is the NSH equivalent of "not open", and the press is refused on top; the
// body never shows.
test("T-030 does not open the content when the trigger is disabled", async () => {
  const app = await openScenario("disclosure/disabled");

  await expect(app.press(TRIGGER)).rejects.toMatchObject({ code: "ERR_NSH_TEST_DISABLED" });
  expect(app.shows(`text:${BODY}`)).toBe(false);
});

// kobalte/packages/core/src/collapsible/collapsible.test.tsx:58
// The callback assertion stays one for one; the source's commented-out
// "not visible" is asserted with `shows`, which is what an uncontrolled close
// means here.
test("T-031 closes uncontrolled open content and reports it", async () => {
  const app = await openCase({ case: "default-expanded" });

  await app.press(TRIGGER);

  expect(callsOf(app, "onExpandedChange")).toEqual([[false]]);
  expect(app.shows(`text:${BODY}`)).toBe(false);
});

// kobalte/packages/core/src/collapsible/collapsible.test.tsx:75
// Controlled open: the body stays visible because the value never changes, and
// the callback still reports the requested close.
test("T-032 does not close controlled open content", async () => {
  const app = await openCase({ case: "controlled-open" });

  await app.press(TRIGGER);

  expect(app.shows(`text:${BODY}`)).toBe(true);
  expect(callsOf(app, "onExpandedChange")).toEqual([[false]]);
});
