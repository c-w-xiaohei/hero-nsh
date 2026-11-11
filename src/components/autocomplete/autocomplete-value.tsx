import type {
  Accessor,
  AccessibilityState,
  Bounds,
  JSX,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "../list-box/children";
import {
  AutocompleteContext,
  type AutocompleteSelectedItem,
  type AutocompleteStateFacade,
} from "./autocomplete-context";

/**
 * What a value `children` function receives (HeroUI's `SelectValueRenderProps`
 * as Autocomplete reuses it). `state` is this port's facade, not React
 * Stately's `SelectState` (port sheet §1, §8).
 */
export interface AutocompleteValueRenderProps {
  isPlaceholder: Accessor<boolean>;

  /** HeroUI's deprecated single-item accessor. */
  selectedItem: Accessor<AutocompleteSelectedItem | null>;

  selectedItems: Accessor<readonly AutocompleteSelectedItem[]>;

  selectedText: Accessor<string | undefined>;

  state: AutocompleteStateFacade;

  /** The tree the value shows with no children: the selected item(s), or the placeholder. */
  defaultChildren: Accessor<JSX.Element | undefined>;
}

/** The props of `Autocomplete.Value`: React Aria's `SelectValue`. */
export interface AutocompleteValueProps {
  /** The value's content, or a render prop called once with accessors. */
  children?: JSX.Element | ((values: AutocompleteValueRenderProps) => JSX.Element);

  /** Appended after the variant classes; function form gets the same accessors. */
  className?: string | ((values: AutocompleteValueRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: AutocompleteValueRenderProps) => StyleProp<ViewStyle>);

  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;

  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * Autocomplete.Value / AutocompleteValue.
 *
 * Stub: the real part renders the selected option's content again (its
 * `children` copy inside the trigger), the placeholder, and the render values
 * over the root's selection. This body only fixes the file and the public
 * surface.
 */
export function AutocompleteValue(
  props: AutocompleteValueProps,
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
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
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
    [autocomplete.slots().value(), local.className as string | undefined]
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
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityHint={local.accessibilityHint}
      accessibilityState={local.accessibilityState}
      accessibilityElementsHidden={local.accessibilityElementsHidden}
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
