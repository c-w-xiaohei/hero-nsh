import { View } from "nsh";

/**
 * The clear button's default glyph: 12 × 12, shrinking CloseButton's 16 × 16
 * `CloseIcon` by the ratio upstream's stylesheet applies
 * (`[data-slot="close-button-icon"] { @apply size-3 }`, R-024). The two strokes
 * are 9.61 × 1.125 pills at ±45°, centered on the box.
 *
 * This stands in for the CSS descendant selector on CloseButton's icon: the
 * default icon is drawn by `CloseButton`, and changing it there would split the
 * close-button unit's geometry ownership across components (port sheet §5). A
 * custom `children` on `SearchField.ClearButton` is not resized, exactly as
 * upstream's selector only matches the default icon.
 */
export function SearchFieldClearIcon() {
  return (
    <View
      testID="search-field-clear-icon"
      class="size-3 shrink-0 self-center pointer-events-none"
      accessibilityElementsHidden
    >
      <View class="absolute left-1/2 top-1/2 h-[1.125px] w-[9.61px] -translate-x-1/2 -translate-y-1/2 rounded-full border-t-[1.125px] rotate-45" />
      <View class="absolute left-1/2 top-1/2 h-[1.125px] w-[9.61px] -translate-x-1/2 -translate-y-1/2 rounded-full border-t-[1.125px] -rotate-45" />
    </View>
  );
}
