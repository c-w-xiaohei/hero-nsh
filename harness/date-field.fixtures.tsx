import { host, mount, Text, View } from "nsh";
import { DateField, Description, FieldError, Label } from "@heroui/react";
import { CalendarDate } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only DateField fixture (port sheet 4b.3). The shared scenarios cover the
 * stories, which carry no callbacks and no test ids; every regression case that
 * reads a callback back, targets one part by `testID` or records a segment
 * render prop opens this file instead.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape; `year` / `month` / `day` feed the value:
 *   default           Label "Date" + group + input + segments with
 *                     defaultValue 2026-08-15, onChange probe. testIDs:
 *                     df-root, df-group, df-input, df-month, df-day, df-year
 *                     (T-001, T-002)
 *   empty             the same field with no value, so typing builds one from
 *                     nothing (T-006)
 *   controlled        `value` from params year/month/day, onChange probe
 *                     (T-007)
 *   required-invalid  isRequired + isInvalid + FieldError "Please enter a
 *                     valid date" (T-008)
 *   description       Label + Description "Enter a date" (T-009)
 *   disabled          isDisabled, defaultValue 2026-08-15, onChange probe
 *                     (T-010)
 *   prefix-suffix     Prefix / Suffix around the input, each one Text (T-011)
 *   focus             the segments' className render prop records
 *                     `isFocused` / `isFocusVisible`, defaultValue 2026-08-15
 *                     (T-012)
 *   full-width        a 400pt parent around a `fullWidth` root and group: the
 *                     visible half of T-004, which has no assertion (port sheet
 *                     4b row T-004, deleted)
 *   validation        minValue / validate around a FieldError, for the
 *                     submit-time validation hand check (§2)
 *   granularity       granularity="second": the segment set (port sheet §2, hand
 *                     check)
 *
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

/** The `onChange` payload as text: a `DateValue` does not survive JSON (4b.3). */
function recordChange(value: { toString(): string } | null): void {
  probe("onChange")(value?.toString() ?? null);
}

/** The testID a segment type gets; literal separators hold no state and no id. */
function segmentTestID(type: string): string | undefined {
  if (type === "month") return "df-month";
  if (type === "day") return "df-day";
  if (type === "year") return "df-year";

  return undefined;
}

/**
 * The group's input, one Segment per part. `record` is the Segment className
 * render prop: the only channel `nsh/test` can read a segment's focus state
 * through (port sheet 4b.3 `focus`; the Segment owns its onFocus / onBlur).
 */
function Segments(props: { record?: (values: unknown) => void }) {
  return (
    <DateField.Input testID="df-input">
      {(segment) => (
        <DateField.Segment
          segment={segment}
          testID={segmentTestID(segment.type)}
          className={
            props.record
              ? (values) => {
                  props.record!({
                    type: segment.type,
                    isFocused: values.isFocused(),
                    isFocusVisible: values.isFocusVisible(),
                  });

                  return "";
                }
              : undefined
          }
        />
      )}
    </DateField.Input>
  );
}

function DefaultCase() {
  return (
    <Stage>
      <DateField
        defaultValue={startDate()}
        name="date"
        onChange={recordChange}
        testID="df-root"
      >
        <Label>Date</Label>
        <DateField.Group testID="df-group">
          <Segments />
        </DateField.Group>
      </DateField>
    </Stage>
  );
}

function EmptyCase() {
  return (
    <Stage>
      <DateField name="date" onChange={recordChange} testID="df-root">
        <Label>Date</Label>
        <DateField.Group testID="df-group">
          <Segments />
        </DateField.Group>
      </DateField>
    </Stage>
  );
}

function ControlledCase() {
  return (
    <Stage>
      <DateField
        name="date"
        onChange={recordChange}
        testID="df-root"
        value={startDate()}
      >
        <Label>Date</Label>
        <DateField.Group testID="df-group">
          <Segments />
        </DateField.Group>
      </DateField>
    </Stage>
  );
}

function RequiredInvalidCase() {
  return (
    <Stage>
      <DateField isInvalid isRequired name="date" testID="df-root">
        <Label>Date</Label>
        <DateField.Group testID="df-group">
          <Segments />
        </DateField.Group>
        <FieldError>Please enter a valid date</FieldError>
      </DateField>
    </Stage>
  );
}

function DescriptionCase() {
  return (
    <Stage>
      <DateField name="date" testID="df-root">
        <Label>Date</Label>
        <DateField.Group testID="df-group">
          <Segments />
        </DateField.Group>
        <Description>Enter a date</Description>
      </DateField>
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <DateField
        defaultValue={startDate()}
        isDisabled
        name="date"
        onChange={recordChange}
        testID="df-root"
      >
        <Label>Date</Label>
        <DateField.Group testID="df-group">
          <Segments />
        </DateField.Group>
      </DateField>
    </Stage>
  );
}

function PrefixSuffixCase() {
  return (
    <Stage>
      <DateField name="date" testID="df-root">
        <Label>Date</Label>
        <DateField.Group testID="df-group">
          <DateField.Prefix>
            <Text>prefix</Text>
          </DateField.Prefix>
          <Segments />
          <DateField.Suffix>
            <Text>suffix</Text>
          </DateField.Suffix>
        </DateField.Group>
      </DateField>
    </Stage>
  );
}

function FocusCase() {
  return (
    <Stage>
      <DateField
        defaultValue={startDate()}
        name="date"
        onChange={recordChange}
        testID="df-root"
      >
        <Label>Date</Label>
        <DateField.Group testID="df-group">
          <Segments record={probe("segment-props")} />
        </DateField.Group>
      </DateField>
    </Stage>
  );
}

function FullWidthCase() {
  return (
    <Stage>
      <View class="w-[400px]" testID="df-frame">
        <DateField fullWidth name="date" testID="df-root">
          <Label>Date</Label>
          <DateField.Group fullWidth testID="df-group">
            <Segments />
          </DateField.Group>
        </DateField>
      </View>
    </Stage>
  );
}

function ValidationCase() {
  return (
    <Stage>
      <DateField
        isRequired
        maxValue={new CalendarDate(2026, 12, 31)}
        minValue={new CalendarDate(2026, 1, 1)}
        name="date"
        onChange={recordChange}
        testID="df-root"
        validate={(value) => {
          if (value == null) return true;

          const date = value.toString();
          const inRange = date >= "2026-01-01" && date <= "2026-12-31";

          return inRange ? true : { message: "Date must be in 2026" };
        }}
      >
        <Label>Date</Label>
        <DateField.Group testID="df-group">
          <Segments />
        </DateField.Group>
        <FieldError>Date must be in 2026</FieldError>
      </DateField>
    </Stage>
  );
}

function GranularityCase() {
  return (
    <Stage>
      <DateField
        defaultValue={startDate()}
        granularity="second"
        name="date"
        testID="df-root"
      >
        <Label>Date</Label>
        <DateField.Group testID="df-group">
          <Segments />
        </DateField.Group>
      </DateField>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "default");

  if (name === "empty") return <EmptyCase />;
  if (name === "controlled") return <ControlledCase />;
  if (name === "required-invalid") return <RequiredInvalidCase />;
  if (name === "description") return <DescriptionCase />;
  if (name === "disabled") return <DisabledCase />;
  if (name === "prefix-suffix") return <PrefixSuffixCase />;
  if (name === "focus") return <FocusCase />;
  if (name === "full-width") return <FullWidthCase />;
  if (name === "validation") return <ValidationCase />;
  if (name === "granularity") return <GranularityCase />;

  return <DefaultCase />;
}

mount(Fixture);
