/**
 * HeroUI's `packages/react/src/components/sheet/sheet.utils.ts`, ported line for
 * line (port sheet §5): the four numeric policies of the sheet, kept free of
 * any host so the regression tests from `sheet.utils.test.ts` can drive them
 * directly (T-035 … T-045).
 *
 * Three adaptations, each forced by the NSH host and recorded in port sheet §8:
 *
 * - `animateSheetValue` takes its start time from the first animation frame
 *   instead of `performance.now()`. nsh/test drives `requestAnimationFrame`
 *   with `app.clock`, and a frame's timestamp is the clock's, so the animation
 *   ends when the test moves the clock; a `performance.now()` read could sit
 *   outside that frame (T-043 notes the rewrite).
 * - `sheetDismissTarget` accepts the swipe direction as a parameter of the same
 *   shape HeroUI uses; the placement-based default lives in the caller.
 * - Two helpers the scroll-snap host gave upstream for free are here instead:
 *   a snap point is resolved against the carrier's length, and the drag
 *   translation is turned into a reveal length.
 */

import type { SheetPlacement, SheetSwipeDirection } from "./sheet.styles";

const HANDLE_DRAG_VELOCITY = 0.4;
const SHEET_CLOSE_THRESHOLD = 0.25;
const SHEET_RELEASE_MS = 500;

/** CSS cubic-bezier(0.32, 0.72, 0, 1), sampled over unit time. */
export function sheetReleaseEase(time: number) {
  if (time <= 0) return 0;
  if (time >= 1) return 1;

  let solved = time;

  for (let iteration = 0; iteration < 8; iteration++) {
    const error = bezierComponent(solved, 0.32, 0) - time;
    const slope = bezierSlope(solved, 0.32, 0);

    if (Math.abs(error) < 1e-4 || slope === 0) break;

    solved = Math.min(1, Math.max(0, solved - error / slope));
  }

  return bezierComponent(solved, 0.72, 1);
}

function bezierComponent(time: number, start: number, end: number) {
  const a = 1 - 3 * end + 3 * start;
  const b = 3 * end - 6 * start;
  const c = 3 * start;

  return ((a * time + b) * time + c) * time;
}

function bezierSlope(time: number, start: number, end: number) {
  const a = 1 - 3 * end + 3 * start;
  const b = 3 * end - 6 * start;
  const c = 3 * start;

  return 3 * a * time * time + 2 * b * time + c;
}

export function sheetDismissTarget({
  current,
  elapsed,
  extent,
  isDismissable,
  rest,
  size,
  swipeDirection,
  travel,
  viewport,
}: {
  current: number;
  elapsed: number;
  isDismissable: boolean;
  swipeDirection: SheetSwipeDirection;
  rest: number;
  extent: number;
  size: number;
  viewport: number;
  travel: number;
}) {
  const bidirectional = swipeDirection === "horizontal" || swipeDirection === "vertical";
  const dismissesTowardStart = bidirectional
    ? travel > 0 || (travel === 0 && current < rest)
    : swipeDirection === "bottom" || swipeDirection === "right";
  const pointerDragged = dismissesTowardStart ? travel : -travel;
  const scrollDragged = dismissesTowardStart ? rest - current : current - rest;
  const dragged = Math.max(pointerDragged, scrollDragged);
  // Bottom and right sheets leave through scroll 0. Top and left leave at the far edge.
  const closed = dismissesTowardStart ? 0 : Math.max(0, extent);

  if (!isDismissable || dragged <= 0) return rest;

  const visible = size > 0 ? Math.min(size, viewport) : 0;
  const velocity = elapsed > 0 ? Math.abs(travel) / elapsed : 0;

  if (
    velocity > HANDLE_DRAG_VELOCITY ||
    (visible > 0 && dragged >= visible * SHEET_CLOSE_THRESHOLD)
  ) {
    return closed;
  }

  return rest;
}

export function nearestSheetSnap(targets: number[], current: number, velocity: number) {
  if (targets.length === 0) return null;

  if (velocity > HANDLE_DRAG_VELOCITY) {
    const lower = targets.filter((target) => target < current - 0.5);

    if (lower.length > 0) return Math.max(...lower);
  }

  if (velocity < -HANDLE_DRAG_VELOCITY) {
    const higher = targets.filter((target) => target > current + 0.5);

    if (higher.length > 0) return Math.min(...higher);
  }

  return targets.reduce((best, target) =>
    Math.abs(target - current) < Math.abs(best - current) ? target : best,
  );
}

/** Animate a scalar; measurement and layout stay in the part that owns them. */
export function animateSheetValue(
  from: number,
  to: number,
  update: (value: number) => void,
  complete: () => void,
  reducedMotion: boolean,
) {
  let cancelled = false;
  let frame = 0;
  let start: number | undefined;
  const cancel = () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };

  if (reducedMotion || Math.abs(to - from) < 0.5) {
    update(to);
    complete();

    return cancel;
  }

  const step = (now: number) => {
    if (cancelled) return;

    // The first frame is the start, so the curve follows the clock that drives
    // the frames (see the header note).
    if (start === undefined) start = now;

    const progress = Math.min(1, Math.max(0, (now - start) / SHEET_RELEASE_MS));

    update(from + (to - from) * sheetReleaseEase(progress));
    if (progress < 1) frame = requestAnimationFrame(step);
    else complete();
  };

  frame = requestAnimationFrame(step);

  return cancel;
}

/* -------------------------------------------------------------------------------------------------
 * Helpers the scroll host gave upstream (port sheet §4c, §5)
 * -----------------------------------------------------------------------------------------------*/

/**
 * Drop the old full-height sentinel. React Aria treats the last reveal as
 * implicit, so `1`, `"1"` and `"100%"` in the last position mean nothing.
 */
export function normalizeSheetSnapPoints(
  snapPoints: Array<number | string> | undefined,
): Array<number | string> | undefined {
  if (!snapPoints?.length) return undefined;

  const points = snapPoints.filter((point, index) => {
    const isLast = index === snapPoints.length - 1;

    if (!isLast) return true;

    return point !== 1 && point !== "1" && point !== "100%";
  });

  return points.length > 0 ? points : undefined;
}

/**
 * A snap point as a length along the sheet's axis. Numbers are points, `"40%"`
 * is that share of the carrier, `"220px"` / `"220"` are points. Other CSS
 * lengths (`rem`, `vh`, `calc()`) have no parser here and are dropped (port
 * sheet §8).
 */
export function resolveSheetSnapPoints(
  snapPoints: Array<number | string> | undefined,
  extent: number,
): number[] {
  if (!snapPoints?.length || !(extent > 0)) return [];

  const resolved: number[] = [];

  for (const point of snapPoints) {
    const value = typeof point === "number" ? point : parseSheetLength(point, extent);

    if (value === undefined || !(value > 0)) continue;

    resolved.push(Math.min(value, extent));
  }

  return resolved;
}

function parseSheetLength(point: string, extent: number): number | undefined {
  const match = /^\s*(-?\d*\.?\d+)\s*(%|px|pt)?\s*$/.exec(point);

  if (!match) return undefined;

  const value = Number(match[1]);

  if (!Number.isFinite(value)) return undefined;

  return match[2] === "%" ? (extent * value) / 100 : value;
}

/** The axis a swipe direction reads: `horizontal` moves along x, the rest y. */
export function sheetAxisFor(direction: SheetSwipeDirection): "x" | "y" {
  return direction === "left" || direction === "right" || direction === "horizontal"
    ? "x"
    : "y";
}

/**
 * Whether the placement's reveal shrinks toward the start of the axis:
 * bottom and right sheets leave through scroll 0, top and left at the far edge
 * (`sheetDismissTarget`'s comment upstream).
 */
export function sheetClosesTowardStart(direction: SheetSwipeDirection): boolean {
  return direction !== "top" && direction !== "left";
}

/**
 * The scroll coordinate `sheetDismissTarget` speaks, for a reveal length.
 *
 * Upstream the sheet is a scroll item and the drag moves the scroll offset; here
 * the reveal length is the state, so the two are mapped: a bottom / right sheet
 * closes through scroll 0 (length 0), a top / left one through the far edge
 * (also length 0). In both cases the sheet's rest coordinate is the rest length
 * and the closed end is exactly its endpoint, so `sheetDismissTarget` returns
 * the rest coordinate iff it did not dismiss. `animateSheetValue` then animates
 * the length itself, not the scroll.
 */
export function sheetScrollPosition(
  length: number,
  extent: number,
  direction: SheetSwipeDirection,
): number {
  return sheetClosesTowardStart(direction) ? length : extent - length;
}

/**
 * The reveal length a handle drag produces, from the physical pointer travel.
 *
 * A bottom or right sheet shrinks when the pointer moves down / right; a top or
 * left one when it moves up / left. A swipe direction on the other axis, or one
 * that allows both ways, has no reveal direction to follow, so the travel there
 * always shrinks the sheet: that is how a horizontal swipe dismisses a bottom
 * sheet upstream (port sheet T-014).
 */
export function sheetDragLength({
  placement,
  startLength,
  swipeDirection,
  travel,
}: {
  placement: SheetPlacement;
  startLength: number;
  swipeDirection: SheetSwipeDirection;
  travel: number;
}) {
  const bidirectional = swipeDirection === "horizontal" || swipeDirection === "vertical";
  const placementAxis = sheetAxisFor(placement);

  if (bidirectional || sheetAxisFor(swipeDirection) !== placementAxis) {
    return startLength - Math.abs(travel);
  }

  // Bottom and right: a positive travel (down / right) shrinks the reveal.
  const towardStart = sheetClosesTowardStart(placement);

  return towardStart ? startLength - travel : startLength + travel;
}
