import { signal, View } from "nsh";
import { Button, DateField, Description, FieldError, Form, Label } from "@heroui/react";
import { parseDate, parseDateTime, today, getLocalTimeZone } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared DateField scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app and this library render the same JSX. The story file is
 * date-field.stories.tsx; every entry below is one story except the controlled
 * / validation / form stories and the three icon splits (port sheet 4b,
 * "需要的共享场景").
 *
 *   date-field/default          story Default: Label, group, 256pt field
 *   date-field/variants         story Variants: primary and secondary groups
 *   date-field/full-width       story FullWidth, without the second field's
 *                               icons (they are the icon splits below)
 *   date-field/description      story WithDescription: two fields
 *   date-field/required         story Required: bare and with a description
 *   date-field/invalid          story Invalid: required + error, error alone
 *   date-field/disabled         story Disabled: with and without a value
 *   date-field/controlled.split story Controlled: a signal(null), two Buttons
 *                               (D17 / SOP 3.3.3: useState becomes a signal)
 *   date-field/validation.split story WithValidation: FieldError while out of
 *                               range, Description otherwise
 *   date-field/form.split       story FormExample without the 1500 ms timer
 *                               and the console.log
 *   date-field/granularity      story Granularity: the four granularities side
 *                               by side; the story's Select of them is replaced
 *                               by one field each (port sheet 4b)
 *   date-field/all-variations   story AllVariations: the three affix layouts
 *   date-field/prefix-icon.split, date-field/suffix-icon.split,
 *   date-field/prefix-and-suffix.split
 *                               stories WithPrefixIcon, WithSuffixIcon and
 *                               WithPrefixAndSuffix. NSH has no `@iconify`, so
 *                               the story's svg becomes a View stand-in here
 *                               (time-field's precedent); the reference side
 *                               keeps the svg.
 *
 * The stories' `name` props are kept: HeroUI accepts them, and this library
 * accepts them with no effect (port sheet §1.2 / §8).
 *
 * The Granularity story's value is a ZonedDateTime in America/Los_Angeles. NSH
 * resolves no IANA zone (the host knows the device's zone, UTC and offsets), so
 * the scenario uses the same wall clock as a CalendarDateTime; the painted
 * segments are identical, and the time zone name is not part of the story's
 * outline.
 *
 * The Disabled story reads `today()` for its value and Validation reads it for
 * `minValue`. Both use a fixed date here, so the reference and candidate
 * screenshots of the same scenario do not depend on when they ran; the painted
 * state is identical (time-field does the same for its disabled story).
 */

/* A View stand-in for an svg glyph: NSH draws no svg (port sheet §3). The
 * reference side draws the story's paths. */
function Glyph(props: { class?: string }) {
  return <View class={props.class ?? "size-4 rounded-sm bg-field-foreground"} />;
}

/* Every story repeats the same group: a Label, the group, the input drawing one
 * Segment per part. Kept as a local part so the scenarios read as the stories. */
function Field(props: { name: string; prefix?: boolean; suffix?: boolean }) {
  return (
    <DateField className="w-[256px]" name={props.name}>
      <Label>Date</Label>
      <DateField.Group>
        {props.prefix ? (
          <DateField.Prefix>
            <Glyph />
          </DateField.Prefix>
        ) : null}
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        {props.suffix ? (
          <DateField.Suffix>
            <Glyph />
          </DateField.Suffix>
        ) : null}
      </DateField.Group>
    </DateField>
  );
}

function Default() {
  return (
    <Stage>
      <Field name="date" />
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <DateField className="w-[256px]" name="primary-date">
          <Label>Primary variant</Label>
          <DateField.Group variant="primary">
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
        </DateField>
        <DateField className="w-[256px]" name="secondary-date">
          <Label>Secondary variant</Label>
          <DateField.Group variant="secondary">
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
        </DateField>
      </View>
    </Stage>
  );
}

function FullWidth() {
  return (
    <Stage>
      <View class="w-[400px] flex-col gap-4">
        <DateField fullWidth name="date">
          <Label>Date</Label>
          <DateField.Group fullWidth>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
        </DateField>
        <DateField fullWidth name="date-icons">
          <Label>Date</Label>
          <DateField.Group fullWidth>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
        </DateField>
      </View>
    </Stage>
  );
}

function WithDescription() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <DateField className="w-[256px]" name="date">
          <Label>Birth date</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
          <Description>Enter your date of birth</Description>
        </DateField>
        <DateField className="w-[256px]" name="appointment-date">
          <Label>Appointment date</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
          <Description>Enter a date for your appointment</Description>
        </DateField>
      </View>
    </Stage>
  );
}

function Required() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <DateField isRequired className="w-[256px]" name="date">
          <Label>Date</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
        </DateField>
        <DateField isRequired className="w-[256px]" name="start-date">
          <Label>Start date</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
          <Description>Required field</Description>
        </DateField>
      </View>
    </Stage>
  );
}

function Invalid() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <DateField isInvalid isRequired className="w-[256px]" name="date">
          <Label>Date</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
          <FieldError>Please enter a valid date</FieldError>
        </DateField>
        <DateField isInvalid className="w-[256px]" name="invalid-date">
          <Label>Date</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
          <FieldError>Date must be in the future</FieldError>
        </DateField>
      </View>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <DateField
          isDisabled
          className="w-[256px]"
          name="date"
          value={parseDate("2026-08-15")}
        >
          <Label>Date</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
          <Description>This date field is disabled</Description>
        </DateField>
        <DateField isDisabled className="w-[256px]" name="date-empty">
          <Label>Date</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
          <Description>This date field is disabled</Description>
        </DateField>
      </View>
    </Stage>
  );
}

/* NSH side of the split: `useState` becomes a signal (D17 / SOP 3.3.3). */
function ControlledSplit() {
  const value = signal<DateValue | null>(null);

  return (
    <Stage>
      <View class="flex-col gap-4">
        <DateField
          className="w-[256px]"
          name="date"
          value={value()}
          onChange={(next) => value.set(next)}
        >
          <Label>Date</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
          <Description>Current value: {value() ? value()!.toString() : "(empty)"}</Description>
        </DateField>
        <View class="flex-row gap-2">
          <Button variant="tertiary" onPress={() => value.set(today(getLocalTimeZone()))}>
            Set today
          </Button>
          <Button variant="tertiary" onPress={() => value.set(null)}>
            Clear
          </Button>
        </View>
      </View>
    </Stage>
  );
}

/* NSH side of the split: the story's `today()` minimum becomes a fixed date, so
 * the scenario does not depend on when it ran. */
function ValidationSplit() {
  const value = signal<DateValue | null>(null);
  const minDate = parseDate("2026-01-01");
  const isInvalid = () => value() !== null && value()!.compare(minDate) < 0;

  return (
    <Stage>
      <View class="flex-col gap-4">
        <DateField
          isRequired
          className="w-[256px]"
          isInvalid={isInvalid()}
          minValue={minDate}
          name="date"
          value={value()}
          onChange={(next) => value.set(next)}
        >
          <Label>Date</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
          {isInvalid() ? (
            <FieldError>Date must be today or in the future</FieldError>
          ) : (
            <Description>Enter a date from today onwards</Description>
          )}
        </DateField>
      </View>
    </Stage>
  );
}

/* The story's 1500 ms `setTimeout`, its pending state and its console.log are
 * dropped: the scenario needs the Form, the isInvalid branch and the submit
 * button (port sheet 4b, as time-field does). A visible counter stands in for
 * the removed side effect. */
function FormSplit() {
  const value = signal<DateValue | null>(null);
  const submitted = signal(0);
  const minDate = parseDate("2026-01-01");
  const isInvalid = () => value() !== null && value()!.compare(minDate) < 0;

  return (
    <Stage>
      <Form
        className="flex w-[280px] flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();

          if (!value() || isInvalid()) {
            return;
          }

          submitted.set(submitted() + 1);
          value.set(null);
        }}
      >
        <DateField
          isRequired
          className="w-full"
          isInvalid={isInvalid()}
          minValue={minDate}
          name="date"
          value={value()}
          onChange={(next) => value.set(next)}
        >
          <Label>Appointment date</Label>
          <DateField.Group>
            <DateField.Prefix>
              <Glyph />
            </DateField.Prefix>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
          {isInvalid() ? (
            <FieldError>Date must be today or in the future</FieldError>
          ) : (
            <Description>Enter a date from today onwards</Description>
          )}
        </DateField>
        <Button
          className="w-full"
          isDisabled={!value() || isInvalid()}
          type="submit"
          variant="primary"
        >
          Submit
        </Button>
      </Form>
      <Description>Submitted: {submitted()} times</Description>
    </Stage>
  );
}

/* The story's Select of the four granularities becomes one field each: the
 * scenario shows the same four segment sets side by side (port sheet 4b). */
function Granularity() {
  const day = parseDate("2025-02-03");
  const timestamp = parseDateTime("2025-02-03T08:45:00");

  return (
    <Stage>
      <View class="flex-row items-start gap-4">
        <DateField className="w-[256px]" defaultValue={day} granularity="day" name="granularity-day">
          <Label>Day</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
        </DateField>
        <DateField
          className="w-[256px]"
          defaultValue={timestamp}
          granularity="hour"
          name="granularity-hour"
        >
          <Label>Hour</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
        </DateField>
        <DateField
          className="w-[256px]"
          defaultValue={timestamp}
          granularity="minute"
          name="granularity-minute"
        >
          <Label>Minute</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
        </DateField>
        <DateField
          className="w-[256px]"
          defaultValue={timestamp}
          granularity="second"
          name="granularity-second"
        >
          <Label>Second</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
        </DateField>
      </View>
    </Stage>
  );
}

function AllVariations() {
  return (
    <Stage>
      <View class="flex-col gap-6">
        <View class="flex-col gap-4">
          <DateField isRequired className="w-[256px]" name="date1">
            <Label>Date</Label>
            <DateField.Group>
              <DateField.Prefix>
                <Glyph />
              </DateField.Prefix>
              <DateField.Input>
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
            </DateField.Group>
            <Description>Enter a date</Description>
          </DateField>

          <DateField isRequired className="w-[256px]" name="date2">
            <Label>Date</Label>
            <DateField.Group>
              <DateField.Input>
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateField.Suffix>
                <Glyph />
              </DateField.Suffix>
            </DateField.Group>
            <Description>Enter a date</Description>
          </DateField>

          <DateField isRequired className="w-[256px]" name="date3">
            <Label>Date</Label>
            <DateField.Group>
              <DateField.Prefix>
                <Glyph />
              </DateField.Prefix>
              <DateField.Input>
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateField.Suffix>
                <Glyph />
              </DateField.Suffix>
            </DateField.Group>
            <Description>Enter a date</Description>
          </DateField>
        </View>
      </View>
    </Stage>
  );
}

/* NSH side of the split: the story's calendar svg becomes a Glyph. */
function WithPrefixIconSplit() {
  return (
    <Stage>
      <Field name="date" prefix />
    </Stage>
  );
}

/* NSH side of the split: the story's calendar svg becomes a Glyph. */
function WithSuffixIconSplit() {
  return (
    <Stage>
      <Field name="date" suffix />
    </Stage>
  );
}

function WithPrefixAndSuffixSplit() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <Field name="date" prefix suffix />
        <Description>Enter a date</Description>
      </View>
    </Stage>
  );
}

export const dateFieldScenarios: Record<string, Component> = {
  "date-field/default": Default,
  "date-field/variants": Variants,
  "date-field/full-width": FullWidth,
  "date-field/description": WithDescription,
  "date-field/required": Required,
  "date-field/invalid": Invalid,
  "date-field/disabled": Disabled,
  "date-field/controlled.split": ControlledSplit,
  "date-field/validation.split": ValidationSplit,
  "date-field/form.split": FormSplit,
  "date-field/granularity": Granularity,
  "date-field/all-variations": AllVariations,
  "date-field/prefix-icon.split": WithPrefixIconSplit,
  "date-field/suffix-icon.split": WithSuffixIconSplit,
  "date-field/prefix-and-suffix.split": WithPrefixAndSuffixSplit,
};
