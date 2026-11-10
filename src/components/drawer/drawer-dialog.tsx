import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
export interface DrawerDialogProps extends Omit<ViewProps, "children" | "class" | "ref" | "role"> {
  children?: JSX.Element | ((values: { close: () => void }) => JSX.Element);
  className?: string;
  style?: ViewProps["style"];
  role?: "alertdialog" | "dialog";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  slot?: string;
  render?: unknown;
  id?: string;
  ref?: (node: import("nsh").ViewRef) => void;
}
export function DrawerDialog(props: DrawerDialogProps): JSX.Element { return <View>{typeof props.children === "function" ? props.children({ close: () => {} }) : props.children}</View>; }
