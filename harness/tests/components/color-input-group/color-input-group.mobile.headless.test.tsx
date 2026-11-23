import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the color-input-group adapt unit —
 * the halves of adapt-sheets/color-input-group.md §4 that need `app.hover`,
 * which a phone has no mouse for:
 *
 *   M-002        the hover-suppression row, moved whole (touch + pointer
 *                halves) from `color-input-group.mobile.test.tsx`.
 *   M-009 S-004  the baseline's Root render-prop hover/focus-within half —
 *                the rest of M-009 stays in the shared file.
 *
 * The fixture is `harness/color-input-group.fixtures.tsx` (`case` +
 * `testInput`, the same params as the shared file); `platform:"windows"`
 * pins the pointer host the desktop halves assert.
 */

type Params = Record<string, string>;

function openCase(name: string, params: Params = {}): Promise<App> {
  return open("../../../color-input-group.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

type RootClassRecord = {
  isHovered: boolean;
};

function rootClassRecords(app: App): RootClassRecord[] {
  return callsOf(app, "root-class").map((args) => args[0] as RootClassRecord);
}

describe("color-input-group mobile (headless)", () => {
  // adapt-sheets/color-input-group.md M-002 (A-003, A-004): under touch the
  // group's hover face stays inert — pressing the input area and hovering
  // the row leave `isHovered` false and every `onHoverStart/End/Change`
  // probe silent on both Root and Input (the JS signal behind
  // `bg-field-hover`/`bg-default-hover` never rises, so no hover residue
  // can paint — sticky hover included). `onMouseEnter`/`onMouseLeave` host
  // callbacks pass through untouched. The pointer environment keeps the
  // desktop hover contract.
  test("M-002 injected touch: press and hover never raise the group's hover face", async () => {
    const touch = await openCase("hover", { testInput: "touch" });

    await touch.press("id:group-input");
    await touch.hover("id:group");
    await touch.hover("id:group-input");

    for (const name of [
      "root-hover-start",
      "root-hover-end",
      "root-hover-change",
      "input-hover-start",
      "input-hover-end",
      "input-hover-change",
    ]) {
      expect(callsOf(touch, name)).toHaveLength(0);
    }
    expect(rootClassRecords(touch).every((r) => !r.isHovered)).toBe(true);

    const pointer = await openCase("hover", { testInput: "pointer" });
    await pointer.hover("id:group");
    await pointer.waitUntil(() =>
      rootClassRecords(pointer).some((r) => r.isHovered),
    );
    expect(callsOf(pointer, "root-hover-start")).toHaveLength(1);
    expect(callsOf(pointer, "root-hover-change")).toEqual([[true]]);
    expect(callsOf(pointer, "root-mouse-enter").length).toBeGreaterThanOrEqual(1);

    // The input's own hover pair (A-004) — `app.hover` delivers to the
    // named view, so the input hears its own enter without setting the
    // Root's signal.
    await pointer.hover("id:group-input");
    await pointer.waitUntil(
      () => callsOf(pointer, "input-hover-start").length > 0,
      { timeout: 3_000 },
    );
    expect(callsOf(pointer, "input-hover-start").length).toBeGreaterThanOrEqual(1);
  }, 120_000);

  // adapt-sheets/color-input-group.md M-009's S-004 half (基线): the
  // Root's render props report hover and focus-within.
  test("M-009 baseline S-004: Root render props report hover and focus-within", async () => {
    const app = await openCase("baseline", { testInput: "pointer" });

    type FullRecord = {
      isHovered: boolean;
      isFocusWithin: boolean;
      isFocusVisible: boolean;
    };
    const records = () => callsOf(app, "root-class").map((a) => a[0] as FullRecord);
    const last = () => records().at(-1)!;

    expect(last().isHovered).toBe(false);
    await app.hover("id:b-rp");
    expect(last().isHovered).toBe(true);
    await app.type("id:b-rp-input", "ff0000");
    expect(last().isFocusWithin).toBe(true);
    await app.press("id:b-blur");
    expect(last().isFocusWithin).toBe(false);
    expect(callsOf(app, "input-focus")).toHaveLength(1);
    expect(callsOf(app, "input-blur")).toHaveLength(1);
    expect(records().every((r) => r.isFocusVisible === r.isFocusWithin)).toBe(true);
  }, 120_000);
});
