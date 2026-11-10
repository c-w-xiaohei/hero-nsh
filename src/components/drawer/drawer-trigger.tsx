import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
export interface DrawerTriggerProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  render?: unknown;
  ref?: (node: import("nsh").ViewRef) => void;
}
export function DrawerTrigger(props: DrawerTriggerProps): JSX.Element { return <View>{props.children}</View>; }
