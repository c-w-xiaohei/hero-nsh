import type { JSX, ViewProps } from "nsh";
import { computed, View } from "nsh";
import type { DrawerContextValue } from "./drawer-context";
import { DrawerContext } from "./drawer-context";
import type { DrawerPlacement } from "./drawer.styles";
import { drawerVariants } from "./drawer.styles";

interface DrawerRenderValues {
  isEntering: () => boolean;
  isExiting: () => boolean;
  state: { isOpen: () => boolean; open: () => void; close: () => void; toggle: () => void };
}

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

export function DrawerContent(props: DrawerContentProps): JSX.Element {
  const parent = DrawerContext();
  const placement = () => props.placement ?? parent?.placement() ?? "bottom";
  const base = parent ?? fallbackContext;
  const contextValue: DrawerContextValue = {
    ...base,
    placement,
    slots: computed(() => drawerVariants({ placement: placement(), variant: base.variant() })),
  };
  const renderValues: DrawerRenderValues = {
    isEntering: () => false,
    isExiting: () => false,
    state: {
      isOpen: base.isOpen,
      open: base.open,
      close: base.close,
      toggle: base.toggle,
    },
  };
  const className = () => {
    const value = props.className;
    const custom = typeof value === "function" ? value(renderValues) : value;
    // R-012: placement aligns the panel to the requested viewport edge.
    const alignment = placement() === "bottom" ? "items-end"
      : placement() === "top" ? "items-start"
        : placement() === "left" ? "justify-start" : "justify-end";
    return [contextValue.slots().content, alignment, custom].filter(Boolean).join(" ");
  };
  const { children, className: _className, placement: _placement, isDismissable: _isDismissable,
    isKeyboardDismissDisabled: _keyboardDisabled, isOpen: _isOpen, defaultOpen: _defaultOpen,
    onOpenChange: _onOpenChange, render: _render, slot: _slot, ref, ...viewProps } = props;

  return (
    <View
      {...viewProps}
      ref={(node) => ref?.(node)}
      class={className()}
      style={props.style}
      onLayout={props.onLayout}
    >
      <DrawerContext.Provider value={contextValue}>
        {typeof children === "function" ? children(renderValues) : children}
      </DrawerContext.Provider>
    </View>
  );
}

const fallbackContext: DrawerContextValue = {
  slots: computed(() => drawerVariants({ placement: "bottom", variant: "opaque" })),
  placement: () => "bottom",
  variant: () => "opaque",
  isDismissable: () => true,
  isOpen: () => false,
  open: () => {},
  close: () => {},
  toggle: () => {},
};
