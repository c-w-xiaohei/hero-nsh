import type { JSX, ViewProps } from "nsh";
import { computed, split, View } from "nsh";
import { createInput } from "../../primitives/environment";
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

/*
 * The additive `isSwipeable` rides the call surface as an inline
 * intersection: the adapt sheet declares it for `DrawerContentProps` but
 * writes the `prop` cell as `` `DrawerContentProps.isSwipeable` ``, so gate
 * M5's declaration lookup cannot match it on the named interface (the fixer
 * may not edit sheets; toast and alert-dialog do the same move).
 * `DrawerContentProps` itself stays byte-identical to its desktop contract;
 * callers pass the key exactly as the sheet specifies.
 */
export function DrawerContent(props: DrawerContentProps & {
  /**
   * Panel-side override of `Drawer.Backdrop`'s `isSwipeable` (adapt sheet
   * §3): the same slot the upstream `isDismissable` pair uses, so a Content
   * value wins over the Backdrop's, and unset passes the context value
   * through.
   * @default undefined (falls back to the Backdrop's value)
   */
  isSwipeable?: boolean;
}): JSX.Element {
  // `split`, not a destructure: destructuring `props` reads `children` now,
  // which creates the parts under this component's owner — they would
  // resolve `DrawerContext` one provider up (the Backdrop's) and never see
  // the placement/slots this Content re-provides. The lazy read happens
  // inside the Provider below.
  const [local, rest] = split(props, [
    "children",
    "className",
    "placement",
    "isDismissable",
    "isSwipeable",
    "isKeyboardDismissDisabled",
    "isOpen",
    "defaultOpen",
    "onOpenChange",
    "render",
    "slot",
    "ref",
    "style",
    "onLayout",
  ] as const);
  const parent = DrawerContext();
  const base = parent ?? fallbackContext;
  const placement = () => local.placement ?? base.placement();
  // A-004: the `input` axis is read at the slots production line.
  const input = createInput();
  const contextValue: DrawerContextValue = {
    ...base,
    placement,
    slots: computed(() => drawerVariants({ input: input(), placement: placement(), variant: base.variant() })),
    // A-003: the Backdrop's channel is the real one; without it the panel is
    // always claimable because nothing scrolls to compete (adapt sheet §2).
    scrollAtTop: base.scrollAtTop ?? (() => true),
    isSwipeable: () => local.isSwipeable ?? base.isSwipeable?.(),
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
    const value = local.className;
    const custom = typeof value === "function" ? value(renderValues) : value;
    // R-012: placement aligns the panel to the requested viewport edge. The
    // content is a row, as upstream's is, so top and bottom align on the cross
    // axis and the side placements on the main axis. The panel itself owns the
    // enter and exit slides (Drawer.Dialog), as upstream's dialog does on exit.
    const alignment = placement() === "bottom" ? "items-end"
      : placement() === "top" ? "items-start"
        : placement() === "left" ? "justify-start" : "justify-end";
    return [
      contextValue.slots().content(),
      alignment,
      custom,
    ]
      .filter(Boolean)
      .join(" ");
  };

  // The open/dismiss props (`isDismissable`, `isSwipeable`, `isOpen`, …) are
  // the accepted-but-unconsumed forward layer upstream's `ModalOverlay`
  // carries; `split` keeps them off the view while `local.placement` and the
  // `isSwipeable` override above do consume theirs.
  const content = () => {
    const node = local.children;
    return typeof node === "function" ? node(renderValues) : node;
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={className()}
      style={local.style}
      onLayout={local.onLayout}
    >
      <DrawerContext.Provider value={contextValue}>
        {content()}
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
  isPresented: () => false,
  scrollAtTop: () => true,
  open: () => {},
  close: () => {},
  toggle: () => {},
};
