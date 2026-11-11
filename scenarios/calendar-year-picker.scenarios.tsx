import { Calendar, RangeCalendar } from "@heroui/react";
import { CalendarDate } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

function CalendarYearPicker() {
  return (
    <Stage>
      <Calendar aria-label="Event date" defaultValue={new CalendarDate(2026, 8, 15)} minValue={new CalendarDate(2020, 1, 1)} maxValue={new CalendarDate(2030, 12, 31)}>
        <Calendar.Header>
          <Calendar.YearPickerTrigger>
            <Calendar.YearPickerTriggerHeading />
            <Calendar.YearPickerTriggerIndicator />
          </Calendar.YearPickerTrigger>
          <Calendar.NavButton slot="previous" />
          <Calendar.NavButton slot="next" />
        </Calendar.Header>
        <Calendar.Grid>
          <Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader>
          <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
        </Calendar.Grid>
        <Calendar.YearPickerGrid>
          <Calendar.YearPickerGridBody>{({ year }) => <Calendar.YearPickerCell year={year} />}</Calendar.YearPickerGridBody>
        </Calendar.YearPickerGrid>
      </Calendar>
    </Stage>
  );
}

function RangeCalendarYearPicker() {
  return (
    <Stage>
      <RangeCalendar aria-label="Trip dates" defaultValue={{ start: new CalendarDate(2026, 8, 1), end: new CalendarDate(2026, 8, 5) }} minValue={new CalendarDate(2020, 1, 1)} maxValue={new CalendarDate(2030, 12, 31)}>
        <RangeCalendar.Header>
          <RangeCalendar.YearPickerTrigger>
            <RangeCalendar.YearPickerTriggerHeading />
            <RangeCalendar.YearPickerTriggerIndicator />
          </RangeCalendar.YearPickerTrigger>
          <RangeCalendar.NavButton slot="previous" />
          <RangeCalendar.NavButton slot="next" />
        </RangeCalendar.Header>
        <RangeCalendar.Grid>
          <RangeCalendar.GridHeader>{(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}</RangeCalendar.GridHeader>
          <RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
        </RangeCalendar.Grid>
        <RangeCalendar.YearPickerGrid>
          <RangeCalendar.YearPickerGridBody>{({ year }) => <RangeCalendar.YearPickerCell year={year} />}</RangeCalendar.YearPickerGridBody>
        </RangeCalendar.YearPickerGrid>
      </RangeCalendar>
    </Stage>
  );
}

export const calendarYearPickerScenarios: Record<string, Component> = {
  "calendar-year-picker/calendar": CalendarYearPicker,
  "calendar-year-picker/range-calendar": RangeCalendarYearPicker,
};
