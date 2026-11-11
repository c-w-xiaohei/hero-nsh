import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Section 4c geometry cases (methodology v2). Each case renders the story shape
 * from a scenario and compares the parts' frames through the `onLayout` probes;
 * no absolute pixel is asserted beyond the viewport the test opens, and the
 * relations are the ones the port sheet states:
 *
 *   G-001  content-sized bottom panel, Footer on the viewport edge
 *   G-002  220-point snap: the Content clips a taller Dialog, Footer outside it
 *   G-003  left detached panel: 8-point inset, 384-point width, content height
 *
 * The values come from the reference measurements in tmp/port-sheets/sheet.md
 * (Chrome 1280 × 900 / viewport 813); this file runs at 1024 × 768, so only the
 * structural relations carry over.
 */

const WIDTH = 1024;
const HEIGHT = 768;

type Layout = { name: string; x: number; y: number; width: number; height: number };

function layout(app: App, name: string): Layout {
  const entries = callsOf(app, "layout").filter((args) => (args[0] as Layout | undefined)?.name === name);
  const last = entries.at(-1)?.[0] as Layout | undefined;

  if (!last) throw new Error(`no layout was reported for ${name}`);

  return last;
}

function openScenarioOnWeb(name: string) {
  return openScenario(name, { clock: {}, platform: "web" });
}

// tmp/port-sheets/sheet.md G-001 (sheet.stories.tsx:29-62, Basic)
test("G-001 default bottom panel is content-sized with the footer on the viewport edge", async () => {
  const app = await openScenarioOnWeb("sheet/open");

  await app.clock!.runFor(20);

  const content = layout(app, "content");
  const dialog = layout(app, "dialog");
  const handle = layout(app, "handle");
  const header = layout(app, "header");
  const body = layout(app, "body");
  const footer = layout(app, "footer");

  // `onLayout` bounds are inside the parent (nsh types), so the Dialog frame is
  // Content-relative and every part frame is Dialog-relative: the window edge
  // checks add the ancestor origins first.
  const dialogTop = content.y + dialog.y;
  const footerTop = dialogTop + footer.y;

  expect(dialog.height).toBeLessThan(HEIGHT);
  expect(Math.abs(dialogTop + dialog.height - HEIGHT)).toBeLessThan(2);
  expect(Math.abs(footerTop + footer.height - HEIGHT)).toBeLessThan(2);
  // Footer follows Body inside the same Dialog frame, so both `y` values share
  // a parent; the reference measurement leaves them contiguous.
  expect(footer.y).toBeGreaterThanOrEqual(body.y + body.height);
  expect(handle.y + handle.height).toBeLessThan(header.y + 1);
  expect(content.height).toBeLessThan(HEIGHT);
});

// tmp/port-sheets/sheet.md G-002 (sheet.stories.tsx:106-139, SnapPoints)
test("G-002 a 220-point snap clips a taller dialog and keeps the footer outside", async () => {
  const app = await openScenarioOnWeb("sheet/pixel-snap");

  await app.clock!.runFor(20);

  const content = layout(app, "content");
  const dialog = layout(app, "dialog");
  const header = layout(app, "header");
  const footer = layout(app, "footer");

  // Dialog-relative part frames: add the Dialog's Content-relative origin, then
  // Content's own origin, before comparing with Content or the viewport.
  const dialogTop = content.y + dialog.y;

  expect(Math.round(content.height)).toBe(220);
  expect(dialog.height).toBeGreaterThan(content.height);
  expect(dialogTop + header.y).toBeGreaterThanOrEqual(content.y);
  expect(dialogTop + footer.y).toBeGreaterThan(content.y + content.height);
});

// tmp/port-sheets/sheet.md G-003 (sheet.stories.tsx:346-376, Detached)
test("G-003 left detached panel insets 8 points with a content-sized dialog", async () => {
  const app = await openScenarioOnWeb("sheet/detached-left");

  await app.clock!.runFor(20);

  const content = layout(app, "content");
  const dialog = layout(app, "dialog");
  const body = layout(app, "body");
  const footer = layout(app, "footer");

  expect(Math.abs(content.x - 8)).toBeLessThan(2);
  expect(Math.abs(content.y - 8)).toBeLessThan(2);
  expect(Math.abs(content.width - 384)).toBeLessThan(2);
  expect(Math.abs(content.height - (HEIGHT - 16))).toBeLessThan(2);
  expect(dialog.height).toBeLessThan(content.height);
  // Body and Footer are siblings inside the Dialog (same parent frame); the
  // reference measurement puts the Footer's top exactly on the Body's bottom.
  expect(footer.y).toBeGreaterThanOrEqual(body.y + body.height);
  expect(content.x + content.width).toBeLessThan(WIDTH);
});
