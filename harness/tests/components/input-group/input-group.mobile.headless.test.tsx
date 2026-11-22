import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the input-group adapt unit —
 * adapt-sheets/input-group.md §4 row M-008: the host-derivation half of
 * A-001/A-002. `open({platform:"ios"})` exists only on the headless target
 * (`--target web` rejects it, ERR_NSH_TEST_UNSUPPORTED), so the assertion
 * that a mobile platform derives `input === "touch"` on its own — no
 * EnvironmentScope — lives here, exactly as the w1 files keep it.
 *
 * The fixture is `harness/input-group.fixtures.tsx` (the same `layout` case
 * M-001 drives through the scope); the `onLayout` probe reports the row's
 * bounds into Storage.
 */

type LayoutEntry = { name: string; width: number; height: number };

function openLayout(options: { platform?: "ios"; width?: number; height?: number } = {}): Promise<App> {
  return open("../../../input-group.fixtures.tsx", {
    locale: "en-US",
    ...options,
    host: { params: { case: "layout" } },
  });
}

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

describe("input-group mobile (headless)", () => {
  // adapt-sheets/input-group.md M-008 (A-001, A-002): an ios host derives
  // `input === "touch"` without an `EnvironmentScope`, so the touch cell of
  // the `input` axis engages on its own and the row measures ≥44pt — the
  // host-derivation half of M-001.
  test("M-008 ios host derivation: the touch row engages without a scope", async () => {
    const app = await openLayout({ platform: "ios", width: 390, height: 844 });
    await app.waitUntil(() =>
      callsOf(app, "layout").some((c) => (c[0] as LayoutEntry).name === "root"),
    );
    expect(layoutFor(app, "root").height).toBeGreaterThanOrEqual(44);
  }, 120_000);
});
