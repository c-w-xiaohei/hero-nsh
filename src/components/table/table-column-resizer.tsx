import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { View } from "nsh";

export interface TableColumnResizerProps extends Omit<ViewProps, "children" | "class" | "style" | "ref"> {
  children?: JSX.Element;
  className?: string;
  style?: StyleProp<ViewStyle>;
  ref?: (node: ViewRef) => void;
  id?: string;
  render?: unknown;
  [key: string]: unknown;
}

// R-052–R-053: the outer view is the transparent, 17px pan hit area.
export function TableColumnResizer(props: TableColumnResizerProps) {
  const { children, className, style, ref, id, render: _render, ...rest } = props;
  return <View {...rest} ref={(node) => ref?.(node)} nativeID={id} class={["absolute end-0 top-1/2 flex h-4 w-[17px] -translate-y-1/2 translate-x-1/2 flex-col items-center justify-center cursor-col-resize outline-none", className].filter(Boolean).join(" ")} style={style}>
    {children}
    <View accessibilityElementsHidden class="pointer-events-none mx-auto h-4 w-px rounded-sm bg-separator" />
  </View>;
}
