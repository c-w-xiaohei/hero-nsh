import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
export interface DrawerFooterProps extends Omit<ViewProps, "children" | "class" | "ref"> { children?: JSX.Element; className?: string; render?: unknown; ref?: (node: import("nsh").ViewRef) => void; }
export function DrawerFooter(props: DrawerFooterProps): JSX.Element { return <View>{props.children}</View>; }
