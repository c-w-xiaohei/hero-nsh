import { RangeCalendar } from "@heroui/react";
import { CalendarDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared RangeCalendar scenarios, written with HeroUI 3.2.7's public API only,
 * so the reference app and this library render the same JSX.
 *
 *   range-calendar/default            the upstream `renderRangeCalendar` shape:
 *                                     year picker trigger in the header, min
 *                                     2020-01-01, max 2030-12-31, 2026-08-01 …
 *                                     08-05
 *   range-calendar/default-change     the same with `onChange` recorded
 *   range-calendar/default-disabled   the same with `isDisabled`
 *   range-calendar/controlled-first   controlled `value` 08-01 … 08-05, Heading
 *   range-calendar/controlled-second  controlled `value` 08-10 … 08-15, Heading
 *   range-calendar/geometry           default shape, every part reports bounds
 *   range-calendar/geometry-week      week view, `visibleDuration={{weeks: 2}}`
 *   range-calendar/geometry-day       day view, `visibleDuration={{days: 7}}`
 *
 * `nsh/test` cannot read aria/data attributes or focus, so the probes record
 * two facts: `range-change` is the `{start, end}` ISO payload of `onChange`
 * (port sheet 4b T-004), `day-focus` is the cell's `onFocus` date and `layout`
 * is a part's bounds (relative to its parent) for the geometry cases.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

type DateRange = { start: DateValue; end: DateValue };

function layout(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/** `onChange` as the two ISO dates the upstream test reads off its payload. */
function recordRange(value: DateRange) {
  probe("range-change")(
    value ? { start: value.start.toString(), end: value.end.toString() } : null,
  );
}

const MIN_VALUE = new CalendarDate(2020, 1, 1);
const MAX_VALUE = new CalendarDate(2030, 12, 31);
const DEFAULT_VALUE: DateRange = {
  start: new CalendarDate(2026, 8, 1),
  end: new CalendarDate(2026, 8, 5),
};
const SECOND_VALUE: DateRange = {
  start: new CalendarDate(2026, 8, 10),
  end: new CalendarDate(2026, 8, 15),
};
const WEEK_VALUE: DateRange = {
  start: new CalendarDate(2026, 3, 5),
  end: new CalendarDate(2026, 3, 9),
};
const DAY_VALUE: DateRange = {
  start: new CalendarDate(2026, 3, 3),
  end: new CalendarDate(2026, 3, 5),
};

type ShellProps = {
  value?: DateRange;
  defaultValue?: DateRange;
  isDisabled?: boolean;
  visibleDuration?: { days?: number; weeks?: number; months?: number };
  onChange?: (value: DateRange) => void;
  probes?: boolean;
};

function Grid(props: ShellProps) {
  return (
    <>
      <RangeCalendar.Grid onLayout={props.probes ? layout("grid") : undefined}>
        <RangeCalendar.GridHeader onLayout={props.probes ? layout("grid-header") : undefined}>
          {(day) => (
            <RangeCalendar.HeaderCell
              onLayout={props.probes ? layout(`header-${day}`) : undefined}
            >
              {day}
            </RangeCalendar.HeaderCell>
          )}
        </RangeCalendar.GridHeader>
        <RangeCalendar.GridBody onLayout={props.probes ? layout("grid-body") : undefined}>
          {(date) => (
            <RangeCalendar.Cell
              date={date}
              onFocus={() => probe("day-focus")(date.toString())}
              onLayout={props.probes ? layout(`day-${date.toString()}`) : undefined}
            />
          )}
        </RangeCalendar.GridBody>
      </RangeCalendar.Grid>
      <RangeCalendar.YearPickerGrid>
        <RangeCalendar.YearPickerGridBody>
          {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
        </RangeCalendar.YearPickerGridBody>
      </RangeCalendar.YearPickerGrid>
    </>
  );
}

/* The upstream `renderRangeCalendar` shape: year trigger in the header. */
function WithYearPicker(props: ShellProps) {
  return (
    <RangeCalendar
      aria-label="Trip dates"
      value={props.value}
      defaultValue={props.defaultValue}
      isDisabled={props.isDisabled}
      visibleDuration={props.visibleDuration}
      maxValue={MAX_VALUE}
      minValue={MIN_VALUE}
      onChange={props.onChange}
    >
      <RangeCalendar.Header>
        <RangeCalendar.YearPickerTrigger>
          <RangeCalendar.YearPickerTriggerHeading />
          <RangeCalendar.YearPickerTriggerIndicator />
        </RangeCalendar.YearPickerTrigger>
        <RangeCalendar.NavButton slot="previous" />
        <RangeCalendar.NavButton slot="next" />
      </RangeCalendar.Header>
      <Grid probes={props.probes} />
    </RangeCalendar>
  );
}

/* The controlled/upstream shape uses the Heading part, not the year trigger. */
function WithHeading(props: { value: DateRange; onChange?: (value: DateRange) => void }) {
  return (
    <RangeCalendar
      aria-label="Trip dates"
      value={props.value}
      maxValue={MAX_VALUE}
      minValue={MIN_VALUE}
      onChange={props.onChange}
    >
      <RangeCalendar.Header>
        <RangeCalendar.Heading />
        <RangeCalendar.NavButton slot="previous" />
        <RangeCalendar.NavButton slot="next" />
      </RangeCalendar.Header>
      <RangeCalendar.Grid>
        <RangeCalendar.GridHeader>
          {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
        </RangeCalendar.GridHeader>
        <RangeCalendar.GridBody>
          {(date) => <RangeCalendar.Cell date={date} />}
        </RangeCalendar.GridBody>
      </RangeCalendar.Grid>
    </RangeCalendar>
  );
}

function Default() {
  return (
    <Stage>
      <WithYearPicker defaultValue={DEFAULT_VALUE} />
    </Stage>
  );
}

function DefaultChange() {
  return (
    <Stage>
      <WithYearPicker defaultValue={DEFAULT_VALUE} onChange={recordRange} />
    </Stage>
  );
}

function DefaultDisabled() {
  return (
    <Stage>
      <WithYearPicker defaultValue={DEFAULT_VALUE} isDisabled onChange={recordRange} />
    </Stage>
  );
}

function ControlledFirst() {
  return (
    <Stage>
      <WithHeading value={DEFAULT_VALUE} onChange={recordRange} />
    </Stage>
  );
}

function ControlledSecond() {
  return (
    <Stage>
      <WithHeading value={SECOND_VALUE} onChange={recordRange} />
    </Stage>
  );
}

function Geometry() {
  return (
    <Stage>
      <WithYearPicker defaultValue={DEFAULT_VALUE} probes />
    </Stage>
  );
}

function GeometryWeek() {
  return (
    <Stage>
      <WithYearPicker defaultValue={WEEK_VALUE} visibleDuration={{ weeks: 2 }} probes />
    </Stage>
  );
}

function GeometryDay() {
  return (
    <Stage>
      <WithYearPicker defaultValue={DAY_VALUE} visibleDuration={{ days: 7 }} probes />
    </Stage>
  );
}

export const rangeCalendarScenarios: Record<string, Component> = {
  "range-calendar/default": Default,
  "range-calendar/default-change": DefaultChange,
  "range-calendar/default-disabled": DefaultDisabled,
  "range-calendar/controlled-first": ControlledFirst,
  "range-calendar/controlled-second": ControlledSecond,
  "range-calendar/geometry": Geometry,
  "range-calendar/geometry-week": GeometryWeek,
  "range-calendar/geometry-day": GeometryDay,
};
