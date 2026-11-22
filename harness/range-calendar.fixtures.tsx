import { effect, host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import { EnvironmentScope, RangeCalendar } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { CalendarDate, DateValue } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import {
  RangeCalendarContext,
  type RangeCalendarContextValue,
  type RangeCalendarFeedbackChannels,
} from "../src/components/range-calendar/range-calendar-context";
import { createInput } from "../src/primitives/environment";

/*
 * NSH-only RangeCalendar fixtures for the mobile layer (adapt-sheets/
 * range-calendar.md §4, M-001…M-014). Not shared scenarios: every case is
 * built from HeroUI's public API and records callbacks through `probe`, read
 * back from Storage.
 *
 * host.params.case picks the case:
 *   default           YearPickerTrigger header + nav buttons + grid +
 *                     YearPickerGrid, defaultValue 2026-08-01…08-05, min
 *                     2020-01-01 / max 2030-12-31, every probe attached
 *   disabled          default + isDisabled
 *   readonly          default + isReadOnly
 *   unavailable       default + isDateUnavailable(2026-08-12)
 *   unavailable-range isDateUnavailable(2026-08-12) inside the selected
 *                     range 2026-08-10…08-15 (M-008's "range 内 unavailable
 *                     日不绘 track/cap" carrier)
 *   noncontiguous     allowsNonContiguousRanges + isDateUnavailable(2026-08-12)
 *   range-start       defaultFocusedValue 2020-01-15 at the min bound, so the
 *                     previous page is range-invalid (M-006/M-012 boundary)
 *   range-end         defaultFocusedValue 2030-12-15 at the max bound
 *   nav-disabled      the previous NavButton's own isDisabled prop
 *   class-override    default + className="w-40" on the root (M-005)
 *   today             no value and no focused value — the grid opens on the
 *                     current month so today's cell exists (M-004)
 *   indicator         no defaultValue; cells render through their render prop
 *                     and mount CellIndicator only while selected (M-013)
 *   duration          visibleDuration={{weeks: 2}} (M-012's visibleDuration)
 *
 * host.params.scope picks the environment: "" = the host default (pointer on
 * headless/web — the desktop-parity half), "touch" wraps the tree in
 * EnvironmentScope(input="touch"). host.params.weekday switches the grid's
 * weekdayStyle on the default frame (M-013).
 *
 * Probe surface, all through app.storage():
 *   layout            part bounds — "root", "grid", "grid-header",
 *                     "nav-previous", "nav-next", "header-<weekday label>",
 *                     "day-<yyyy-mm-dd>", "dot" (the selected cell's indicator)
 *   range-change      Root onChange — {start, end} ISO pair (testers'
 *                     `rangeValues`/`lastRangeValue` read this name)
 *   focus-change      Root onFocusChange — ISO date
 *   picker-change     onYearPickerOpenChange — boolean
 *   cell-press        each Cell's onPress — ISO date (fires before the guard
 *                     chain, so it records even when selection is refused)
 *   day-focus         each Cell's onFocus — ISO date
 *   cell-hover        each Cell's onHoverStart/onHoverEnd — "<iso>:start"/":end"
 *   unavailable-args  isDateUnavailable calls — [date ISO, anchor ISO|null]
 *   seam-env          input + anchor + isValueInvalid + value + nav gate/cell
 *                     count, re-reported on every subscribed edge
 *   seam-edge         which cell dates / nav slots the touch-gated seam holds
 *                     pressed, plus the anchor/invalid state at that edge
 *   seam-state        on-demand full channel dump per cell/nav slot
 *
 * The seam channels come from RangeCalendarContextValue.navButtonFeedback /
 * .cellFeedback (adapt sheet §5): the fixture imports the internal context
 * directly, the same way the calendar/checkbox fixtures do. `rcCtx` carries
 * the context to the `rc-sample` sibling button outside the calendar.
 */

const MIN_VALUE = parseDate("2020-01-01");
const MAX_VALUE = parseDate("2030-12-31");
const DEFAULT_VALUE = { start: parseDate("2026-08-01"), end: parseDate("2026-08-05") };

/* -------------------------------------------------------------------------------------------------
 * Layout + seam probes
 * -----------------------------------------------------------------------------------------------*/

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

type ChannelSnapshot = {
  enabled: boolean;
  isPressed: boolean;
  hitSlop:
    | { top?: number; right?: number; bottom?: number; left?: number }
    | number
    | null;
  bounds: { width: number; height: number };
  origin: { x: number; y: number } | null;
};

function channel(ch: RangeCalendarFeedbackChannels): ChannelSnapshot {
  return {
    enabled: ch.enabled(),
    isPressed: ch.isPressed(),
    hitSlop: ch.hitSlop() ?? null,
    bounds: ch.bounds(),
    origin: ch.pressOrigin(),
  };
}

let rcCtx: RangeCalendarContextValue | null = null;

/** The range state a seam sample reports: the two-press machine's anchors. */
function rangeState(state: RangeCalendarContextValue["state"]) {
  const value = state.value();
  return {
    anchor: state.anchorDate()?.toString() ?? null,
    invalid: state.isValueInvalid(),
    value: value ? { start: value.start.toString(), end: value.end.toString() } : null,
  };
}

/** The full seam dump `seam-state` reports: input, both nav slots, every cell. */
function readSeam(ctx: RangeCalendarContextValue | null, input: () => string) {
  if (ctx === null) return null;
  const nav = ctx.navButtonFeedback();
  const cells = ctx.cellFeedback();
  return {
    input: input(),
    ...rangeState(ctx.state),
    cellCount: cells.size,
    nav: {
      previous: nav.previous ? channel(nav.previous) : null,
      next: nav.next ? channel(nav.next) : null,
    },
    cells: [...cells.entries()].map(([date, ch]) => ({ date, ...channel(ch) })),
  };
}

/**
 * Reads the seam channels through RangeCalendarContext and reports three
 * surfaces: `seam-env` (mount-time input/anchor/invalid/nav gate/cell count,
 * re-reported on every subscribed edge), `seam-edge` (which cell dates and
 * nav slots are seam-pressed, on every isPressed edge) and `seam-state` (the
 * full per-cell dump, on demand plus deferred samples after each press edge
 * and from a 200 ms poll while any seam press is held — the web-batching
 * half, same cadence as calendar.fixtures' SeamProbe).
 */
function SeamProbe() {
  const ctx = RangeCalendarContext() ?? null;
  const input = createInput();
  const reportEnv = probe("seam-env");
  const reportEdge = probe("seam-edge");
  const reportState = probe("seam-state");

  effect(() => {
    rcCtx = ctx;
  });

  const sample = () => reportState(readSeam(ctx, input));

  effect(() => {
    const nav = ctx?.navButtonFeedback() ?? {};
    const slim = (ch: RangeCalendarFeedbackChannels | undefined) =>
      ch
        ? {
            enabled: ch.enabled(),
            isPressed: ch.isPressed(),
            hitSlop: ch.hitSlop() ?? null,
          }
        : null;
    reportEnv({
      input: input(),
      ...(ctx ? rangeState(ctx.state) : { anchor: null, invalid: false, value: null }),
      cellCount: ctx?.cellFeedback().size ?? 0,
      nav: { previous: slim(nav.previous), next: slim(nav.next) },
    });
  });

  effect(() => {
    const nav = ctx?.navButtonFeedback() ?? {};
    const cells = ctx?.cellFeedback() ?? new Map<string, RangeCalendarFeedbackChannels>();
    const pressedCells = [...cells.entries()]
      .filter(([, ch]) => ch.isPressed())
      .map(([date]) => date);
    const navPressed = {
      previous: nav.previous?.isPressed() ?? false,
      next: nav.next?.isPressed() ?? false,
    };
    reportEdge({
      cells: pressedCells,
      nav: navPressed,
      ...(ctx ? rangeState(ctx.state) : { anchor: null, invalid: false }),
    });
    if (pressedCells.length > 0 || navPressed.previous || navPressed.next) {
      setTimeout(sample, 600);
      setTimeout(sample, 1500);
    }
  });

  effect(() => {
    const timer = setInterval(() => {
      const nav = ctx?.navButtonFeedback() ?? {};
      const cells = ctx?.cellFeedback() ?? new Map<string, RangeCalendarFeedbackChannels>();
      const anyCell = [...cells.values()].some((ch) => ch.isPressed());
      const anyNav =
        (nav.previous?.isPressed() ?? false) || (nav.next?.isPressed() ?? false);
      if (anyCell || anyNav) sample();
    }, 200);
    return () => clearInterval(timer);
  });

  return null;
}

/** Sibling of the calendar that dumps the seam channels on demand. */
function SampleButton() {
  const input = createInput();
  const report = probe("seam-state");
  return (
    <View testID="rc-sample" role="button" class="p-2" onPress={() => report(readSeam(rcCtx, input))}>
      <Text>sample</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Calendar frames
 * -----------------------------------------------------------------------------------------------*/

type FrameProps = {
  defaultValue?: { start: DateValue; end: DateValue } | null;
  defaultFocusedValue?: DateValue;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isDateUnavailable?: (date: DateValue, anchorDate: CalendarDate | null) => boolean;
  minValue?: DateValue | null;
  maxValue?: DateValue | null;
  allowsNonContiguousRanges?: boolean;
  visibleDuration?: { days?: number; weeks?: number; months?: number };
  weekdayStyle?: "narrow" | "short" | "long";
  className?: string;
  /** The previous NavButton's own isDisabled prop. */
  navPrevDisabled?: boolean;
  /** Cells render through their render prop; the indicator mounts only while selected. */
  indicator?: boolean;
};

function DayCell(props: { date: CalendarDate; indicator?: boolean }) {
  const reportFocus = probe("day-focus");
  const reportPress = probe("cell-press");
  const reportHover = probe("cell-hover");
  const iso = props.date.toString();

  if (props.indicator === true) {
    return (
      <RangeCalendar.Cell
        date={props.date}
        onFocus={() => reportFocus(iso)}
        onPress={() => reportPress(iso)}
        onHoverStart={() => reportHover(`${iso}:start`)}
        onHoverEnd={() => reportHover(`${iso}:end`)}
        onLayout={layout(`day-${iso}`)}
      >
        {(cell) => (
          // A View wrapper, not a fragment: element-level conditionals inside
          // a fragment returned from the render prop do not mount on signal
          // flips (measured); inside a View they do.
          <View class="flex-col items-center">
            <Text>{cell.formattedDate}</Text>
            {cell.isSelected() ? (
              <RangeCalendar.CellIndicator testID="sel-dot" onLayout={layout("dot")} />
            ) : null}
          </View>
        )}
      </RangeCalendar.Cell>
    );
  }

  return (
    <RangeCalendar.Cell
      date={props.date}
      onFocus={() => reportFocus(iso)}
      onPress={() => reportPress(iso)}
      onHoverStart={() => reportHover(`${iso}:start`)}
      onHoverEnd={() => reportHover(`${iso}:end`)}
      onLayout={layout(`day-${iso}`)}
    />
  );
}

function Frame(props: FrameProps) {
  return (
    <RangeCalendar
      aria-label="Trip dates"
      defaultValue={props.defaultValue}
      defaultFocusedValue={props.defaultFocusedValue}
      isDisabled={props.isDisabled}
      isReadOnly={props.isReadOnly}
      isDateUnavailable={props.isDateUnavailable}
      minValue={props.minValue ?? MIN_VALUE}
      maxValue={props.maxValue ?? MAX_VALUE}
      allowsNonContiguousRanges={props.allowsNonContiguousRanges}
      visibleDuration={props.visibleDuration}
      className={props.className}
      onChange={(value) =>
        probe("range-change")(
          value ? { start: value.start.toString(), end: value.end.toString() } : null,
        )
      }
      onFocusChange={(date) => probe("focus-change")(date.toString())}
      onYearPickerOpenChange={(open) => probe("picker-change")(open)}
      onLayout={layout("root")}
    >
      <RangeCalendar.Header>
        <RangeCalendar.YearPickerTrigger>
          <RangeCalendar.YearPickerTriggerHeading />
          <RangeCalendar.YearPickerTriggerIndicator />
        </RangeCalendar.YearPickerTrigger>
        <RangeCalendar.NavButton
          slot="previous"
          isDisabled={props.navPrevDisabled}
          onLayout={layout("nav-previous")}
        />
        <RangeCalendar.NavButton slot="next" onLayout={layout("nav-next")} />
      </RangeCalendar.Header>
      <RangeCalendar.Grid weekdayStyle={props.weekdayStyle} onLayout={layout("grid")}>
        <RangeCalendar.GridHeader onLayout={layout("grid-header")}>
          {(day) => (
            <RangeCalendar.HeaderCell onLayout={layout(`header-${day}`)}>
              {day}
            </RangeCalendar.HeaderCell>
          )}
        </RangeCalendar.GridHeader>
        <RangeCalendar.GridBody>
          {(date) => <DayCell date={date} indicator={props.indicator} />}
        </RangeCalendar.GridBody>
      </RangeCalendar.Grid>
      <RangeCalendar.YearPickerGrid>
        <RangeCalendar.YearPickerGridBody>
          {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
        </RangeCalendar.YearPickerGridBody>
      </RangeCalendar.YearPickerGrid>
      <SeamProbe />
    </RangeCalendar>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Environment injection + dispatch
 * -----------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  return String(host.params.scope ?? "") === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

/** Refuses 2026-08-12 and records the anchorDate the state hands it (M-010). */
function unavailableAug12(date: DateValue, anchorDate: CalendarDate | null): boolean {
  probe("unavailable-args")(date.toString(), anchorDate?.toString() ?? null);
  return date.day === 12 && date.month === 8 && date.year === 2026;
}

function Fixture() {
  const name = String(host.params.case ?? "default");
  const weekday = String(host.params.weekday ?? "") as "narrow" | "short" | "long" | "";

  if (name === "disabled") {
    return <Frame isDisabled defaultValue={DEFAULT_VALUE} />;
  }
  if (name === "readonly") {
    return <Frame isReadOnly defaultValue={DEFAULT_VALUE} />;
  }
  if (name === "unavailable") {
    return <Frame isDateUnavailable={unavailableAug12} defaultValue={DEFAULT_VALUE} />;
  }
  if (name === "unavailable-range") {
    return (
      <Frame
        isDateUnavailable={unavailableAug12}
        defaultValue={{ start: parseDate("2026-08-10"), end: parseDate("2026-08-15") }}
      />
    );
  }
  if (name === "noncontiguous") {
    return (
      <Frame
        allowsNonContiguousRanges
        isDateUnavailable={unavailableAug12}
        defaultValue={DEFAULT_VALUE}
      />
    );
  }
  if (name === "range-start") {
    return <Frame defaultFocusedValue={parseDate("2020-01-15")} />;
  }
  if (name === "range-end") {
    return <Frame defaultFocusedValue={parseDate("2030-12-15")} />;
  }
  if (name === "nav-disabled") {
    return <Frame navPrevDisabled defaultValue={DEFAULT_VALUE} />;
  }
  if (name === "class-override") {
    return <Frame className="w-40" defaultValue={DEFAULT_VALUE} />;
  }
  if (name === "today") {
    // No value and no focused value: the core's focused date falls back to
    // today, so the grid opens on the current month and today's cell exists.
    return <Frame />;
  }
  if (name === "indicator") {
    // No value: nothing is selected, so `sel-dot` mounts only after presses.
    // `defaultFocusedValue` pins the visible month — without it the calendar
    // opens on today's month and the August selectors find no cell.
    return <Frame indicator defaultFocusedValue={parseDate("2026-08-15")} />;
  }
  if (name === "duration") {
    return <Frame visibleDuration={{ weeks: 2 }} defaultValue={DEFAULT_VALUE} />;
  }

  return (
    <Frame weekdayStyle={weekday === "" ? undefined : weekday} defaultValue={DEFAULT_VALUE} />
  );
}

function App() {
  return (
    <Scoped>
      <Stage>
        <Fixture />
        <SampleButton />
      </Stage>
    </Scoped>
  );
}

mount(App);
