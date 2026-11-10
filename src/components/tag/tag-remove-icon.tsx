import { View } from "nsh";

/**
 * The remove glyph of a tag: HeroUI's internal `CloseIcon` drawn at the size
 * the tag's stylesheet gives it. `.tag__remove-button svg` sets
 * `size-[inherit]`, so the 16 × 16 icon is scaled into the button's 12 × 12
 * box: the strokes are 9.06 × 1.5 at 16, which is 6.8 × 1.125 at 12
 * (R-024).
 *
 * NSH has no inline SVG and an `Image` cannot take `currentColor`, so the two
 * strokes are views with a colorless top border that follows the inherited
 * text color, exactly as the CloseButton glyph does.
 *
 * R-009: `.tag svg { pointer-events-none size-3 shrink-0 self-center
 * text-current }` styles the component's own glyph (this view). It does not
 * reach an icon the caller puts in the tag: NSH has no descendant selector and
 * no "any svg" concept, so a caller's icon keeps its own size (port sheet §8).
 */
export function TagRemoveIcon() {
  return (
    <View
      testID="tag-remove-icon"
      class="size-3 shrink-0 self-center pointer-events-none"
      accessibilityElementsHidden
    >
      <View class="absolute left-1/2 top-1/2 h-[1.125px] w-[6.8px] -translate-x-1/2 -translate-y-1/2 rounded-full border-t-[1.125px] rotate-45" />
      <View class="absolute left-1/2 top-1/2 h-[1.125px] w-[6.8px] -translate-x-1/2 -translate-y-1/2 rounded-full border-t-[1.125px] -rotate-45" />
    </View>
  );
}
