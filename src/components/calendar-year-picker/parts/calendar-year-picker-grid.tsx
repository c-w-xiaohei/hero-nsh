import type { Accessor, JSX, ViewProps } from "nsh";
import { computed, context, split, View } from "nsh";
import type { ViewRef } from "nsh";
import type { CalendarYearPickerVariants } from "../calendar-year-picker.styles";
import { calendarYearPickerVariants } from "../calendar-year-picker.styles";
import { useYearPicker } from "../year-picker-context";

export interface CalendarYearPickerGridProps extends Omit<ViewProps, "children" | "class">, CalendarYearPickerVariants {
  children?: JSX.Element;
  className?: string;
  format?: "numeric" | "2-digit";
  visibleYears?: number;
  onKeyDown?: (event: unknown) => void;
  ref?: (node: ViewRef) => void;
}

export interface YearCellData {
  year: Accessor<number>;
  formattedYear: Accessor<string>;
  isSelected: Accessor<boolean>;
  isCurrentYear: Accessor<boolean>;
  isOpen: Accessor<boolean>;
  selectYear: () => void;
}

export interface YearGridContextValue {
  years: Accessor<readonly number[]>;
  yearData: (year: number) => YearCellData;
}

export const YearGridContext = context<YearGridContextValue | undefined>(undefined);

export function CalendarYearPickerGrid(props: CalendarYearPickerGridProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "format", "visibleYears", "onKeyDown", "ref"]);
  const parent = useYearPicker();
  const count = Math.max(1, local.visibleYears ?? 20);
  // The Calendar state bridge is supplied by Calendar/RangeCalendar. Until its
  // date API is available, derive a stable local year range for this instance.
  const firstYear = new Date().getFullYear() - Math.floor(count / 2);
  const years = computed(() => Array.from({ length: count }, (_, index) => firstYear + index));
  const values: YearGridContextValue = {
    years,
    yearData: (year) => {
      const isSelected = computed(() => year === new Date().getFullYear());
      return {
        year: () => year,
        formattedYear: () => new Intl.DateTimeFormat(undefined, { year: local.format ?? "numeric" }).format(new Date(year, 0, 1)),
        isSelected,
        isCurrentYear: () => year === new Date().getFullYear(),
        isOpen: parent.isYearPickerOpen,
        selectYear: () => parent.setIsYearPickerOpen(false),
      };
    },
  };
  const classes = calendarYearPickerVariants();
  return (
    <YearGridContext.Provider value={values}>
      <View
        {...rest}
        ref={(node) => local.ref?.(node)}
        role="listbox"
        accessibilityLabel="Choose year"
        // R-013: opacity and pointer behavior follow the parent open state.
        // R-014: preserve the upstream three-column year collection.
        class={`${classes.yearGrid()} ${parent.isYearPickerOpen() ? "pointer-events-auto opacity-100" : "opacity-0"} ${local.className ?? ""}`}
      >
        {local.children}
      </View>
    </YearGridContext.Provider>
  );
}
