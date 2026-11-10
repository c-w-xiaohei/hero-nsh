/*
 * `showDots`' dot overlay: `.color-area--show-dots::after` in
 * `packages/styles/components/color-area.css`, as real views (R-007, R-008).
 *
 * The stylesheet paints a radial-gradient dot in an 8×8 tile and repeats it
 * with `background-size: 8px 8px`; neither `background-size` nor
 * `background-repeat` exists in NSH's style set, so the repeat is structure:
 *
 * - one view per 8-point row (28 of them, the 224-point width limit);
 * - each row is 2 points high and carries a horizontal `linear-gradient` whose
 *   hard stops place the 2-point dots every 8 points;
 * - the rows sit in a flex column with a 6-point gap and a 3-point top padding,
 *   so the dots land on upstream's grid: a dot's center at 4 + 8n on both axes.
 *
 * The pattern starts at the top-left corner (upstream's gradient tile is
 * positioned the same way) and is clipped by the layer's rounded corners, so
 * nothing spills over the root's radius (port sheet §8 registers the fixed
 * phase and the substitute geometry).
 */

import { View } from "nsh";

/** The stylesheet's `background-size: 8px 8px`. */
const DOT_PERIOD = 8;

/** The visible size of one dot, in points. */
const DOT_SIZE = 2;

/** The widest the root can be (`max-w-[224px]`); past it the layer is clipped. */
const DOT_COVERAGE = 224;

/** Dot centers along an axis: 4, 12, 20, … 220. */
const DOT_CENTERS: number[] = [];

for (
  let center = DOT_PERIOD / 2;
  center < DOT_COVERAGE;
  center += DOT_PERIOD
) {
  DOT_CENTERS.push(center);
}

/**
 * One row's dots, as a single horizontal gradient: a hard stop at each dot's
 * start and end, transparent in between. Consecutive stops at one position
 * draw the edge without interpolating, which is exactly the tile's look.
 */
const DOT_ROW_IMAGE = `linear-gradient(to right, ${DOT_CENTERS.flatMap(
  (center) => {
    const start = center - DOT_SIZE / 2;
    const end = center + DOT_SIZE / 2;

    return [
      `transparent ${start}px`,
      `rgba(255, 255, 255, 0.2) ${start}px`,
      `rgba(255, 255, 255, 0.2) ${end}px`,
      `transparent ${end}px`,
    ];
  },
).join(", ")})`;

/**
 * The dot overlay. It is mounted only while `showDots` is true, from the Root's
 * single `when` condition, and takes no pointer (the root is the responder).
 */
export function ColorAreaDots() {
  return (
    <View
      class="absolute inset-0 flex-col gap-[6px] overflow-hidden rounded-2xl pt-[3px]"
      style={{ pointerEvents: "none" }}
    >
      {DOT_CENTERS.map(() => (
        <View
          class="h-[2px] w-full shrink-0"
          style={{ backgroundImage: DOT_ROW_IMAGE }}
        />
      ))}
    </View>
  );
}
