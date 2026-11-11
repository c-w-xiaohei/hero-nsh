import type { App } from "nsh/test";
import { callsOf } from "../helpers/calls";

/*
 * Probe readers for Calendar (port sheet 4b, "需要的测试器"). The shared
 * scenarios record the focused date and part bounds into Storage; these
 * helpers turn that log into the facts the upstream `User` would read.
 *
 * Nothing here drives the app apart from the two press shortcuts: upstream's
 * `getByRole("button", { name })` for a day and for a year becomes the event
 * log's recorded date and the year cell's accessible name.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-08-15" as the cell's accessible label fragment, "August 15, 2026". */
export function dayCellLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map((part) => Number(part));

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`not an ISO date: ${iso}`);
  }

  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/** The selector for a day cell, matching the full date inside its label. */
export function dayCellSelector(iso: string): string {
  return `role:button[/${dayCellLabel(iso)}/]`;
}

export async function pressDay(app: App, iso: string): Promise<void> {
  await app.press(dayCellSelector(iso));
}

export async function openYearPicker(app: App): Promise<void> {
  await app.press("role:button[/year selector/i]");
}

export async function selectYear(app: App, year: number): Promise<void> {
  await app.press(`role:button[${year}]`);
}

/** The last date a day cell reported through `onFocus`, or null. */
export function focusedDate(app: App): string | null {
  const calls = callsOf(app, "day-focus");
  const found = calls[calls.length - 1];

  return found ? String(found[0]) : null;
}

/** The last date a year cell reported through `onFocus`, or null. */
export function focusedYear(app: App): number | null {
  const calls = callsOf(app, "year-focus");
  const found = calls[calls.length - 1];

  return found ? Number(found[0]) : null;
}

/** What an `onLayout` probe recorded for `name`. */
export type PartLayout = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function layouts(app: App): PartLayout[] {
  return callsOf(app, "layout").map((args) => args[0] as PartLayout);
}

/** One layout per name: the last call, because the scenario re-renders. */
export function latestLayouts(app: App): PartLayout[] {
  const byName = new Map<string, PartLayout>();

  for (const call of layouts(app)) byName.set(call.name, call);

  return [...byName.values()];
}

export function lastLayout(app: App, name: string): PartLayout {
  const found = latestLayouts(app).find((call) => call.name === name);

  if (!found) throw new Error(`no layout recorded for ${name}`);

  return found;
}

/** The seven weekday labels' boxes, left to right. */
export function headerLayouts(app: App): PartLayout[] {
  return latestLayouts(app)
    .filter((call) => call.name.startsWith("header-"))
    .sort((left, right) => left.x - right.x);
}

/** Every day cell in date order: the first seven are the first row. */
export function dayLayouts(app: App): PartLayout[] {
  return latestLayouts(app)
    .filter((call) => call.name.startsWith("day-"))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function dayLayout(app: App, iso: string): PartLayout {
  return lastLayout(app, `day-${iso}`);
}

export function yearLayout(app: App, year: number): PartLayout {
  return lastLayout(app, `year-${year}`);
}

export const LAYOUT_TOLERANCE = 1;

export function rightOf(part: PartLayout): number {
  return part.x + part.width;
}
