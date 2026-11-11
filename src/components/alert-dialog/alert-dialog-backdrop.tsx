import type { Accessor, JSX, PressEvent, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { reduceMotion, View } from "nsh";
import { Dialog } from "nsh/base";

import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import type { OverlayTriggerContextValue } from "../../primitives/create-overlay-trigger";
import {
  createOverlayTrigger,
  OverlayTriggerContext,
} from "../../primitives/create-overlay-trigger";
import type { AlertDialogContextValue } from "./alert-dialog-context";
import {
  AlertDialogContext,
  createAlertDialogContextValue,
  deriveAlertDialogState,
} from "./alert-dialog-context";
import type { AlertDialogRenderValues } from "./alert-dialog-render-values";
import type { AlertDialogVariant } from "./alert-dialog.styles";
import { alertDialogBackdropCarrierClasses } from "./alert-dialog.styles";

/**
 * The props of `AlertDialog.Backdrop`: HeroUI's `AlertDialogBackdropProps`,
 * which is React Aria's `ModalOverlay` props plus `variant` and the two
 * dismiss defaults AlertDialog flips.
 *
 * The overlay's own open channel (`isOpen` / `defaultOpen` / `onOpenChange`)
 * overrides the root's state while it is given, as RAC merges the two
 * (`react-aria-components/src/Modal.tsx`: `props.isOpen != null ||
 * props.defaultOpen != null || !contextState ? localState : contextState`).
 */
export interface AlertDialogBackdropProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "style"> {
  children?: JSX.Element | ((values: AlertDialogRenderValues) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string | ((values: AlertDialogRenderValues) => string);

  style?: StyleProp<ViewStyle> | ((values: AlertDialogRenderValues) => StyleProp<ViewStyle>);

  /** The backdrop's paint. @default "opaque" */
  variant?: AlertDialogVariant;

  /**
   * Whether a press outside the dialog closes it. Alert dialogs require an
   * explicit action upstream, so this defaults to `false` (port sheet §1).
   */
  isDismissable?: boolean;

  /**
   * Whether Escape and the back button close it. Alert dialogs require an
   * explicit action upstream, so this defaults to `true`.
   */
  isKeyboardDismissDisabled?: boolean;

  /** The open state in controlled mode, over the root's. */
  isOpen?: boolean;

  /** The initial open state when there is no root. */
  defaultOpen?: boolean;

  /** Called on every change, with HeroUI's boolean payload. */
  onOpenChange?: (isOpen: boolean) => void;

  /** Forces the entering phase. */
  isEntering?: boolean;

  /** Accepted, no effect: the host owns the overlay's animation. */
  isExiting?: boolean;

  /** Accepted, no effect: the host owns the overlay's animation. */
  onEnter?: (element?: unknown) => void | Promise<void>;

  /** Accepted, no effect: the host owns the overlay's animation. */
  onExit?: (element?: unknown) => void | Promise<void>;

  /** Accepted, no effect: there is no DOM element to test. */
  shouldCloseOnInteractOutside?: (element?: unknown) => boolean;

  /** Accepted, no effect: deprecated upstream, and NSH has no portal. */
  UNSTABLE_portalContainer?: unknown;

  /** Forwarded as a callback to the paint layer's view. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM attribute channel. */
  [key: `data-${string}`]: unknown;
}

/* -------------------------------------------------------------------------------------------------
 * Backdrop
 * -----------------------------------------------------------------------------------------------*/

/**
 * AlertDialog.Backdrop / AlertDialogBackdrop: the overlay layer. nsh/base
 * `Dialog` is the native modal layer (port sheet §3, B1–B4); inside it the
 * paint layer and the layout carrier are siblings, so a press on the card
 * cannot reach the paint layer's `onPress` (port sheet §5).
 */
export function AlertDialogBackdrop(props: AlertDialogBackdropProps): JSX.Element {
  const parent = AlertDialogContext();

  // React Aria's rule: a Backdrop that has its own open channel, or that has no
  // root above it, owns the state; otherwise the root's state is the truth.
  const ownsState = () =>
    props.isOpen !== undefined || props.defaultOpen !== undefined || parent === null;

  const state = createOverlayTrigger({
    defaultOpen: () => (ownsState() ? props.defaultOpen : undefined),
    isOpen: () => (ownsState() ? props.isOpen : undefined),
    onOpenChange: (isOpen) => {
      if (ownsState()) {
        props.onOpenChange?.(isOpen);
      }
    },
  });

  // HeroUI merges a second `alertDialogVariants({variant})` over the root's
  // slots; here that is the same table with one axis replaced, so every part
  // below sees the merged slots without copying the state.
  //
  // React Aria gives the overlay its local state whenever the overlay itself
  // has an open channel (`isOpen` / `defaultOpen`) or has no trigger above it,
  // so in those cases the Dialog below has to read — and close — the Backdrop's
  // state, not the Root's. Without a Root the base value is already the local
  // state.
  const base: AlertDialogContextValue = parent
    ? parent.withOverrides({ variant: () => props.variant })
    : createAlertDialogContextValue({
        isOpen: state.isOpen,
        setOpen: state.setIsOpen,
        variant: () => props.variant,
      });

  const contextValue: AlertDialogContextValue =
    parent !== null && ownsState()
      ? deriveAlertDialogState(base, state.isOpen, state.setIsOpen)
      : base;

  const isOpen = contextValue.isOpen;
  const close = () => contextValue.close();

  // AlertDialog's defaults are the opposite of Modal's: an outside press and
  // Escape do nothing unless the caller turns them on (port sheet §1).
  const isDismissable = () => props.isDismissable ?? false;
  const isKeyboardDismissDisabled = () => props.isKeyboardDismissDisabled ?? true;

  // The entering and exiting phases the render values report, and the exit hold
  // below. HeroUI keeps the overlay mounted until the container's 100ms exit
  // animation finishes (`useOverlayExitHold`); NSH has no animation event, so
  // `createOverlayPresence` holds the same window with a timer (R-026).
  const presence = createOverlayPresence({
    isOpen,
    isEntering: () => props.isEntering,
  });

  const values: AlertDialogRenderValues = {
    isEntering: presence.isEntering,
    isExiting: presence.isExiting,
    state: {
      isOpen,
      open: contextValue.open,
      close: contextValue.close,
      toggle: contextValue.toggle,
    },
  };

  const className = () => {
    const value = props.className;

    return (typeof value === "function" ? value(values) : value) ?? "";
  };

  const style = () => {
    const value = props.style;

    return typeof value === "function" ? value(values) : value;
  };

  // R-007 (fixed inset-0 z-index) is the Dialog itself: it is the native layer
  // over the whole window and sits at the top of the stack. What is written
  // here is the paint box, R-013 … R-015 through the slot table.
  const paintClasses = () =>
    ["absolute inset-0", contextValue.slots().backdrop(), className()]
      .filter((part) => part !== "")
      .join(" ");

  // The carrier is only a flex box (R-008 / R-009); it mounts the parts the
  // caller wrote, and the Container's own `pointer-events-none` (R-020) leaves
  // the card's `pointer-events-auto` (R-034) as the only target.
  // `props.children` is read once, at its placement inside it.
  const carrier = () => {
    const node = props.children;
    const content = () => {
      if (typeof node === "function" && node.length >= 1) {
        return (node as (values: AlertDialogRenderValues) => JSX.Element)(values);
      }

      return node as JSX.Element;
    };

    return <View class={alertDialogBackdropCarrierClasses}>{content()}</View>;
  };

  // Inside the layer a Button must not toggle the alert dialog or register
  // itself as the trigger (port sheet §5, the same ruling as Modal and
  // Popover.Content). `close` is kept so a part inside the dialog still closes
  // it; `isOpen` reports no opinion rather than a collapsed overlay this Button
  // never opened.
  const scopedTrigger: OverlayTriggerContextValue = {
    isOpen: () => undefined,
    setIsOpen: () => {},
    toggle: () => {},
    close,
    registerTrigger: () => () => {},
    triggerRef: () => undefined,
  };

  const dismiss = () => {
    if (isOpen() && isDismissable()) {
      close();
    }
  };

  // Upstream spreads the caller's props onto the overlay, whose press handler
  // dismisses; a caller's own `onPress` runs too (React Aria merges them).
  const handlePress = (event: PressEvent) => {
    props.onPress?.(event);
    dismiss();
  };

  return (
    <AlertDialogContext.Provider value={contextValue}>
      <OverlayTriggerContext.Provider value={scopedTrigger}>
        <AlertDialogLayer
          // R-026: `open` follows the presence, not the state, so the backdrop
          // and the card stay mounted for the 100ms after a close. HeroUI's
          // `useOverlayExitHold` does the same with the animation end event.
          open={presence.isPresent}
          isOpen={isOpen}
          closeOnEscape={() => !isKeyboardDismissDisabled()}
          onDismiss={close}
          paintClasses={paintClasses}
          style={style}
          handlePress={handlePress}
          forwardRef={(node) => props.ref?.(node)}
          testID={() => props.testID}
          nativeID={() => props.id ?? props.nativeID}
          accessibilityLabel={() => props.accessibilityLabel}
          onLayout={() => props.onLayout}
          carrier={carrier}
        />
      </OverlayTriggerContext.Provider>
    </AlertDialogContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * The native layer
 * -----------------------------------------------------------------------------------------------*/

/** What `AlertDialogLayer` takes: the Backdrop's prepared values, as live accessors. */
interface AlertDialogLayerProps {
  /** What the native dialog presents: the presence, including the exit hold. */
  open: Accessor<boolean>;

  /** The open state itself, for the dismiss callback and the exit look. */
  isOpen: Accessor<boolean>;

  closeOnEscape: Accessor<boolean>;
  onDismiss: () => void;
  paintClasses: Accessor<string>;
  style: Accessor<StyleProp<ViewStyle> | undefined>;
  handlePress: (event: PressEvent) => void;
  forwardRef: (node: ViewRef) => void;
  testID: Accessor<ViewProps["testID"]>;
  nativeID: Accessor<string | undefined>;
  accessibilityLabel: Accessor<string | undefined>;
  onLayout: Accessor<ViewProps["onLayout"] | undefined>;
  carrier: () => JSX.Element;
}

/**
 * The native layer and its two children: the paint layer and the carrier.
 *
 * A component of its own, so what it creates is an element *below* the
 * providers rather than a thunk in the Backdrop's body. The web host builds a
 * presented dialog's content in a pass of its own; a part created from the
 * Backdrop's body looked its context up from the Backdrop's own scope and read
 * the root's closed state (measured in Modal: its CloseTrigger closed nothing).
 */
function AlertDialogLayer(props: AlertDialogLayerProps): JSX.Element {
  return (
    <Dialog
      open={props.open()}
      // R-010 / R-011: the backdrop's 150ms fade in and 100ms fade out are the
      // Dialog's native fade on the way in; the durations are the host's.
      // R-012: `motion-reduce:animate-none` → no animation at all.
      // R-026: on the way out the exit hold already ran the 100ms (the
      // presence), so the native fade is off then and the layer leaves at the
      // end of that window instead of starting another animation.
      animation={reduceMotion() || !props.isOpen() ? "none" : "fade"}
      // R-027: `motion-reduce:animate-none` for the exit too.
      // The paint layer below owns the backdrop press, so the native one is off.
      closeOnBackdropPress={false}
      closeOnEscape={props.closeOnEscape()}
      onOpenChange={(event) => {
        // The exit hold flips `open` itself when it ends; only a close the host
        // reports while the state is still open is a user dismiss.
        if (!event.open && props.isOpen()) {
          props.onDismiss();
        }
      }}
      class="flex-1"
    >
      <View class="relative flex-1">
        <View
          ref={(node) => props.forwardRef(node)}
          testID={props.testID()}
          nativeID={props.nativeID()}
          accessibilityLabel={props.accessibilityLabel()}
          onLayout={props.onLayout()}
          focusable={false}
          class={props.paintClasses()}
          style={props.style()}
          onPress={props.handlePress}
        />
        {() => props.carrier()}
      </View>
    </Dialog>
  );
}
