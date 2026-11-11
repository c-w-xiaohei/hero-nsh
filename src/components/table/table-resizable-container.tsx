import type { JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { Scroll } from "nsh";

export interface TableResizableContainerProps {
  children?: JSX.Element;
  className?: string;
  style?: StyleProp<ViewStyle>;
  ref?: (node: ViewRef) => void;
  id?: string;
  render?: unknown;
  onResizeStart?: (widths: Map<string, number>) => void;
  onResize?: (widths: Map<string, number>) => void;
  onResizeEnd?: (widths: Map<string, number>) => void;
  [key: string]: unknown;
}

// R-051: Scroll provides the bidirectional scrolling viewport.
export function TableResizableContainer(props: TableResizableContainerProps) {
  const { children, className, style, ref, id, render: _render, onResizeStart: _onResizeStart, onResize: _onResize, onResizeEnd: _onResizeEnd, ...rest } = props;
  return <Scroll {...rest as any} ref={(node) => ref?.(node)} nativeID={id} class={className} style={style}>{children}</Scroll>;
}
