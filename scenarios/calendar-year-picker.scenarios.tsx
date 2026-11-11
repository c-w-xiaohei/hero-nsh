import { Calendar } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared CalendarYearPicker scenario, written with HeroUI 3.2.7's public API
 * only. The year picker has no root of its own: it renders inside Calendar,
 * which owns the open state and the date state.
 *
 *   calendar-year-picker/calendar   min 2020-01-01, max 2030-12-31,
 *                                   2026-08-15 selected, trigger in the header
 *
 * The RangeCalendar rows of the earlier picker test file (T-005 … T-007 of
 * port sheet calendar-year-picker 4b) belong to the RangeCalendar unit, so no
 * `range-calendar` entry is provided here.
 */

const MIN_VALUE = parseDate("2020-01-01");
const MAX_VALUE = parseDate("2030-12-31");
const DEFAULT_VALUE = parseDate("2026-08-15");

function CalendarYearPickerCase() {
  return (
    <Stage>
      <Calendar
        aria-label="Event date"
        defaultValue={DEFAULT_VALUE}
        maxValue={MAX_VALUE}
        minValue={MIN_VALUE}
      >
        <Calendar.Header>
          <Calendar.YearPickerTrigger onFocus={() => probe("trigger-focus")()}>
            <Calendar.YearPickerTriggerHeading />
            <Calendar.YearPickerTriggerIndicator />
          </Calendar.YearPickerTrigger>
          <Calendar.NavButton slot="previous" />
          <Calendar.NavButton slot="next" />
        </Calendar.Header>
        <Calendar.Grid>
          <Calendar.GridHeader>
            {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
          </Calendar.GridHeader>
          <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
        </Calendar.Grid>
        <Calendar.YearPickerGrid>
          <Calendar.YearPickerGridBody>
            {({ year }) => <Calendar.YearPickerCell year={year} />}
          </Calendar.YearPickerGridBody>
        </Calendar.YearPickerGrid>
      </Calendar>
    </Stage>
  );
}

export const calendarYearPickerScenarios: Record<string, Component> = {
  "calendar-year-picker/calendar": CalendarYearPickerCase,
};
