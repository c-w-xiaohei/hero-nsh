import { signal, Text, View } from "nsh";
import {
  Button,
  Calendar,
  DateField,
  DatePicker,
  Description,
  FieldError,
  Form,
  Label,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared DatePicker scenarios, written with HeroUI 3.2.7's public API only, so
 * the reference app and this library render the same JSX. The story file is
 * date-picker.stories.tsx; every entry below is one story except the four
 * `.split` entries and the four geometry shapes (port sheet 4b, "需要的共享
 * 场景" and §4c).
 *
 *   date-picker/default               story Default: a 280pt root, Label, the
 *                                     fullWidth group with the trigger in the
 *                                     suffix, and the calendar in the popover
 *   date-picker/controlled.split      story Controlled: the story's `useState`
 *                                     becomes a signal here, and the footer
 *                                     Description reads the current value
 *   date-picker/disabled              story Disabled: a fixed value, isDisabled
 *   date-picker/validation.split      story WithValidation: a signal holding a
 *                                     value before `minValue`, so the FieldError
 *                                     branch is the one on screen
 *   date-picker/custom-indicator.split
 *                                     story WithCustomIndicator: NSH draws no
 *                                     svg, so the story's `@iconify` Icon becomes
 *                                     a View stand-in (number-field / time-field
 *                                     precedent); the reference side keeps it
 *   date-picker/form.split            story FormExample without the 1200 ms
 *                                     timer and the console.log: NSH clears the
 *                                     value on submit and counts the submits
 *   date-picker/geometry              §4c G-001: a 600pt frame around label,
 *                                     group and description, every part
 *                                     reporting its bounds
 *   date-picker/geometry-popover      §4c G-002 shape A: the same picker with
 *                                     the popover open at mount, popover and
 *                                     calendar reporting their bounds
 *   date-picker/geometry-popover-layout
 *                                     §4c G-002 shape B: the popover opened at
 *                                     mount with the caller's `flex items-start
 *                                     gap-4` row and a trailing preset button
 *   date-picker/geometry-trigger      §4c G-003: a 280pt root with the group,
 *                                     the suffix, the trigger and the indicator
 *                                     reporting their bounds
 *
 * The stories read `today(getLocalTimeZone())` for their value and their
 * `minValue`. These scenarios use two fixed dates instead, so the reference and
 * candidate screenshots of one scenario do not depend on when they ran
 * (time-field's precedent). The painted state is the same: one valid value and
 * one value before the minimum.
 *
 * `nsh/test` cannot read computed styles or focus, so the geometry entries
 * record bounds through `probe`, as the calendar scenarios do. Bounds are
 * relative to each part's parent, which is what the G cases compare.
 */

const VALUE = parseDate("2026-08-15");
const BEFORE_MIN = parseDate("2026-08-10");

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

/* The story's `CalendarContent`: the calendar with the year picker in its
 * header. It passes no value of its own — inside a DatePicker it shares the
 * picker's value (port sheet §5, contract one). */
function CalendarContent(props: { probes?: boolean }) {
  return (
    <Calendar aria-label="Selected date" onLayout={props.probes ? layout("calendar") : undefined}>
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

/* The story's `DatePickerField`: Label, the fullWidth group with the trigger in
 * its suffix, an optional description, and the popover. The trigger carries an
 * `aria-label` here: the stories leave it to the component's default name
 * ("Calendar", port sheet §8 item 7) and the cases need a selector that cannot
 * be confused with the calendar inside the popover. It is invisible either way. */
function DatePickerField(props: {
  showDescription?: boolean;
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
      <Label>Date</Label>
      <DateField.Group fullWidth>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger aria-label="Open calendar">
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      {props.showDescription ? (
        <Description>Select a date from the calendar.</Description>
      ) : null}
      <DatePicker.Popover
        aria-label={props.popoverProps?.["aria-label"]}
        className={props.popoverProps?.className}
        onLayout={props.popoverProps?.onLayout}
      >
        <CalendarContent probes={props.probes} />
        {props.preset ? (
          <Button onLayout={layout("preset")}>Use today</Button>
        ) : null}
      </DatePicker.Popover>
    </>
  );
}

function Default() {
  return (
    <Stage>
      <DatePicker className="w-[280px]" name="date">
        <DatePickerField />
      </DatePicker>
    </Stage>
  );
}

/* NSH side of the split: a signal where the story has `useState`. */
function ControlledSplit() {
  const value = signal<DateValue | null>(VALUE);

  return (
    <Stage>
      <View class="flex w-64 flex-col gap-2">
        <DatePicker
          name="date"
          value={value()}
          onChange={(next: DateValue | null) => value.set(next)}
        >
          <DatePickerField showDescription />
        </DatePicker>
        <Description>Current value: {value() ? value()!.toString() : "(empty)"}</Description>
      </View>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <DatePicker className="w-64" isDisabled name="date" value={VALUE}>
        <DatePickerField />
      </DatePicker>
    </Stage>
  );
}

/* NSH side of the split: the story's `useState` becomes a signal, and the
 * starting value is before `minValue`, so the invalid branch is the painted
 * one. */
function ValidationSplit() {
  const value = signal<DateValue | null>(BEFORE_MIN);
  const isInvalid = () => value() != null && value()!.compare(VALUE) < 0;

  return (
    <Stage>
      <DatePicker
        isRequired
        className="w-64"
        isInvalid={isInvalid()}
        minValue={VALUE}
        name="date"
        value={value()}
        onChange={(next: DateValue | null) => value.set(next)}
      >
        <Label>Appointment date</Label>
        <DateField.Group fullWidth>
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateField.Suffix>
            <DatePicker.Trigger aria-label="Open calendar">
              <DatePicker.TriggerIndicator />
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        {isInvalid() ? (
          <FieldError>Date must be today or in the future.</FieldError>
        ) : (
          <Description>Select a date from today onward.</Description>
        )}
        <DatePicker.Popover>
          <CalendarContent />
        </DatePicker.Popover>
      </DatePicker>
    </Stage>
  );
}

/* NSH side of the split: the story's svg chevron becomes a Glyph. */
function CustomIndicatorSplit() {
  return (
    <Stage>
      <DatePicker className="w-64" name="date">
        <Label>Date</Label>
        <DateField.Group fullWidth>
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateField.Suffix>
            <DatePicker.Trigger aria-label="Open calendar">
              <DatePicker.TriggerIndicator>
                <Glyph />
              </DatePicker.TriggerIndicator>
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <Description>
          Use a custom trigger icon while keeping DatePicker behavior.
        </Description>
        <DatePicker.Popover>
          <CalendarContent />
        </DatePicker.Popover>
      </DatePicker>
    </Stage>
  );
}

/* NSH side of the split: the story's 1200 ms submit timer becomes an immediate
 * clear plus a counter, so the scenario keeps its visible evidence of a submit
 * without a timer (port sheet 4b). */
function FormSplit() {
  const value = signal<DateValue | null>(null);
  const submitted = signal(0);
  const isInvalid = () => value() != null && value()!.compare(VALUE) < 0;

  return (
    <Stage>
      <View class="flex w-64 flex-col gap-3">
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            if (!value() || isInvalid()) return;
            value.set(null);
            submitted.set(submitted() + 1);
          }}
        >
          <DatePicker
            isRequired
            isInvalid={isInvalid()}
            minValue={VALUE}
            name="appointmentDate"
            value={value()}
            onChange={(next: DateValue | null) => value.set(next)}
          >
            <Label>Appointment date</Label>
            <DateField.Group fullWidth>
              <DateField.Input>
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateField.Suffix>
                <DatePicker.Trigger aria-label="Open calendar">
                  <DatePicker.TriggerIndicator />
                </DatePicker.Trigger>
              </DateField.Suffix>
            </DateField.Group>
            {isInvalid() ? (
              <FieldError>Date must be today or in the future.</FieldError>
            ) : (
              <Description>Choose a valid appointment date.</Description>
            )}
            <DatePicker.Popover>
              <CalendarContent />
            </DatePicker.Popover>
          </DatePicker>
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
 * child while the group stays `w-full` inside it. */
function Geometry() {
  return (
    <Stage>
      <View class="w-[600px]" onLayout={layout("frame")}>
        <DatePicker name="date" onLayout={layout("root")}>
          <Label onLayout={layout("label")}>Date</Label>
          <DateField.Group fullWidth onLayout={layout("group")}>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              <DatePicker.Trigger aria-label="Open calendar">
                <DatePicker.TriggerIndicator />
              </DatePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <Description onLayout={layout("description")}>Select a date.</Description>
          <DatePicker.Popover>
            <CalendarContent />
          </DatePicker.Popover>
        </DatePicker>
      </View>
    </Stage>
  );
}

/* §4c G-002 shape A: the popover is open at mount, so the calendar's box and
 * the popover's box exist without a press. `defaultValue` pins the month to the
 * one the sheet measured: an empty picker opens on today's month, which would
 * make the month in the grid's name depend on when the test ran. */
function GeometryPopover() {
  return (
    <Stage>
      <DatePicker defaultValue={VALUE} defaultOpen className="w-[280px]" name="date">
        <DatePickerField probes popoverProps={{ onLayout: layout("popover") }} />
      </DatePicker>
    </Stage>
  );
}

/* §4c G-002 shape B: the caller's row turns the popover content into a row with
 * the calendar and a trailing preset button. The same fixed value as shape A, so
 * both shapes show the same month and their calendars compare. */
function GeometryPopoverLayout() {
  return (
    <Stage>
      <DatePicker defaultValue={VALUE} defaultOpen className="w-[280px]" name="date">
        <DatePickerField
          preset
          probes
          popoverProps={{
            className: "flex items-start gap-4",
            "aria-label": "Choose a date",
            onLayout: layout("popover"),
          }}
        />
      </DatePicker>
    </Stage>
  );
}

/* §4c G-003: the group, the suffix, the trigger and the indicator inside it. */
function GeometryTrigger() {
  return (
    <Stage>
      <DatePicker className="w-[280px]" name="date">
        <Label>Date</Label>
        <DateField.Group fullWidth onLayout={layout("group")}>
          <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
          <DateField.Suffix onLayout={layout("suffix")}>
            <DatePicker.Trigger aria-label="Open calendar" onLayout={layout("trigger")}>
              <DatePicker.TriggerIndicator onLayout={layout("indicator")} />
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <DatePicker.Popover>
          <CalendarContent />
        </DatePicker.Popover>
      </DatePicker>
    </Stage>
  );
}

export const datePickerScenarios: Record<string, Component> = {
  "date-picker/default": Default,
  "date-picker/controlled.split": ControlledSplit,
  "date-picker/disabled": Disabled,
  "date-picker/validation.split": ValidationSplit,
  "date-picker/custom-indicator.split": CustomIndicatorSplit,
  "date-picker/form.split": FormSplit,
  "date-picker/geometry": Geometry,
  "date-picker/geometry-popover": GeometryPopover,
  "date-picker/geometry-popover-layout": GeometryPopoverLayout,
  "date-picker/geometry-trigger": GeometryTrigger,
};
