import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
export interface DrawerBodyProps extends Omit<ViewProps, "children" | "class" | "ref"> { children?: JSX.Element; className?: string; render?: unknown; ref?: (node: import("nsh").ViewRef) => void; }
export function DrawerBody(props: DrawerBodyProps): JSX.Element { return <View>{props.children}</View>; }
