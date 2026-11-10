import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
export interface DrawerHeadingProps extends Omit<ViewProps, "children" | "class" | "ref"> { children?: JSX.Element; className?: string; slot?: string; level?: number; render?: unknown; ref?: (node: import("nsh").ViewRef) => void; }
export function DrawerHeading(props: DrawerHeadingProps): JSX.Element { return <View>{props.children}</View>; }
