import { host, mount, View } from "nsh";
import type { JSX } from "nsh";
import {
  Button,
  DateField,
  DateRangePicker,
  EnvironmentScope,
  Label,
  RangeCalendar,
} from "@heroui/react";
import type { DateInputGroupInputKeyboardType } from "@heroui/react";
import { CalendarDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import { DateInputGroupKeyboardContext } from "../src/components/date-input-group/date-input-group-context";
import type { DateSegment } from "../src/components/date-input-group/date-field-utils";

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
 * A-011 (mobile layer): every case mounts inside `Scoped`, which always
 * provides an `EnvironmentScope` — `host.params.input` / `width` / `density`
 * inject field by field, absent params keep the host-derived baseline (the
 * popover unit measured that an unwrapped fragment breaks exit-hold unmount).
 * Extra params read on every case:
 *   presentation  "panel" | "sheet" | "auto"  → Popover.presentation
 *   nonmodal      "1" → Popover.isNonModal
 *   kd            "1" → Popover.isKeyboardDismissDisabled
 *   kt            a KeyboardType name → both DateField.Input `keyboardType`s
 *   readonly      "1" → Root.isReadOnly        disabled "1" → Root.isDisabled
 * Carrier probes: the layer derives `drp-popover-panel` / `drp-popover-sheet`
 * from `testID="drp-popover"`; `onLayout` probes record "group" and "trigger".
 * `dig-seg-*` channels come from the date-input-group unit — single-side
 * addressing uses `id:drp-start-input >> id:dig-seg-*` / `id:drp-end-input >>`.
 *
 * testIDs: drp-root, drp-group, drp-start-input, drp-end-input, drp-trigger,
 * drp-popover(-panel/-sheet), drp-calendar, drp-preset. The separator and the
 * suffix are read
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

/*
 * The mobile layer's segment probes (adapt sheet M-009/M-010/M-011): Segment
 * takes no `onLayout`, so a shrink-wrapping `View` reports its bounds; the
 * `className` render prop records focus/edit state and text per segment per
 * side; `KeyboardTypeProbe` sits inside the Input's provider tree (as a
 * segment sibling, so the segment keeps its own text) and records the
 * `DateInputGroupKeyboardContext` value the `kt` param feeds — the host's
 * soft keyboard itself is unobservable (sheet §6).
 */
function KeyboardTypeProbe(props: { side: "start" | "end" }) {
  const record = probe("keyboard-type");
  const type = DateInputGroupKeyboardContext();

  record({ side: props.side, type: type() });

  return <></>;
}

type SegmentSlot = "start" | "end";

function segmentProbes(side: SegmentSlot) {
  const segmentBounds = probe("segment-bounds");
  const segmentProps = probe("segment-props");

  return (segment: DateSegment) => (
    <View
      onLayout={(event) =>
        segmentBounds({ side, type: segment.type, bounds: event.bounds })
      }
    >
      <DateField.Segment
        segment={segment}
        className={(values) => {
          segmentProps({
            side,
            type: segment.type,
            isFocused: values.isFocused(),
            isDisabled: values.isDisabled(),
            isReadOnly: values.isReadOnly(),
            text: values.text,
          });

          return "";
        }}
      />
      {segment.type === "month" ? <KeyboardTypeProbe side={side} /> : null}
    </View>
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
  // A-011: the mobile layer's extra knobs (all optional, default = baseline).
  presentation?: "auto" | "panel" | "sheet";
  isNonModal?: boolean;
  isKeyboardDismissDisabled?: boolean;
  keyboardType?: DateInputGroupInputKeyboardType;
  isReadOnly?: boolean;
  isDisabled?: boolean;
};

function Shell(props: ShellProps) {
  return (
    <Stage>
      <DateRangePicker
        defaultValue={props.defaultValue}
        endName="endDate"
        isDisabled={props.isDisabled}
        isReadOnly={props.isReadOnly}
        onChange={recordRange}
        onOpenChange={props.onOpenChange}
        shouldCloseOnSelect={props.shouldCloseOnSelect}
        startName="startDate"
        testID="drp-root"
        value={props.value}
      >
        <Label>Trip dates</Label>
        {/* A-011: "group" layout probe for the touch hit-area assertions. */}
        <DateField.Group fullWidth testID="drp-group" onLayout={layout("group")}>
          <DateField.Input
            slot="start"
            testID="drp-start-input"
            keyboardType={props.keyboardType}
          >
            {segmentProbes("start")}
          </DateField.Input>
          <DateRangePicker.RangeSeparator onLayout={layout("separator")} />
          <DateField.Input
            slot="end"
            testID="drp-end-input"
            keyboardType={props.keyboardType}
          >
            {segmentProbes("end")}
          </DateField.Input>
          <DateField.Suffix onLayout={layout("suffix")}>
            <DateRangePicker.Trigger
              aria-label="Open calendar"
              onFocus={() => probe("trigger-focus")()}
              onLayout={layout("trigger")}
              testID="drp-trigger"
            >
              <DateRangePicker.TriggerIndicator />
            </DateRangePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <DateRangePicker.Popover
          aria-label={props.popoverProps?.["aria-label"]}
          className={props.popoverProps?.className}
          isKeyboardDismissDisabled={props.isKeyboardDismissDisabled}
          isNonModal={props.isNonModal}
          presentation={props.presentation}
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

/**
 * A-011: the injected-environment seam. `EnvironmentScope` is mounted for
 * every case — `host.params.input` / `width` / `density` override field by
 * field and an absent param keeps the host-derived baseline, so the same
 * file serves the desktop-parity half and the injected mobile half without
 * a wrapper-less fragment (the popover unit measured that a bare fragment
 * breaks exit-hold unmount).
 */
function Scoped(props: { children?: JSX.Element }) {
  const input = String(host.params.input ?? "");
  const width = String(host.params.width ?? "");
  const density = String(host.params.density ?? "");

  return (
    <EnvironmentScope
      input={input === "touch" || input === "pointer" ? input : undefined}
      width={width === "compact" || width === "regular" ? width : undefined}
      density={density === "compact" || density === "default" ? density : undefined}
    >
      {props.children}
    </EnvironmentScope>
  );
}

/** `"1"` or `true` — the mobile params arrive as strings. */
function flag(name: string): boolean {
  const raw = host.params[name];

  return raw === true || String(raw ?? "") === "1";
}

/** A-011: the extra knobs shared by every case, read once from host.params. */
function extras(): Pick<
  ShellProps,
  "presentation" | "isNonModal" | "isKeyboardDismissDisabled" | "keyboardType" |
  "isReadOnly" | "isDisabled"
> {
  const p = String(host.params.presentation ?? "");
  const kt = host.params.kt;

  return {
    presentation:
      p === "panel" || p === "sheet" || p === "auto" ? (p as "auto" | "panel" | "sheet") : undefined,
    isNonModal: flag("nonmodal"),
    isKeyboardDismissDisabled: flag("kd"),
    keyboardType:
      typeof kt === "string" && kt !== ""
        ? (kt as DateInputGroupInputKeyboardType)
        : undefined,
    isReadOnly: flag("readonly"),
    isDisabled: flag("disabled"),
  };
}

function Fixture() {
  const name = String(host.params.case ?? "default");
  const extra = extras();

  if (name === "open") {
    return (
      <Scoped>
        <Shell defaultValue={startRange()} onOpenChange={probe("openChange")} {...extra} />
      </Scoped>
    );
  }

  if (name === "layout") {
    return (
      <Scoped>
        <Shell
          defaultValue={startRange()}
          preset
          probes
          popoverProps={{
            className: "flex items-start gap-4",
            "aria-label": "Choose a range",
          }}
          {...extra}
        />
      </Scoped>
    );
  }

  if (name === "no-close-on-select") {
    return (
      <Scoped>
        <Shell defaultValue={startRange()} shouldCloseOnSelect={false} {...extra} />
      </Scoped>
    );
  }

  if (name === "controlled") {
    return (
      <Scoped>
        <Shell value={startRange()} {...extra} />
      </Scoped>
    );
  }

  return (
    <Scoped>
      <Shell defaultValue={startRange()} {...extra} />
    </Scoped>
  );
}

mount(Fixture);
