import { host, mount } from "nsh";
import { Button, Calendar, DateField, DatePicker, Label } from "@heroui/react";
import { CalendarDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only DatePicker fixture (port sheet 4b.3). The shared scenarios cover the
 * stories, which carry no callbacks and no test ids; the regression cases that
 * read a callback back or target one part by `testID` open this file instead.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape; `year` / `month` / `day` feed the value:
 *   default           Label "Date" + group + input + segments + the suffix
 *                     trigger, defaultValue 2026-08-15, root `onChange` probe,
 *                     trigger `onFocus` probe (T-001 … T-003)
 *   open              the same plus an `onOpenChange` probe (controlled open
 *                     state, port sheet §1.2)
 *   layout            the same with the popover carrying `flex items-start
 *                     gap-4`, an explicit `aria-label`, and `onLayout` probes on
 *                     the calendar and a trailing preset button (T-007)
 *   no-close-on-select
 *                     `shouldCloseOnSelect={false}`, for the hand check and the
 *                     screenshot stage
 *   motion            the default shape with the caller's `duration-[6000ms]` on
 *                     the popover: a transition long enough for a screenshot to
 *                     land inside it, for the reduced-motion paint case (X-001)
 *   controlled        `value` from params year/month/day, `onChange` probe
 *                     (controlled write-back)
 *
 * testIDs: dp-root, dp-group, dp-trigger, dp-popover, dp-calendar, dp-preset.
 * The host locale would otherwise decide the date order and the segment names,
 * so every case pins `locale` through the test's `open` options (en-US).
 */

const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = 8;
const DEFAULT_DAY = 15;

function numberParam(name: string): number | undefined {
  const raw = host.params[name];

  if (raw === undefined) return undefined;

  return typeof raw === "number" ? raw : Number(raw);
}

/** The value the fixture starts from: params `year` / `month` / `day`, else 2026-08-15. */
function startDate(): CalendarDate {
  return new CalendarDate(
    numberParam("year") ?? DEFAULT_YEAR,
    numberParam("month") ?? DEFAULT_MONTH,
    numberParam("day") ?? DEFAULT_DAY,
  );
}

/** The `onChange` payload as `{year, month, day}`: a `DateValue` does not survive JSON. */
function recordChange(value: DateValue | null): void {
  probe("onChange")(
    value ? { year: value.year, month: value.month, day: value.day } : null,
  );
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

/* The upstream `CalendarContent`: the calendar shares the picker's value, so it
 * passes none of its own (port sheet §5, contract one). */
function CalendarContent(props: { probes?: boolean }) {
  return (
    <Calendar
      aria-label="Selected date"
      testID="dp-calendar"
      onLayout={props.probes ? layout("calendar") : undefined}
    >
      <Calendar.Header>
        <Calendar.YearPickerTrigger>
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
  );
}

type ShellProps = {
  defaultValue?: CalendarDate;
  value?: CalendarDate;
  shouldCloseOnSelect?: boolean;
  onOpenChange?: (open: boolean) => void;
  probes?: boolean;
  preset?: boolean;
  popoverProps?: {
    className?: string;
    "aria-label"?: string;
    onLayout?: (event: LayoutEvent) => void;
  };
};

function Shell(props: ShellProps) {
  return (
    <Stage>
      <DatePicker
        defaultValue={props.defaultValue}
        name="date"
        onChange={recordChange}
        onOpenChange={props.onOpenChange}
        shouldCloseOnSelect={props.shouldCloseOnSelect}
        testID="dp-root"
        value={props.value}
      >
        <Label>Date</Label>
        <DateField.Group testID="dp-group">
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateField.Suffix>
            <DatePicker.Trigger
              aria-label="Open calendar"
              onFocus={() => probe("trigger-focus")()}
              testID="dp-trigger"
            >
              <DatePicker.TriggerIndicator />
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <DatePicker.Popover
          aria-label={props.popoverProps?.["aria-label"]}
          className={props.popoverProps?.className}
          onLayout={props.popoverProps?.onLayout}
          testID="dp-popover"
        >
          <CalendarContent probes={props.probes} />
          {props.preset ? (
            <Button onLayout={layout("preset")} testID="dp-preset">
              Use today
            </Button>
          ) : null}
        </DatePicker.Popover>
      </DatePicker>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "default");

  if (name === "open") {
    return <Shell defaultValue={startDate()} onOpenChange={probe("openChange")} />;
  }

  if (name === "layout") {
    return (
      <Shell
        defaultValue={startDate()}
        preset
        probes
        popoverProps={{
          className: "flex items-start gap-4",
          "aria-label": "Choose a date",
        }}
      />
    );
  }

  if (name === "no-close-on-select") {
    return <Shell defaultValue={startDate()} shouldCloseOnSelect={false} />;
  }

  if (name === "motion") {
    return <Shell defaultValue={startDate()} popoverProps={{ className: "duration-[6000ms]" }} />;
  }

  if (name === "controlled") {
    return <Shell value={startDate()} />;
  }

  return <Shell defaultValue={startDate()} />;
}

mount(Fixture);
