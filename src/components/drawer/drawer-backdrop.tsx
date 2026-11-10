import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
import type { DrawerVariants } from "./drawer.styles";
export interface DrawerBackdropProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element | ((values: unknown) => JSX.Element);
  className?: string | ((values: unknown) => string);
  variant?: DrawerVariants["variant"];
  isDismissable?: boolean;
  isKeyboardDismissDisabled?: boolean;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  isEntering?: boolean;
  isExiting?: boolean;
  onEnter?: (element?: unknown) => void | Promise<void>;
  onExit?: (element?: unknown) => void | Promise<void>;
  shouldCloseOnInteractOutside?: (element?: unknown) => boolean;
  UNSTABLE_portalContainer?: unknown;
  render?: unknown;
  slot?: string;
  ref?: (node: import("nsh").ViewRef) => void;
}
export function DrawerBackdrop(props: DrawerBackdropProps): JSX.Element { return <View>{typeof props.children === "function" ? props.children({}) : props.children}</View>; }
