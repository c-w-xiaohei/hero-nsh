import { host, mount, Text, View } from "nsh";
import { Description, FieldError, Label, TimeField } from "@heroui/react";
import { Time, parseTime } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only TimeField fixture (port sheet 4b.3). The shared scenarios cover the
 * stories, which carry no callbacks and no test ids; every regression case that
 * reads a callback back, targets one part by `testID` or records a segment
 * render prop opens this file instead.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape; `hour` / `minute` params feed the value:
 *   default           Label "Time" + group + input + segments, defaultValue
 *                     9:30, onChange probe. testIDs: tf-root, tf-group,
 *                     tf-input, tf-hour, tf-minute, tf-day-period (T-001,
 *                     T-002, T-004, T-005)
 *   controlled        `value` from params (never written back), onChange probe
 *                     (T-006)
 *   required-invalid  isRequired + isInvalid + FieldError "Please enter a valid
 *                     time" (T-007)
 *   description       Label + Description "Enter a time" (T-008)
 *   disabled          isDisabled, defaultValue 9:30, onChange probe (T-009)
 *   prefix-suffix     Prefix / Suffix around the input, each one Text (T-010)
 *   focus             the segments' className render prop records
 *                     `isFocused` / `isFocusVisible`, defaultValue 9:30 (T-011)
 *   render-children   the function form of `children` receiving the field state
 *                     (T-012)
 *   full-width        a 400pt parent around a `fullWidth` root and group: the
 *                     visible half of T-003, which has no assertion (port sheet
 *                     4b row T-003, deleted)
 *   validation        minValue / maxValue / validate around a FieldError, for
 *                     the submit-time validation hand check (§2)
 *   granularity       granularity="second" and hourCycle={24}: the segment set
 *                     and the 24-hour form (§2, hand check)
 *
 * `hourCycle={12}` on every case with segments is deliberate: the host locale
 * would otherwise decide whether a day period exists, and the cases count
 * three segments (port sheet 4b.3 `default`).
 */

const DEFAULT_HOUR = 9;
const DEFAULT_MINUTE = 30;

function numberParam(name: string): number | undefined {
  const raw = host.params[name];

  if (raw === undefined) return undefined;

  return typeof raw === "number" ? raw : Number(raw);
}

/** The value the fixture starts from: params `hour` / `minute`, else 9:30. */
function startTime(): Time {
  return new Time(numberParam("hour") ?? DEFAULT_HOUR, numberParam("minute") ?? DEFAULT_MINUTE);
}

/** The testID a segment type gets; literal separators hold no state and no id. */
function segmentTestID(type: string): string | undefined {
  if (type === "hour") return "tf-hour";
  if (type === "minute") return "tf-minute";
  if (type === "second") return "tf-second";
  if (type === "dayPeriod") return "tf-day-period";

  return undefined;
}

/**
 * The group's input, one Segment per part. `record` is the Segment className
 * render prop: the only channel `nsh/test` can read a segment's focus state
 * through (port sheet 4b.3 `focus`).
 */
function Segments(props: { record?: (values: unknown) => void }) {
  return (
    <TimeField.Input testID="tf-input">
      {(segment) => (
        <TimeField.Segment
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
    </TimeField.Input>
  );
}

function DefaultCase() {
  return (
    <Stage>
      <TimeField
        defaultValue={startTime()}
        hourCycle={12}
        name="time"
        onChange={probe("onChange")}
        testID="tf-root"
      >
        <Label>Time</Label>
        <TimeField.Group testID="tf-group">
          <Segments />
        </TimeField.Group>
      </TimeField>
    </Stage>
  );
}

function ControlledCase() {
  return (
    <Stage>
      <TimeField
        hourCycle={12}
        name="time"
        onChange={probe("onChange")}
        testID="tf-root"
        value={startTime()}
      >
        <Label>Time</Label>
        <TimeField.Group testID="tf-group">
          <Segments />
        </TimeField.Group>
      </TimeField>
    </Stage>
  );
}

function RequiredInvalidCase() {
  return (
    <Stage>
      <TimeField hourCycle={12} isInvalid isRequired name="time" testID="tf-root">
        <Label>Time</Label>
        <TimeField.Group testID="tf-group">
          <Segments />
        </TimeField.Group>
        <FieldError>Please enter a valid time</FieldError>
      </TimeField>
    </Stage>
  );
}

function DescriptionCase() {
  return (
    <Stage>
      <TimeField hourCycle={12} name="time" testID="tf-root">
        <Label>Time</Label>
        <TimeField.Group testID="tf-group">
          <Segments />
        </TimeField.Group>
        <Description>Enter a time</Description>
      </TimeField>
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <TimeField
        defaultValue={startTime()}
        hourCycle={12}
        isDisabled
        name="time"
        onChange={probe("onChange")}
        testID="tf-root"
      >
        <Label>Time</Label>
        <TimeField.Group testID="tf-group">
          <Segments />
        </TimeField.Group>
      </TimeField>
    </Stage>
  );
}

function PrefixSuffixCase() {
  return (
    <Stage>
      <TimeField hourCycle={12} name="time" testID="tf-root">
        <Label>Time</Label>
        <TimeField.Group testID="tf-group">
          <TimeField.Prefix>
            <Text>prefix</Text>
          </TimeField.Prefix>
          <Segments />
          <TimeField.Suffix>
            <Text>suffix</Text>
          </TimeField.Suffix>
        </TimeField.Group>
      </TimeField>
    </Stage>
  );
}

function FocusCase() {
  return (
    <Stage>
      <TimeField
        defaultValue={startTime()}
        hourCycle={12}
        name="time"
        onChange={probe("onChange")}
        testID="tf-root"
      >
        <Label>Time</Label>
        <TimeField.Group testID="tf-group">
          <Segments record={probe("segment-props")} />
        </TimeField.Group>
      </TimeField>
    </Stage>
  );
}

function RenderChildrenCase() {
  return (
    <Stage>
      <TimeField hourCycle={12} isRequired name="time" testID="tf-root">
        {({ isRequired }) => (
          <View class="flex-col gap-2">
            <Label>Time</Label>
            <TimeField.Group testID="tf-group">
              <Segments />
            </TimeField.Group>
            <Description>{isRequired() ? "Required" : "Optional"}</Description>
          </View>
        )}
      </TimeField>
    </Stage>
  );
}

function FullWidthCase() {
  return (
    <Stage>
      <View class="w-[400px]" testID="tf-frame">
        <TimeField fullWidth hourCycle={12} name="time" testID="tf-root">
          <Label>Time</Label>
          <TimeField.Group fullWidth testID="tf-group">
            <Segments />
          </TimeField.Group>
        </TimeField>
      </View>
    </Stage>
  );
}

function ValidationCase() {
  const minTime = parseTime("09:00");
  const maxTime = parseTime("17:00");

  return (
    <Stage>
      <TimeField
        hourCycle={12}
        maxValue={maxTime}
        minValue={minTime}
        name="time"
        onChange={probe("onChange")}
        testID="tf-root"
        validate={(value) => {
          // Both halves of `TimeValue` (Time and ZonedDateTime) carry hour and
          // minute; reading them avoids narrowing the union just to compare.
          const minutes = value.hour * 60 + value.minute;
          const inRange = minutes >= 9 * 60 && minutes <= 17 * 60;

          return inRange ? true : { message: "Time must be between 9:00 AM and 5:00 PM" };
        }}
      >
        <Label>Time</Label>
        <TimeField.Group testID="tf-group">
          <Segments />
        </TimeField.Group>
        <FieldError>Time must be between 9:00 AM and 5:00 PM</FieldError>
      </TimeField>
    </Stage>
  );
}

function GranularityCase() {
  return (
    <Stage>
      <TimeField
        defaultValue={startTime()}
        granularity="second"
        hourCycle={24}
        name="time"
        testID="tf-root"
      >
        <Label>Time</Label>
        <TimeField.Group testID="tf-group">
          <Segments />
        </TimeField.Group>
      </TimeField>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "default");

  if (name === "controlled") return <ControlledCase />;
  if (name === "required-invalid") return <RequiredInvalidCase />;
  if (name === "description") return <DescriptionCase />;
  if (name === "disabled") return <DisabledCase />;
  if (name === "prefix-suffix") return <PrefixSuffixCase />;
  if (name === "focus") return <FocusCase />;
  if (name === "render-children") return <RenderChildrenCase />;
  if (name === "full-width") return <FullWidthCase />;
  if (name === "validation") return <ValidationCase />;
  if (name === "granularity") return <GranularityCase />;

  return <DefaultCase />;
}

mount(Fixture);
