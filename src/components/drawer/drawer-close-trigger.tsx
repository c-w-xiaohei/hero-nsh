import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
export interface DrawerCloseTriggerProps extends Omit<ViewProps, "children" | "class" | "ref"> { children?: JSX.Element; className?: string; slot?: string; render?: unknown; ref?: (node: import("nsh").ViewRef) => void; }
export function DrawerCloseTrigger(props: DrawerCloseTriggerProps): JSX.Element { return <View>{props.children}</View>; }
