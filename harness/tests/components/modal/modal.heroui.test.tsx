import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Modal, per port sheet 4b (T-001 … T-003).
 * Every case keeps its upstream file:line above it and its title starts with
 * the port-sheet id.
 *
 * The assertions follow SOP 3.2. `nsh test` has no DOM attribute, computed
 * style or focus channel, so the `data-slot` / BEM / role=heading lookups are
 * dropped as partial ports (the sheet names which per row); what stays is the
 * behavior chain: hidden at first, shown by the trigger, gone after closing.
 *
 * Closing runs on the native Dialog, whose fade-out takes a moment on a real
 * host, so presence is read after `waitFor` rather than immediately.
 *
 * The browser cases (T-004 … T-007) live in `modal.heroui.web.test.tsx`, and
 * the Kobalte texts (T-009, T-010) in `modal.kobalte.test.tsx`.
 */

const CONTENT = "text:Modal body content";
const TRIGGER = "role:button[Open modal]";

// heroui/packages/react/tests/components/modal/modal.test.tsx:27
// Partial port (port sheet T-001): six `data-slot` lookups and the
// `modal__dialog` class check are D18 deletions (there is no BEM/class
// channel), and `getByRole("dialog")` has no counterpart because NSH's
// accessibility roles do not include `dialog` (port sheet §5.6). Kept: the
// content is absent before opening, the trigger opens it, the heading and body
// text are there, and Escape closes it again (the upstream tester's `close()`).
test("T-001 exposes compound slots via Dialog tester", async () => {
  const app = await openScenario("modal/basic", { clock: {} });

  expect(app.count(CONTENT)).toBe(0);

  await app.press(TRIGGER);
  expect(app.shows(CONTENT)).toBe(true);
  expect(app.shows("text:Welcome")).toBe(true);

  await app.keyboard.press("escape");
  await app.waitFor(CONTENT, { state: "gone" });
});

// heroui/packages/react/tests/components/modal/modal.test.tsx:58
// Ported (port sheet T-002): `defaultOpen` opens the modal; Escape goes through
// the native Dialog and the root callback receives `false`; the content goes
// away. The payload is a boolean even though NSH's own cancel event carries
// `{open, reason}`; the part folds it.
test("T-002 supports Escape dismiss", async () => {
  const app = await openScenario("modal/default-open", { clock: {} });

  expect(app.shows(CONTENT)).toBe(true);

  await app.keyboard.press("escape");

  const closes = callsOf(app, "openChange").filter((args) => args[0] === false);

  expect(closes).toEqual([[false]]);

  await app.waitFor(CONTENT, { state: "gone" });
  expect(app.shows(CONTENT)).toBe(false);
});

// heroui/packages/react/tests/components/modal/modal.test.tsx:73
// Ported (port sheet T-003): pressing CloseTrigger closes through the root
// `close()` and adds the content-disappeared check the sheet asks for.
test("T-003 supports closing via CloseTrigger", async () => {
  const app = await openScenario("modal/default-open", { clock: {} });

  await app.press("role:button[Close]");

  const closes = callsOf(app, "openChange").filter((args) => args[0] === false);

  expect(closes).toEqual([[false]]);

  await app.waitFor(CONTENT, { state: "gone" });
});

// src/components/modal/modal-container.tsx:48-55 (R-029 in tmp/port-sheets/modal.md:229
// and tmp/port-sheets/modal.parts/Backdrop.md:24)
// X-001: `scroll="outside"` moves the scrolling to the Backdrop carrier: the
// Container registers its `scroll` on ModalBackdropContext, the Backdrop
// replaces the carrier `View` with `<Scroll>` and adds `items-start`. A carrier
// that stays a plain `View` neither makes the 30 rows (1200pt in a 768pt
// window) part of a scroll view's content nor keeps the first row on screen,
// and there is no scroll view for the step below to drag.
test("X-001 scrolls long outside content in the backdrop carrier", async () => {
  const app = await openScenario("modal/scroll-outside-long", { clock: {} });

  // Inside a scroll view the user can scroll, content past the fold still
  // matches; clipped by the window without one, it does not.
  expect(app.count("text:Row 30")).toBe(1);
  // items-start: the tall container starts at the top, so its first row is on
  // screen instead of being centred above it.
  expect(app.shows("text:Row 01")).toBe(true);

  await app.scroll("text:Row 01", 500);
  await app.waitFor("text:Row 01", { state: "gone" });

  expect(app.shows("text:Row 30")).toBe(true);
});

// src/components/modal/modal-backdrop.tsx:163-171
// X-002: a Backdrop that is given `isOpen` owns its overlay state (RAC
// useControlledState), so the value it provides to the parts must come from
// that state, not from the Root's. Here the Root is closed and only the
// Backdrop is open; if the provided context reads the Root, there is no dialog
// at all, and the CloseTrigger cannot close the Backdrop either.
test("X-002 lets a nested Backdrop's own isOpen control its dialog", async () => {
  const app = await openScenario("modal/backdrop-open", { clock: {} });

  expect(app.shows("text:Backdrop owned content")).toBe(true);

  await app.press("role:button[Close]");

  const closes = callsOf(app, "backdropOpen").filter((args) => args[0] === false);

  expect(closes).toEqual([[false]]);

  await app.waitFor("text:Backdrop owned content", { state: "gone" });
});

// src/components/modal/modal-dom-props.ts:13-35; modal-header.tsx:44-53;
// modal-icon.tsx:28-40; modal-body.tsx:70-89; modal-footer.tsx:53-62;
// modal-heading.tsx:62-72; modal-dialog.tsx:106-117; modal-container.tsx:113-121
// X-003: the parts' props extend ViewProps, so a caller's `accessibilityLabel`
// and `onPress` must reach the underlying view (upstream spreads every prop).
// Passing them through and dropping them type-checks silently; each label is
// only found when the part spread its props, and the two presses only report
// when they did (the Backdrop's own `onPress` used to be replaced by dismiss).
test("X-003 forwards View props on every modal part", async () => {
  const app = await openScenario("modal/forwarded-props", { clock: {} });

  for (const part of ["container", "dialog", "header", "heading", "body", "footer"]) {
    expect(app.count(`label:Forwarded ${part}`)).toBe(1);
  }

  await app.press("text:Forwarded heading");
  expect(callsOf(app, "headingPress").length).toBe(1);

  await app.press("id:backdrop");
  expect(callsOf(app, "backdropPress").length).toBe(1);
});
