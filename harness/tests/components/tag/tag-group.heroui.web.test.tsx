import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression case for TagGroup that needs Tab to move the
 * keyboard focus, per port sheet 4b (T-015).
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab walks text fields, `ref.focus()` on a view is a no-op and a
 * focused view does not hear Delete (crates/nsh-platform-windows/src/input.rs:997-1053,
 * mount.rs:440; crates/nsh-core/src/props.rs:365). The case starts with Tab on
 * the grid, which the list owns as its only Tab stop. Approved difference
 * "Windows keyboard focus and activation (NSH 0.4.0 host gap)", port sheet
 * section 8. macOS and the web both move focus with Tab, so nothing is hidden
 * on a target where it could work.
 *
 * Focus is virtual: the list holds the real focus, `focusedKey` names the row,
 * so the fixture's `▶` marker stands in for `document.activeElement`.
 */

function openFixture(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../tag.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

// X-002: a keyboard activation of the focused tag must run the tag's press
// lifecycle, not only the selection. src/components/tag/tag-group-list.tsx:466-480,
// src/components/tag/tag-root.tsx:392-427
test("X-002 fires the tag's press lifecycle on Space and Enter", async () => {
  for (const key of ["space", "enter"]) {
    const app = await openFixture("press-log", { platform: "web" });

    await app.keyboard.press("tab");

    expect(app.count("role:row[News] >> text:▶")).toBe(1);

    await app.keyboard.press(key);

    expect(callsOf(app, "pressStart")).toHaveLength(1);
    expect(callsOf(app, "pressUp")).toHaveLength(1);
    expect(callsOf(app, "pressEnd")).toHaveLength(1);
    expect(callsOf(app, "pressChange")).toEqual([[true], [false]]);
    expect(callsOf(app, "press")).toHaveLength(1);
  }
});

// heroui/packages/react/tests/components/tag-group/tag-group.test.tsx:169
// Ported (port sheet T-015): upstream focuses the first row directly; here Tab
// enters the grid and lands on the first row, whose delete binding then runs.
test("T-015 supports removing a focused tag with the keyboard", async () => {
  const app = await openFixture("remove-marked", { platform: "web" });

  await app.keyboard.press("tab");

  expect(app.count("role:row[News] >> text:▶")).toBe(1);

  await app.keyboard.press("delete");

  const removed = callsOf(app, "remove");

  expect(removed).toHaveLength(1);
  expect(removed[0][0]).toEqual(["news"]);
});
