/*
 * ProgressCircle's geometry and drawing.
 *
 * HeroUI draws the two rings as `<circle>` elements inside an
 * `<svg viewBox="0 0 36 36" fill="none">`
 * (`packages/react/src/components/progress-circle/progress-circle.tsx:118-122,153-160`).
 * NSH has no SVG element, so each ring is a `Canvas` and the same numbers are
 * replayed in the SVG's own 36-unit space, then scaled to the measured box:
 * the 20 / 28 / 36 pt track boxes give the 2.22 / 3.11 / 4 pt strokes upstream
 * shows, because `lineWidth`, dash lengths and the dash phase all live in that
 * scaled space (port sheet §3.1).
 */

import type { AnimatedNode, CanvasRenderingContext2D, CanvasSize } from "nsh";

/** HeroUI's constants (`progress-circle.tsx:15-18`). */
export const STROKE_WIDTH = 4;
export const CENTER = 18;
export const RADIUS = CENTER - STROKE_WIDTH / 2;
export const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The SVG `viewBox` is `0 0 36 36`. */
const VIEW_BOX = CENTER * 2;

/** Scales the 36-unit drawing space to the canvas's measured size. */
function scaleToCanvas(cx: CanvasRenderingContext2D, size: CanvasSize): void {
  cx.scale(size.width / VIEW_BOX, size.height / VIEW_BOX);
}

/**
 * The whole track circle: `stroke: var(--progress-circle-track-stroke)`,
 * `cx` / `cy` 18, `r` 16, `strokeWidth` 4, default `butt` caps. This is
 * R-005: an SVG presentation attribute became a drawing call.
 */
export function drawTrackCircle(
  cx: CanvasRenderingContext2D,
  size: CanvasSize,
  paint: string,
): void {
  cx.clearRect(0, 0, size.width, size.height);
  cx.save();
  scaleToCanvas(cx, size);

  cx.strokeStyle = paint;
  cx.lineWidth = STROKE_WIDTH;
  // SVG's default `stroke-linecap` is `butt`.
  cx.lineCap = "butt";
  cx.beginPath();
  cx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
  cx.stroke();

  cx.restore();
}

/**
 * The fill arc: the whole circle with one dash as long as the circumference
 * and a gap as long as it too, cut to the visible part by the dash phase
 * (`CIRCUMFERENCE - percentage/100 · CIRCUMFERENCE`, `0.75 · C` while
 * indeterminate). This is R-006: `stroke: var(--progress-circle-stroke)`.
 *
 * `offset` is the `AnimatedValue` that R-007 / R-008 drive: the phase, not the
 * geometry, is what changes over 300 ms, so the canvas animates natively
 * without running `draw` again. The phase semantics are SVG's and Canvas's
 * alike (a positive offset starts the pattern that far into the path), which
 * is why upstream's `strokeDashoffset` transfers unchanged.
 *
 * `rotate(-90 18 18)` upstream moves 0 rad from 3 o'clock to 12 o'clock,
 * clockwise; the same transform is applied around the center here.
 */
export function drawFillCircle(
  cx: CanvasRenderingContext2D,
  size: CanvasSize,
  paint: string,
  offset: AnimatedNode,
): void {
  cx.clearRect(0, 0, size.width, size.height);
  cx.save();
  scaleToCanvas(cx, size);

  cx.strokeStyle = paint;
  cx.lineWidth = STROKE_WIDTH;
  // `strokeLinecap="round"` upstream: each end gains half a stroke width.
  cx.lineCap = "round";
  cx.setLineDash([CIRCUMFERENCE, CIRCUMFERENCE]);
  cx.lineDashOffset = offset;

  cx.translate(CENTER, CENTER);
  cx.rotate(-Math.PI / 2);
  cx.translate(-CENTER, -CENTER);

  cx.beginPath();
  cx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
  cx.stroke();

  cx.restore();
}
