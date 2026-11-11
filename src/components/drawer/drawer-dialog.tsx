import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";
import { SurfaceContext } from "../surface/surface-context";
import { createDrawerPartOrder, DrawerDialogContext } from "./create-drawer-part-order";
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
  ref?: (node: ViewRef) => void;
}

export function DrawerDialog(props: DrawerDialogProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "role",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "slot",
    "render",
    "id",
    "ref",
  ] as const);

  const context = DrawerContext();
  const drawer = context ?? fallbackContext;
  const renderValues = { close: drawer.close };

  // R-030–R-032: the parts read their predecessor here. Created once per
  // Dialog so the table is shared with the children mounted below.
  const partOrder = createDrawerPartOrder();

  // The children are read exactly once, at the placement, inside the order
  // provider (common rules: a part that registers into the Dialog's table
  // must be created inside that provider to see it).
  const content = () => {
    const node = local.children;

    return typeof node === "function"
      ? (node as (values: { close: () => void }) => JSX.Element)(renderValues)
      : (node as JSX.Element);
  };

  const className = () =>
    [drawer.slots().dialog(), local.className].filter(Boolean).join(" ");
  const style = () => {
    const caller = local.style;

    return drawer.isDismissable() ? { touchAction: "none" as const, ...caller } : caller;
  };

  return (
    <SurfaceContext.Provider value={{ variant: () => "default" }}>
      <DrawerDialogContext.Provider value={partOrder}>
        <View
          {...rest}
          ref={(node) => local.ref?.(node)}
          class={className()}
          style={style()}
        >
          {content()}
        </View>
      </DrawerDialogContext.Provider>
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
