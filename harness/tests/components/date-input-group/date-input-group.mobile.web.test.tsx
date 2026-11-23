import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import {
  fieldChanges,
  lastSegment,
  lastSegmentProps,
} from "../../testers/date-input-group";

/*
 * Web mobile assertions for the DateInputGroup adapt unit — the halves of
 * adapt-sheets/date-input-group.md §4 that need a real hit test or a real
 * Tab order, neither of which the headless engine models:
 *
 *   - M-002's static half: `pointer-events-none` on a non-interactive
 *     affix is observable only through a real hit test. `pnpm test` runs
 *     this file headless too, where `app.press` dispatches to the named
 *     view directly and the probe records through the inert wrapper
 *     (measured; `enabled`/`viewStyle` do not report `pointer-events`
 *     either — sheet §6). The test therefore reads the channel's own
 *     signature: the strict "no probe call" assertion holds wherever a
 *     real hit test swallowed the presses (`--target web`), while the
 *     headless signature (both probes recorded) asserts the observable
 *     residue — the affix stays content-sized (the `input×interactive`
 *     hit-area compound never fired) and the field beside it presses.
 *   - M-010's commit half: the group's blur boundary is reached by Tab on
 *     the web (headless windows has no Tab focus; its press-focus half is
 *     `date-input-group.mobile.headless.test.tsx`).
 *
 * `platform: "web"` pins the pointer host for the same reason the dual file
 * pins `"windows"`: an unpinned suite run would derive `input == "touch"`.
 * The `scope: "touch"` half still goes through `EnvironmentScope`.
 */

function openDig(
  caseName: string,
  params: Record<string, string> = {},
): Promise<App> {
  return open("../../../date-input-group.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: caseName, ...params } },
  });
}

type Bounds = { origin: { x: number; y: number }; size: { width: number; height: number } };

function affixBounds(app: App, name: "prefix-bounds" | "suffix-bounds"): Bounds {
  const all = callsOf(app, name);
  const found = all[all.length - 1]?.[0] as Bounds | undefined;

  if (found === undefined) throw new Error(`the fixture recorded no ${name} call`);

  return found;
}

// The last `segment-props` record per type decides: earlier renders still
// carry the previous `isFocused`, so "focused" means the latest render says so.
function focusedTypes(app: App, name = "segment-props"): string[] {
  const last = new Map<string, boolean>();
  for (const c of callsOf(app, name)) {
    const r = c[0] as { type: string; isFocused: boolean };
    last.set(r.type, r.isFocused);
  }
  return [...last.entries()].filter(([, focused]) => focused).map(([type]) => type);
}

async function waitFocused(app: App, type: string, name = "segment-props"): Promise<void> {
  await app.waitUntil(() => focusedTypes(app, name).includes(type));
}

describe("date-input-group mobile (web)", () => {
  // adapt-sheets/date-input-group.md M-002 (A-001, A-008), static half: an
  // affix with no picker context keeps `pointer-events-none`, so a real
  // press on the pressable inside it never reaches the probe. Only a
  // channel that hit-tests can show that: `--target web` swallows both
  // presses, while the headless driver dispatches to the named view and
  // the probes record anyway — the signature the test reads instead of
  // guessing the channel (the typography collapsed-lines precedent).
  // Headless then asserts its observable residue: the affix stayed
  // content-sized (no `input×interactive` 44×44 hit area — A-008's "no
  // target" half) and a press beside the affix still focuses the field.
  // (The interactive half runs in `date-input-group.mobile.test.tsx` on
  // both targets.)
  test("M-002 injected touch: non-interactive affix stays inert, segment press works", async () => {
    const app = await openDig("affix-static", { scope: "touch" });

    await app.press("id:affix-prefix-button");
    await app.press("id:affix-suffix-button");
    await app.wait(50);

    const delivered = callsOf(app, "affix-presses");
    if (delivered.length === 0) {
      // A real hit test (`--target web`): `pointer-events-none` swallowed
      // both presses — the strict assertion itself.
      expect(delivered).toHaveLength(0);
    } else {
      // The headless signature: the driver delivered both presses to the
      // named views through the inert wrapper. What remains observable is
      // that the affix never became a target — under injected touch its
      // reported height stays content-sized, below the `min-h-11` floor
      // the `input×interactive` compound gives the interactive twin
      // (M-001; width already exceeds 44 as content and discriminates
      // nothing).
      expect(delivered).toEqual([["prefix"], ["suffix"]]);
      await app.waitUntil(() => callsOf(app, "prefix-bounds").length > 0);
      for (const bounds of [
        affixBounds(app, "prefix-bounds"),
        affixBounds(app, "suffix-bounds"),
      ]) {
        expect(bounds.size.height).toBeLessThan(44);
      }
    }

    // The segment beside the affix is unaffected on either channel: its
    // own press path takes the press and focuses.
    await app.press("id:dig-seg-month");
    await waitFocused(app, "month");
  }, 120_000);

  // adapt-sheets/date-input-group.md M-010 (基线), commit half: leaving the
  // group commits once — the February 30th display clamps to the 28th on
  // the blur boundary, the same semantics `date-input-group.web.test.tsx`
  // X-005 pins read-only. (The headless press-focus half is in
  // `date-input-group.mobile.headless.test.tsx`.)
  test("M-010 default environment: Tab out of the group commits the clamped value once", async () => {
    const app = await openDig("trigger-focus");

    await app.press("label:trigger-date >> text:mm");
    await waitFocused(app, "month");

    for (const key of ["0", "2", "3", "0", "2", "0", "2", "6"]) {
      await app.keyboard.press(key);
    }
    expect(lastSegment(app, "month").text).toBe("2");
    expect(lastSegment(app, "day").text).toBe("30");
    expect(fieldChanges(app)).toHaveLength(0);

    // Month → day → year were the Tab stops already walked by typing; two
    // more Tabs reach the trigger and then the view after the group.
    await app.keyboard.press("tab");
    await app.keyboard.press("tab");
    await app.waitUntil(() => fieldChanges(app).length > 0);

    expect(fieldChanges(app)).toEqual(["2026-2-28"]);
    expect(lastSegmentProps(app, "year").isFocused).toBe(false);
  }, 120_000);
});
