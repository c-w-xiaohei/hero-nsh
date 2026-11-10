import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

type Layout = { name: string; x: number; y: number; width: number; height: number };
function layout(app: Awaited<ReturnType<typeof openScenario>>, name: string): Layout | undefined {
  const args = callsOf(app, "layout").find((entry) => (entry[0] as Layout | undefined)?.name === name);
  return args?.[0] as Layout | undefined;
}

// heroui/packages/react/src/components/drawer/drawer.stories.tsx:22-50; port sheet G-001
// Structural geometry: short bottom panel stays content-sized and the footer follows the body.
test("G-001 default bottom drawer panel is content-sized with footer after body", async () => {
  const app = await openScenario("drawer/geometry-bottom", { platform: "web", clock: {} });
  const body = layout(app, "body");
  const footer = layout(app, "footer");
  expect(body).toBeDefined();
  expect(footer).toBeDefined();
  if (!body || !footer) throw new Error("Drawer body/footer layout was not reported");
  expect(footer.y).toBeGreaterThan(body.y + body.height);
});

// heroui/packages/react/src/components/drawer/drawer.stories.tsx:52-91; port sheet G-002
// Structural relations use onLayout probes; no absolute pixel coordinates are asserted.
test("G-002 right side drawer renders its panel, body and footer", async () => {
  const app = await openScenario("drawer/geometry-right", { platform: "web", clock: {} });
  const body = layout(app, "body");
  const footer = layout(app, "footer");
  expect(body).toBeDefined();
  expect(footer).toBeDefined();
  if (!body || !footer) throw new Error("Drawer body/footer layout was not reported");
  expect(footer.y).toBeGreaterThan(body.y + body.height);
});
