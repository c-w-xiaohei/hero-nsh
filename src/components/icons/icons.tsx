import { Path2D } from "nsh";
import type { JSX } from "nsh";

import { IconCanvas } from "./icon-base";
import type { IconProps } from "./icon-base";

/* -------------------------------------------------------------------------------------------------
 * Icon paths
 *
 * HeroUI 3.2.7, packages/react/src/components/icons.tsx: one `<path d>` per icon.
 * The data is copied byte for byte, compact missing spaces included, because
 * `Path2D` parses the same SVG path grammar. Each path is parsed once at module
 * load (port sheet §5: never inside a component body).
 * -----------------------------------------------------------------------------------------------*/

const CHEVRON_DOWN_PATH = new Path2D(
  "M2.97 5.47a.75.75 0 0 1 1.06 0L8 9.44l3.97-3.97a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 0-1.06",
);

/** Upstream's selection tick: a 16-unit polyline, stroked, never filled. */
const CHECK_PATH = new Path2D("M1 9 L7 14 L15 4");

const CHEVRON_UP_PATH = new Path2D(
  "M13.03 10.53a.75.75 0 0 1-1.06 0L8 6.56l-3.97 3.97a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06",
);

const CHEVRON_LEFT_PATH = new Path2D(
  "M10.53 2.97a.75.75 0 0 1 0 1.06L6.56 8l3.97 3.97a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 0",
);

const CHEVRON_RIGHT_PATH = new Path2D(
  "M5.47 2.97a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06L9.44 8 5.47 4.03a.75.75 0 0 1 0-1.06Z",
);

const EXTERNAL_LINK_PATH = new Path2D(
  "M1.20592 6.84333L0.379822 6.01723L4.52594 1.8672H1.37819L1.38601 0.731812H6.48742V5.83714H5.34421L5.35203 2.6933L1.20592 6.84333Z",
);

const CIRCLE_DASHED_PATH = new Path2D(
  "M6.906 1.085a7.047 7.047 0 0 1 2.188 0 .75.75 0 0 1-.232 1.482 5.546 5.546 0 0 0-1.724 0 .75.75 0 0 1-.232-1.482ZM4.933 2.502a.75.75 0 0 1-.166 1.048c-.466.34-.878.75-1.217 1.217a.75.75 0 0 1-1.213-.882 7.036 7.036 0 0 1 1.548-1.548.75.75 0 0 1 1.048.165Zm6.135 0a.75.75 0 0 1 1.047-.165 7.037 7.037 0 0 1 1.548 1.548.75.75 0 0 1-1.213.882 5.533 5.533 0 0 0-1.217-1.217.75.75 0 0 1-.165-1.048ZM1.943 6.28a.75.75 0 0 1 .624.857 5.546 5.546 0 0 0 0 1.724.75.75 0 0 1-1.482.232 7.047 7.047 0 0 1 0-2.188.75.75 0 0 1 .858-.625Zm12.114 0a.75.75 0 0 1 .858.625 7.048 7.048 0 0 1 0 2.188.75.75 0 1 1-1.482-.232 5.54 5.54 0 0 0 0-1.724.75.75 0 0 1 .624-.857ZM2.502 11.068a.75.75 0 0 1 1.048.165c.34.466.75.878 1.217 1.217a.75.75 0 0 1-.882 1.213 7.037 7.037 0 0 1-1.548-1.548.75.75 0 0 1 .165-1.047Zm10.996 0a.75.75 0 0 1 .165 1.047 7.037 7.037 0 0 1-1.548 1.548.75.75 0 0 1-.883-1.213 5.53 5.53 0 0 0 1.218-1.217.75.75 0 0 1 1.048-.165Zm-7.217 2.99a.75.75 0 0 1 .857-.625 5.54 5.54 0 0 0 1.724 0 .75.75 0 0 1 .232 1.482 7.048 7.048 0 0 1-2.188 0 .75.75 0 0 1-.625-.857Z",
);

const CLOSE_PATH = new Path2D(
  "M3.47 3.47a.75.75 0 0 1 1.06 0L8 6.94l3.47-3.47a.75.75 0 1 1 1.06 1.06L9.06 8l3.47 3.47a.75.75 0 1 1-1.06 1.06L8 9.06l-3.47 3.47a.75.75 0 0 1-1.06-1.06L6.94 8 3.47 4.53a.75.75 0 0 1 0-1.06Z",
);

const INFO_PATH = new Path2D(
  "M8 13.5a5.5 5.5 0 1 0 0-11a5.5 5.5 0 0 0 0 11M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14m1-9.5a1 1 0 1 1-2 0a1 1 0 0 1 2 0m-.25 3a.75.75 0 0 0-1.5 0V11a.75.75 0 0 0 1.5 0z",
);

const WARNING_PATH = new Path2D(
  "M7.134 2.994L2.217 11.5a1 1 0 0 0 .866 1.5h9.834a1 1 0 0 0 .866-1.5L8.866 2.993a1 1 0 0 0-1.732 0m3.03-.75c-.962-1.665-3.366-1.665-4.329 0L.918 10.749c-.963 1.666.24 3.751 2.165 3.751h9.834c1.925 0 3.128-2.085 2.164-3.751zM8 5a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2A.75.75 0 0 1 8 5m1 5.75a1 1 0 1 1-2 0a1 1 0 0 1 2 0",
);

const DANGER_PATH = new Path2D(
  "M8 13.5a5.5 5.5 0 1 0 0-11a5.5 5.5 0 0 0 0 11M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14m1-4.5a1 1 0 1 1-2 0a1 1 0 0 1 2 0M8.75 5a.75.75 0 0 0-1.5 0v2.5a.75.75 0 0 0 1.5 0z",
);

const SUCCESS_PATH = new Path2D(
  "M13.5 8a5.5 5.5 0 1 1-11 0a5.5 5.5 0 0 1 11 0M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0m-3.9-1.55a.75.75 0 1 0-1.2-.9L7.419 8.858L6.03 7.47a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.13-.08z",
);

const MINUS_PATH = new Path2D(
  "M1.75 8a.75.75 0 0 1 .75-.75h11a.75.75 0 0 1 0 1.5h-11A.75.75 0 0 1 1.75 8",
);

const PLUS_PATH = new Path2D(
  "M8 1.75a.75.75 0 0 1 .75.75v4.75h4.75a.75.75 0 0 1 0 1.5H8.75v4.75a.75.75 0 0 1-1.5 0V8.75H2.5a.75.75 0 0 1 0-1.5h4.75V2.5A.75.75 0 0 1 8 1.75",
);

const SEARCH_PATH = new Path2D(
  "M11.5 7a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m-.82 4.74a6 6 0 1 1 1.06-1.06l2.79 2.79a.75.75 0 1 1-1.06 1.06z",
);

const CALENDAR_PATH = new Path2D(
  "M3.75 4.5A.75.75 0 0 1 3 3.75v-.748a1.5 1.5 0 0 0-1.5 1.5v1h10v-1a1.5 1.5 0 0 0-1.5-1.5v.75a.75.75 0 1 1-1.5 0v-.75h-4v.747a.75.75 0 0 1-.75.75ZM8.5 1.501h-4V.75a.75.75 0 0 0-1.5 0v.752a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3v-.75a.75.75 0 0 0-1.5 0v.75Zm-7 5.5v3.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5v-3.5h-10Z",
);

/* -------------------------------------------------------------------------------------------------
 * Icons
 *
 * Fifteen named exports, the same names, order and shapes as HeroUI. Each is a
 * real component: `IconCanvas` with its own path, viewBox, fill rule, default
 * size and default test id. There is no namespace object, exactly as upstream.
 * -----------------------------------------------------------------------------------------------*/

/** The downward chevron: disclosure, accordion, select and menu indicators (R-017). */
export function IconChevronDown(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={CHEVRON_DOWN_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-chevron-down"
    />
  );
}

/** The upward chevron (R-018). */
export function IconChevronUp(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={CHEVRON_UP_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-chevron-up"
    />
  );
}

/** The left chevron: pagination and previous-month buttons (R-019). */
export function IconChevronLeft(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={CHEVRON_LEFT_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-chevron-left"
    />
  );
}

/** The right chevron: pagination, submenu and next-month indicators (R-020). */
export function IconChevronRight(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={CHEVRON_RIGHT_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-chevron-right"
    />
  );
}

/** The external-link arrow: the Link default icon (R-021). It keeps the SVG's 9×9 default box (R-002). Same path data as `link-icon.tsx`; the port sheet proposes one shared component later. */
export function ExternalLinkIcon(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={EXTERNAL_LINK_PATH}
      viewBoxWidth={7}
      viewBoxHeight={7}
      pathFillRule="nonzero"
      defaultClass="h-[9px] w-[9px]"
      defaultTestID="icon-external-link"
    />
  );
}

/** The dashed circle: a progress/loading glyph with no current caller (R-022). */
export function CircleDashedIcon(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={CIRCLE_DASHED_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="nonzero"
      defaultClass="h-4 w-4"
      defaultTestID="icon-circle-dashed"
    />
  );
}

/** The close cross: chip, tag, select and search-field clear buttons (R-023). */
export function CloseIcon(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={CLOSE_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-close"
    />
  );
}

/** The information disc: Alert and AlertDialog `status="default"` (R-024). */
export function InfoIcon(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={INFO_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-info"
    />
  );
}

/** The warning triangle: Alert and AlertDialog `status="warning"` (R-025). */
export function WarningIcon(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={WARNING_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-warning"
    />
  );
}

/** The danger disc: Alert and AlertDialog `status="danger"` (R-026). */
export function DangerIcon(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={DANGER_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-danger"
    />
  );
}

/** The success disc: Alert and AlertDialog `status="success"` (R-027). */
export function SuccessIcon(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={SUCCESS_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-success"
    />
  );
}

/** The minus sign: NumberField's decrement button (R-028). */
export function IconMinus(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={MINUS_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-minus"
    />
  );
}

/** The plus sign: NumberField's increment button (R-029). */
export function IconPlus(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={PLUS_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-plus"
    />
  );
}

/** The search glass: SearchField's leading icon (R-030). */
export function IconSearch(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={SEARCH_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-search"
    />
  );
}

/** The calendar: date picker and calendar triggers (R-031). Upstream sizes it `1em`; the port defaults to 16 points because NSH has no `em` (R-003, §8). */
export function IconCalendar(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={CALENDAR_PATH}
      viewBoxWidth={13}
      viewBoxHeight={14}
      pathFillRule="evenodd"
      defaultClass="h-4 w-4"
      defaultTestID="icon-calendar"
    />
  );
}

/** The selection tick of a menu item, a list-box row or a checkbox: the
 * upstream `<polyline points="1 9 7 14 15 4">`, stroked at 1.5 with round ends
 * in a 16-unit box. Canvas has a stroke, so the shape is the upstream one. */
export function IconCheck(props: IconProps): JSX.Element {
  return (
    <IconCanvas
      {...props}
      path={CHECK_PATH}
      viewBoxWidth={16}
      viewBoxHeight={16}
      pathFillRule="nonzero"
      mode="stroke"
      defaultClass="size-2.5"
      defaultTestID="icon-check"
    />
  );
}
