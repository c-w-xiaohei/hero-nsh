import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the input-group adapt unit — the half of
 * adapt-sheets/input-group.md §4 that only exists on the headless engine:
 * `open({ platform: "ios" })` host derivation (`platform.desktop` false →
 * `Environment.input` defaults to `"touch"` without an `EnvironmentScope`).
 * `--target web` rejects a phone `platform`, so this file is headless-only.
 *
 * The fixture is `harness/input-group.fixtures.tsx`, `case: "layout"`, whose
 * Root `onLayout` probe reports the same bounds M-001 reads under the
 * injected scope.
 */

type LayoutEntry = { name: string; width: number; height: number };

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

describe("input-group mobile (headless)", () => {
  // adapt-sheets/input-group.md M-008 (A-001, A-002): an ios host derives
  // `input()==="touch"` on its own — no `EnvironmentScope` — so the `input`
  // axis' `min-h-11` lifts the group row to the 44 pt hit minimum. This is
  // M-001's host-derivation half.
  test("M-008 ios host derivation: the group row gets the touch height without a scope", async () => {
    const app = await open("../../../input-group.fixtures.tsx", {
      platform: "ios",
      width: 390,
      height: 844,
      host: { params: { case: "layout" } },
    });

    expect(app.shows("label:Amount")).toBe(true);
    await app.waitUntil(() =>
      callsOf(app, "layout").some((c) => (c[0] as LayoutEntry).name === "root"),
    );
    expect(layoutFor(app, "root").height).toBeGreaterThanOrEqual(44);
  }, 120_000);
});
