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
