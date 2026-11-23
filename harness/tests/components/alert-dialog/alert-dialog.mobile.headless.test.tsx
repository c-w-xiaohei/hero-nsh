import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertion for the alert-dialog adapt unit:
 * adapt-sheets/alert-dialog.md §4 M-011 (A-001). The host-derived half of
 * the presentation rule — no `EnvironmentScope`, the environment comes from
 * `platform`/`windowSize()` — can only run where `open` accepts
 * `platform: "ios"`, which is the headless target alone (`--target web`
 * rejects it, the same reason the dragAndHold tests live headless).
 *
 * An iOS host at 390×844 derives `input="touch"` and `width="compact"`
 * (short side under 640), so `presentation="auto"` must resolve `"sheet"`:
 * the card docks to the bottom edge at full width.
 */

type LayoutRecord = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const VIEWPORT_W = 390;
const VIEWPORT_H = 844;

function openIos(): Promise<App> {
  return open("../../../alert-dialog.fixtures.tsx", {
    platform: "ios",
    width: VIEWPORT_W,
    height: VIEWPORT_H,
    clock: {},
    host: { params: { fixture: "geometry" } },
  });
}

function lastLayout(app: App, name: string): LayoutRecord {
  const records = callsOf(app, "layout")
    .map((args) => args[0] as LayoutRecord)
    .filter((record) => record.name === name);
  const last = records.at(-1);

  if (!last) throw new Error(`no layout record for ${name}`);

  return last;
}

describe("alert-dialog mobile (headless)", () => {
  // adapt-sheets/alert-dialog.md M-011 (A-001): `open({platform:"ios"})` at
  // 390×844 with no scope — the host derives touch + compact and `auto`
  // presents the sheet form (bottom-docked, full width).
  test("M-011 ios host derives touch+compact: auto presents the sheet", async () => {
    const app = await openIos();

    await app.clock?.runFor(300);

    const dialog = lastLayout(app, "dialog");
    expect(Math.abs(dialog.y + dialog.height - VIEWPORT_H)).toBeLessThanOrEqual(4);
    expect(dialog.width).toBeGreaterThan(VIEWPORT_W * 0.9);
    expect(app.shows("id:ad-card")).toBe(true);
  });
});
