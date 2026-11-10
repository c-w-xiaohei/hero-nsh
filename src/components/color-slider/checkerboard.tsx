import type { JSX } from "nsh";
import { computed, signal, View } from "nsh";

/*
 * R-040 / R-070 / R-077: HeroUI paints the transparency checkerboard with
 * `repeating-conic-gradient(#efefef 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px`.
 * NSH has neither `background-size` nor `background-position`, so the tiling is
 * rebuilt as real views: one 16-point tile per cell, each a four-quadrant conic
 * gradient (the same 2×2 checkerboard at 8-point squares), placed at the phase
 * upstream's `50%` position produces. The tile *count* is what the size is for:
 * `ceil((size - phase) / 16)` columns and rows, exactly as the sheet derives
 * it. This is "rebuilt from the measurement", not an approximation.
 *
 * Both the track's checkerboard and the start cap's use this component; the
 * caller owns the box (position, clipping, pointer events).
 */

/** Upstream's tile size, in points (`16px`). */
const TILE_SIZE = 16;

/**
 * One tile: `repeating-conic-gradient` unrolled over a single turn, the string
 * ColorSwatch's probe already verified is an accepted arbitrary background
 * (`src/components/color-swatch/color-swatch-root.tsx:112`).
 */
const CHECKER_TILE_CLASS =
  "absolute size-4 bg-[conic-gradient(#efefef_0_25%,#f7f7f7_0_50%,#efefef_0_75%,#f7f7f7_0)]";

interface CheckerTile {
  x: number;
  y: number;
}

/** `value mod divisor`, always in `[0, divisor)`, for the tile phase. */
function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export interface CheckerboardProps {
  /** The box classes: position, clipping and `pointer-events-none` belong to the caller. */
  class?: string;
}

/**
 * The checkerboard layer. It measures its own box (`onLayout`) and lays out the
 * tiles that cover it, so it never needs the track's size from elsewhere.
 */
export function Checkerboard(props: CheckerboardProps): JSX.Element {
  const size = signal({ width: 0, height: 0 });

  const tiles = computed<CheckerTile[]>(() => {
    const { width, height } = size();

    if (width <= 0 || height <= 0) {
      return [];
    }

    // Upstream's `50%` background position. CSS positions a background image of
    // size `TILE` with `(area - TILE) * 50%`, so the first tile starts half the
    // leftover in, and the pattern repeats from there in both directions; a
    // tile is drawn before it whenever that start is inside the box.
    const originX = positiveModulo((width - TILE_SIZE) / 2, TILE_SIZE) - TILE_SIZE;
    const originY = positiveModulo((height - TILE_SIZE) / 2, TILE_SIZE) - TILE_SIZE;
    const columns = Math.ceil((width - originX) / TILE_SIZE);
    const rows = Math.ceil((height - originY) / TILE_SIZE);
    const result: CheckerTile[] = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        result.push({
          x: originX + column * TILE_SIZE,
          y: originY + row * TILE_SIZE,
        });
      }
    }

    return result;
  });

  return (
    <View
      class={props.class}
      onLayout={(event) =>
        size.set({
          width: event.bounds.size.width,
          height: event.bounds.size.height,
        })
      }
    >
      <Each of={tiles()}>
        {(tile) => (
          <View
            class={CHECKER_TILE_CLASS}
            style={{ left: tile().x, top: tile().y }}
          />
        )}
      </Each>
    </View>
  );
}
