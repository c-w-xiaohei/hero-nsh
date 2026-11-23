import { host, mount, View } from "nsh";
import type { JSX } from "nsh";
import {
  Button,
  Calendar,
  DateField,
  DatePicker,
  EnvironmentScope,
  Label,
} from "@heroui/react";
import type {
  DateInputGroupInputKeyboardType,
  EnvironmentDensity,
  EnvironmentInput,
  EnvironmentWidth,
} from "@heroui/react";
import { CalendarDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import { DateInputGroupKeyboardContext } from "../src/components/date-input-group/date-input-group-context";

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
 *   empty             no `defaultValue`/`value`: placeholder segments, for the
 *                     mobile layer's keymap/channel editing assertions
 *
 * Every case mounts inside `Scoped` (A-011): `host.params.input` /
 * `host.params.width` / `host.params.density` inject an `EnvironmentScope`
 * over the whole app — a field absent keeps the host-derived baseline, so an
 * unparameterized open mounts the desktop side untouched. This is a real
 * provider, never a bare fragment: a fragment would break the exit-hold
 * unmount channel the presence assertions ride on (adapt sheet §6, popover
 * §7's measured damage).
 *
 * `host.params.presentation` ∈ "auto"|"panel"|"sheet" pins
 * `DatePicker.Popover`'s carrier (absent = auto, adapt sheet A-001).
 * `host.params.nonmodal`="1" sets `isNonModal` (the non-modal fold of A-002).
 * `host.params.kt` feeds `DateField.Input`'s `keyboardType` ("auto" when
 * absent — the inherited date-input-group A-007 channel, A-006/M-010).
 * `host.params.readonly`/`disabled`="1" set the Root's `isReadOnly` /
 * `isDisabled`. `host.params.kbdismiss`="1" sets the Popover's
 * `isKeyboardDismissDisabled` and `host.params.skipanim`="1" its
 * `shouldSkipAnimation` (the M-006 / M-014 exit-path halves).
 *
 * The mobile layer's probes (adapt sheet §4): every part reports `onLayout`
 * bounds through the `layout` probe — `trigger`, `group`, `suffix` and one
 * `segment-<type>` per segment (Segment takes no `onLayout`, so a
 * shrink-wrapping View reports its bounds, the date-input-group convention);
 * each Segment's render props record `segments` ({type, text, isPlaceholder,
 * isEditable, isFocused, isReadOnly, isDisabled}) and a zero-argument child
 * records the `DateInputGroupKeyboardContext` value it reads as
 * `keyboard-type` — the internal context by relative path, the same reach
 * date-input-group's own fixture takes (A-006/M-009/M-010/M-013).
 *
 * testIDs: dp-root, dp-group, dp-trigger, dp-popover (+ the derived carriers
 * `dp-popover-panel` / `dp-popover-sheet`, adapt sheet §8), dp-calendar,
 * dp-preset; `dig-seg-<type>` is the soft-keyboard channel id the
 * date-input-group unit owns and this fixture rides on unchanged.
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

/*
 * Reads the `DateInputGroupKeyboardContext` the Input provides and records
 * it, so `DateField.Input`'s `keyboardType` prop path to the segments is
 * observable where the host keyboard itself is not (adapt sheet M-010, the
 * same probe date-input-group's `keyboard-type` case mounts).
 */
function KeyboardTypeProbe() {
  const record = probe("keyboard-type");
  const type = DateInputGroupKeyboardContext();

  record(type());

  return <></>;
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
    presentation?: "auto" | "panel" | "sheet";
    isNonModal?: boolean;
    isKeyboardDismissDisabled?: boolean;
    shouldSkipAnimation?: boolean;
  };
  inputKeyboardType?: DateInputGroupInputKeyboardType;
  isReadOnly?: boolean;
  isDisabled?: boolean;
};

function Shell(props: ShellProps) {
  return (
    <Stage>
      <DatePicker
        defaultValue={props.defaultValue}
        isDisabled={props.isDisabled}
        isReadOnly={props.isReadOnly}
        name="date"
        onChange={recordChange}
        onOpenChange={props.onOpenChange}
        shouldCloseOnSelect={props.shouldCloseOnSelect}
        testID="dp-root"
        value={props.value}
      >
        <Label>Date</Label>
        <DateField.Group testID="dp-group" onLayout={layout("group")}>
          <DateField.Input keyboardType={props.inputKeyboardType}>
            {(segment) => (
              <View onLayout={layout(`segment-${segment.type}`)}>
                {/* The context probe sits beside the Segment, inside the
                    Input's provider tree: it reads the same
                    `DateInputGroupKeyboardContext` a channel inside the
                    segment would, without replacing the segment's own
                    `segment.text` child. */}
                <KeyboardTypeProbe />
                <DateField.Segment
                  segment={segment}
                  className={(values) => {
                    probe("segments")({
                      type: segment.type,
                      text: segment.text,
                      isPlaceholder: segment.isPlaceholder,
                      isEditable: segment.isEditable,
                      isFocused: values.isFocused(),
                      isReadOnly: values.isReadOnly(),
                      isDisabled: values.isDisabled(),
                    });

                    return "";
                  }}
                />
              </View>
            )}
          </DateField.Input>
          <DateField.Suffix onLayout={layout("suffix")}>
            <DatePicker.Trigger
              aria-label="Open calendar"
              onFocus={() => probe("trigger-focus")()}
              onLayout={layout("trigger")}
              onPress={() => probe("trigger-press")()}
              testID="dp-trigger"
            >
              <DatePicker.TriggerIndicator />
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <DatePicker.Popover
          aria-label={props.popoverProps?.["aria-label"]}
          className={props.popoverProps?.className}
          isKeyboardDismissDisabled={props.popoverProps?.isKeyboardDismissDisabled}
          isNonModal={props.popoverProps?.isNonModal}
          onLayout={props.popoverProps?.onLayout}
          presentation={props.popoverProps?.presentation}
          shouldSkipAnimation={props.popoverProps?.shouldSkipAnimation}
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

/* -------------------------------------------------------------------------------------------------
 * EnvironmentScope wrapper (A-011): always a real provider, per-field.
 * -------------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  const input = host.params.input;
  const width = host.params.width;
  const density = host.params.density;

  return (
    <EnvironmentScope
      input={input === undefined ? undefined : (String(input) as EnvironmentInput)}
      width={width === undefined ? undefined : (String(width) as EnvironmentWidth)}
      density={
        density === undefined ? undefined : (String(density) as EnvironmentDensity)
      }
    >
      {props.children}
    </EnvironmentScope>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "default");

  const presentation = String(host.params.presentation ?? "");
  const nonModal = String(host.params.nonmodal ?? "") === "1";
  const kt = String(host.params.kt ?? "");
  const readonly = String(host.params.readonly ?? "") === "1";
  const disabled = String(host.params.disabled ?? "") === "1";
  const kbDismiss = String(host.params.kbdismiss ?? "") === "1";
  const skipAnim = String(host.params.skipanim ?? "") === "1";

  const shellProps: ShellProps = {
    defaultValue: startDate(),
    isReadOnly: readonly || undefined,
    isDisabled: disabled || undefined,
    inputKeyboardType:
      kt === "" ? undefined : (kt as DateInputGroupInputKeyboardType),
    popoverProps: {
      isKeyboardDismissDisabled: kbDismiss || undefined,
      presentation:
        presentation === ""
          ? undefined
          : (presentation as "auto" | "panel" | "sheet"),
      isNonModal: nonModal || undefined,
      shouldSkipAnimation: skipAnim || undefined,
    },
  };

  if (name === "open") {
    return (
      <Scoped>
        <Shell {...shellProps} onOpenChange={probe("openChange")} />
      </Scoped>
    );
  }

  if (name === "layout") {
    return (
      <Scoped>
        <Shell
          {...shellProps}
          preset
          probes
          popoverProps={{
            ...shellProps.popoverProps,
            className: "flex items-start gap-4",
            "aria-label": "Choose a date",
          }}
        />
      </Scoped>
    );
  }

  if (name === "no-close-on-select") {
    return (
      <Scoped>
        <Shell
          {...shellProps}
          onOpenChange={probe("openChange")}
          shouldCloseOnSelect={false}
        />
      </Scoped>
    );
  }

  if (name === "motion") {
    return (
      <Scoped>
        <Shell
          {...shellProps}
          popoverProps={{ ...shellProps.popoverProps, className: "duration-[6000ms]" }}
        />
      </Scoped>
    );
  }

  if (name === "controlled") {
    return (
      <Scoped>
        <Shell {...shellProps} defaultValue={undefined} value={startDate()} />
      </Scoped>
    );
  }

  if (name === "empty") {
    return (
      <Scoped>
        <Shell {...shellProps} defaultValue={undefined} />
      </Scoped>
    );
  }

  return (
    <Scoped>
      <Shell {...shellProps} />
    </Scoped>
  );
}

mount(Fixture);
