import type { JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { Scroll } from "nsh";

export interface TableScrollContainerProps {
  children?: JSX.Element;
  className?: string;
  style?: StyleProp<ViewStyle>;
  ref?: (node: ViewRef) => void;
  id?: string;
  render?: unknown;
  [key: string]: unknown;
}

// R-002: NSH Scroll owns horizontal overflow and its scrollbar.
export function TableScrollContainer(props: TableScrollContainerProps) {
  const { children, className, style, ref, id, render: _render, ...rest } = props;
  return <Scroll {...rest as any} horizontal ref={(node) => ref?.(node)} nativeID={id} class={["w-full", className].filter(Boolean).join(" ")} style={style}>{children}</Scroll>;
}
