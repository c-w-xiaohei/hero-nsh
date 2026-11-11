import type { JSX, ViewProps } from "nsh";
import { computed, effect, signal, View } from "nsh";
import type { DrawerContextValue } from "./drawer-context";
import { DrawerContext } from "./drawer-context";
import type { DrawerPlacement } from "./drawer.styles";
import { drawerVariants } from "./drawer.styles";
import { ease } from "../../tokens/geometry";

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
  // Upstream animates the wrapper with `heroui-drawer-enter-*`: from the edge
  // off-screen (250ms, `cubic-bezier(0.32, 0.72, 0, 1)`) to rest. NSH has no
  // keyframes, so the same two states are classes; `settled` starts false and
  // flips one frame after the wrapper is painted, which is what makes the
  // change a transition instead of the resting state from the first frame.
  const settled = signal(false);
  effect(() => {
    if (!base.isOpen()) {
      settled.set(false);
      return;
    }
    const frame = requestAnimationFrame(() => settled.set(true));
    return () => cancelAnimationFrame(frame);
  });
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
    // R-012: placement aligns the panel to the requested viewport edge. The
    // content is a row, as upstream's is, so top and bottom align on the cross
    // axis and the side placements on the main axis.
    const alignment = placement() === "bottom" ? "items-end"
      : placement() === "top" ? "items-start"
        : placement() === "left" ? "justify-start" : "justify-end";
    // The panel starts past the edge it comes from and slides to rest; the
    // backdrop fades over the same 250ms in the backdrop's own classes.
    const off = !base.isOpen() || !settled();
    const edge = placement() === "bottom" ? "translate-y-full"
      : placement() === "top" ? "-translate-y-full"
        : placement() === "left" ? "-translate-x-full" : "translate-x-full";
    // Upstream's enter is 250ms and its exit 200ms, both on the fluid curve;
    // the state picks the duration before the change lands.
    const duration = base.isOpen() ? "duration-[250ms]" : "duration-[200ms]";
    return [
      contextValue.slots().content(),
      alignment,
      "transition motion-reduce:transition-none",
      duration,
      ease.outFluid,
      off ? edge : "translate-x-0 translate-y-0",
      custom,
    ]
      .filter(Boolean)
      .join(" ");
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
  isEntering: () => false,
  open: () => {},
  close: () => {},
  toggle: () => {},
};
