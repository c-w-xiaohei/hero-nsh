import type {
  Accessor,
  Bounds,
  JSX,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "../list-box/children";
import { AutocompleteContext } from "./autocomplete-context";

/** What a popover `className` / `style` function receives (RAC's `PopoverRenderProps`). */
export interface AutocompletePopoverRenderProps {
  /** The component that opened the popover (default `"Autocomplete"`). */
  trigger: Accessor<string>;
  /** The side the overlay ended up on, `null` before the first placement. */
  placement: Accessor<"top" | "bottom" | "left" | "right" | null>;
  isEntering: Accessor<boolean>;
  isExiting: Accessor<boolean>;
}

/** The props of `Autocomplete.Popover`: React Aria's `Popover`, `placement` default `"bottom"`. */
export interface AutocompletePopoverProps {
  /** The popover's content (the caller's Filter); read once at the placement. */
  children: JSX.Element;

  /** Appended after the popover slot classes; function form gets accessors. */
  className?: string | ((values: AutocompletePopoverRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: AutocompletePopoverRenderProps) => StyleProp<ViewStyle>);

  /** The overlay view; `focus()` and `measure()` reach it. */
  ref?: (node: ViewRef) => void;

  /** RAC placement (default `"bottom"`). */
  placement?: "top" | "bottom" | "start" | "end" | "left" | "right";

  /** The gap between the trigger and the overlay (default 8). */
  offset?: number;

  /** Accepted, no effect: the core Overlay has no cross-axis offset. */
  crossOffset?: number;

  /** Accepted, no effect: the core Overlay always flips when the other side fits. */
  shouldFlip?: boolean;

  /** The safe-area margin (default 12; RAC's `containerPadding`). */
  containerPadding?: number;

  /** The popover's own open state (overrides the field's, as in React Aria). */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;

  /** Modal by default (RAC): a backdrop absorbs the presses outside. */
  isNonModal?: boolean;

  /** When `true`, Escape does not close (the `onCancel` channel still fires). */
  isKeyboardDismissDisabled?: boolean;

  /** Accepted, no effect: NSH has no element object to hand to the predicate. */
  shouldCloseOnInteractOutside?: (element: unknown) => boolean;

  /** Forces the enter state (custom animations). */
  isEntering?: boolean;

  /** Forces the exit state and keeps the content mounted. */
  isExiting?: boolean;

  /** Skips the enter and exit phases entirely. */
  shouldSkipAnimation?: boolean;

  /** The name of the trigger, for render values (default `"Autocomplete"`). */
  trigger?: string;

  /** Anchors a standalone popover directly. */
  triggerRef?: ViewRef | null;

  /** Accepted, no effect: the overlay renders in its own root view. */
  UNSTABLE_portalContainer?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;

  "aria-label"?: string;
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH resolves no accessible names from ids. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * Autocomplete.Popover / AutocompletePopover.
 *
 * Stub: the real part is the core `Overlay` anchored to the trigger, with the
 * enter / exit presence, the measured trigger width, the list container's
 * classes and the Escape / outside-press dismissal. This body only fixes the
 * file and the public surface.
 */
export function AutocompletePopover(
  props: AutocompletePopoverProps,
): JSX.Element | null {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "placement",
    "offset",
    "crossOffset",
    "shouldFlip",
    "containerPadding",
    "isOpen",
    "defaultOpen",
    "onOpenChange",
    "isNonModal",
    "isKeyboardDismissDisabled",
    "shouldCloseOnInteractOutside",
    "isEntering",
    "isExiting",
    "shouldSkipAnimation",
    "trigger",
    "triggerRef",
    "UNSTABLE_portalContainer",
    "id",
    "nativeID",
    "testID",
    "aria-label",
    "accessibilityLabel",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const autocomplete = AutocompleteContext();

  if (!autocomplete) {
    return null;
  }

  const classes = computed(() =>
    [autocomplete.slots().popover(), local.className as string | undefined]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      class={classes()}
      style={local.style as StyleProp<ViewStyle>}
      onLayout={local.onLayout}
    >
      {renderChildren(local.children)}
    </View>
  );
}
