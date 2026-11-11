import type {
  Bounds,
  JSX,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "../list-box/children";
import { AutocompleteContext } from "./autocomplete-context";

/**
 * The props of `Autocomplete.ClearButton`: HeroUI's `DOMRenderProps` over the
 * button host, with `children` and `className` (an icon, or the built-in cross).
 */
export interface AutocompleteClearButtonProps {
  /** Custom icon content; empty draws the built-in cross. */
  children?: JSX.Element;

  /** Appended after the clear-button slot classes. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;

  /** A DOM click upstream; the press that clears (only a completed press counts). */
  onClick?: (e: PressEvent) => void;

  /** A DOM pointerdown upstream; the press start here. */
  onPointerDown?: (e: PressEvent) => void;

  "aria-hidden"?: boolean;

  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * Autocomplete.ClearButton / AutocompleteClearButton.
 *
 * Stub: the real part empties the selection, calls `onClear`, keeps out of the
 * Tab order, paints itself invisible while nothing is selected and reports its
 * hover to the trigger. This body only fixes the file and the public surface.
 */
export function AutocompleteClearButton(
  props: AutocompleteClearButtonProps,
): JSX.Element | null {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "onClick",
    "onPointerDown",
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
    [autocomplete.slots().clearButton(), local.className]
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
      focusable={false}
      disabled={autocomplete.isDisabled()}
      class={classes()}
      style={local.style}
      onLayout={local.onLayout}
    >
      {renderChildren(local.children as JSX.Element)}
    </View>
  );
}
