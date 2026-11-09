import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ProgressCircle, per port sheet 4b
 * (T-001, T-005). T-002 and T-004 are deleted (D18 drops the BEM class and
 * `data-*` APIs, neither has a user-visible effect); T-003 is a screenshot
 * check of the warning stroke, so it has no test here.
 */

// heroui/packages/react/tests/components/progress-circle/progress-circle.test.tsx:6
// Straight port (port sheet T-001): the scenario is the upstream JSX. The
// selector checks the progressbar role and the accessible name together, and
// either one being wrong fails it.
test("T-001 renders with progressbar role and accessible name", async () => {
  const app = await openScenario("progress-circle/default");
  expect(app.shows("role:progressbar[Loading]")).toBe(true);
});

// heroui/packages/react/tests/components/progress-circle/progress-circle.test.tsx:63
// Partial port (port sheet T-005): the upstream case asserts three `data-slot`
// values (progress-circle-track / -track-circle / -fill-circle); D18 drops
// them. Each part must still be really mounted, so the three assertions read
// the part's own testID scoped to the progressbar root, as upstream's
// per-part lookup does. A part that is missing, or rendered outside the root,
// fails it.
test("T-005 mounts the track, track circle and fill circle", async () => {
  const app = await openScenario("progress-circle/default");
  expect(app.shows("role:progressbar[Loading] >> id:pcircle-track")).toBe(true);
  expect(app.shows("role:progressbar[Loading] >> id:pcircle-track-circle")).toBe(true);
  expect(app.shows("role:progressbar[Loading] >> id:pcircle-fill-circle")).toBe(true);
});
