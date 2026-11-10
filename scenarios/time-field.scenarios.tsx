import { signal, View } from "nsh";
import { Button, Description, FieldError, Form, Label, TimeField } from "@heroui/react";
import { Time, getLocalTimeZone, now, parseTime } from "@internationalized/date";
import type { ZonedDateTime } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared TimeField scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app and this library render the same JSX. The story file is
 * time-field.stories.tsx; every entry below is one story except the three icon
 * splits (port sheet 4b, "需要的共享场景").
 *
 *   time-field/default          story Default: Label, group, 256pt root
 *   time-field/full-width       story FullWidth, first field: fullWidth on the
 *                               root and on the group inside a 400pt column.
 *                               The story's second field carries prefix /
 *                               suffix icons and is covered by the three icon
 *                               splits below, because an icon cannot be shared.
 *   time-field/description      story WithDescription: start and end time
 *   time-field/required         story Required: bare and with a description
 *   time-field/invalid          story Invalid: required + error, error alone
 *   time-field/disabled         story Disabled: with and without a value
 *   time-field/controlled       story Controlled: signal(null), two Buttons
 *   time-field/validation       story WithValidation: FieldError while out of
 *                               range, Description otherwise
 *   time-field/form             story FormExample without the 1500 ms timer
 *                               and the console.log
 *   time-field/all-variations   story AllVariations: the three affix layouts
 *   time-field/prefix-icon.split, time-field/suffix-icon.split,
 *   time-field/prefix-and-suffix.split
 *                               stories WithPrefixIcon, WithSuffixIcon and
 *                               WithPrefixAndSuffix. NSH has no `@iconify`, so
 *                               the story's svg becomes a View stand-in here
 *                               (number-field's `custom-icons.split`
 *                               precedent); the reference side keeps the svg.
 *
 * The stories' `name` props are kept: HeroUI accepts them, and this library
 * accepts them with no effect (port sheet §1.2 / §8).
 *
 * The Disabled story reads `now()` for its value. The scenario uses a fixed
 * 10:30 instead, so the reference and candidate screenshots of the same
 * scenario do not depend on when they ran; the painted state is identical.
 */

/* A View stand-in for an svg glyph: NSH draws no svg (port sheet §3). The
 * reference side draws the story's paths. */
function Glyph(props: { class?: string }) {
  return <View class={props.class ?? "size-4 rounded-sm bg-field-foreground"} />;
}

/* The value model both sides share: HeroUI's `TimeValue` (not exported by the
 * package entry, as upstream). */
type TimeValue = Time | ZonedDateTime;

/* Every story repeats the same group: a Label, the group, the input drawing one
 * Segment per part. Kept as a local part so the scenarios below read as the
 * stories do. */
function Field(props: { prefix?: boolean; suffix?: boolean; name: string }) {
  return (
    <TimeField className="w-[256px]" name={props.name}>
      <Label>Time</Label>
      <TimeField.Group>
        {props.prefix ? (
          <TimeField.Prefix>
            <Glyph />
          </TimeField.Prefix>
        ) : null}
        <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
        {props.suffix ? (
          <TimeField.Suffix>
            <Glyph />
          </TimeField.Suffix>
        ) : null}
      </TimeField.Group>
    </TimeField>
  );
}

function Default() {
  return (
    <Stage>
      <Field name="time" />
    </Stage>
  );
}

function FullWidth() {
  return (
    <Stage>
      <View class="w-[400px] flex-col gap-4">
        <TimeField fullWidth name="time">
          <Label>Time</Label>
          <TimeField.Group fullWidth>
            <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          </TimeField.Group>
        </TimeField>
      </View>
    </Stage>
  );
}

function WithDescription() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <TimeField className="w-[256px]" name="time">
          <Label>Start time</Label>
          <TimeField.Group>
            <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          </TimeField.Group>
          <Description>Enter the start time</Description>
        </TimeField>
        <TimeField className="w-[256px]" name="end-time">
          <Label>End time</Label>
          <TimeField.Group>
            <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          </TimeField.Group>
          <Description>Enter the end time</Description>
        </TimeField>
      </View>
    </Stage>
  );
}

function Required() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <TimeField isRequired className="w-[256px]" name="time">
          <Label>Time</Label>
          <TimeField.Group>
            <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          </TimeField.Group>
        </TimeField>
        <TimeField isRequired className="w-[256px]" name="appointment-time">
          <Label>Appointment time</Label>
          <TimeField.Group>
            <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          </TimeField.Group>
          <Description>Required field</Description>
        </TimeField>
      </View>
    </Stage>
  );
}

function Invalid() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <TimeField isInvalid isRequired className="w-[256px]" name="time">
          <Label>Time</Label>
          <TimeField.Group>
            <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          </TimeField.Group>
          <FieldError>Please enter a valid time</FieldError>
        </TimeField>
        <TimeField isInvalid className="w-[256px]" name="invalid-time">
          <Label>Time</Label>
          <TimeField.Group>
            <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          </TimeField.Group>
          <FieldError>Time must be within business hours</FieldError>
        </TimeField>
      </View>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <TimeField isDisabled className="w-[256px]" name="time" value={new Time(10, 30)}>
          <Label>Time</Label>
          <TimeField.Group>
            <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          </TimeField.Group>
          <Description>This time field is disabled</Description>
        </TimeField>
        <TimeField isDisabled className="w-[256px]" name="time-empty">
          <Label>Time</Label>
          <TimeField.Group>
            <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          </TimeField.Group>
          <Description>This time field is disabled</Description>
        </TimeField>
      </View>
    </Stage>
  );
}

function Controlled() {
  const value = signal<TimeValue | null>(null);

  return (
    <Stage>
      <View class="flex-col gap-4">
        <TimeField
          className="w-[256px]"
          name="time"
          value={value()}
          onChange={(next) => value.set(next)}
        >
          <Label>Time</Label>
          <TimeField.Group>
            <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          </TimeField.Group>
          <Description>Current value: {value() ? value()!.toString() : "(empty)"}</Description>
        </TimeField>
        <View class="flex-row gap-2">
          <Button
            variant="tertiary"
            onPress={() => {
              const currentTime = now(getLocalTimeZone());

              value.set(new Time(currentTime.hour, currentTime.minute, currentTime.second));
            }}
          >
            Set now
          </Button>
          <Button variant="tertiary" onPress={() => value.set(null)}>
            Clear
          </Button>
        </View>
      </View>
    </Stage>
  );
}

function WithValidation() {
  const value = signal<Time | null>(null);
  const minTime = parseTime("09:00");
  const maxTime = parseTime("17:00");
  const isInvalid = () =>
    value() !== null && (value()!.compare(minTime) < 0 || value()!.compare(maxTime) > 0);

  return (
    <Stage>
      <View class="flex-col gap-4">
        <TimeField
          isRequired
          className="w-[256px]"
          isInvalid={isInvalid()}
          maxValue={maxTime}
          minValue={minTime}
          name="time"
          value={value()}
          onChange={(next) => value.set(next instanceof Time ? next : null)}
        >
          <Label>Time</Label>
          <TimeField.Group>
            <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          </TimeField.Group>
          {isInvalid() ? (
            <FieldError>Time must be between 9:00 AM and 5:00 PM</FieldError>
          ) : (
            <Description>Enter a time between 9:00 AM and 5:00 PM</Description>
          )}
        </TimeField>
      </View>
    </Stage>
  );
}

/* The story's 1500 ms `setTimeout`, its pending state and its console.log are
 * dropped: the scenario needs the Form, the isInvalid branch and the submit
 * button (port sheet 4b). A visible counter stands in for the removed side
 * effect. */
function FormExample() {
  const value = signal<Time | null>(null);
  const submitted = signal(0);
  const minTime = parseTime("09:00");
  const maxTime = parseTime("17:00");
  const isInvalid = () =>
    value() !== null && (value()!.compare(minTime) < 0 || value()!.compare(maxTime) > 0);

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
        <TimeField
          isRequired
          className="w-full"
          isInvalid={isInvalid()}
          maxValue={maxTime}
          minValue={minTime}
          name="time"
          value={value()}
          onChange={(next) => value.set(next instanceof Time ? next : null)}
        >
          <Label>Appointment time</Label>
          <TimeField.Group>
            <TimeField.Prefix>
              <Glyph />
            </TimeField.Prefix>
            <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          </TimeField.Group>
          {isInvalid() ? (
            <FieldError>Time must be between 9:00 AM and 5:00 PM</FieldError>
          ) : (
            <Description>Enter a time between 9:00 AM and 5:00 PM</Description>
          )}
        </TimeField>
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

function AllVariations() {
  return (
    <Stage>
      <View class="flex-col gap-6">
        <View class="flex-col gap-4">
          <TimeField isRequired className="w-[256px]" name="time1">
            <Label>Time</Label>
            <TimeField.Group>
              <TimeField.Prefix>
                <Glyph />
              </TimeField.Prefix>
              <TimeField.Input>
                {(segment) => <TimeField.Segment segment={segment} />}
              </TimeField.Input>
            </TimeField.Group>
            <Description>Enter a time</Description>
          </TimeField>

          <TimeField isRequired className="w-[256px]" name="time2">
            <Label>Time</Label>
            <TimeField.Group>
              <TimeField.Input>
                {(segment) => <TimeField.Segment segment={segment} />}
              </TimeField.Input>
              <TimeField.Suffix>
                <Glyph />
              </TimeField.Suffix>
            </TimeField.Group>
            <Description>Enter a time</Description>
          </TimeField>

          <TimeField isRequired className="w-[256px]" name="time3">
            <Label>Time</Label>
            <TimeField.Group>
              <TimeField.Prefix>
                <Glyph />
              </TimeField.Prefix>
              <TimeField.Input>
                {(segment) => <TimeField.Segment segment={segment} />}
              </TimeField.Input>
              <TimeField.Suffix>
                <Glyph />
              </TimeField.Suffix>
            </TimeField.Group>
            <Description>Enter a time</Description>
          </TimeField>
        </View>
      </View>
    </Stage>
  );
}

/* NSH side of the split: the story's svg clock becomes a Glyph. */
function WithPrefixIconSplit() {
  return (
    <Stage>
      <Field name="time" prefix />
    </Stage>
  );
}

/* NSH side of the split: the story's svg clock becomes a Glyph. */
function WithSuffixIconSplit() {
  return (
    <Stage>
      <Field name="time" suffix />
    </Stage>
  );
}

function WithPrefixAndSuffixSplit() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <Field name="time" prefix suffix />
        <Description>Enter a time</Description>
      </View>
    </Stage>
  );
}

export const timeFieldScenarios: Record<string, Component> = {
  "time-field/default": Default,
  "time-field/full-width": FullWidth,
  "time-field/description": WithDescription,
  "time-field/required": Required,
  "time-field/invalid": Invalid,
  "time-field/disabled": Disabled,
  "time-field/controlled": Controlled,
  "time-field/validation": WithValidation,
  "time-field/form": FormExample,
  "time-field/all-variations": AllVariations,
  "time-field/prefix-icon.split": WithPrefixIconSplit,
  "time-field/suffix-icon.split": WithSuffixIconSplit,
  "time-field/prefix-and-suffix.split": WithPrefixAndSuffixSplit,
};
