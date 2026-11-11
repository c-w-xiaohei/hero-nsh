/*
 * AlertDialog geometry (port sheet 4c, G-001).
 *
 * G-001 comes from the Default story (narrow content and a multi-line body) and
 * the Sizes story's long body: the container carries the card and is larger than
 * it, the Header sits before the Body inside the card, and the Footer starts at
 * or after the Body's bottom edge, so a long body is taken by the body's own
 * scroll area instead of pushing the actions away.
 *
 * The parts' bounds are recorded through `onLayout` in
 * harness/alert-dialog.fixtures.tsx: `onLayout` is an NSH View prop, so the
 * shared HeroUI-only scenario cannot carry it. The fixture renders the same
 * part tree as `alert-dialog/basic`.
 *
 * `onLayout` reports the frame *in its parent*, so each case compares parts
 * that share a parent: the card against the container's box, and Header / Body /
 * Footer against each other inside the card. No pixel values are asserted.
 *
 * The Chrome baseline in the sheet (1280x900; backdrop 1280x813, container
 * 1280x813, dialog 400x282, header y=289 h=76, body y=373 h=106, footer y=500
 * h=24) only frames the relations; the fixtures' own boxes under the 1024x768
 * web window are container 1024x321, dialog 448x241 at (288, 40), header 400x72
 * at (24, 24), body 406x57 at (21, 104), footer 400x36 at (24, 181).
 *
 * Run on the web target (the sheet's web geometry route).
 */

import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

type LayoutCall = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function openFixture() {
  return open("../../../alert-dialog.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { fixture: "geometry" } },
  });
}

function lastLayout(app: App, name: LayoutCall["name"]): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

test("G-001 keeps the card inside the container and the footer below the body", async () => {
  const app = await openFixture();

  await app.waitFor("text:This action cannot be undone.");

  const container = lastLayout(app, "container");
  const dialog = lastLayout(app, "dialog");
  const header = lastLayout(app, "header");
  const body = lastLayout(app, "body");
  const footer = lastLayout(app, "footer");

  // The container is the carrier with its own padding, so it is larger than
  // the card and the card's frame lies inside it.
  expect(container.height).toBeGreaterThan(dialog.height);
  expect(container.width).toBeGreaterThan(dialog.width);
  expect(dialog.y).toBeGreaterThanOrEqual(0);
  expect(dialog.y + dialog.height).toBeLessThanOrEqual(container.height);
  expect(dialog.x).toBeGreaterThanOrEqual(0);
  expect(dialog.x + dialog.width).toBeLessThanOrEqual(container.width);

  // Header → Body → Footer, in reading order inside the card.
  expect(body.y).toBeGreaterThanOrEqual(header.y + header.height);
  expect(footer.y).toBeGreaterThanOrEqual(body.y + body.height);

  // Every part shares the card's column and stays inside its width.
  expect(header.x).toBeGreaterThanOrEqual(0);
  expect(body.x).toBeGreaterThanOrEqual(0);
  expect(footer.x).toBeGreaterThanOrEqual(0);
  expect(header.x + header.width).toBeLessThanOrEqual(dialog.width);
  expect(body.x + body.width).toBeLessThanOrEqual(dialog.width);
  expect(footer.x + footer.width).toBeLessThanOrEqual(dialog.width);
});
