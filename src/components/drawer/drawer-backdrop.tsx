import type { Accessor, JSX, PressEvent, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, View } from "nsh";
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

/** What the layer below reads; kept as accessors so a signalled value stays live. */
interface DrawerLayerProps {
  open: Accessor<boolean>;
  backdropClass: Accessor<string>;
  backdropStyle: Accessor<StyleProp<ViewStyle> | undefined>;
  testID: Accessor<ViewProps["testID"]>;
  backdropTestID: Accessor<ViewProps["testID"]>;
  onBackdropPress: (event: PressEvent) => void;
  onCancel: () => void;
  content: () => JSX.Element;
}

/**
 * The native layer and the two children it stacks: the backdrop (the paint
 * layer, and the one that owns an outside press) and the content above it.
 *
 * A component of its own, so the parts below are created inside the Backdrop's
 * providers: the web host builds a presented dialog's content in a pass of its
 * own, and a part created from the Backdrop's body looked its context up from
 * the Backdrop's own scope (measured on `Modal.CloseTrigger`, which closed
 * nothing).
 *
 * The backdrop is a view of ours rather than the Dialog's own (`backdropClass` /
 * `backdropStyle`): the host's backdrop paints over the popup in document order
 * and its press arrives as a cancellation without a reason, so an outside press
 * could not be told apart from Escape and gated by `isDismissable` alone. Here
 * the paint layer is the first sibling — below the content — and a press on it is
 * an outside press by construction.
 */
function DrawerLayer(props: DrawerLayerProps): JSX.Element {
  return (
    <Dialog
      open={props.open()}
      animation="fade"
      // Every native close attempt is turned off and routed through the state
      // instead: a close the host performs itself ignores `open` (a dialog that
      // closed natively stays closed while `open` stays true), which in
      // controlled mode would close a drawer whose owner did not change `isOpen`.
      // `onCancel` reports Escape, back and a dismissed sheet alike.
      closeOnBackdropPress={false}
      closeOnEscape={false}
      closeOnSwipe={false}
      onCancel={props.onCancel}
      testID={props.testID()}
      class="h-full w-full"
    >
      <View class="relative h-full w-full">
        <View
          testID={props.backdropTestID()}
          class={props.backdropClass()}
          style={props.backdropStyle()}
          onPress={props.onBackdropPress}
        />
        {props.content()}
      </View>
    </Dialog>
  );
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
  const isKeyboardDismissDisabled = () => props.isKeyboardDismissDisabled === true;
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

  // HeroUI's outside press and its keyboard dismissal are two gates on the same
  // request: `isDismissable` for a press on the backdrop, `isKeyboardDismissDisabled`
  // for Escape, the back button and a dismissed sheet. Both end in the state, so
  // a controlled owner still decides (`react-aria-components/src/Modal.tsx:200-215`).
  const requestClose = () => {
    if (isOpen()) setOpen(false);
  };
  const handleBackdropPress = (event: PressEvent) => {
    props.onPress?.(event);
    if (isDismissable()) requestClose();
  };
  const handleCancel = () => {
    if (!isKeyboardDismissDisabled()) requestClose();
  };

  // The children are read here, at their placement, from inside the providers:
  // the render-prop form takes the Backdrop's render values.
  const content = () => {
    const node = props.children;
    return typeof node === "function"
      ? (node as (values: unknown) => JSX.Element)(renderValues)
      : (node as JSX.Element);
  };

  return (
    <DrawerContext.Provider value={contextValue}>
      <OverlayTriggerContext.Provider value={overlay}>
        <DrawerLayer
          open={isOpen}
          backdropClass={classes}
          backdropStyle={() => props.style}
          testID={() => props.testID}
          backdropTestID={() => (props.testID ? `${props.testID}-backdrop` : undefined)}
          onBackdropPress={handleBackdropPress}
          onCancel={handleCancel}
          content={content}
        />
      </OverlayTriggerContext.Provider>
    </DrawerContext.Provider>
  );
}
