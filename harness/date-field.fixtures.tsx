import type { JSX } from "nsh";
import { host, mount, Text, View } from "nsh";
import {
  DateField,
  type DateInputGroupInputKeyboardType,
  Description,
  EnvironmentScope,
  FieldError,
  Label,
} from "@heroui/react";
import { DateInputGroupKeyboardContext } from "../src/components/date-input-group/date-input-group-context";
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
 *   readonly          isReadOnly + the 2026-08-15 default; the touch layer's
 *                     read-only channel half (adapt sheet A-007, M-005)
 *   keyboard-type     the default case with `Input`'s `keyboardType` prop set
 *                     to `host.params.kt` ("auto" when absent); a probe inside
 *                     each segment records the `DateInputGroupKeyboardContext`
 *                     value it reads (A-007, M-006)
 *
 * host.params.scope picks the environment wrapper (adapt sheet A-007):
 * "touch" wraps the mounted case in `EnvironmentScope(input="touch")` — the
 * injected half of the mobile assertions; anything else keeps the
 * host-derived default (the pointer half on a desktop-pinned open). The
 * test-only params `testInput` ("pointer"/"touch") inject an outer
 * EnvironmentScope input.
 *
 * The mobile layer's extra probes (adapt sheet §4): `Segments` wraps each
 * Segment in a shrink-wrapping View that records `segment-bounds` (Segment
 * takes no `onLayout` — the date-input-group fixture's precedent) and, when
 * no `record` prop overrides it, records the full `segment-props` set plus a
 * `segments` text/placeholder record per render. The default case also
 * records the Group's `onLayout` bounds (`group-bounds`) and the field's
 * `onFocus` / `onBlur` / `onFocusChange` edges (`focus-in`, `focus-out`,
 * `focus-change`).
 *
 * The keyboard-type case imports the unit's internal context by relative
 * path, as `harness/field-error.fixtures.tsx` does: it is an internal module,
 * not a public export, and a fixture is the one place that may hold it.
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
  const segmentBounds = probe("segment-bounds");
  const segmentProps = probe("segment-props");
  const segments = probe("segments");

  return (
    <DateField.Input testID="df-input">
      {(segment) => (
        <View
          onLayout={(event) =>
            segmentBounds({ type: segment.type, bounds: event.bounds })
          }
        >
          <DateField.Segment
            segment={segment}
            testID={segmentTestID(segment.type)}
            className={(values) => {
              if (props.record) {
                props.record({
                  type: segment.type,
                  isFocused: values.isFocused(),
                  isFocusVisible: values.isFocusVisible(),
                });
              } else {
                // The mobile layer reads the wider set (adapt sheet §4); the
                // `focus` case keeps its own two-field record through `record`.
                segmentProps({
                  type: segment.type,
                  isFocused: values.isFocused(),
                  isFocusVisible: values.isFocusVisible(),
                  isHovered: values.isHovered(),
                  isReadOnly: values.isReadOnly(),
                  isInvalid: values.isInvalid(),
                  isDisabled: values.isDisabled(),
                });
              }

              segments({
                type: segment.type,
                text: segment.text,
                isPlaceholder: segment.isPlaceholder,
                isEditable: segment.isEditable,
              });

              return "";
            }}
          />
        </View>
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
        onFocus={() => probe("focus-in")()}
        onBlur={() => probe("focus-out")()}
        onFocusChange={(focused) => probe("focus-change")(focused)}
      >
        <Label>Date</Label>
        <DateField.Group
          testID="df-group"
          onLayout={(event) => probe("group-bounds")(event.bounds)}
        >
          <Segments />
        </DateField.Group>
      </DateField>
    </Stage>
  );
}

function EmptyCase() {
  return (
    <Stage>
      <DateField
        name="date"
        onChange={recordChange}
        testID="df-root"
        onFocus={() => probe("focus-in")()}
        onBlur={() => probe("focus-out")()}
        onFocusChange={(focused) => probe("focus-change")(focused)}
      >
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
          <DateField.Group
            fullWidth
            testID="df-group"
            onLayout={(event) => probe("group-bounds")(event.bounds)}
          >
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

function ReadOnlyCase() {
  return (
    <Stage>
      <DateField
        defaultValue={startDate()}
        isReadOnly
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

/*
 * A-007: reads the `DateInputGroupKeyboardContext` the Input provides and
 * records it, so `DateField.Input`'s `keyboardType` prop is observable where
 * the host's keyboard itself is not (sheet §6). It renders in place of the
 * segment text, the same spot the date-input-group fixture's probe takes.
 */
function KeyboardTypeProbe() {
  const record = probe("keyboard-type");
  const type = DateInputGroupKeyboardContext();

  record(type());

  return <></>;
}

function KeyboardTypeCase() {
  const kt = host.params.kt;

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
          <DateField.Input
            testID="df-input"
            keyboardType={
              typeof kt === "string" && kt !== ""
                ? (kt as DateInputGroupInputKeyboardType)
                : undefined
            }
          >
            {(segment) => (
              <DateField.Segment
                segment={segment}
                testID={segmentTestID(segment.type)}
              >
                {() => <KeyboardTypeProbe />}
              </DateField.Segment>
            )}
          </DateField.Input>
        </DateField.Group>
      </DateField>
    </Stage>
  );
}

/* A-007: the environment wrapper the mobile assertions drive — the same
 * `Scoped` shape the date-input-group fixture uses
 * (harness/date-input-group.fixtures.tsx:676). */
function Scoped(props: { children?: JSX.Element }) {
  // Test-harness environment param (only the mobile tests set it —
  // absent keeps the host-derived default): `testInput` injects an outer
  // EnvironmentScope input so the pointer baseline is host-independent
  // (inner `scope` overrides still win).
  const testInput = String(host.params.testInput ?? "");

  const body =
    String(host.params.scope ?? "") === "touch" ? (
      <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
    ) : (
      <>{props.children}</>
    );

  return testInput === "pointer" || testInput === "touch" ? (
    <EnvironmentScope input={testInput}>{body}</EnvironmentScope>
  ) : (
    body
  );
}

function Fixture() {
  const name = String(host.params.case ?? "default");

  if (name === "empty") return <Scoped><EmptyCase /></Scoped>;
  if (name === "controlled") return <Scoped><ControlledCase /></Scoped>;
  if (name === "required-invalid") return <Scoped><RequiredInvalidCase /></Scoped>;
  if (name === "description") return <Scoped><DescriptionCase /></Scoped>;
  if (name === "disabled") return <Scoped><DisabledCase /></Scoped>;
  if (name === "prefix-suffix") return <Scoped><PrefixSuffixCase /></Scoped>;
  if (name === "focus") return <Scoped><FocusCase /></Scoped>;
  if (name === "full-width") return <Scoped><FullWidthCase /></Scoped>;
  if (name === "validation") return <Scoped><ValidationCase /></Scoped>;
  if (name === "granularity") return <Scoped><GranularityCase /></Scoped>;
  if (name === "readonly") return <Scoped><ReadOnlyCase /></Scoped>;
  if (name === "keyboard-type") return <Scoped><KeyboardTypeCase /></Scoped>;

  return <Scoped><DefaultCase /></Scoped>;
}

mount(Fixture);
