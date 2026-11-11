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

function gapBetween(upper: Layout, lower: Layout): number {
  return lower.y - (upper.y + upper.height);
}

// heroui/packages/styles/components/drawer.css:337-347 the only conditional gaps are header + body
// (mt-2) and header/body + footer (mt-5); 308-311 gives a bare footer mt-0. Port sheet drawer.md:224.
// The layout probes carry the rendered gaps, so a hard-coded mt-5 on every footer or a missing
// header-to-body gap both show up here.
test("X-001 applies sibling-order spacing between Header, Body and Footer", async () => {
  const sections = await openScenario("drawer/spacing-sections", { platform: "web", clock: {} });
  const header = layout(sections, "header");
  const body = layout(sections, "body");
  const footer = layout(sections, "footer");
  expect(header).toBeDefined();
  expect(body).toBeDefined();
  expect(footer).toBeDefined();
  if (!header || !body || !footer) throw new Error("Header/body/footer layout was not reported");
  const headerBodyGap = gapBetween(header, body);
  const bodyFooterGap = gapBetween(body, footer);
  expect(headerBodyGap).toBeGreaterThan(0);
  expect(bodyFooterGap).toBeGreaterThan(headerBodyGap);

  const headerFooterApp = await openScenario("drawer/spacing-header-footer", { platform: "web", clock: {} });
  const headerOnlyFooter = layout(headerFooterApp, "header");
  const footerAfterHeader = layout(headerFooterApp, "footer");
  expect(headerOnlyFooter).toBeDefined();
  expect(footerAfterHeader).toBeDefined();
  if (!headerOnlyFooter || !footerAfterHeader) throw new Error("Header/footer layout was not reported");
  expect(Math.abs(gapBetween(headerOnlyFooter, footerAfterHeader) - bodyFooterGap)).toBeLessThanOrEqual(1);

  const headerOnlyApp = await openScenario("drawer/spacing-header-only", { platform: "web", clock: {} });
  const headerOnlyDialog = layout(headerOnlyApp, "dialog");
  const headerOnlyHeader = layout(headerOnlyApp, "header");
  const footerOnlyApp = await openScenario("drawer/spacing-footer-only", { platform: "web", clock: {} });
  const footerOnlyDialog = layout(footerOnlyApp, "dialog");
  const footerOnlyFooter = layout(footerOnlyApp, "footer");
  expect(headerOnlyDialog).toBeDefined();
  expect(headerOnlyHeader).toBeDefined();
  expect(footerOnlyDialog).toBeDefined();
  expect(footerOnlyFooter).toBeDefined();
  if (!headerOnlyDialog || !headerOnlyHeader || !footerOnlyDialog || !footerOnlyFooter) {
    throw new Error("Dialog/part layout was not reported");
  }
  // Part layouts are in their parent's coordinates, so both `y`s already measure the
  // offset from the dialog's content box; the dialog's own `y` is in window coordinates.
  expect(Math.abs(footerOnlyFooter.y - headerOnlyHeader.y)).toBeLessThanOrEqual(1);
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
