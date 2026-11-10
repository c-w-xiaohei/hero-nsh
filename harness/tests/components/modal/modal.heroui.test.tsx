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
