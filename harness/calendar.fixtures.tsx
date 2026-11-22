import { effect, host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Calendar, EnvironmentScope } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { CalendarDate, DateValue } from "@internationalized/date";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import {
  CalendarContext,
  type CalendarContextValue,
  type CalendarFeedbackChannels,
} from "../src/components/calendar/calendar-context";
import { createInput } from "../src/primitives/environment";

/*
 * NSH-only Calendar fixtures for the mobile layer (adapt-sheets/calendar.md
 * §4, M-001…M-011). Not shared scenarios: every case is built from HeroUI's
 * public API and records callbacks through `probe`, read back from Storage.
 *
 * host.params.case picks the case:
 *   default          Heading + nav buttons + grid, defaultValue 2026-08-15,
 *                    min 2020-01-01 / max 2030-12-31, every probe attached
 *   disabled         default + isDisabled
 *   readonly         default + isReadOnly
 *   unavailable      default + isDateUnavailable(2026-08-20)
 *   range-start      defaultValue 2020-01-15 at the min bound, so the
 *                    previous page is range-invalid (nav boundary, M-006)
 *   multiple         selectionMode="multiple", two dates preselected
 *   class-override   default + className="w-40" on the root (M-005's
 *                    custom-width half)
 *   indicator        no defaultValue; cells render through their render prop
 *                    and mount Calendar.CellIndicator only while selected
 *                    (M-010's "dot only on the selected cell" carrier)
 *   year-picker      YearPickerTrigger composition + YearPickerGrid (M-009's
 *                    picker half); host.params.picker="open" mounts it open
 *
 * host.params.scope picks the environment: "" = the host default (pointer on
 * headless/web — the desktop-parity half), "touch" wraps the tree in
 * EnvironmentScope(input="touch"). host.params.weekday="narrow" switches the
 * grid's weekdayStyle on the default frame (M-010).
 *
 * Probe surface, all through app.storage():
 *   layout         part bounds — "root", "grid", "nav-previous",
 *                  "nav-next", "header-<weekday label>", "day-<yyyy-mm-dd>",
 *                  "dot" (the selected cell's indicator)
 *   onChange       Root onChange — ISO string, ISO list in multiple mode
 *   onFocusChange  Root onFocusChange — ISO date
 *   cell-press     each Cell's onPress — ISO date (fires before the guard
 *                  chain, so it records even when selection is refused)
 *   day-focus      each Cell's onFocus — ISO date
 *   seam-env       input + per-slot nav channels + mounted cell count
 *   seam-edge      pressed-set edges — which cell dates / nav slots the
 *                  touch-gated seam holds
 *   seam-state     on-demand full channel dump per cell/nav slot
 *
 * The seam channels come from CalendarContextValue.navButtonHitSlop /
 * .cellFeedback (adapt sheet §5): the fixture imports the internal context
 * directly, the same way checkbox/list-box fixtures do. `calCtx` carries the
 * context to the `cal-sample` sibling button outside the calendar.
 */

const MIN_VALUE = parseDate("2020-01-01");
const MAX_VALUE = parseDate("2030-12-31");
const DEFAULT_VALUE = parseDate("2026-08-15");

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

function channel(ch: CalendarFeedbackChannels): ChannelSnapshot {
  return {
    enabled: ch.enabled(),
    isPressed: ch.isPressed(),
    hitSlop: ch.hitSlop() ?? null,
    bounds: ch.bounds(),
    origin: ch.pressOrigin(),
  };
}

let calCtx: CalendarContextValue | null = null;

/** The full seam dump `seam-state` reports: input, both nav slots, every cell. */
function readSeam(ctx: CalendarContextValue | null, input: () => string) {
  if (ctx === null) return null;
  const nav = ctx.navButtonHitSlop();
  const cells = ctx.cellFeedback();
  return {
    input: input(),
    nav: {
      previous: nav.previous ? channel(nav.previous) : null,
      next: nav.next ? channel(nav.next) : null,
    },
    cells: [...cells.entries()].map(([date, ch]) => ({ date, ...channel(ch) })),
  };
}

/**
 * Reads the seam channels through CalendarContext and reports three surfaces:
 * `seam-env` (mount-time input/nav gate/cell count), `seam-edge` (which cell
 * dates and nav slots are seam-pressed, on every isPressed edge) and
 * `seam-state` (the full per-cell dump, on demand plus deferred samples after
 * each press edge and from a 200 ms poll while any seam press is held — the
 * web-batching half, same cadence as switch.fixtures' CtxProbe).
 */
function SeamProbe() {
  const ctx = CalendarContext() ?? null;
  const input = createInput();
  const reportEnv = probe("seam-env");
  const reportEdge = probe("seam-edge");
  const reportState = probe("seam-state");

  effect(() => {
    calCtx = ctx;
  });

  const sample = () => reportState(readSeam(ctx, input));

  effect(() => {
    const nav = ctx?.navButtonHitSlop() ?? {};
    reportEnv({
      input: input(),
      cellCount: ctx?.cellFeedback().size ?? 0,
      nav: {
        previous: nav.previous
          ? {
              enabled: nav.previous.enabled(),
              isPressed: nav.previous.isPressed(),
              hitSlop: nav.previous.hitSlop() ?? null,
            }
          : null,
        next: nav.next
          ? {
              enabled: nav.next.enabled(),
              isPressed: nav.next.isPressed(),
              hitSlop: nav.next.hitSlop() ?? null,
            }
          : null,
      },
    });
  });

  effect(() => {
    const nav = ctx?.navButtonHitSlop() ?? {};
    const cells = ctx?.cellFeedback() ?? new Map<string, CalendarFeedbackChannels>();
    const pressedCells = [...cells.entries()]
      .filter(([, ch]) => ch.isPressed())
      .map(([date]) => date);
    const navPressed = {
      previous: nav.previous?.isPressed() ?? false,
      next: nav.next?.isPressed() ?? false,
    };
    reportEdge({ cells: pressedCells, nav: navPressed });
    if (pressedCells.length > 0 || navPressed.previous || navPressed.next) {
      setTimeout(sample, 600);
      setTimeout(sample, 1500);
    }
  });

  effect(() => {
    const timer = setInterval(() => {
      const nav = ctx?.navButtonHitSlop() ?? {};
      const cells = ctx?.cellFeedback() ?? new Map<string, CalendarFeedbackChannels>();
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
    <View testID="cal-sample" role="button" class="p-2" onPress={() => report(readSeam(calCtx, input))}>
      <Text>sample</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Calendar frames
 * -----------------------------------------------------------------------------------------------*/

type FrameProps = {
  defaultValue?: DateValue | DateValue[] | null;
  defaultFocusedValue?: DateValue;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  selectionMode?: "single" | "multiple";
  className?: string;
  weekdayStyle?: "narrow" | "short" | "long";
  minValue?: DateValue;
  maxValue?: DateValue;
  isDateUnavailable?: (date: DateValue) => boolean;
  /** Year-picker composition: trigger heading + open YearPickerGrid. */
  yearPicker?: boolean;
  defaultYearPickerOpen?: boolean;
  /** Cells render through their render prop; the indicator mounts only while selected. */
  indicator?: boolean;
  /** NavButton's own isDisabled prop (RAC ButtonContext merges it with the range gate). */
  navIsDisabled?: boolean;
};

function DayCell(props: { date: CalendarDate; indicator?: boolean }) {
  const reportFocus = probe("day-focus");
  const reportPress = probe("cell-press");
  const iso = props.date.toString();

  if (props.indicator === true) {
    return (
      <Calendar.Cell
        date={props.date}
        onFocus={() => reportFocus(iso)}
        onPress={() => reportPress(iso)}
        onLayout={layout(`day-${iso}`)}
      >
        {(cell) => (
          // A View wrapper, not a fragment: element-level conditionals inside
          // a fragment returned from the render prop do not mount on signal
          // flips (measured); inside a View they do.
          <View class="flex-col items-center">
            <Text>{cell.formattedDate}</Text>
            {cell.isSelected() ? (
              <Calendar.CellIndicator testID="sel-dot" onLayout={layout("dot")} />
            ) : null}
          </View>
        )}
      </Calendar.Cell>
    );
  }

  return (
    <Calendar.Cell
      date={props.date}
      onFocus={() => reportFocus(iso)}
      onPress={() => reportPress(iso)}
      onLayout={layout(`day-${iso}`)}
    />
  );
}

function CalendarFrame(props: FrameProps) {
  return (
    <Calendar
      aria-label="Event date"
      defaultValue={props.defaultValue}
      defaultFocusedValue={props.defaultFocusedValue}
      isDisabled={props.isDisabled}
      isReadOnly={props.isReadOnly}
      selectionMode={props.selectionMode}
      className={props.className}
      minValue={props.minValue ?? MIN_VALUE}
      maxValue={props.maxValue ?? MAX_VALUE}
      isDateUnavailable={props.isDateUnavailable}
      defaultYearPickerOpen={props.defaultYearPickerOpen}
      onChange={(value) =>
        probe("onChange")(
          Array.isArray(value)
            ? value.map((date) => date.toString())
            : value == null
              ? null
              : value.toString(),
        )
      }
      onFocusChange={(date) => probe("onFocusChange")(date.toString())}
      onLayout={layout("root")}
    >
      <Calendar.Header>
        {props.yearPicker === true ? (
          <Calendar.YearPickerTrigger>
            <Calendar.YearPickerTriggerHeading />
            <Calendar.YearPickerTriggerIndicator />
          </Calendar.YearPickerTrigger>
        ) : (
          <Calendar.Heading />
        )}
        <Calendar.NavButton
          slot="previous"
          isDisabled={props.navIsDisabled}
          onLayout={layout("nav-previous")}
        />
        <Calendar.NavButton slot="next" onLayout={layout("nav-next")} />
      </Calendar.Header>
      <Calendar.Grid weekdayStyle={props.weekdayStyle} onLayout={layout("grid")}>
        <Calendar.GridHeader>
          {(day) => (
            <Calendar.HeaderCell onLayout={layout(`header-${day}`)}>{day}</Calendar.HeaderCell>
          )}
        </Calendar.GridHeader>
        <Calendar.GridBody>
          {(date) => <DayCell date={date} indicator={props.indicator} />}
        </Calendar.GridBody>
      </Calendar.Grid>
      {props.yearPicker === true ? (
        <Calendar.YearPickerGrid>
          <Calendar.YearPickerGridBody>
            {({ year }) => <Calendar.YearPickerCell year={year} />}
          </Calendar.YearPickerGridBody>
        </Calendar.YearPickerGrid>
      ) : null}
      <SeamProbe />
    </Calendar>
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

function Fixture() {
  const name = String(host.params.case ?? "default");
  const weekday = String(host.params.weekday ?? "") as "narrow" | "short" | "long" | "";

  if (name === "disabled") return <CalendarFrame isDisabled defaultValue={DEFAULT_VALUE} />;
  if (name === "readonly") return <CalendarFrame isReadOnly defaultValue={DEFAULT_VALUE} />;
  if (name === "unavailable") {
    // host.params.value overrides the selected date — the "unavailable +
    // selected" combination case (M-008) mounts value=2026-08-20, which the
    // availability rule also refuses.
    return (
      <CalendarFrame
        isDateUnavailable={(date) => date.day === 20 && date.month === 8 && date.year === 2026}
        defaultValue={
          String(host.params.value ?? "") === ""
            ? DEFAULT_VALUE
            : parseDate(String(host.params.value))
        }
      />
    );
  }
  if (name === "range-start") return <CalendarFrame defaultValue={parseDate("2020-01-15")} />;
  if (name === "nav-disabled") {
    // The NavButton part's own isDisabled prop — the prop half of M-006's
    // "NavButton focusable/enabled false" clause (the range half is
    // range-start).
    return <CalendarFrame navIsDisabled defaultValue={DEFAULT_VALUE} />;
  }
  if (name === "multiple") {
    return (
      <CalendarFrame
        selectionMode="multiple"
        defaultValue={[parseDate("2026-08-10"), parseDate("2026-08-15")]}
      />
    );
  }
  if (name === "class-override") {
    return <CalendarFrame className="w-40" defaultValue={DEFAULT_VALUE} />;
  }
  if (name === "indicator") {
    // No value: nothing is selected, so `sel-dot` mounts only after a press.
    // `defaultFocusedValue` pins the visible month — without it the calendar
    // opens on today's month and the August selectors find no cell.
    return <CalendarFrame indicator defaultFocusedValue={parseDate("2026-08-15")} />;
  }
  if (name === "year-picker") {
    return (
      <CalendarFrame
        yearPicker
        defaultValue={DEFAULT_VALUE}
        defaultYearPickerOpen={String(host.params.picker ?? "") === "open"}
      />
    );
  }

  return (
    <CalendarFrame weekdayStyle={weekday === "" ? undefined : weekday} defaultValue={DEFAULT_VALUE} />
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
