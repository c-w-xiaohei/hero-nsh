import { signal, Text, View } from "nsh";
import {
  Button,
  DateField,
  DateRangePicker,
  Description,
  FieldError,
  Form,
  Label,
  RangeCalendar,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared DateRangePicker scenarios, written with HeroUI 3.2.7's public API only,
 * so the reference app and this library render the same JSX. The story file is
 * date-range-picker.stories.tsx; every entry below is one story except the four
 * `.split` entries and the five geometry shapes (port sheet 4b, "需要的共享
 * 场景" and §4c).
 *
 *   date-range-picker/default             story Default: a 320pt root, Label, the
 *                                         fullWidth group with the two slotted
 *                                         inputs around the range separator, the
 *                                         trigger in the suffix, and the range
 *                                         calendar in the popover
 *   date-range-picker/controlled.split    story Controlled: the story's `useState`
 *                                         becomes a signal here, and the footer
 *                                         Description reads the current range
 *   date-range-picker/disabled            story Disabled: a fixed range, isDisabled
 *   date-range-picker/validation.split    story WithValidation: a signal holding a
 *                                         range before `minValue`, so the
 *                                         FieldError branch is the one on screen
 *   date-range-picker/custom-indicator.split
 *                                         story WithCustomIndicator: NSH draws no
 *                                         svg, so the story's `@iconify` Icon
 *                                         becomes a View stand-in (date-picker /
 *                                         number-field precedent); the reference
 *                                         side keeps it
 *   date-range-picker/form.split          story FormExample without the 1200 ms
 *                                         timer and the console.log: NSH clears the
 *                                         range on submit and counts the submits
 *   date-range-picker/geometry            §4c G-001: a 600pt frame around label,
 *                                         group, the separator and description,
 *                                         each reporting its bounds
 *   date-range-picker/geometry-popover    §4c G-002 shape A: the same picker with
 *                                         the popover open at mount, popover and
 *                                         range calendar reporting their bounds
 *   date-range-picker/geometry-popover-layout
 *                                         §4c G-002 shape B: the popover opened at
 *                                         mount with the caller's `flex items-start
 *                                         gap-4` row and a trailing preset button
 *   date-range-picker/geometry-range      §4c G-003 shape A: a content-driven group
 *                                         (no `fullWidth`), group, separator and
 *                                         suffix reporting bounds
 *   date-range-picker/geometry-range-filled
 *                                         §4c G-003 shape C: the same group with both
 *                                         dates filled in
 *
 * The stories read `today(getLocalTimeZone())` for their value and their
 * `minValue`. These scenarios use fixed dates instead, so the reference and
 * candidate screenshots of one scenario do not depend on when they ran
 * (date-picker's precedent). The painted state is the same: one valid range and
 * one range before the minimum.
 *
 * The trigger carries `aria-label="Open calendar"`: the stories leave it to the
 * component's default name ("Calendar", port sheet §8 item 8) and the cases need
 * a selector that cannot be confused with the range calendar inside the popover.
 * It is invisible either way.
 *
 * `nsh/test` cannot read computed styles or focus, so the geometry entries
 * record bounds through `probe`, as the calendar scenarios do. Bounds are
 * relative to each part's parent, which is what the G cases compare.
 *
 * `DateField.Input` takes no `onLayout` (the shared `date-input-group` Input
 * reads a fixed prop list and does not forward it), so a field's own box cannot
 * be probed. The two fields' widths are derived from their siblings instead: the
 * start field runs from the row's left edge to the separator, the end field from
 * the separator to the suffix — both sibling boxes are probed.
 */

type DateRange = { start: DateValue; end: DateValue };

const RANGE: DateRange = { start: parseDate("2026-08-01"), end: parseDate("2026-08-05") };
const MIN_VALUE = parseDate("2026-08-01");
const BEFORE_MIN: DateRange = { start: parseDate("2026-07-20"), end: parseDate("2026-07-24") };

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

/* A View stand-in for the story's `@iconify` chevron: NSH draws no svg. */
function Glyph(props: { class?: string }) {
  return <View class={props.class ?? "size-4 rounded-sm bg-field-foreground"} />;
}

/* The story's `RangeCalendarContent`: the range calendar with the year picker in
 * its header. It passes no value of its own — inside a DateRangePicker it shares
 * the picker's range (port sheet §5, contract one). */
function RangeCalendarContent(props: { probes?: boolean }) {
  return (
    <RangeCalendar
      aria-label="Selected range"
      onLayout={props.probes ? layout("calendar") : undefined}
    >
      <RangeCalendar.Header>
        <RangeCalendar.YearPickerTrigger>
          <RangeCalendar.YearPickerTriggerHeading />
          <RangeCalendar.YearPickerTriggerIndicator />
        </RangeCalendar.YearPickerTrigger>
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
      <RangeCalendar.YearPickerGrid>
        <RangeCalendar.YearPickerGridBody>
          {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
        </RangeCalendar.YearPickerGridBody>
      </RangeCalendar.YearPickerGrid>
    </RangeCalendar>
  );
}

/* The story's `DateRangePickerField`: Label, the fullWidth group with both
 * slotted inputs around the range separator, the trigger in the suffix, an
 * optional description, and the popover. */
function DateRangePickerField(props: {
  showDescription?: boolean;
  /* G-001 / G-003: the group's parts report their own bounds. */
  groupProbes?: boolean;
  /* G-003: a content-driven group instead of the stories' `fullWidth`. */
  contentWidth?: boolean;
  popoverProps?: {
    className?: string;
    "aria-label"?: string;
    onLayout?: (event: LayoutEvent) => void;
  };
  probes?: boolean;
  /* G-002 shape B: the upstream browser case appends a preset button after the
   * calendar, inside the popover. */
  preset?: boolean;
}) {
  return (
    <>
      <Label onLayout={props.groupProbes ? layout("label") : undefined}>Trip dates</Label>
      <DateField.Group
        fullWidth={!props.contentWidth}
        onLayout={props.groupProbes ? layout("group") : undefined}
      >
        <DateField.Input slot="start">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateRangePicker.RangeSeparator
          onLayout={props.groupProbes ? layout("separator") : undefined}
        />
        <DateField.Input slot="end">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix onLayout={props.groupProbes ? layout("suffix") : undefined}>
          <DateRangePicker.Trigger
            aria-label="Open calendar"
            onLayout={props.groupProbes ? layout("trigger") : undefined}
          >
            <DateRangePicker.TriggerIndicator />
          </DateRangePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      {props.showDescription ? (
        <Description onLayout={props.groupProbes ? layout("description") : undefined}>
          Select your check-in and check-out dates.
        </Description>
      ) : null}
      <DateRangePicker.Popover
        aria-label={props.popoverProps?.["aria-label"]}
        className={props.popoverProps?.className}
        onLayout={props.popoverProps?.onLayout}
      >
        <RangeCalendarContent probes={props.probes} />
        {props.preset ? (
          <Button onLayout={layout("preset")}>Use today</Button>
        ) : null}
      </DateRangePicker.Popover>
    </>
  );
}

function Default() {
  return (
    <Stage>
      <DateRangePicker className="w-[320px]" endName="endDate" startName="startDate">
        <DateRangePickerField />
      </DateRangePicker>
    </Stage>
  );
}

/* NSH side of the split: a signal where the story has `useState`. */
function ControlledSplit() {
  const value = signal<DateRange | null>(RANGE);

  return (
    <Stage>
      <View class="flex w-[320px] flex-col gap-2">
        <DateRangePicker
          endName="endDate"
          startName="startDate"
          value={value()}
          onChange={(next: DateRange | null) => value.set(next)}
        >
          <DateRangePickerField showDescription />
        </DateRangePicker>
        <Description>
          Current value: {value() ? `${value()!.start.toString()} -> ${value()!.end.toString()}` : "(empty)"}
        </Description>
      </View>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <DateRangePicker
        isDisabled
        className="w-[320px]"
        endName="endDate"
        startName="startDate"
        value={RANGE}
      >
        <DateRangePickerField />
      </DateRangePicker>
    </Stage>
  );
}

/* NSH side of the split: the story's `useState` becomes a signal, and the
 * starting range is before `minValue`, so the invalid branch is the painted
 * one. */
function ValidationSplit() {
  const value = signal<DateRange | null>(BEFORE_MIN);
  const isInvalid = () =>
    value() != null &&
    (value()!.start.compare(MIN_VALUE) < 0 || value()!.end.compare(value()!.start) < 0);

  return (
    <Stage>
      <DateRangePicker
        isRequired
        className="w-[320px]"
        endName="endDate"
        isInvalid={isInvalid()}
        minValue={MIN_VALUE}
        startName="startDate"
        value={value()}
        onChange={(next: DateRange | null) => value.set(next)}
      >
        <Label>Booking period</Label>
        <DateField.Group fullWidth>
          <DateField.Input slot="start">
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateRangePicker.RangeSeparator />
          <DateField.Input slot="end">
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateField.Suffix>
            <DateRangePicker.Trigger aria-label="Open calendar">
              <DateRangePicker.TriggerIndicator />
            </DateRangePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        {isInvalid() ? (
          <FieldError>Select a valid range starting today or later.</FieldError>
        ) : (
          <Description>Choose a check-in and check-out date.</Description>
        )}
        <DateRangePicker.Popover>
          <RangeCalendarContent />
        </DateRangePicker.Popover>
      </DateRangePicker>
    </Stage>
  );
}

/* NSH side of the split: the story's svg chevron becomes a Glyph. */
function CustomIndicatorSplit() {
  return (
    <Stage>
      <DateRangePicker className="w-[320px]" endName="endDate" startName="startDate">
        <Label>Trip dates</Label>
        <DateField.Group fullWidth>
          <DateField.Input slot="start">
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateRangePicker.RangeSeparator />
          <DateField.Input slot="end">
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateField.Suffix>
            <DateRangePicker.Trigger aria-label="Open calendar">
              <DateRangePicker.TriggerIndicator>
                <Glyph />
              </DateRangePicker.TriggerIndicator>
            </DateRangePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <Description>
          Use a custom trigger icon while preserving DateRangePicker behavior.
        </Description>
        <DateRangePicker.Popover>
          <RangeCalendarContent />
        </DateRangePicker.Popover>
      </DateRangePicker>
    </Stage>
  );
}

/* NSH side of the split: the story's 1200 ms submit timer becomes an immediate
 * clear plus a counter, so the scenario keeps its visible evidence of a submit
 * without a timer (port sheet 4b). */
function FormSplit() {
  const value = signal<DateRange | null>(null);
  const submitted = signal(0);
  const isInvalid = () =>
    value() != null &&
    (value()!.start.compare(MIN_VALUE) < 0 || value()!.end.compare(value()!.start) < 0);

  return (
    <Stage>
      <View class="flex w-[320px] flex-col gap-3">
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            if (!value() || isInvalid()) return;
            value.set(null);
            submitted.set(submitted() + 1);
          }}
        >
          <DateRangePicker
            isRequired
            endName="tripEndDate"
            isInvalid={isInvalid()}
            minValue={MIN_VALUE}
            startName="tripStartDate"
            value={value()}
            onChange={(next: DateRange | null) => value.set(next)}
          >
            <Label>Trip dates</Label>
            <DateField.Group fullWidth>
              <DateField.Input slot="start">
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateRangePicker.RangeSeparator />
              <DateField.Input slot="end">
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateField.Suffix>
                <DateRangePicker.Trigger aria-label="Open calendar">
                  <DateRangePicker.TriggerIndicator />
                </DateRangePicker.Trigger>
              </DateField.Suffix>
            </DateField.Group>
            {isInvalid() ? (
              <FieldError>Please choose a valid range in the future.</FieldError>
            ) : (
              <Description>Select your check-in and check-out dates.</Description>
            )}
            <DateRangePicker.Popover>
              <RangeCalendarContent />
            </DateRangePicker.Popover>
          </DateRangePicker>
          <Button type="submit" isDisabled={!value() || isInvalid()}>
            Submit
          </Button>
        </Form>
        <Text>Submitted {submitted()} times</Text>
      </View>
    </Stage>
  );
}

/* §4c G-001: a 600pt frame around the root. The root shrinks to its widest
 * child while the group stays `w-full` inside it, and the separator sits
 * between the two inputs. */
function Geometry() {
  return (
    <Stage>
      <View class="w-[600px]" onLayout={layout("frame")}>
        <DateRangePicker endName="endDate" startName="startDate" onLayout={layout("root")}>
          <DateRangePickerField groupProbes showDescription />
        </DateRangePicker>
      </View>
    </Stage>
  );
}

/* §4c G-002 shape A: the popover is open at mount, so the range calendar's box
 * and the popover's box exist without a press. `defaultValue` pins the month to
 * the one the sheet measured: an empty picker opens on today's month, which
 * would make the month in the grid's name depend on when the test ran. */
function GeometryPopover() {
  return (
    <Stage>
      <DateRangePicker
        defaultValue={RANGE}
        defaultOpen
        className="w-[320px]"
        endName="endDate"
        startName="startDate"
      >
        <DateRangePickerField probes popoverProps={{ onLayout: layout("popover") }} />
      </DateRangePicker>
    </Stage>
  );
}

/* §4c G-002 shape B: the caller's row turns the popover content into a row with
 * the range calendar and a trailing preset button. The same fixed range as
 * shape A, so both shapes show the same month and their calendars compare. */
function GeometryPopoverLayout() {
  return (
    <Stage>
      <DateRangePicker
        defaultValue={RANGE}
        defaultOpen
        className="w-[320px]"
        endName="endDate"
        startName="startDate"
      >
        <DateRangePickerField
          preset
          probes
          popoverProps={{
            className: "flex items-start gap-4",
            "aria-label": "Choose a range",
            onLayout: layout("popover"),
          }}
        />
      </DateRangePicker>
    </Stage>
  );
}

/* §4c G-003 shape A: a content-driven group (no `fullWidth`), so its width is
 * the two inputs plus the separator plus the suffix — the shape where a
 * collapsed `flex-1` end input would show. */
function GeometryRange() {
  return (
    <Stage>
      <DateRangePicker endName="endDate" startName="startDate">
        <DateRangePickerField contentWidth groupProbes />
      </DateRangePicker>
    </Stage>
  );
}

/* §4c G-003 shape C: the same content-driven group with both dates filled in. */
function GeometryRangeFilled() {
  return (
    <Stage>
      <DateRangePicker
        defaultValue={RANGE}
        endName="endDate"
        startName="startDate"
      >
        <DateRangePickerField contentWidth groupProbes />
      </DateRangePicker>
    </Stage>
  );
}

export const dateRangePickerScenarios: Record<string, Component> = {
  "date-range-picker/default": Default,
  "date-range-picker/controlled.split": ControlledSplit,
  "date-range-picker/disabled": Disabled,
  "date-range-picker/validation.split": ValidationSplit,
  "date-range-picker/custom-indicator.split": CustomIndicatorSplit,
  "date-range-picker/form.split": FormSplit,
  "date-range-picker/geometry": Geometry,
  "date-range-picker/geometry-popover": GeometryPopover,
  "date-range-picker/geometry-popover-layout": GeometryPopoverLayout,
  "date-range-picker/geometry-range": GeometryRange,
  "date-range-picker/geometry-range-filled": GeometryRangeFilled,
};
