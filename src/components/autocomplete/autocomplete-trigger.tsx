import type {
  Accessor,
  AccessibilityState,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "../list-box/children";
import { AutocompleteContext } from "./autocomplete-context";

/**
 * What a trigger `children` function receives: React Aria's
 * `ButtonRenderProps`. Every flag is an accessor (D17); `isPending` is always
 * `false`, since an Autocomplete has no pending state.
 */
export interface AutocompleteTriggerRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isPending: Accessor<boolean>;
}

/** The props of `Autocomplete.Trigger`: React Aria's `Group` plus `isDisabled`. */
export interface AutocompleteTriggerProps {
  /** The trigger's content, or a render prop called once with accessors. */
  children?: JSX.Element | ((values: AutocompleteTriggerRenderProps) => JSX.Element);

  /** Appended after the variant classes; function form gets the same accessors. */
  className?: string | ((values: AutocompleteTriggerRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: AutocompleteTriggerRenderProps) => StyleProp<ViewStyle>);

  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;

  /** Overrides the root's `isDisabled`; the clear button reads this value. */
  isDisabled?: boolean;

  /** Focuses the trigger after mount (macOS and the web). */
  autoFocus?: boolean;

  /** Accepted, no effect: NSH has no tab index, only `focusable`. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: there is no form button to submit. */
  type?: "button" | "submit" | "reset";
  form?: string;
  name?: string;
  value?: string;

  /** The trigger was pressed (a pointer, Return or Space; it opens or closes). */
  onPress?: (e: PressEvent) => void;

  onPressDown?: (e: PressEvent) => void;
  onPressUp?: (e: PressEvent) => void;
  onPressStart?: (e: PressEvent) => void;
  onPressEnd?: (e: PressEvent) => void;
  onPressChange?: (isPressed: boolean) => void;
  onLongPress?: (e: PressEvent) => void;

  onMouseEnter?: (e: NshMouseEvent) => void;
  onMouseLeave?: (e: NshMouseEvent) => void;
  onHoverStart?: (e: NshMouseEvent) => void;
  onHoverEnd?: (e: NshMouseEvent) => void;
  onHoverChange?: (isHovered: boolean) => void;

  onFocus?: () => void;
  onBlur?: () => void;
  onFocusChange?: (isFocused: boolean) => void;

  /** A DOM click upstream; a press here. */
  onClick?: (e: PressEvent) => void;

  /** A DOM key event upstream; keys arrive through `keymap` here. */
  onKeyDown?: unknown;
  onKeyUp?: unknown;

  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;

  /** Accepted, no effect: NSH has one kind of host element. */
  elementType?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * Autocomplete.Trigger / AutocompleteTrigger.
 *
 * Stub: the real part owns the hover / focus / invalid state classes, the open
 * toggle, the overlay anchor registration and the indicator / clear-button
 * registrations. This body only fixes the file and the public surface, so the
 * part can be written against the finished core.
 */
export function AutocompleteTrigger(
  props: AutocompleteTriggerProps,
): JSX.Element | null {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "isDisabled",
    "autoFocus",
    "excludeFromTabOrder",
    "type",
    "form",
    "name",
    "value",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onPressStart",
    "onPressEnd",
    "onPressChange",
    "onLongPress",
    "onMouseEnter",
    "onMouseLeave",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "onClick",
    "onKeyDown",
    "onKeyUp",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
    "elementType",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const autocomplete = AutocompleteContext();

  if (!autocomplete) {
    return null;
  }

  const classes = computed(() =>
    [autocomplete.slots().trigger(), local.className as string | undefined]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      role="button"
      accessibilityState={local.accessibilityState}
      class={classes()}
      style={local.style as StyleProp<ViewStyle>}
      onLayout={local.onLayout}
    >
      {/* A render prop is the part's own job; the stub shows a plain child. */}
      {typeof local.children === "function"
        ? null
        : renderChildren(local.children as JSX.Element)}
    </View>
  );
}
