import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
export interface DrawerHandleProps extends Omit<ViewProps, "children" | "class" | "ref"> { children?: JSX.Element; className?: string; render?: unknown; ref?: (node: import("nsh").ViewRef) => void; }
export function DrawerHandle(_props: DrawerHandleProps): JSX.Element { return <View />; }
