import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

/*
 * Headless-only mobile assertions for the autocomplete adapt unit: M-016
 * and M-017 of adapt-sheets/autocomplete.md §4.
 *
 * These rows open `platform: "ios"` — `open`'s platform option rejects
 * `ios`/`android` under `--target web` (the page is a desktop there), so
 * the host-derived half of the presentation rule (touch input + compact
 * short side from the phone-sized engine, no `EnvironmentScope`) can only
 * run headless. The EnvironmentScope-injected halves of the same rule live
 * in `autocomplete.mobile.test.tsx` and run on both targets.
 *
 * `platform: "ios"` at 390×844 derives `input: "touch"` and `width:
 * "compact"`, so `presentation: "auto"` resolves the Sheet carrier — the
 * `id:ac-pop-sheet` / `id:ac-pop` testID probes discriminate it.
 */

const IOS = { platform: "ios", width: 390, height: 844 } as const;

function openMobileIos(
  caseName: string = "m",
  params: Record<string, string> = {},
): Promise<App> {
  return open("../../../autocomplete.fixtures.tsx", {
    ...IOS,
    clock: {},
    host: { params: { case: caseName, ...params } },
  });
}

describe("autocomplete mobile (headless)", () => {
  // adapt-sheets/autocomplete.md M-001 (A-001), the exact pointer half: the
  // shared file asserts the pointer box only as `>=36 && <44` because iOS
  // device hosts measured `min-h-9` at 40pt (a floor whose cause is
  // unproven). On the ios headless engine the pointer environment's trigger
  // measures the class's exact 36pt — the zero-drift pin the range relaxes.
  test("M-001 headless half: the pointer trigger box measures exactly 36pt", async () => {
    const pointer = await openMobileIos("m", { input: "pointer" });
    await pointer.waitUntil(() =>
      callsOf(pointer, "layout").some((c) => (c[0] as LayoutEntry).name === "trigger"),
    );
    expect(layoutFor(pointer, "trigger").height).toBe(36);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-016 (A-006): the presentation value
  // latches on the open edge — resizing the window to regular while the
  // sheet is open must not swap carriers mid-open; after close the next
  // open re-evaluates against the new environment and yields the panel.
  test("M-016 latched sheet survives rotation; reopen re-evaluates to panel", async () => {
    const app = await openMobileIos();

    await app.press("id:ac-trigger");
    await app.waitFor("role:option");
    expect(app.count("id:ac-pop-sheet")).toBe(1);
    expect(app.count("id:ac-pop")).toBe(0);

    // Rotation to a regular short side while open: the latched carrier holds.
    await app.setViewport(1024, 768);
    expect(app.count("id:ac-pop-sheet")).toBe(1);
    expect(app.count("id:ac-pop")).toBe(0);

    // Close through the field's own Escape chain, then reopen — the latch
    // released, the re-evaluated environment (pointer? the engine keeps
    // touch input; the short side is now regular) picks the panel.
    await app.keyboard.press("escape");
    await app.waitUntil(() => callsOf(app, "openChange").length === 2);

    await app.press("id:ac-trigger");
    await app.waitFor("role:option");
    expect(app.count("id:ac-pop")).toBe(1);
    expect(app.count("id:ac-pop-sheet")).toBe(0);
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true]]);
  });

  // adapt-sheets/autocomplete.md M-017 (A-008): the phone-sized ios engine
  // derives `input: "touch"` + `width: "compact"` with no scope at all, so
  // `auto` mounts the sheet carrier — the host-derived half of M-010 —
  // with the same Filter / ListBox content contract.
  test("M-017 ios host derives touch+compact: auto presents the sheet carrier", async () => {
    const app = await openMobileIos();

    await app.press("id:ac-trigger");
    await app.waitFor("role:option");

    expect(app.count("id:ac-pop-sheet")).toBe(1);
    expect(app.count("id:ac-pop")).toBe(0);
    expect(app.shows("label:Search animals")).toBe(true);
    expect(app.count("role:option")).toBe(3);
    expect(app.shows("role:option[Dog]")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  });
});
