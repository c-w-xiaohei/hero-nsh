import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
import type { DrawerPlacement } from "./drawer.styles";
export interface DrawerContentProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element | ((values: unknown) => JSX.Element);
  className?: string | ((values: unknown) => string);
  placement?: DrawerPlacement;
  isDismissable?: boolean;
  isKeyboardDismissDisabled?: boolean;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  render?: unknown;
  slot?: string;
  ref?: (node: import("nsh").ViewRef) => void;
}
export function DrawerContent(props: DrawerContentProps): JSX.Element { return <View>{typeof props.children === "function" ? props.children({}) : props.children}</View>; }
