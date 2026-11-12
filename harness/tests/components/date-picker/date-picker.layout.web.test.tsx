import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";
import {
  bottomOf,
  LAYOUT_TOLERANCE,
  lastLayout,
  rightOf,
} from "../../testers/date-picker";

/*
 * Web-only: the §4c geometry cases read every part's box through `onLayout`
 * probes. Bounds are relative to each part's parent, and the assertions are
 * structural — a shoebox root inside a wide frame, a column whose gaps are the
 * slot's `gap-1`, a popover sized by its content plus its own padding, a
 * trigger no larger than its icon plus `p-1` — never hard-coded pixel sizes
 * beyond the spacing constants the port sheet derives from the CSS.
 *
 * G-001 root shrink and column gap; G-002 content-driven popover and the custom
 * row; G-003 trigger and indicator inside the suffix.
 */

const TOLERANCE = LAYOUT_TOLERANCE;

/* R-001: the root is a column with `gap-1`. */
const ROOT_GAP = 4;
/* R-012: the popover pads its content by `p-3` on both sides. */
const POPOVER_PADDING = 12;
/* G-002 shape B: the caller's own `gap-4` between the calendar and the preset. */
const ROW_GAP = 16;
/* R-004: the trigger pads its icon by `p-1` on both sides. */
const TRIGGER_PADDING = 4;

function openGeometry(scenario: string): Promise<App> {
  return openScenario(scenario, { platform: "web", locale: "en-US" });
}

function near(left: number, right: number): boolean {
  return Math.abs(left - right) <= TOLERANCE;
}

// port sheet 4c, G-001: the root shrinks to its widest child inside a wider
// frame, the `w-full` group is stretched to the root's width, and the label,
// group and description are one `gap-1` apart in a column.
test("G-001 shrinks the root to its widest child and keeps the column gap", async () => {
  const app = await openGeometry("date-picker/geometry");

  await app.waitFor("role:spinbutton[/month/i]");

  const frame = lastLayout(app, "frame");
  const root = lastLayout(app, "root");
  const label = lastLayout(app, "label");
  const group = lastLayout(app, "group");
  const description = lastLayout(app, "description");

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
});

// port sheet 4c, G-002: the popover is sized by its content — the calendar plus
// its own `p-3` — and the caller's `flex items-start gap-4` row puts the preset
// one `gap-4` right of the calendar, top-aligned, without stretching the
// popover's height past the calendar.
test("G-002 sizes the popover to its content and lays the custom row out", async () => {
  const plain = await openGeometry("date-picker/geometry-popover");

  await plain.waitFor("role:grid[/August 2026/]");
  // The overlay measures and positions itself a frame after it mounts.
  await plain.wait(50);

  const popoverAlone = lastLayout(plain, "popover");
  const calendarAlone = lastLayout(plain, "calendar");

  expect(near(popoverAlone.width, calendarAlone.width + 2 * POPOVER_PADDING)).toBe(true);
  expect(near(popoverAlone.height, calendarAlone.height + 2 * POPOVER_PADDING)).toBe(true);

  const custom = await openGeometry("date-picker/geometry-popover-layout");

  await custom.waitFor("role:button[Use today]");
  await custom.wait(50);

  const popoverRow = lastLayout(custom, "popover");
  const calendarRow = lastLayout(custom, "calendar");
  const preset = lastLayout(custom, "preset");

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

// port sheet 4c, G-003: the trigger is the indicator plus `p-1` on both sides,
// square, and it does not stretch the field: the suffix is only as large as the
// trigger and is centred in the taller group.
test("G-003 keeps the trigger at its icon size inside the suffix", async () => {
  const app = await openGeometry("date-picker/geometry-trigger");

  await app.waitFor("role:spinbutton[/month/i]");

  const group = lastLayout(app, "group");
  const suffix = lastLayout(app, "suffix");
  const trigger = lastLayout(app, "trigger");
  const indicator = lastLayout(app, "indicator");

  expect(near(indicator.width, indicator.height)).toBe(true);
  expect(near(trigger.width, indicator.width + 2 * TRIGGER_PADDING)).toBe(true);
  expect(near(trigger.width, trigger.height)).toBe(true);
  /* `w-full` inside the content-sized suffix adds nothing. */
  expect(near(suffix.width, trigger.width)).toBe(true);
  expect(near(suffix.height, trigger.height)).toBe(true);
  /* The trigger is shorter than the field, which keeps its own height… */
  expect(trigger.height).toBeLessThan(group.height);
  /* …and the suffix is vertically centred in the group. */
  expect(near(2 * suffix.y + suffix.height, group.height)).toBe(true);
});
