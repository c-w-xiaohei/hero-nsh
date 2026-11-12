import { host, mount } from "nsh";
import { Button, DateField, DateRangePicker, Label, RangeCalendar } from "@heroui/react";
import { CalendarDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only DateRangePicker fixture (port sheet 4b, "需要的 NSH-only fixture").
 * The shared scenarios cover the stories, which carry no callbacks and no test
 * ids; the regression cases that read a callback back or target one part by
 * `testID` open this file instead.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape:
 *   default             Label "Trip dates" + the group with the two slotted
 *                       inputs around the separator + the suffix trigger + the
 *                       range calendar in the popover; `defaultValue` from the
 *                       `start*` / `end*` params (2026-08-01 … 2026-08-05), root
 *                       `onChange` probe, trigger `onFocus` probe, `onLayout`
 *                       probes on the separator and the suffix (T-001 … T-003)
 *   open                the same plus an `onOpenChange` probe (controlled open
 *                       state, port sheet §1.2)
 *   layout              the same with the popover carrying `flex items-start
 *                       gap-4`, an explicit `aria-label`, and `onLayout` probes
 *                       on the range calendar and a trailing preset button (T-007)
 *   no-close-on-select  `shouldCloseOnSelect={false}`, for the hand check and the
 *                       screenshot stage
 *   controlled          `value` from the params, `onChange` probe (controlled
 *                       write-back)
 *
 * testIDs: drp-root, drp-group, drp-start-input, drp-end-input, drp-trigger,
 * drp-popover, drp-calendar, drp-preset. The separator and the suffix are read
 * through their `onLayout` probes only: `DateField.Input` takes no `onLayout`
 * (the shared `date-input-group` Input reads a fixed prop list), so a field's own
 * box is not observable — T-001 derives the two fields' widths from the
 * separator and suffix boxes it can read.
 *
 * The host locale would otherwise decide the date order and the segment names,
 * so every case pins `locale` through the test's `open` options (en-US).
 */

const DEFAULT_START = { year: 2026, month: 8, day: 1 };
const DEFAULT_END = { year: 2026, month: 8, day: 5 };

function numberParam(name: string): number | undefined {
  const raw = host.params[name];

  if (raw === undefined) return undefined;

  return typeof raw === "number" ? raw : Number(raw);
}

/** One end of the range the fixture starts from: params, else the sheet's date. */
function dateParam(prefix: string, fallback: { year: number; month: number; day: number }) {
  return new CalendarDate(
    numberParam(`${prefix}Year`) ?? fallback.year,
    numberParam(`${prefix}Month`) ?? fallback.month,
    numberParam(`${prefix}Day`) ?? fallback.day,
  );
}

/** The range the fixture starts from: 2026-08-01 … 2026-08-05 unless params say otherwise. */
function startRange(): { start: CalendarDate; end: CalendarDate } {
  return { start: dateParam("start", DEFAULT_START), end: dateParam("end", DEFAULT_END) };
}

type DateRecord = { year: number; month: number; day: number };

/** One `DateValue` as `{year, month, day}`: a `DateValue` does not survive JSON. */
function record(date: DateValue): DateRecord {
  return { year: date.year, month: date.month, day: date.day };
}

/** The `onChange` payload as `{start, end}` in the probe's JSON-safe shape. */
function recordRange(value: { start: DateValue; end: DateValue } | null): void {
  probe("onChange")(value ? { start: record(value.start), end: record(value.end) } : null);
}

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

/* The upstream `RangeCalendarContent`: the range calendar shares the picker's
 * range, so it passes none of its own (port sheet §5, contract one). */
function RangeCalendarContent(props: { probes?: boolean }) {
  return (
    <RangeCalendar
      aria-label="Selected range"
      testID="drp-calendar"
      onLayout={props.probes ? layout("calendar") : undefined}
    >
      <RangeCalendar.Header>
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

type ShellProps = {
  defaultValue?: { start: CalendarDate; end: CalendarDate };
  value?: { start: CalendarDate; end: CalendarDate };
  shouldCloseOnSelect?: boolean;
  onOpenChange?: (open: boolean) => void;
  probes?: boolean;
  preset?: boolean;
  popoverProps?: {
    className?: string;
    "aria-label"?: string;
  };
};

function Shell(props: ShellProps) {
  return (
    <Stage>
      <DateRangePicker
        defaultValue={props.defaultValue}
        endName="endDate"
        onChange={recordRange}
        onOpenChange={props.onOpenChange}
        shouldCloseOnSelect={props.shouldCloseOnSelect}
        startName="startDate"
        testID="drp-root"
        value={props.value}
      >
        <Label>Trip dates</Label>
        <DateField.Group fullWidth testID="drp-group">
          <DateField.Input slot="start" testID="drp-start-input">
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateRangePicker.RangeSeparator onLayout={layout("separator")} />
          <DateField.Input slot="end" testID="drp-end-input">
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateField.Suffix onLayout={layout("suffix")}>
            <DateRangePicker.Trigger
              aria-label="Open calendar"
              onFocus={() => probe("trigger-focus")()}
              testID="drp-trigger"
            >
              <DateRangePicker.TriggerIndicator />
            </DateRangePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <DateRangePicker.Popover
          aria-label={props.popoverProps?.["aria-label"]}
          className={props.popoverProps?.className}
          testID="drp-popover"
        >
          <RangeCalendarContent probes={props.probes} />
          {props.preset ? (
            <Button onLayout={layout("preset")} testID="drp-preset">
              Use today
            </Button>
          ) : null}
        </DateRangePicker.Popover>
      </DateRangePicker>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "default");

  if (name === "open") {
    return <Shell defaultValue={startRange()} onOpenChange={probe("openChange")} />;
  }

  if (name === "layout") {
    return (
      <Shell
        defaultValue={startRange()}
        preset
        probes
        popoverProps={{
          className: "flex items-start gap-4",
          "aria-label": "Choose a range",
        }}
      />
    );
  }

  if (name === "no-close-on-select") {
    return <Shell defaultValue={startRange()} shouldCloseOnSelect={false} />;
  }

  if (name === "controlled") {
    return <Shell value={startRange()} />;
  }

  return <Shell defaultValue={startRange()} />;
}

mount(Fixture);
