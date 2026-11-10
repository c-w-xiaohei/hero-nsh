import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
import { SurfaceContext } from "../surface/surface-context";
import type { DrawerContextValue } from "./drawer-context";
import { DrawerContext } from "./drawer-context";
import { drawerVariants } from "./drawer.styles";

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

export function DrawerDialog(props: DrawerDialogProps): JSX.Element {
  const context = DrawerContext();
  const drawer = context ?? fallbackContext;
  const renderValues = { close: drawer.close };
  const className = [drawer.slots().dialog, props.className].filter(Boolean).join(" ");
  const style = drawer.isDismissable()
    ? { touchAction: "none", ...props.style }
    : props.style;
  const {
    children, className: _className, style: _style, role: _role,
    "aria-label": _ariaLabel, "aria-labelledby": _ariaLabelledby,
    "aria-describedby": _ariaDescribedby, slot: _slot, render: _render,
    id: _id, ref, ...viewProps
  } = props;

  return (
    <SurfaceContext.Provider value={{ variant: () => "default" }}>
      <View
        {...viewProps}
        ref={(node) => ref?.(node)}
        class={className}
        style={style}
        onLayout={props.onLayout}
      >
        {typeof children === "function" ? children(renderValues) : children}
      </View>
    </SurfaceContext.Provider>
  );
}

const fallbackContext: DrawerContextValue = {
  slots: () => drawerVariants({ placement: "bottom", variant: "opaque" }),
  placement: () => "bottom",
  variant: () => "opaque",
  isDismissable: () => true,
  isOpen: () => false,
  open: () => {},
  close: () => {},
  toggle: () => {},
};
