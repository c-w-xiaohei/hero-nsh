import type { Calendar, DateValue } from "@internationalized/date";
import { createCalendar, getLocalTimeZone, now, toCalendar, toCalendarDate, toCalendarDateTime } from "@internationalized/date";
import { NumberFormatter } from "@internationalized/number";

import type { IncompleteDate } from "./incomplete-date";

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

/** React Stately's `DateSegmentType` (`@react-stately/datepicker`). */
export type DateSegmentType =
  | "era"
  | "year"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "dayPeriod"
  | "literal"
  | "timeZoneName";

/** One formatted segment, React Stately's `DateSegment`. */
export interface DateSegment {
  /** The type of segment. */
  type: DateSegmentType;
  /** The formatted text for the segment. */
  text: string;
  /** The numeric value for the segment, if applicable. */
  value?: number | null;
  /** The minimum numeric value for the segment, if applicable. */
  minValue?: number;
  /** The maximum numeric value for the segment, if applicable. */
  maxValue?: number;
  /** Whether the value is a placeholder. */
  isPlaceholder: boolean;
  /** A placeholder string for the segment. */
  placeholder: string;
  /** Whether the segment is editable. */
  isEditable: boolean;
}

/** The smallest unit the field displays (`DatePickerProps["granularity"]`). */
export type Granularity = "day" | "hour" | "minute" | "second";

/** The largest unit the field displays. */
export type MaxGranularity = "year" | "month" | Granularity;

/** What `Intl.DateTimeFormat` resolved the hour cycle to. */
export type HourCycle = "h11" | "h12" | "h23" | "h24";

/**
 * A segment that stays current inside an `<Each>` row.
 *
 * `<Each key="index">` keeps the row when the item is replaced and updates the
 * row's `item()` accessor; a plain value read in the row callback would freeze
 * the `DateSegment` the caller's render function receives (port sheet §5,
 * "children 的读法"). The proxy reads through to the row's accessor, so the
 * caller's `segment={segment}` keeps showing the text and the type the field
 * state has now, without rebuilding the view and losing its focus.
 */
export function createLiveSegment(get: () => DateSegment): DateSegment {
  return new Proxy({} as DateSegment, {
    get: (_target, property) =>
      (get() as unknown as Record<string, unknown>)[property as string],
  });
}

/* -------------------------------------------------------------------------------------------------
 * Formatting options (React Stately's `@react-stately/datepicker/utils`)
 * -----------------------------------------------------------------------------------------------*/

export type FieldOptions = Pick<
  Intl.DateTimeFormatOptions,
  "year" | "month" | "day" | "hour" | "minute" | "second"
>;

export interface FormatterOptions {
  timeZone?: string;
  hideTimeZone?: boolean;
  granularity?: Granularity;
  maxGranularity?: MaxGranularity;
  hourCycle?: 12 | 24;
  showEra?: boolean;
  shouldForceLeadingZeros?: boolean;
}

const DEFAULT_FIELD_OPTIONS: FieldOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
};

const TWO_DIGIT_FIELD_OPTIONS: FieldOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
};

/** React Stately's `getFormatOptions`, ported one to one. */
export function getFormatOptions(
  fieldOptions: FieldOptions,
  options: FormatterOptions,
): Intl.DateTimeFormatOptions {
  const defaultFieldOptions = options.shouldForceLeadingZeros
    ? TWO_DIGIT_FIELD_OPTIONS
    : DEFAULT_FIELD_OPTIONS;
  const merged: FieldOptions = { ...defaultFieldOptions, ...fieldOptions };
  const granularity = options.granularity || "minute";
  const keys = Object.keys(merged) as (keyof FieldOptions)[];
  let startIndex = keys.indexOf(options.maxGranularity ?? "year");

  if (startIndex < 0) {
    startIndex = 0;
  }

  let endIndex = keys.indexOf(granularity);

  if (endIndex < 0) {
    endIndex = 2;
  }

  const opts: Intl.DateTimeFormatOptions = {};

  for (const key of keys.slice(startIndex, endIndex + 1)) {
    (opts as Record<string, unknown>)[key] = merged[key];
  }

  if (options.hourCycle != null) {
    opts.hour12 = options.hourCycle === 12;
  }

  opts.timeZone = options.timeZone || "UTC";

  const hasTime = granularity === "hour" || granularity === "minute" || granularity === "second";

  if (hasTime && options.timeZone && !options.hideTimeZone) {
    opts.timeZoneName = "short";
  }

  if (options.showEra && startIndex === 0) {
    opts.era = "short";
  }

  return opts;
}

/** React Stately's `convertValue`. */
export function convertValue(
  value: DateValue | null | undefined,
  calendar: Calendar,
): DateValue | null | undefined {
  if (value === null) {
    return null;
  }

  if (!value) {
    return undefined;
  }

  return toCalendar(value, calendar);
}

/** React Stately's `createPlaceholderDate`: today, constrained to the granularity. */
export function createPlaceholderDate(
  placeholderValue: DateValue | null | undefined,
  granularity: string,
  calendar: Calendar,
  timeZone: string | undefined,
): DateValue {
  if (placeholderValue) {
    return convertValue(placeholderValue, calendar)!;
  }

  const date = toCalendar(
    now(timeZone ?? getLocalTimeZone()).set({
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    }),
    calendar,
  );

  if (granularity === "year" || granularity === "month" || granularity === "day") {
    return toCalendarDate(date);
  }

  if (!timeZone) {
    return toCalendarDateTime(date);
  }

  return date;
}

/** React Stately's default `createCalendar`, kept here so callers can omit it. */
export function defaultCreateCalendar(name: Parameters<typeof createCalendar>[0]): Calendar {
  return createCalendar(name);
}

/* -------------------------------------------------------------------------------------------------
 * Hour cycle helpers
 * -----------------------------------------------------------------------------------------------*/

/** Converts a 0-23 hour into the given cycle, returning the day period and the display hour. */
export function toHourCycle(hour: number, hourCycle: HourCycle): [number | null, number] {
  let dayPeriod: number | null = hour >= 12 ? 1 : 0;

  switch (hourCycle) {
    case "h11":
      // Hours are numbered from 0 to 11. Used in Japan.
      if (hour >= 12) {
        hour -= 12;
      }
      break;
    case "h12":
      // Hours are numbered from 12 (representing 0) to 11.
      if (hour === 0) {
        hour = 12;
      } else if (hour > 12) {
        hour -= 12;
      }
      break;
    case "h23":
      // 24 hour time, numbered 0 to 23.
      dayPeriod = null;
      break;
    case "h24":
      // 24 hour time numbered 24 to 23. Unused but supported by Intl.DateTimeFormat.
      hour += 1;
      dayPeriod = null;
  }

  return [dayPeriod, hour];
}

/** Converts a display hour and day period back into a 0-23 hour. */
export function fromHourCycle(hour: number, dayPeriod: number, hourCycle: HourCycle): number {
  switch (hourCycle) {
    case "h11":
      if (dayPeriod === 1) {
        hour += 12;
      }
      break;
    case "h12":
      if (hour === 12) {
        hour = 0;
      }
      if (dayPeriod === 1) {
        hour += 12;
      }
      break;
    case "h24":
      hour -= 1;
      break;
  }

  return hour;
}

/** React Stately's `cycleValue`: add, wrapping around the limits. */
export function cycleValue(
  value: number,
  amount: number,
  min: number,
  max: number,
  round = false,
): number {
  if (round) {
    value += Math.sign(amount);

    if (value < min) {
      value = max;
    }

    const div = Math.abs(amount);

    if (amount > 0) {
      value = Math.ceil(value / div) * div;
    } else {
      value = Math.floor(value / div) * div;
    }

    if (value > max) {
      value = min;
    }
  } else {
    value += amount;

    if (value < min) {
      value = max - (min - value - 1);
    } else if (value > max) {
      value = min + (value - max - 1);
    }
  }

  return value;
}

/* -------------------------------------------------------------------------------------------------
 * Segment placeholders (React Stately's `placeholders.ts`, same data)
 * -----------------------------------------------------------------------------------------------*/

type PlaceholderNames = { year: string; month: string; day: string };

const PLACEHOLDERS: Record<string, PlaceholderNames> = {
  ach: { year: "mwaka", month: "dwe", day: "nino" },
  af: { year: "jjjj", month: "mm", day: "dd" },
  am: { year: "ዓዓዓዓ", month: "ሚሜ", day: "ቀቀ" },
  an: { year: "aaaa", month: "mm", day: "dd" },
  ar: { year: "سنة", month: "شهر", day: "يوم" },
  ast: { year: "aaaa", month: "mm", day: "dd" },
  az: { year: "iiii", month: "aa", day: "gg" },
  be: { year: "гггг", month: "мм", day: "дд" },
  bg: { year: "гггг", month: "мм", day: "дд" },
  bn: { year: "yyyy", month: "মিমি", day: "dd" },
  br: { year: "bbbb", month: "mm", day: "dd" },
  bs: { year: "gggg", month: "mm", day: "dd" },
  ca: { year: "aaaa", month: "mm", day: "dd" },
  cak: { year: "jjjj", month: "ii", day: "q'q'" },
  ckb: { year: "ساڵ", month: "مانگ", day: "ڕۆژ" },
  cs: { year: "rrrr", month: "mm", day: "dd" },
  cy: { year: "bbbb", month: "mm", day: "dd" },
  da: { year: "åååå", month: "mm", day: "dd" },
  de: { year: "jjjj", month: "mm", day: "tt" },
  dsb: { year: "llll", month: "mm", day: "źź" },
  el: { year: "εεεε", month: "μμ", day: "ηη" },
  en: { year: "yyyy", month: "mm", day: "dd" },
  eo: { year: "jjjj", month: "mm", day: "tt" },
  es: { year: "aaaa", month: "mm", day: "dd" },
  et: { year: "aaaa", month: "kk", day: "pp" },
  eu: { year: "uuuu", month: "hh", day: "ee" },
  fa: { year: "سال", month: "ماه", day: "روز" },
  ff: { year: "hhhh", month: "ll", day: "ññ" },
  fi: { year: "vvvv", month: "kk", day: "pp" },
  fr: { year: "aaaa", month: "mm", day: "jj" },
  fy: { year: "jjjj", month: "mm", day: "dd" },
  ga: { year: "bbbb", month: "mm", day: "ll" },
  gd: { year: "bbbb", month: "mm", day: "ll" },
  gl: { year: "aaaa", month: "mm", day: "dd" },
  he: { year: "שנה", month: "חודש", day: "יום" },
  hr: { year: "gggg", month: "mm", day: "dd" },
  hsb: { year: "llll", month: "mm", day: "dd" },
  hu: { year: "éééé", month: "hh", day: "nn" },
  ia: { year: "aaaa", month: "mm", day: "dd" },
  id: { year: "tttt", month: "bb", day: "hh" },
  is: { year: "áááá", month: "mm", day: "dd" },
  it: { year: "aaaa", month: "mm", day: "gg" },
  ja: { year: "年", month: "月", day: "日" },
  ka: { year: "წწწწ", month: "თთ", day: "რრ" },
  kk: { year: "жжжж", month: "аа", day: "кк" },
  kn: { year: "ವವವವ", month: "ಮಿಮೀ", day: "ದಿದಿ" },
  ko: { year: "연도", month: "월", day: "일" },
  lb: { year: "jjjj", month: "mm", day: "dd" },
  lo: { year: "ປປປປ", month: "ດດ", day: "ວວ" },
  lt: { year: "mmmm", month: "mm", day: "dd" },
  lv: { year: "gggg", month: "mm", day: "dd" },
  meh: { year: "aaaa", month: "mm", day: "dd" },
  ml: { year: "വർഷം", month: "മാസം", day: "തീയതി" },
  ms: { year: "tttt", month: "mm", day: "hh" },
  nb: { year: "åååå", month: "mm", day: "dd" },
  nl: { year: "jjjj", month: "mm", day: "dd" },
  nn: { year: "åååå", month: "mm", day: "dd" },
  no: { year: "åååå", month: "mm", day: "dd" },
  oc: { year: "aaaa", month: "mm", day: "jj" },
  pl: { year: "rrrr", month: "mm", day: "dd" },
  pt: { year: "aaaa", month: "mm", day: "dd" },
  rm: { year: "oooo", month: "mm", day: "dd" },
  ro: { year: "aaaa", month: "ll", day: "zz" },
  ru: { year: "гггг", month: "мм", day: "дд" },
  sc: { year: "aaaa", month: "mm", day: "dd" },
  scn: { year: "aaaa", month: "mm", day: "jj" },
  sk: { year: "rrrr", month: "mm", day: "dd" },
  sl: { year: "llll", month: "mm", day: "dd" },
  sr: { year: "гггг", month: "мм", day: "дд" },
  "sr-latn": { year: "gggg", month: "mm", day: "dd" },
  sv: { year: "åååå", month: "mm", day: "dd" },
  szl: { year: "rrrr", month: "mm", day: "dd" },
  tg: { year: "сссс", month: "мм", day: "рр" },
  th: { year: "ปปปป", month: "ดด", day: "วว" },
  tr: { year: "yyyy", month: "aa", day: "gg" },
  uk: { year: "рррр", month: "мм", day: "дд" },
  "zh-cn": { year: "年", month: "月", day: "日" },
  "zh-tw": { year: "年", month: "月", day: "日" },
};

function placeholderNames(locale: string): PlaceholderNames {
  const lower = locale.toLowerCase();
  const direct = PLACEHOLDERS[lower];

  if (direct) {
    return direct;
  }

  const base = lower.split("-")[0];

  return PLACEHOLDERS[base] ?? PLACEHOLDERS.en;
}

/** React Stately's `getPlaceholder`. */
export function getPlaceholder(field: string, value: string, locale: string): string {
  // Use the actual placeholder value for the era and day period fields.
  if (field === "era" || field === "dayPeriod") {
    return value;
  }

  if (field === "year" || field === "month" || field === "day") {
    const names = placeholderNames(locale);

    return names[field as keyof PlaceholderNames];
  }

  // For time fields (e.g. hour, minute, etc.), use two dashes as the placeholder.
  return "––";
}

/* -------------------------------------------------------------------------------------------------
 * Segment processing (React Stately's `processSegments`)
 * -----------------------------------------------------------------------------------------------*/

const EDITABLE_SEGMENTS: Record<string, boolean> = {
  year: true,
  month: true,
  day: true,
  hour: true,
  minute: true,
  second: true,
  dayPeriod: true,
  era: true,
};

const TYPE_MAPPING: Record<string, DateSegmentType> = {
  // Some hosts lowercase every datetime part name.
  dayperiod: "dayPeriod",
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts#named_years
  relatedYear: "year",
  yearName: "literal", // not editable
  unknown: "literal",
};

function mappedType(type: string): DateSegmentType {
  return TYPE_MAPPING[type] ?? (type as DateSegmentType);
}

/**
 * Turns the formatted parts of the current display value into `DateSegment`s,
 * following React Stately's `processSegments` one to one: numeric segments are
 * re-formatted from the raw `IncompleteDate` fields so a temporarily invalid
 * date (February 30th) can be shown while editing, limits come from
 * `IncompleteDate.getSegmentLimits`, and the time segments are wrapped in
 * left-to-right isolates so an RTL locale keeps their order.
 */
export function processSegments(
  dateValue: Date,
  displayValue: IncompleteDate,
  dateFormatter: Intl.DateTimeFormat,
  resolvedOptions: Intl.ResolvedDateTimeFormatOptions,
  calendar: Calendar,
  locale: string,
  granularity: Granularity,
): DateSegment[] {
  const timeValue: DateSegmentType[] = ["hour", "minute", "second"];
  const parts = dateFormatter.formatToParts(dateValue);

  // In order to allow formatting temporarily invalid dates during editing (e.g.
  // February 30th), format numeric segments manually from raw numbers.
  const numberFormatter = new NumberFormatter(locale, { useGrouping: false });
  const twoDigitFormatter = new NumberFormatter(locale, {
    useGrouping: false,
    minimumIntegerDigits: 2,
  });
  const resolved = resolvedOptions as unknown as Record<string, string | undefined>;

  for (const part of parts) {
    if (
      part.type === "year" ||
      part.type === "month" ||
      part.type === "day" ||
      part.type === "hour"
    ) {
      const value = displayValue.read(part.type) ?? 0;

      part.value =
        resolved[part.type] === "2-digit"
          ? String(twoDigitFormatter.format(Number(value)))
          : String(numberFormatter.format(Number(value)));
    }
  }

  const processedSegments: DateSegment[] = [];

  for (const part of parts) {
    const type = mappedType(part.type);
    let isEditable = EDITABLE_SEGMENTS[type] === true;

    if (type === "era" && calendar.getEras().length === 1) {
      isEditable = false;
    }

    const isPlaceholder = EDITABLE_SEGMENTS[type] === true && displayValue.read(part.type) == null;
    const placeholder = EDITABLE_SEGMENTS[type] === true
      ? getPlaceholder(type, part.value, locale)
      : "";

    const dateSegment = {
      type,
      text: isPlaceholder ? placeholder : part.value,
      ...displayValue.getSegmentLimits(type),
      isPlaceholder,
      placeholder,
      isEditable,
    } as DateSegment;

    // There is an issue in RTL languages where time fields render
    // (minute:hour) instead of (hour:minute). RAC wraps the time segments in
    // LRI (left-to-right isolate) unicode; the isolate characters become
    // literal segments in the array.
    if (type === "hour") {
      processedSegments.push({
        type: "literal",
        text: "\u2066",
        isPlaceholder: false,
        placeholder: "",
        isEditable: false,
      });
      processedSegments.push(dateSegment);

      if (type === granularity) {
        processedSegments.push({
          type: "literal",
          text: "\u2069",
          isPlaceholder: false,
          placeholder: "",
          isEditable: false,
        });
      }
    } else if (timeValue.includes(type) && type === granularity) {
      processedSegments.push(dateSegment);
      processedSegments.push({
        type: "literal",
        text: "\u2069",
        isPlaceholder: false,
        placeholder: "",
        isEditable: false,
      });
    } else {
      processedSegments.push(dateSegment);
    }
  }

  return processedSegments;
}
