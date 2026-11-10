import type { JSX, ViewProps } from "nsh";
import { computed } from "nsh";
import { Dialog } from "nsh/base";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { createDrawerState } from "./create-drawer-state";
import { createDrawerContextValue, DrawerContext } from "./drawer-context";
import { drawerVariants } from "./drawer.styles";
import type { DrawerContextValue } from "./drawer-context";
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
export function DrawerBackdrop(props: DrawerBackdropProps): JSX.Element {
  const parent = DrawerContext();
  const parentOverlay = OverlayTriggerContext();
  const local = createDrawerState({
    isOpen: () => props.isOpen,
    defaultOpen: () => props.defaultOpen,
    onOpenChange: props.onOpenChange,
  });
  const isOpen = () => props.isOpen ?? parent?.isOpen() ?? local.isOpen();
  const setOpen = (open: boolean | ((previous: boolean) => boolean)) => {
    if (parent && props.isOpen === undefined && props.defaultOpen === undefined) {
      const next = typeof open === "function" ? open(parent.isOpen()) : open;
      if (next) parent.open();
      else parent.close();
      props.onOpenChange?.(next);
    } else {
      local.setIsOpen(open);
    }
  };
  // R-008, R-009: variant is resolved through the backdrop slot table.
  const variant = () => props.variant ?? parent?.variant() ?? "opaque";
  const slots = computed(() => drawerVariants({ placement: parent?.placement(), variant: variant() }));
  const isDismissable = () => props.isDismissable ?? true;
  const contextValue: DrawerContextValue = {
    ...(parent ?? createDrawerContextValue({ isOpen, setOpen })),
    slots,
    variant,
    isDismissable,
    isOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!isOpen()),
  };
  const ownsOpenState = props.isOpen !== undefined || props.defaultOpen !== undefined || !parent;
  const overlay = ownsOpenState ? local.context : parentOverlay ?? local.context;
  const renderValues = { isOpen, isEntering: () => false, isExiting: () => false };
  const classes = () => {
    const value = props.className;
    return [slots().backdrop(), typeof value === "function" ? value(renderValues) : value]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <DrawerContext.Provider value={contextValue}>
      <OverlayTriggerContext.Provider value={overlay}>
        <Dialog
          open={isOpen()}
          animation="fade"
          closeOnBackdropPress={isDismissable()}
          closeOnEscape={!props.isKeyboardDismissDisabled}
          onOpenChange={(event) => {
            if (!event.open) setOpen(false);
          }}
          testID={props.testID}
          backdropTestID={props.testID ? `${props.testID}-backdrop` : undefined}
          backdropClass={classes()}
          backdropStyle={props.style}
          class="flex-1"
        >
          {typeof props.children === "function" ? props.children(renderValues) : props.children}
        </Dialog>
      </OverlayTriggerContext.Provider>
    </DrawerContext.Provider>
  );
}
