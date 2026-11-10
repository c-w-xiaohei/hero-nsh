import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
export interface DrawerHeaderProps extends Omit<ViewProps, "children" | "class" | "ref"> { children?: JSX.Element; className?: string; render?: unknown; ref?: (node: import("nsh").ViewRef) => void; }
export function DrawerHeader(props: DrawerHeaderProps): JSX.Element { return <View>{props.children}</View>; }
