import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only Avatar cases (port sheet 4b, T-023 and T-024).
 *
 * Reason for the `.web.test.tsx` suffix: both cases need a real browser to
 * decode the inline `data:` image. A headless run never loads images ("What
 * headless runs play of the platform"), so the image would never reach the
 * `loaded` state there; Chrome on the web target does load it.
 *
 * Source: kobalte/packages/core/src/image/image.test.tsx, Radix Avatar's Solid
 * port.
 */

// kobalte/packages/core/src/image/image.test.tsx:63
test("T-023 should render the image after it has loaded", async () => {
  const app = await openScenario("avatar/image", { platform: "web" });

  await app.waitUntil(() => app.count("role:image") === 1);

  expect(app.count("role:image")).toBe(1);
  expect(app.shows("text:AB")).toBe(false);
});

// kobalte/packages/core/src/image/image.test.tsx:75
// The `alt` becomes the accessibility label, and only once the image has
// loaded, matching upstream's "the image exists only after load".
test("T-024 should have alt text on the image", async () => {
  const app = await openScenario("avatar/image", { platform: "web" });

  await app.waitUntil(() => app.shows("label:Fake Image"));

  expect(app.shows("label:Fake Image")).toBe(true);
});
