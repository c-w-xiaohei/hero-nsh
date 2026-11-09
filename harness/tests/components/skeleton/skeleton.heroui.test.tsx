import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

// heroui/packages/react/tests/components/skeleton/skeleton.test.tsx:6
// Partial port (port sheet T-001): the upstream case asserts the `skeleton` and
// `skeleton--shimmer` BEM class names, which D18 drops. The visible behavior
// kept here is that the default skeleton mounts and that its default shimmer
// branch mounts the real child view that replaced `::after`.
test("T-001 shows the skeleton and its default shimmer overlay", async () => {
  const app = await openScenario("skeleton/default");

  expect(app.shows("id:skeleton")).toBe(true);
  expect(app.shows("id:skeleton-shimmer")).toBe(true);
});

// heroui/packages/react/tests/components/skeleton/skeleton.test.tsx:14
// Partial port (port sheet T-002): the upstream case asserts the
// `skeleton--pulse` BEM class, which D18 drops. Rendering a pulse skeleton and
// observing that it has no shimmer overlay keeps the animationType branch
// observable: a broken mapping that stayed on shimmer would count one.
test("T-002 renders pulse without a shimmer overlay", async () => {
  const app = await openScenario("skeleton/pulse");

  expect(app.shows("id:skeleton")).toBe(true);
  expect(app.count("id:skeleton-shimmer")).toBe(0);
});

// src/components/skeleton/skeleton.tsx:58-67,123-124
// X-001: port sheet §1 maps `aria-label` to accessibilityLabel and the
// `aria-*` state aliases to accessibilityState, and accepts the remaining div
// props (`title`, `tabIndex`, `onClick` ...) as no-ops. Each state skeleton
// hides itself through the class of the state it should report, so a dropped
// alias leaves the skeleton showing.
test("X-001 maps aria aliases and accepts div props on the root", async () => {
  const app = await openScenario("skeleton/accessibility-aliases");

  expect(app.shows("label:Loading profile")).toBe(true);
  expect(app.shows("id:skeleton-checked")).toBe(false);
  expect(app.shows("id:skeleton-expanded")).toBe(false);
  expect(app.shows("id:skeleton-pressed")).toBe(false);
  expect(app.shows("id:skeleton-selected")).toBe(false);
});
