import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, View } from "nsh";

import { renderChildren } from "./children";
import { type AriaProps, type DataProps, type GlobalDomProps } from "./dom-props";
import { ToggleButtonGroupContext } from "./toggle-button-group-context";

export interface ToggleButtonGroupSeparatorProps
  extends AriaProps,
    DataProps,
    GlobalDomProps {
  children?: JSX.Element;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** A `span`'s role upstream: accepted, the separator stays hidden. */
  role?: string;
  title?: string;
  id?: string;
  testID?: string;
  nativeID?: string;
  tooltip?: JSX.Element;
  onLayout?: (e: { bounds: Bounds }) => void;
  ref?: (node: ViewRef) => void;
  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;
}

/**
 * ToggleButtonGroup.Separator / ToggleButtonGroupSeparator: the 1-point divider
 * between two members. HeroUI draws it with `bg-current`; NSH cannot take
 * `currentColor` as a color value, so the slot draws a colorless `border-s` /
 * `border-t`, which NSH paints in the element's text color (R-042).
 */
export function ToggleButtonGroupSeparator(props: ToggleButtonGroupSeparatorProps) {
  const group = ToggleButtonGroupContext();

  const classes = computed(() => {
    const slot = group ? group.slots().separator() : "";

    return [slot, props.className ?? ""].filter((part) => part !== "").join(" ");
  });

  return (
    <View
      ref={(node) => props.ref?.(node)}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      tooltip={props.tooltip}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      class={classes()}
      style={props.style}
      onLayout={props.onLayout}
    >
      {renderChildren(props.children)}
    </View>
  );
}
