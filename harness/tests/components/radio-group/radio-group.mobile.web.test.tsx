import { describe, expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only mobile assertion for the radio-group adapt unit:
 * adapt-sheets/radio-group.md §4 M-007 (the desktop zero-drift baseline)
 * lives here because keyboard focus only exists on the web target — a
 * headless Windows window has no Tab (the registered focus gap). The row
 * opens `platform: "web"` and reuses radio.fixtures.tsx's `group-focus`
 * case, which already records the group's onFocus/onBlur/onFocusChange and
 * the per-item focus probes (the same upstream unit the heroui.web suite
 * already pins).
 */

describe("radio-group mobile (web)", () => {
  // adapt-sheets/radio-group.md M-007 (基线): desktop zero-drift sample —
  // the focus-within contract is unchanged: the first item entering the
  // group fires the group's `onFocus`/`onFocusChange(true)` once, arrow
  // moves inside the group never produce `onBlur`/`onFocusChange(false)`,
  // and the real leave commits the delayed blur pair.
  test("M-007 baseline: focus-within enters once, survives arrow moves, and leaves once", async () => {
    const app = await open("../../../radio.fixtures.tsx", {
      platform: "web",
      width: 1024,
      height: 768,
      host: { params: { case: "group-focus" } },
    });

    await app.keyboard.press("tab");
    expect(callsOf(app, "groupFocus")).toEqual([["group"]]);
    expect(callsOf(app, "groupBlur")).toHaveLength(0);
    expect(callsOf(app, "groupFocusChange")).toEqual([[true]]);

    await app.keyboard.press("arrowdown");
    await app.keyboard.press("arrowup");
    expect(callsOf(app, "onFocus")).toEqual([["a"], ["b"], ["a"]]);
    expect(callsOf(app, "groupFocus")).toEqual([["group"]]);
    expect(callsOf(app, "groupBlur")).toHaveLength(0);
    expect(callsOf(app, "groupFocusChange")).toEqual([[true]]);

    await app.keyboard.press("tab");
    expect(callsOf(app, "groupBlur")).toEqual([["group"]]);
    expect(callsOf(app, "groupFocusChange")).toEqual([[true], [false]]);
    expect(callsOf(app, "groupFocus")).toEqual([["group"]]);
  }, 120_000);
});
