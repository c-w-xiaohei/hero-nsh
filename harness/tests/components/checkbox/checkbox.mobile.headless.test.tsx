import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the checkbox adapt unit — the halves
 * of adapt-sheets/checkbox.md §4 that need `app.hover`, which a phone has
 * no mouse for:
 *
 *   M-004        the gated-hover row, moved whole (touch + pointer halves)
 *                from `checkbox.mobile.test.tsx`.
 *   M-007 tail   the baseline's hover close: under the pointer environment
 *                a hover on the row still raises `rawHover` AND the gated
 *                `effectHover` — proof the desktop hover path is unmoved.
 *
 * The fixture is `harness/checkbox.fixtures.tsx` (`case` + `testInput`,
 * the same params as the shared file).
 */

type Params = Record<string, string>;

function openCase(name: string, params: Params = {}): Promise<App> {
  return open("../../../checkbox.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type Env = {
  input: string;
  hitSlop: Edges | null;
  seamPressed: boolean;
  enabled: boolean;
  effectHover: boolean;
  rawHover: boolean;
  selected: boolean;
};

function envs(app: App): Env[] {
  return callsOf(app, "env").map((c) => c[0] as Env);
}

describe("checkbox mobile (headless)", () => {
  // M-004 (A-002): under touch the Control's hover effect cells stay off
  // even while the raw hover signal still records — `app.hover` raises
  // `rawHover` and the gated `effectHover` must not follow; a press that
  // toggles selection leaves it off too (the sticky-hover half). Under
  // pointer the same hover drives the effect exactly as on desktop.
  test("M-004 injected touch: the gated hover effect stays off; pointer keeps it", async () => {
    const touch = await openCase("row", { testInput: "touch" });

    // The hover signal itself is contract surface and still records under
    // touch — only the Control's paint read is gated (A-002).
    await touch.hover("id:cb-row");
    await touch.waitUntil(() => envs(touch).some((s) => s.rawHover));
    expect(envs(touch).every((s) => !s.effectHover)).toBe(true);

    await touch.press("id:cb-row");
    await touch.waitUntil(() => callsOf(touch, "onChange").length === 1);
    expect(envs(touch).every((s) => !s.effectHover)).toBe(true);

    const pointer = await openCase("row", { testInput: "pointer" });
    await pointer.hover("id:cb-row");
    await pointer.waitUntil(() =>
      envs(pointer).some((s) => s.rawHover && s.effectHover),
    );
    // Whatever the raw signal reports, the gated effect mirrors it under
    // pointer — no suppression on the desktop half.
    for (const s of envs(pointer)) {
      expect(s.effectHover).toBe(s.rawHover);
    }
  }, 120_000);

  // M-007's hover tail (基线): the hover path is untouched on the desktop
  // half — a hover on the mobile row case still raises the raw signal AND
  // the gated effect read.
  test("M-007 baseline: pointer hover raises the raw signal and the gated effect", async () => {
    const row = await openCase("row", { testInput: "pointer" });
    await row.hover("id:cb-row");
    await row.waitUntil(() => envs(row).some((s) => s.rawHover && s.effectHover));
  }, 120_000);
});
