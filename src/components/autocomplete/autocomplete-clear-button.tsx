import type {
  Bounds,
  JSX,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, split, View } from "nsh";

import { renderChildren } from "../list-box/children";
import { AutocompleteContext, AutocompleteTriggerContext } from "./autocomplete-context";

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
 * Autocomplete.ClearButton / AutocompleteClearButton: the small cross inside
 * the trigger. Upstream it is a `<button type="button" tabIndex={-1}>` that
 * empties the selection and calls `onClear`, hidden while nothing is selected.
 *
 * It is not a Tab stop and a pointer press does not give it the focus, so the
 * field's focus stays on the trigger (port sheet §3). A press here is the
 * deepest one, so the trigger's toggle never sees it: the popover stays as it
 * was, exactly as upstream's `clearButtonRef.contains(e.target)` check makes
 * it.
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
  const trigger = AutocompleteTriggerContext();

  if (!autocomplete) {
    return null;
  }

  // The trigger's resolved value wins over the root's, as upstream reads one
  // `isDisabled` for both (port sheet §1).
  const isDisabled = () => trigger?.isDisabled() ?? autocomplete.isDisabled();
  const isEmpty = autocomplete.isSelectionEmpty;

  // R-041: the root counts the mounted clear buttons; a field with one clears
  // from the keyboard (Select's Backspace shortcut uses the same registration).
  cleanup(autocomplete.registerClearButton());

  // R-006: the trigger suppresses its own hover while this button holds the
  // pointer (`:has(.autocomplete__clear-button:hover)`). The pointer leaves the
  // button when it goes anywhere else, and an unmount releases it too.
  const handleMouseEnter = () => trigger?.setClearHovered(true);
  const handleMouseLeave = () => trigger?.setClearHovered(false);

  cleanup(() => trigger?.setClearHovered(false));

  // R-041: the empty and disabled states are unreachable through
  // `pointer-events: none` upstream; both are also gated here, because the
  // press still arrives on hosts that do not honour the class.
  const handlePress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    // The only press this view can receive is a pointer's: it is not a view
    // focus stop and no key activates it.
    autocomplete.notePointer();

    if (!isEmpty()) {
      autocomplete.clear();
    }

    local.onClick?.(event);
  };

  const handlePressDown = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    local.onPointerDown?.(event);
  };

  // R-042: the built-in cross is the 14pt CloseIcon this button's stylesheet
  // sets (`[data-slot="autocomplete-clear-button-icon"] { @apply size-3.5 }`).
  // NSH has no inline SVG and a canvas cannot take `currentColor`, so the two
  // strokes are views whose border follows the inherited `text-muted` colour,
  // as Select's clear glyph does.
  const cross = () => (
    <View class="relative size-3.5">
      <View class="absolute inset-x-0 top-1/2 border-b-[1.5px] rotate-45" />
      <View class="absolute inset-x-0 top-1/2 border-b-[1.5px] -rotate-45" />
    </View>
  );

  // The single read of `children`, at the placement; the default cross only
  // stands in for an absent child.
  const content = (): JSX.Element => {
    const children = local.children;

    if (children === undefined || children === null) {
      return cross();
    }

    return renderChildren(children as JSX.Element);
  };

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
      role="button"
      accessibilityLabel="Clear selection"
      // Upstream's `aria-hidden={isEmpty || undefined}`: nothing to name while
      // nothing is selected.
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden ?? isEmpty()
      }
      accessibilityState={{ disabled: isDisabled() }}
      // Not a Tab stop, but it still takes the pointer (`focusable={false}`).
      focusable={false}
      disabled={isDisabled()}
      class={classes()}
      classList={{
        // R-041: `[data-empty="true"]` → no pointer, no paint.
        "pointer-events-none opacity-0": isEmpty(),
        // R-040: the opacity transition applies only while the button is not
        // empty, so clearing disappears without a fade.
        "transition-none": isEmpty(),
        // R-009's disabled field: the trigger already dims the subtree, so only
        // the pointer target is taken away here.
        "pointer-events-none cursor-not-allowed": isDisabled(),
      }}
      style={local.style}
      onPress={handlePress}
      onPressDown={handlePressDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onLayout={local.onLayout}
    >
      {content()}
    </View>
  );
}
