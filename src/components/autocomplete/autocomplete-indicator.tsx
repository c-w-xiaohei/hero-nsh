import type {
  Bounds,
  JSX,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "../list-box/children";
import { AutocompleteContext } from "./autocomplete-context";

/**
 * The props of `Autocomplete.Indicator`: HeroUI's `DOMRenderProps` over the
 * SVG host, with `children` and `className` (an icon, or the built-in chevron).
 */
export interface AutocompleteIndicatorProps {
  /** Custom indicator content; empty draws the built-in chevron. */
  children?: JSX.Element;

  /** Appended after the indicator slot classes. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;

  "aria-hidden"?: boolean;

  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * Autocomplete.Indicator / AutocompleteIndicator.
 *
 * Stub: the real part registers itself with the trigger (its `pe-7` padding),
 * draws the default chevron at `size-4`, and rotates with the open state. This
 * body only fixes the file and the public surface.
 */
export function AutocompleteIndicator(
  props: AutocompleteIndicatorProps,
): JSX.Element | null {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "aria-hidden",
    "accessibilityElementsHidden",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const autocomplete = AutocompleteContext();

  if (!autocomplete) {
    return null;
  }

  const classes = computed(() =>
    [autocomplete.slots().indicator(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden ?? true
      }
      class={classes()}
      style={local.style}
      onLayout={local.onLayout}
    >
      {renderChildren(local.children as JSX.Element)}
    </View>
  );
}
