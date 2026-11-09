import { View } from "nsh";

/**
 * The default close glyph: HeroUI's internal `CloseIcon`
 * (`packages/react/src/components/icons.tsx`) drawn with views, because NSH
 * has no inline SVG and an `Image` cannot take `currentColor` (port sheet
 * §5, R-009 … R-011).
 *
 * The container is the `svg` box the CSS sized: 16 × 16 (`size-4`),
 * `shrink-0 self-center`, and `pointer-events-none` (R-009 / R-010). The two
 * strokes are 12.81 × 1.5 pills at 45° / -45°, centered on the root: the CSS
 * `-mx-0.5 my-0.5` negative margins are not applied (no descendant selector),
 * and they are not needed, since the 16 × 16 icon already sits at the center of
 * the 16 × 16 content box (24 − 2 × 4). They are drawn with a colorless top
 * border, which follows the inherited text color, as `currentColor` would
 * (R-011).
 */
export function CloseIcon() {
  return (
    <View
      testID="close-button-icon"
      class="size-4 shrink-0 self-center pointer-events-none"
      accessibilityElementsHidden
    >
      <View class="absolute left-1/2 top-1/2 h-[1.5px] w-[12.81px] -translate-x-1/2 -translate-y-1/2 rounded-full border-t-[1.5px] rotate-45" />
      <View class="absolute left-1/2 top-1/2 h-[1.5px] w-[12.81px] -translate-x-1/2 -translate-y-1/2 rounded-full border-t-[1.5px] -rotate-45" />
    </View>
  );
}
