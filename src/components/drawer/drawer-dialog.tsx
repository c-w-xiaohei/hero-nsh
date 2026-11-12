import type { JSX, ViewProps, ViewRef } from "nsh";
import { createMotion, effect, reduceMotion, split, View, windowSize } from "nsh";
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

  // Upstream slides the content wrapper from `translate: 100%` of the visual
  // viewport, so the panel's visible travel is the last part of a full-screen
  // move. A class transition depends on both the start state being painted and
  // the class change landing after it, which a presented dialog does not
  // guarantee (the host may mount it a few frames after `open`). A motion value
  // moves the view natively from its first frame, so the slide cannot be
  // skipped; the distance is the window's, the same 100% upstream uses.
  const horizontal = () =>
    drawer.placement() === "left" || drawer.placement() === "right";
  // Upstream's enter starts past the edge the panel comes from: negative for
  // top and left, positive for bottom and right.
  const offset = () => {
    const size = horizontal() ? windowSize().width : windowSize().height;

    return drawer.placement() === "left" || drawer.placement() === "top" ? -size : size;
  };
  const motion = createMotion({
    initial: horizontal()
      ? { translateX: offset(), translateY: 0 }
      : { translateX: 0, translateY: offset() },
  });
  // Upstream's enter (250ms) and exit (200ms), on the fluid curve.
  const slide = [0.32, 0.72, 0, 1] as [number, number, number, number];

  effect(() => {
    const open = drawer.isOpen();
    const exiting = drawer.isExiting();
    const shown = drawer.isPresented();
    const moving = horizontal() ? motion.translateX : motion.translateY;
    const across = horizontal() ? motion.translateY : motion.translateX;
    across.set(0);

    if (reduceMotion()) {
      moving.set(0);

      return;
    }

    if (exiting) {
      moving.timing(offset(), { duration: 200, easing: slide });

      return;
    }

    if (shown && open) {
      // Presented: the panel starts off the edge (the motion's initial value)
      // and slides to rest. A reopen during the exit continues from where it is.
      moving.timing(0, { duration: 250, easing: slide });

      return;
    }

    if (shown) {
      // The close render arrives before the presence sets the exit hold; the
      // panel stays where it is until `exiting` is true.
      return;
    }

    // The dialog is gone (or never presented): park past the edge, ready.
    moving.set(offset());
  });

  const className = () =>
    [drawer.slots().dialog(), local.className].filter(Boolean).join(" ");
  const style = () => {
    const caller = local.style;
    const base = drawer.isDismissable() ? { touchAction: "none" as const, ...caller } : caller;

    return [base, motion.style];
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
  isEntering: () => false,
  isExiting: () => false,
  isPresented: () => false,
  open: () => {},
  close: () => {},
  toggle: () => {},
};
