import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Methodology v2 geometry cases from port sheet §4c. These use the web target
 * because layout probes are structural measurements, not selector queries.
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function lastLayout(app: App, name: string): LayoutCall {
  const found = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name)
    .at(-1);

  if (!found) throw new Error(`no layout call recorded for ${name}`);
  return found;
}

test("G-001 keeps wide content inside the constrained scroll viewport", async () => {
  const app = await openScenario("table/layout-wide", { platform: "web", width: 1024, height: 768 });
  await app.clock?.runFor(20);

  const root = lastLayout(app, "root");
  const scroll = lastLayout(app, "scroll");
  const content = lastLayout(app, "content");
  const footer = lastLayout(app, "footer");

  expect(root.width).toBeLessThanOrEqual(420);
  expect(scroll.width).toBeLessThanOrEqual(root.width);
  expect(content.width).toBeGreaterThan(scroll.width);
  expect(footer.y).toBeGreaterThanOrEqual(scroll.y + scroll.height);
});

test("G-002 grows rows to their tallest cell and keeps header/data columns aligned", async () => {
  const app = await openScenario("table/layout-content-rows", { platform: "web", width: 1024, height: 768 });
  await app.clock?.runFor(20);

  const shortRow = lastLayout(app, "short-row");
  const longRow = lastLayout(app, "long-row");
  const shortCell = lastLayout(app, "short-cell");
  const longCell = lastLayout(app, "long-cell");
  const headerMember = lastLayout(app, "header-member");
  const headerRole = lastLayout(app, "header-role");

  expect(longRow.height).toBeGreaterThan(shortRow.height);
  expect(longCell.height).toBe(longRow.height);
  expect(shortCell.height).toBe(shortRow.height);
  expect(headerMember.x).toBe(shortCell.x);
  expect(headerRole.x).toBeGreaterThan(headerMember.x);
});

test("G-003 places the footer after the body as rows increase its height", async () => {
  const empty = await openScenario("table/layout-footer-empty", { platform: "web", width: 1024, height: 768 });
  await empty.clock?.runFor(20);
  const emptyBody = lastLayout(empty, "body");
  const emptyFooter = lastLayout(empty, "footer");

  const populated = await openScenario("table/layout-footer-rows", { platform: "web", width: 1024, height: 768 });
  await populated.clock?.runFor(20);
  const populatedBody = lastLayout(populated, "body");
  const populatedFooter = lastLayout(populated, "footer");

  expect(populatedBody.height).toBeGreaterThan(emptyBody.height);
  expect(emptyFooter.y).toBeGreaterThanOrEqual(emptyBody.y + emptyBody.height);
  expect(populatedFooter.y).toBeGreaterThanOrEqual(populatedBody.y + populatedBody.height);
});
