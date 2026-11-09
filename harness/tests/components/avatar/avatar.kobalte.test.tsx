import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 regression cases for Avatar, ported from
 * kobalte/packages/core/src/image/image.test.tsx (port sheet 4b, T-021 …
 * T-026). The Kobalte suite is Radix Avatar's Solid port, which is what
 * Avatar's loading model is copied from.
 *
 * T-023 and T-024 need a real Chrome to load the inline `data:` image and live
 * in avatar.web.test.tsx. The cases here run headless, where images never load
 * ("What headless runs play of the platform"), so the fallback is what shows and
 * the image is not exposed to accessibility.
 */

// kobalte/packages/core/src/image/image.test.tsx:39
test("T-021 should render the fallback initially", async () => {
  const app = await openScenario("avatar/image");

  expect(app.shows("text:AB")).toBe(true);
});

// kobalte/packages/core/src/image/image.test.tsx:51
// Partial port (port sheet T-022): Kobalte / Radix render no `<img>` at all
// before load. NSH's core Image is mounted from the first frame but paints
// nothing and exposes no role or name until loaded, with the fallback over it.
// The equivalent, assertable property is "no image is reachable before load":
// no `role:image`, no image label, and the fallback text is what a screen
// reader user gets. The missing DOM node itself is dropped.
test("T-022 should not render the image initially", async () => {
  const app = await openScenario("avatar/image");

  expect(app.count("role:image")).toBe(0);
  expect(app.shows("label:Fake Image")).toBe(false);
  expect(app.shows("text:AB")).toBe(true);
});

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
