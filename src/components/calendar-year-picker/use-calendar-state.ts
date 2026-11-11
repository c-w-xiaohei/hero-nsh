/**
 * The state bridge now returns the Calendar state directly. RangeCalendar will
 * provide the same context from its own root, so the picker's parts do not
 * change when it lands (port sheet §5).
 */
export { useCalendarOrRangeState } from "../calendar/calendar-context";
