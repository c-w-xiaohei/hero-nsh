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
  const base = parent ?? fallbackContext;
  const placement = () => props.placement ?? base.placement();
  // Upstream animates the wrapper with `heroui-drawer-enter-*`: from the edge
  // off-screen (250ms, `cubic-bezier(0.32, 0.72, 0, 1)`) to rest. NSH has no
  // keyframes, so the same two states are classes. The start state has to be
  // painted before the class is replaced: the first frame after the mount can
  // still be the frame that paints the wrapper, and the transition would be
  // skipped. Two frames put a painted off-screen state between them on every
  // host.
  const settled = signal(false);
  effect(() => {
    if (!base.isOpen()) {
      // During the exit the wrapper stays at rest: the dialog is the layer
      // that slides out. Once the hold ends, a retained subtree (a host that
      // keeps the content mounted) starts the next open from the edge again.
      if (!base.isExiting()) {
        settled.set(false);
      }

      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => settled.set(true));
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  });
  const contextValue: DrawerContextValue = {
    ...base,
    placement,
    slots: computed(() => drawerVariants({ placement: placement(), variant: base.variant() })),
  };
  const renderValues: DrawerRenderValues = {
    isEntering: base.isEntering,
    isExiting: base.isExiting,
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
    // R-015: only the open slide lives here. The panel starts past the edge it
    // comes from and slides to rest over 250ms; the dialog owns the 200ms exit.
    const off = !settled();
    const edge = placement() === "bottom" ? "translate-y-full"
      : placement() === "top" ? "-translate-y-full"
        : placement() === "left" ? "-translate-x-full" : "translate-x-full";
    return [
      contextValue.slots().content(),
      alignment,
      "transition motion-reduce:transition-none",
      "duration-[250ms]",
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
  isExiting: () => false,
  open: () => {},
  close: () => {},
  toggle: () => {},
};
