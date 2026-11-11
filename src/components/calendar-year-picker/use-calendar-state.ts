/**
 * Calendar state bridge reserved for the Calendar / RangeCalendar integration.
 * The date components are not present in this worktree yet.
 */
export function useCalendarOrRangeState(): never {
  throw new Error("useCalendarOrRangeState requires a <Calendar> or <RangeCalendar> implementation.");
}
