import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the adapt unit disclosure-group, one test per row
 * of adapt-sheets/disclosure-group.md §4 (M-001…M-008). The fixture is
 * `harness/disclosure-group.fixtures.tsx`; `host.params.scope="touch"`
 * mounts the `EnvironmentScope input="touch"` the assertions inject, and
 * its absence is the default pointer environment — the desktop-parity
 * baseline the action-B contract pins: the press surface belongs to each
 * `Disclosure.Trigger`, never to the group container.
 *
 * `app.press`, `shows`, `enabled`, `texts` and the Storage probes are the
 * whole observation channel; no class names or computed styles are read.
 */

const TRIGGER_PREVIEW = "role:button[Preview]";
const TRIGGER_DOWNLOAD = "role:button[Download]";
const PREVIEW_CONTENT = "text:Preview content";
const DOWNLOAD_CONTENT = "text:Download content";

function openGroup(
  caseName: string,
  scope?: "touch",
): Promise<App> {
  return open("../../../disclosure-group.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...(scope ? { scope } : {}) } },
  });
}

type LayoutRecord = { width: number; height: number };

function lastLayout(app: App): LayoutRecord {
  const calls = callsOf(app, "layout");
  const last = calls.at(-1)?.[0] as LayoutRecord | undefined;

  if (!last) throw new Error("the layout probe reported nothing");

  return last;
}

describe("disclosure-group mobile", () => {
  // adapt-sheets/disclosure-group.md M-001 (A-004): default environment
  // (pointer baseline) — pressing a trigger toggles through the group:
  // `onExpandedChange` reports the new set and the panel body shows; in
  // single mode the second press replaces the first.
  test("M-001 default environment: trigger presses toggle the group unchanged", async () => {
    const app = await openGroup("group");

    await app.press(TRIGGER_PREVIEW);
    expect(callsOf(app, "onExpandedChange")).toEqual([["preview"]]);
    expect(app.shows(PREVIEW_CONTENT)).toBe(true);

    await app.press(TRIGGER_DOWNLOAD);
    expect(callsOf(app, "onExpandedChange")).toEqual([
      ["preview"],
      ["download"],
    ]);
    expect(app.shows(DOWNLOAD_CONTENT)).toBe(true);
    expect(app.shows(PREVIEW_CONTENT)).toBe(false);
  }, 120_000);

  // adapt-sheets/disclosure-group.md M-002 (A-001): the group's bare
  // surface — the `group-gap` spacer between the items — is not a press
  // surface. `nsh/test` can only press a view that hears presses, so the
  // strongest observable form of "无按压面" is that the press finds no
  // pressable view at all; the probes and panels then confirm nothing
  // moved.
  test("M-002 pressing the group's bare surface finds no pressable and toggles nothing", async () => {
    const app = await openGroup("group-gap");

    expect(app.shows("id:group-gap")).toBe(true);

    await expect(app.press("id:group-gap")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    expect(callsOf(app, "onExpandedChange")).toHaveLength(0);
    expect(app.shows(PREVIEW_CONTENT)).toBe(false);
    expect(app.shows(DOWNLOAD_CONTENT)).toBe(false);
  }, 120_000);

  // adapt-sheets/disclosure-group.md M-003 (A-001): the same bare-surface
  // press under an injected touch environment — "组自身不变按压面" holds
  // on mobile too.
  test("M-003 under touch the group's bare surface still has no pressable", async () => {
    const app = await openGroup("group-gap", "touch");

    expect(app.shows("id:group-gap")).toBe(true);

    await expect(app.press("id:group-gap")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    expect(callsOf(app, "onExpandedChange")).toHaveLength(0);
    expect(app.shows(PREVIEW_CONTENT)).toBe(false);
    expect(app.shows(DOWNLOAD_CONTENT)).toBe(false);
  }, 120_000);

  // adapt-sheets/disclosure-group.md M-004 (A-004): under
  // `EnvironmentScope input="touch"` a trigger press still runs the group
  // toggle — expand reports the key, pressing again collapses (the
  // single-mode clear contract does not drift).
  test("M-004 under touch a trigger press toggles and re-press collapses", async () => {
    const app = await openGroup("group", "touch");

    await app.press(TRIGGER_PREVIEW);
    expect(callsOf(app, "onExpandedChange")).toEqual([["preview"]]);
    expect(app.shows(PREVIEW_CONTENT)).toBe(true);

    await app.press(TRIGGER_PREVIEW);
    expect(callsOf(app, "onExpandedChange")).toEqual([["preview"], []]);
    expect(app.shows(PREVIEW_CONTENT)).toBe(false);
  }, 120_000);

  // adapt-sheets/disclosure-group.md M-005 (A-004): the group's `isDisabled`
  // still reaches every trigger under touch — the press is refused before
  // it can toggle, and nothing is reported.
  test("M-005 under touch a disabled group refuses the trigger press", async () => {
    const app = await openGroup("group-disabled", "touch");

    expect(app.enabled(TRIGGER_PREVIEW)).toBe(false);
    expect(app.enabled(TRIGGER_DOWNLOAD)).toBe(false);

    await expect(app.press(TRIGGER_PREVIEW)).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });

    expect(callsOf(app, "onExpandedChange")).toHaveLength(0);
    expect(app.shows(PREVIEW_CONTENT)).toBe(false);
    expect(app.shows(DOWNLOAD_CONTENT)).toBe(false);
  }, 120_000);

  // adapt-sheets/disclosure-group.md M-006 (A-003): the navigation hook is
  // pure computation — under touch `currentIndex` still falls back to the
  // first item and `Next` reports the next key as a single-element set.
  test("M-006 under touch navigation computes the same index and target key", async () => {
    const app = await openGroup("nav", "touch");

    expect(app.texts()[0]).toBe("0");

    await app.press("role:button[Next]");

    expect(callsOf(app, "onExpandedChange")).toEqual([["download"]]);
  }, 120_000);

  // adapt-sheets/disclosure-group.md M-007 (A-002): the group root's
  // `w-full` box measures the same under pointer and touch — the variant
  // table carries no input or density axis for the container.
  test("M-007 the group root's laid-out width is identical under touch", async () => {
    const pointer = await openGroup("group");
    await pointer.waitUntil(() => callsOf(pointer, "layout").length > 0);
    const pointerWidth = lastLayout(pointer).width;

    const touch = await openGroup("group", "touch");
    await touch.waitUntil(() => callsOf(touch, "layout").length > 0);
    const touchWidth = lastLayout(touch).width;

    expect(pointerWidth).toBeGreaterThan(0);
    expect(touchWidth).toBe(pointerWidth);
  }, 120_000);

  // adapt-sheets/disclosure-group.md M-008 (baseline): single mode handed
  // two `defaultExpandedKeys` still normalizes to the first — the desktop
  // contract does not drift.
  test("M-008 single mode normalizes two default keys to the first", async () => {
    const app = await openGroup("group-single-two-defaults");

    await app.wait(20);

    expect(app.shows(PREVIEW_CONTENT)).toBe(true);
    expect(app.shows(DOWNLOAD_CONTENT)).toBe(false);
    expect(callsOf(app, "onExpandedChange")).toEqual([["preview"]]);
  }, 120_000);
});
