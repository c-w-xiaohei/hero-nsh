import { Calendar } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared Calendar scenarios, written with HeroUI 3.2.7's public API only, so
 * the reference app and this library render the same JSX.
 *
 *   calendar/default             the upstream `renderCalendar` shape: year
 *                                picker trigger in the header, min 2020-01-01,
 *                                max 2030-12-31, 2026-08-15 selected
 *   calendar/change              the same with `onChange` recorded
 *   calendar/disabled            the same with `isDisabled`
 *   calendar/controlled-first    controlled `value` 2026-08-15, Heading header
 *   calendar/controlled-second   controlled `value` 2026-08-20, Heading header
 *   calendar/day-view            `visibleDuration={{days: 7}}`
 *   calendar/geometry            default shape, every part reports its bounds
 *   calendar/geometry-day        day view shape with the same probes
 *   calendar/geometry-year-picker
 *                                default shape with the year panel open
 *
 * `nsh/test` cannot read aria/data attributes or focus, so the probes record
 * two facts: `day-focus` is the cell's `onFocus` date, and `layout` is a part's
 * bounds (relative to its parent) for the geometry cases.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

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

const MIN_VALUE = parseDate("2020-01-01");
const MAX_VALUE = parseDate("2030-12-31");
const DEFAULT_VALUE = parseDate("2026-08-15");

type ShellProps = {
  value?: DateValue | null;
  defaultValue?: DateValue | null;
  isDisabled?: boolean;
  visibleDuration?: { days?: number; weeks?: number; months?: number };
  onChange?: (value: DateValue | DateValue[] | null) => void;
  probes?: boolean;
  defaultYearPickerOpen?: boolean;
};

function WithYearPicker(props: ShellProps) {
  return (
    <Calendar
      aria-label="Event date"
      defaultValue={props.defaultValue}
      value={props.value}
      isDisabled={props.isDisabled}
      visibleDuration={props.visibleDuration}
      defaultYearPickerOpen={props.defaultYearPickerOpen}
      maxValue={MAX_VALUE}
      minValue={MIN_VALUE}
      onChange={props.onChange}
    >
      <Calendar.Header>
        <Calendar.YearPickerTrigger onFocus={() => probe("trigger-focus")()}>
          <Calendar.YearPickerTriggerHeading />
          <Calendar.YearPickerTriggerIndicator />
        </Calendar.YearPickerTrigger>
        <Calendar.NavButton slot="previous" />
        <Calendar.NavButton slot="next" />
      </Calendar.Header>
      <Calendar.Grid onLayout={props.probes ? layout("grid") : undefined}>
        <Calendar.GridHeader onLayout={props.probes ? layout("grid-header") : undefined}>
          {(day) => (
            <Calendar.HeaderCell onLayout={props.probes ? layout(`header-${day}`) : undefined}>
              {day}
            </Calendar.HeaderCell>
          )}
        </Calendar.GridHeader>
        <Calendar.GridBody onLayout={props.probes ? layout("grid-body") : undefined}>
          {(date) => (
            <Calendar.Cell
              date={date}
              onFocus={() => probe("day-focus")(date.toString())}
              onLayout={props.probes ? layout(`day-${date.toString()}`) : undefined}
            />
          )}
        </Calendar.GridBody>
      </Calendar.Grid>
      <Calendar.YearPickerGrid onLayout={props.probes ? layout("year-grid") : undefined}>
        <Calendar.YearPickerGridBody>
          {({ year }) => (
            <Calendar.YearPickerCell
              year={year}
              onFocus={() => probe("year-focus")(year)}
              onLayout={props.probes ? layout(`year-${year}`) : undefined}
            />
          )}
        </Calendar.YearPickerGridBody>
      </Calendar.YearPickerGrid>
    </Calendar>
  );
}

/* The controlled/upstream shape uses the Heading part, not the year trigger. */
function WithHeading(props: { value: DateValue }) {
  return (
    <Calendar
      aria-label="Event date"
      value={props.value}
      maxValue={MAX_VALUE}
      minValue={MIN_VALUE}
    >
      <Calendar.Header>
        <Calendar.Heading />
        <Calendar.NavButton slot="previous" />
        <Calendar.NavButton slot="next" />
      </Calendar.Header>
      <Calendar.Grid>
        <Calendar.GridHeader>
          {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
        </Calendar.GridHeader>
        <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
      </Calendar.Grid>
    </Calendar>
  );
}

function Default() {
  return (
    <Stage>
      <WithYearPicker defaultValue={DEFAULT_VALUE} />
    </Stage>
  );
}

function Change() {
  return (
    <Stage>
      <WithYearPicker
        defaultValue={DEFAULT_VALUE}
        onChange={(value) => probe("onChange")(value?.toString())}
      />
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <WithYearPicker
        defaultValue={DEFAULT_VALUE}
        isDisabled
        onChange={(value) => probe("onChange")(value?.toString())}
      />
    </Stage>
  );
}

function ControlledFirst() {
  return (
    <Stage>
      <WithHeading value={DEFAULT_VALUE} />
    </Stage>
  );
}

function ControlledSecond() {
  return (
    <Stage>
      <WithHeading value={parseDate("2026-08-20")} />
    </Stage>
  );
}

function DayView() {
  return (
    <Stage>
      <WithYearPicker defaultValue={DEFAULT_VALUE} probes visibleDuration={{ days: 7 }} />
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

function GeometryDay() {
  return (
    <Stage>
      <WithYearPicker defaultValue={DEFAULT_VALUE} probes visibleDuration={{ days: 7 }} />
    </Stage>
  );
}

function GeometryYearPicker() {
  return (
    <Stage>
      <WithYearPicker defaultValue={DEFAULT_VALUE} probes />
    </Stage>
  );
}

export const calendarScenarios: Record<string, Component> = {
  "calendar/default": Default,
  "calendar/change": Change,
  "calendar/disabled": Disabled,
  "calendar/controlled-first": ControlledFirst,
  "calendar/controlled-second": ControlledSecond,
  "calendar/day-view": DayView,
  "calendar/geometry": Geometry,
  "calendar/geometry-day": GeometryDay,
  "calendar/geometry-year-picker": GeometryYearPicker,
};
