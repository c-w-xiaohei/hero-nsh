import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Headless-only Avatar cases (port sheet 4b, T-021 and T-022).
 *
 * Reason for the `.headless.test.tsx` suffix: both cases assert the pre-load
 * state. Upstream (kobalte/packages/core/src/image/image.test.tsx:39-61) can
 * query it synchronously because it replaces `window.Image` with a mock whose
 * `onload` fires after 300 ms (image.test.tsx:16,22-33). The port uses an
 * inline `data:` image, and `open()` resolves once the app has rendered and is
 * quiet, so on the web target Chrome has already loaded the image by the time
 * the body runs. Headless never loads images ("What headless runs play of the
 * platform"), so the fallback is stable there.
 *
 * The loaded state is covered by T-023/T-024 in avatar.web.test.tsx.
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
