import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 regression cases for Avatar, ported from
 * kobalte/packages/core/src/image/image.test.tsx (port sheet 4b, T-025 and
 * T-026). The Kobalte suite is Radix Avatar's Solid port, which is what
 * Avatar's loading model is copied from.
 *
 * T-021 and T-022 assert the pre-load state and live in
 * avatar.headless.test.tsx, because the inline `data:` image has already
 * loaded by the time `open()` resolves on the web target. T-023 and T-024
 * need a real Chrome to load the image and live in avatar.web.test.tsx.
 *
 * The scenario mounts no Image (upstream image.test.tsx:89-112 does the same),
 * so the fallback delay is the only gate and these cases hold on every target.
 */

// kobalte/packages/core/src/image/image.test.tsx:89
test("T-025 should not render a fallback immediately", async () => {
  const app = await openScenario("avatar/image-delay", { clock: {} });

  expect(app.shows("text:AB")).toBe(false);
});

// kobalte/packages/core/src/image/image.test.tsx:100
test("T-026 should render a fallback after the delay", async () => {
  const app = await openScenario("avatar/image-delay", { clock: {} });

  expect(app.shows("text:AB")).toBe(false);

  await app.clock!.runFor(600);

  expect(app.shows("text:AB")).toBe(true);
});
