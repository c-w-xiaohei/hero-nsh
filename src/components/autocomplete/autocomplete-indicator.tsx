import type {
  Bounds,
  JSX,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, split, View } from "nsh";

import { renderChildren } from "../list-box/children";
import { AutocompleteContext, AutocompleteTriggerContext } from "./autocomplete-context";

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
 * Autocomplete.Indicator / AutocompleteIndicator: the chevron at the trigger's
 * inline end, rotated while the field is open.
 *
 * HeroUI renders an SVG and clones a custom child to inject the slot classes;
 * NSH has no SVG and cannot rewrite the caller's element, so a custom child
 * sits inside a container carrying the slot classes instead (registered
 * difference, the same as `Select.Indicator`, port sheet §8).
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
  const trigger = AutocompleteTriggerContext();

  if (!autocomplete) {
    return null;
  }

  // R-005: `.autocomplete__trigger:has(.autocomplete__indicator)` pads the
  // trigger's inline end. NSH has no `:has`, so the trigger reserves the room
  // while an indicator is mounted.
  if (trigger) {
    // Registered on mount, released on unmount: the trigger's `pe-7` follows
    // the indicator's presence, not its first render.
    cleanup(trigger.registerIndicator());
  }

  const classes = computed(() =>
    [autocomplete.slots().indicator(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-018: `[data-slot="autocomplete-default-indicator"]` → `size-4`, which is
  // the built-in chevron's own box; a custom child is not sized by the slot,
  // as upstream only targets the native SVG.
  const chevron = () => (
    <View class="flex size-4 items-center justify-center">
      <View class="size-2 border-b-2 border-e-2 rotate-45" />
    </View>
  );

  const content = () => {
    const children = local.children;

    if (children === undefined || children === null || children === false) {
      return chevron();
    }

    return renderChildren(children);
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden ?? true
      }
      // R-015: `.autocomplete__indicator` → the `indicator` slot classes
      // (absolute, inline end, centred, placeholder colour).
      // R-016: the interactive cursor lives in the same slot string.
      class={classes()}
      // R-017: `[data-open="true"]` → `rotate-180`, so the default chevron
      // turns with the field.
      classList={{ "rotate-180": autocomplete.isOpen() }}
      style={local.style}
      onLayout={local.onLayout}
    >
      {content()}
    </View>
  );
}
