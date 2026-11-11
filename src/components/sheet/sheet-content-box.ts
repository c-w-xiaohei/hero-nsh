import type { SheetPlacement } from "./sheet.styles";

/**
 * The lengths of HeroUI's `.sheet__content` (R-010 … R-022), as numbers.
 *
 * Four of them are lengths no NSH class or `style` can spell: measured on NSH
 * 0.4.0, an arbitrary class value takes `px` / `pt` / `rem` / `%` but not
 * `calc()`, `min()` or `vw` (`max-h-[calc(100%-2rem)]`,
 * `w-[min(24rem,96vw)]` and `w-[calc(100%-2rem)]` are unknown classes), and a
 * `style` length is a number or a percentage. The percentages upstream are
 * shares of the surface the carrier spans, which is `windowSize()` — the same
 * source `createSheetDetent` takes `extent` from — so this module turns the
 * surface size into the numbers the Content writes:
 *
 * - R-013 `width: min(24rem, 96vw)` → the smaller of 384 and 96% of the surface
 *   width, `axialCap` on a left / right sheet.
 * - R-010 `max-height: calc(100% - 2rem)` (top / bottom) → the surface height
 *   minus 32: 1rem of breathing room per side.
 * - R-016 `max-height: calc(100% - 1rem)` and the detached R-017 / R-018 →
 *   minus 16, the other 8 points being the `m-2` margin's opposite side.
 *
 * The cross length is what the sheet fills instead: the surface width on a top
 * / bottom sheet (`w-full` / R-017's `calc(100% - 1rem)`), the surface height
 * on a left / right one (`h-full` / R-018's `calc(100% - 1rem)`).
 *
 * It lives in the component directory rather than in `src/primitives/`, as the
 * batch rule for new shared code requires (port sheet §5).
 */

/** `m-2`: the detached sheet's inset, 8 points per side. */
const DETACHED_MARGIN = 8;

/** `min(24rem, 96vw)`'s fixed half: 24rem in points. */
const SIDE_WIDTH = 384;

/** `min(24rem, 96vw)`'s relative half. */
const SIDE_VIEWPORT_SHARE = 0.96;

/** 1rem of R-010's `calc(100% - 2rem)`, per side. */
const EDGE_GAP = 16;

/** What `sheetContentExtent` needs to know. */
export interface SheetContentExtentInput {
  placement: SheetPlacement;

  isDetached: boolean;

  /**
   * The detent's length when it owns the axial size (a partial detent or a
   * fully expanded snap sheet), or `null` while the box is content-sized
   * (R-008 / G-001).
   */
  detentLength: number | null;

  surfaceWidth: number;

  surfaceHeight: number;
}

/** The Content's box, in points. */
export interface SheetContentExtent {
  /** The reveal axis is x: left / right. */
  horizontal: boolean;

  /**
   * The length along the reveal axis the detent owns, or `null` when the box
   * keeps its natural length.
   */
  axial: number | null;

  /** The limit along the reveal axis: R-013's `min()` or R-010's `calc()`. */
  axialCap: number;

  /** What the box fills across the axis: `w-full` / `h-full`, or `- 1rem` detached. */
  cross: number;
}

/**
 * R-010 / R-013 / R-016 / R-017 / R-018 / R-019 / R-020 / R-021 / R-022, as
 * numbers. Guarded at zero so a surface shorter than the edge gap cannot
 * produce a negative length.
 */
export function sheetContentExtent(input: SheetContentExtentInput): SheetContentExtent {
  const horizontal = input.placement === "left" || input.placement === "right";
  const inset = input.isDetached ? DETACHED_MARGIN * 2 : 0;

  return {
    horizontal,
    axial: input.detentLength,
    axialCap: horizontal
      ? // R-013: `min(24rem, 96vw)`.
        Math.min(SIDE_WIDTH, input.surfaceWidth * SIDE_VIEWPORT_SHARE)
      : // R-010 (`calc(100% - 2rem)`) / R-016 (`calc(100% - 1rem)`).
        Math.max(0, input.surfaceHeight - (input.isDetached ? DETACHED_MARGIN * 2 : EDGE_GAP * 2)),
    cross: horizontal
      ? // `h-full` / R-018's `calc(100% - 1rem)`.
        Math.max(0, input.surfaceHeight - inset)
      : // `w-full` / R-017's `calc(100% - 1rem)`.
        Math.max(0, input.surfaceWidth - inset),
  };
}
