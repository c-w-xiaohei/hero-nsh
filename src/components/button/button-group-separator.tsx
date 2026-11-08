import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, View } from "nsh";

import { ButtonGroupContext } from "./button-group-context";
import { renderChildren } from "./children";

export interface ButtonGroupSeparatorProps {
  children?: JSX.Element;
  className?: string;
  style?: StyleProp<ViewStyle>;
  id?: string;
  testID?: string;
  nativeID?: string;
  tooltip?: JSX.Element;
  onLayout?: (e: { bounds: Bounds }) => void;
  ref?: (node: ViewRef) => void;
  /** React Aria's DOM render function: accepted for parity, no effect. */
  render?: unknown;
}

/**
 * ButtonGroup.Separator / ButtonGroupSeparator: the 1-point divider between
 * buttons. HeroUI draws it with `bg-current`; NSH cannot take `currentColor` as
 * a color value, so the slot draws a colorless `border-s` / `border-t`, which
 * NSH paints in the element's text color (R-043).
 */
export function ButtonGroupSeparator(props: ButtonGroupSeparatorProps) {
  const group = ButtonGroupContext();

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
