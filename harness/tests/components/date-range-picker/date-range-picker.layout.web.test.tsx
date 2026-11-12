import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";
import {
  bottomOf,
  LAYOUT_TOLERANCE,
  layoutOf,
  rightOf,
} from "../../testers/date-range-picker";

/*
 * Web-only: the §4c geometry cases read every part's box through `onLayout`
 * probes. Bounds are relative to each part's parent, and the assertions are
 * structural — a shoebox root inside a wide frame, a column whose gaps are the
 * slot's `gap-1`, a separator between the two inputs, a popover sized by its
 * content plus its own padding — never hard-coded pixel sizes beyond the spacing
 * constants the port sheet derives from the CSS.
 *
 * G-001 root shrink, group row and separator; G-002 content-driven popover and
 * the custom row; G-003 the content-driven dual-field row.
 */

const TOLERANCE = LAYOUT_TOLERANCE;

/* R-001: the root is a column with `gap-1`. */
const ROOT_GAP = 4;
/* R-013: the popover pads its content by `p-3` on both sides. */
const POPOVER_PADDING = 12;
/* G-002 shape B: the caller's own `gap-4` between the calendar and the preset. */
const ROW_GAP = 16;

function openGeometry(scenario: string): Promise<App> {
  return openScenario(scenario, { platform: "web", locale: "en-US" });
}

function near(left: number, right: number): boolean {
  return Math.abs(left - right) <= TOLERANCE;
}

// port sheet 4c, G-001: the root shrinks to its widest child inside a wider
// frame, the `w-full` group is stretched to the root's width, the label, group
// and description are one `gap-1` apart in a column, and the separator is a real
// `px-1` part centred between the two fields it splits.
//
// `DateField.Input` takes no `onLayout`, so a field's box is derived from its
// siblings: the row starts at the group's left edge, so `separator.x` is the
// start field's width, and `suffix.x - rightOf(separator)` is the end field's.
test("G-001 shrinks the root to its widest child and keeps the separator between the inputs", async () => {
  const app = await openGeometry("date-range-picker/geometry");

  await app.waitFor("role:spinbutton[/month/i]");

  const frame = layoutOf(app, "frame");
  const root = layoutOf(app, "root");
  const label = layoutOf(app, "label");
  const group = layoutOf(app, "group");
  const description = layoutOf(app, "description");
  const separator = layoutOf(app, "separator");
  const suffix = layoutOf(app, "suffix");

  /* `w-fit`: the root is narrower than the frame it sits in. */
  expect(group.width).toBeLessThan(frame.width);
  /* …and as wide as its children, which the group fills (`w-full` inside it). */
  expect(near(root.width, group.width)).toBe(true);
  expect(near(label.width, root.width)).toBe(true);
  expect(near(description.width, root.width)).toBe(true);
  /* The column gaps. */
  expect(near(group.y, bottomOf(label) + ROOT_GAP)).toBe(true);
  expect(near(description.y, bottomOf(group) + ROOT_GAP)).toBe(true);
  expect(
    near(root.height, label.height + group.height + description.height + 2 * ROOT_GAP),
  ).toBe(true);
  /* R-012: the separator is its own box with a field on each side of it… */
  expect(separator.x).toBeGreaterThan(TOLERANCE);
  expect(suffix.x - rightOf(separator)).toBeGreaterThan(TOLERANCE);
  /* …and the row's `items-center` centres it in the field's height. */
  expect(near(2 * separator.y + separator.height, group.height)).toBe(true);
});

// port sheet 4c, G-002: the popover is sized by its content — the range calendar
// plus its own `p-3` — and the caller's `flex items-start gap-4` row puts the
// preset one `gap-4` right of the calendar, top-aligned, without stretching the
// popover's height past the calendar.
test("G-002 sizes the popover to its content and lays the custom row out", async () => {
  const plain = await openGeometry("date-range-picker/geometry-popover");

  await plain.waitFor("role:grid[/August 2026/]");
  // The overlay measures and positions itself a frame after it mounts.
  await plain.wait(50);

  const popoverAlone = layoutOf(plain, "popover");
  const calendarAlone = layoutOf(plain, "calendar");

  expect(near(popoverAlone.width, calendarAlone.width + 2 * POPOVER_PADDING)).toBe(true);
  expect(near(popoverAlone.height, calendarAlone.height + 2 * POPOVER_PADDING)).toBe(true);

  const custom = await openGeometry("date-range-picker/geometry-popover-layout");

  await custom.waitFor("role:button[Use today]");
  await custom.wait(50);

  const popoverRow = layoutOf(custom, "popover");
  const calendarRow = layoutOf(custom, "calendar");
  const preset = layoutOf(custom, "preset");

  /* The same calendar in both shapes: the row grows the popover, not the month. */
  expect(near(calendarRow.width, calendarAlone.width)).toBe(true);
  expect(near(calendarRow.height, calendarAlone.height)).toBe(true);
  /* Width = calendar + `gap-4` + preset + `p-3` on both sides. */
  expect(
    near(popoverRow.width, calendarRow.width + ROW_GAP + preset.width + 2 * POPOVER_PADDING),
  ).toBe(true);
  /* `items-start`: the preset is top-aligned and one `gap-4` right of the
   * calendar; the calendar alone still sets the popover's height. */
  expect(near(preset.y, calendarRow.y)).toBe(true);
  expect(near(preset.x, rightOf(calendarRow) + ROW_GAP)).toBe(true);
  expect(near(popoverRow.height, calendarRow.height + 2 * POPOVER_PADDING)).toBe(true);
});

// port sheet 4c, G-003: with no caller width the group is content-driven, and
// both slots keep a real box — the end field is `flex-1` in the slot rules, and
// `flex: 1 1 0` alone collapses it to nothing in NSH, which has no CSS automatic
// minimum size; `basis-auto` is what keeps it there. A field's own box cannot be
// probed (`DateField.Input` takes no `onLayout`), so the room a field occupies is
// read off its siblings: the start field runs from the row's left edge to the
// separator, the end field from the separator to the suffix. That is why the two
// fields' widths are not compared with each other here — the group's own inline
// padding is not observable either, and the comparison would rest on it.
test("G-003 keeps the dual field row content-driven with a field on each side", async () => {
  const empty = await openGeometry("date-range-picker/geometry-range");

  await empty.waitFor("role:spinbutton[/month/i]");

  const emptyGroup = layoutOf(empty, "group");
  const emptySeparator = layoutOf(empty, "separator");
  const emptySuffix = layoutOf(empty, "suffix");

  const filled = await openGeometry("date-range-picker/geometry-range-filled");

  await filled.waitFor("role:spinbutton[/month/i]");

  const filledGroup = layoutOf(filled, "group");
  const filledSeparator = layoutOf(filled, "separator");
  const filledSuffix = layoutOf(filled, "suffix");

  for (const [separator, suffix] of [
    [emptySeparator, emptySuffix],
    [filledSeparator, filledSuffix],
  ] as const) {
    /* A field before the separator… */
    expect(separator.x).toBeGreaterThan(separator.width);
    /* …and a field between the separator and the suffix, wider than the
     * separator: a collapsed end field leaves nothing here. */
    expect(suffix.x - rightOf(separator)).toBeGreaterThan(separator.width);
  }

  /* Content-driven: filling both dates narrows the group instead of stretching
   * it (upstream G-003 shape C is 185.3 against shape A's 238.1). */
  expect(filledGroup.width).toBeLessThan(emptyGroup.width);
  expect(filledSuffix.x - rightOf(filledSeparator)).toBeLessThan(
    emptySuffix.x - rightOf(emptySeparator),
  );
});
