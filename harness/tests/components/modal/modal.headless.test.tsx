import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Headless-only cases for Modal (port sheet 4b).
 *
 * The web target's hit test stops at the layout carrier that covers the
 * backdrop paint layer: pressing `id:backdrop` there reports nothing even for a
 * default dismissable backdrop (measured while writing X-004), so the merge of
 * the caller's `onPress` with the dismiss handler is only observable where the
 * press reaches the paint layer. The part-level forwarding (X-003) runs on every
 * target in `modal.heroui.test.tsx`.
 */

// src/components/modal/modal-backdrop.tsx:163-171,298-301
// X-004 (regression 3, the Backdrop clause): the paint layer takes the caller's
// `onPress` as well as dismissing, as React Aria merges the two. `isDismissable`
// is false here so the recorded call can only come from the caller's handler
// having been replaced by the dismiss one.
test("X-004 keeps the caller's onPress on the backdrop paint layer", async () => {
  const app = await openScenario("modal/forwarded-props", { clock: {} });

  await app.press("id:backdrop");

  expect(callsOf(app, "backdropPress").length).toBe(1);
  expect(app.shows("text:Forwarded props content")).toBe(true);
});
