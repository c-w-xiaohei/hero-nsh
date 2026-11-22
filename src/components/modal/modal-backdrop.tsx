import type {
  Accessor,
  JSX,
  Point,
  PressEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, context, reduceMotion, Scroll, signal, View } from "nsh";
import { Dialog } from "nsh/base";

import { createInput } from "../../primitives/environment";
import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import type { OverlayTriggerContextValue } from "../../primitives/create-overlay-trigger";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { createPan } from "../../primitives/pan";
import { createPresentation } from "../../primitives/presentation";
import { createModalState } from "./create-modal-state";
import type { ModalContextValue, ModalSwipe } from "./modal-context";
import { createModalContextValue, deriveModalState, ModalContext } from "./modal-context";
import type { ModalRenderValues } from "./modal-render-values";
import type { ModalPresentation, ModalVariants } from "./modal.styles";
import { modalBackdropLayoutClasses, modalBackdropScrollClasses } from "./modal.styles";

/**
 * The props of `Modal.Backdrop`: HeroUI's `ModalBackdropProps`, which is
 * React Aria's `ModalOverlay` props plus `variant` and `isDismissable`.
 *
 * The overlay's own open channel (`isOpen` / `defaultOpen` / `onOpenChange`)
 * overrides the root's state while it is given, as RAC merges the two
 * (`react-aria-components/src/Modal.tsx`: `props.isOpen != null ||
 * props.defaultOpen != null || !contextState ? localState : contextState`).
 */
export interface ModalBackdropProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "style"> {
  children?: JSX.Element | ((values: ModalRenderValues) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string | ((values: ModalRenderValues) => string);

  style?: StyleProp<ViewStyle> | ((values: ModalRenderValues) => StyleProp<ViewStyle>);

  /** The backdrop's paint. @default "opaque" */
  variant?: ModalVariants["variant"];

  /** Whether a press outside the dialog closes it. @default true */
  isDismissable?: boolean;

  /** Whether Escape and the back button close it. @default false */
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

  /** Forwarded as a callback to the overlay's root view. */
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
 * The scroll registration (R-029)
 * -----------------------------------------------------------------------------------------------*/

/**
 * What `Modal.Backdrop` gives `Modal.Container` (port sheet §5.4).
 *
 * `scroll` is the Container's prop while the scrolling carrier is the
 * Backdrop's, so the value travels upwards: the Container registers its
 * accessor on mount and the carrier becomes a `Scroll` when it reads
 * `"outside"`.
 */
export interface ModalBackdropContextValue {
  /** The registered Container's `scroll`, if one registered. */
  scroll: Accessor<ModalVariants["scroll"] | undefined>;

  /** Hands the Container's `scroll` up; the returned function withdraws it. */
  registerScroll: (scroll: Accessor<ModalVariants["scroll"] | undefined>) => () => void;
}

/** `null` outside a `Modal.Backdrop`. */
export const ModalBackdropContext = context<ModalBackdropContextValue | null>(null);

/**
 * The swipe's release velocity bound, in points per second (ResponderGestureState's
 * `vy` unit): a downward flick dismisses even short of the half-card travel —
 * same family as the sheet's `HANDLE_DRAG_VELOCITY` (0.4 pt/ms), declared
 * locally per adapt sheet A-004 (§5 asks the controller about a shared home).
 */
const SWIPE_DISMISS_VELOCITY = 500;

/**
 * A one-slot registry. The accessor travels inside an object so reading it
 * through the signal keeps the Container's own props tracked: a function
 * value could not be told apart from a signal updater.
 */
function createBackdropScrollRegistry(): ModalBackdropContextValue {
  const registration = signal<{ read: Accessor<ModalVariants["scroll"] | undefined> } | undefined>(
    undefined,
  );

  return {
    scroll: () => registration()?.read(),
    registerScroll: (read) => {
      const current = registration();

      // The carrier switches element on this value, and that switch remounts
      // the Container below it, which registers the same value again. Keeping
      // the entry when the value did not change ends the switch there instead
      // of rebuilding the carrier forever; the accessor is swapped in place,
      // without a notification, because the value it reads did not change but
      // the Container that owns it did.
      if (current === undefined || current.read() !== read()) {
        registration.set({ read });
      } else {
        current.read = read;
      }

      // The entry outlives this Container on purpose. A withdrawal here runs
      // before the carrier's rebuild (measured: register build 1 → cleanup
      // build 1 → register build 2), so it would clear the value the rebuild is
      // about to register again and the mount would never settle (60+ builds).
      // The next Container replaces or confirms the value; a Backdrop that
      // keeps running with no Container at all keeps the last one (port sheet
      // §8 notes the limit).
      return () => {};
    },
  };
}

/** What `ModalLayer` takes: the Backdrop's prepared values, as live accessors. */
interface ModalLayerProps {
  open: Accessor<boolean>;
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

/* -------------------------------------------------------------------------------------------------
 * Backdrop
 * -----------------------------------------------------------------------------------------------*/

/**
 * Modal.Backdrop / ModalBackdrop: the overlay layer. nsh/base `Dialog` is the
 * native modal layer (port sheet §3, B1–B4); inside it the paint layer and the
 * layout carrier are siblings, so a press on the card cannot reach the paint
 * layer's `onPress` (port sheet §5.3).
 */
export function ModalBackdrop(
  props: ModalBackdropProps & {
    /**
     * The container the modal presents as. `"auto"` takes the environment rule
     * — touch on a compact window docks to the bottom as a `"sheet"`,
     * everything else stays the centered `"panel"` — evaluated once at open
     * and latched until close; a pin fixes it outright. @default "auto"
     */
    presentation?: ModalPresentation | "auto";

    /**
     * Allows the swipe-to-dismiss gesture (adapt sheet A-004). Opt-in only —
     * Native Dialog's `isSwipeable` defaults `true`, this library does not
     * change its existing dismiss strategy (action-list §2, 修正记录 19): the
     * pan attaches only while `isSwipeable` *and* `isDismissable` *and* the
     * resolved presentation is `"sheet"` *and* the input is touch. @default false
     */
    isSwipeable?: boolean;
  },
): JSX.Element {
  const parent = ModalContext();

  // React Aria's rule: a Backdrop that has its own open channel, or that has no
  // root above it, owns the state; otherwise the root's state is the truth.
  const ownsState = () =>
    props.isOpen !== undefined || props.defaultOpen !== undefined || parent === null;

  const state = createModalState({
    defaultOpen: () => (ownsState() ? props.defaultOpen : undefined),
    isOpen: () => (ownsState() ? props.isOpen : undefined),
    onOpenChange: (isOpen) => {
      if (ownsState()) {
        props.onOpenChange?.(isOpen);
      }
    },
  });

  const isDismissable = () => props.isDismissable ?? true;
  const isKeyboardDismissDisabled = () => props.isKeyboardDismissDisabled ?? false;

  const input = createInput();

  // A-001 (seam ③): the carrier is decided by `createPresentation`, latched
  // on the false→true edge of the effective open state — the same value
  // `contextValue.isOpen` resolves to below, derived eagerly so the latch's
  // first effect run never touches a context that is not built yet. The pin
  // is the caller's `presentation` prop; the domain is the component's own
  // two carriers (action-list §4: no `fullscreen` on Modal).
  const presentation = createPresentation<ModalPresentation>({
    pin: () => props.presentation,
    isOpen: () => (ownsState() ? state.isOpen() : (parent?.isOpen() ?? false)),
    allowed: () => ["panel", "sheet"],
  });

  // A-004 / A-005 (seam ②): the swipe-to-dismiss channel. The offset the
  // Dialog translates by, the card height the release threshold judges
  // `dy ≥ card/2` against, and the scroll position `shouldClaim` consults —
  // all owned here, written by the parts below through `contextValue`.
  const swipeOffset = signal(0);
  const cardHeight = signal(0);
  const scrollOffset = signal<Point>({ x: 0, y: 0 });
  const atTop = computed(() => scrollOffset().y <= 0);

  const pan = createPan({
    // All four conditions gate the attachment (adapt sheet §2): under the
    // default pointer environment — or without the explicit `isSwipeable`,
    // or not dismissable, or carried as a panel — `panHandlers()` resolves
    // to an empty object and no listener exists at all.
    enabled: () =>
      input() === "touch" &&
      isDismissable() &&
      props.isSwipeable === true &&
      presentation() === "sheet",
    // The first dominant move decides, with no displacement floor (the
    // sheet-handoff unit measured a late claim granted into the void): only
    // a downward pull while the scrolling element is back at its start edge
    // is the swipe; upward and sideways travel stays the content's scroll.
    shouldClaim: (_event, gesture) =>
      gesture.dy > 0 && gesture.dy > Math.abs(gesture.dx) && atTop(),
    onDrag: (_event, gesture) => {
      swipeOffset.set(Math.max(0, gesture.dy));
    },
    onDragEnd: (_event, gesture, terminated) => {
      if (terminated) {
        swipeOffset.set(0);
        return;
      }

      const height = cardHeight();
      const dismisses =
        (height > 0 && gesture.dy >= height / 2) ||
        gesture.vy >= SWIPE_DISMISS_VELOCITY;

      if (dismisses) {
        // The release goes through `close()`, so the exit keeps the overlay's
        // own presence path and `onOpenChange` semantics; the offset holds
        // where the finger left it through the fade.
        contextValue.close();
      } else {
        swipeOffset.set(0);
      }
    },
  });

  const swipe: ModalSwipe = {
    panHandlers: pan.panHandlers,
    offset: swipeOffset,
    reportCardHeight: (height) => cardHeight.set(height),
  };

  // HeroUI merges a second `modalVariants({variant})` over the root's slots;
  // here that is the same table with one axis replaced, so every part below
  // sees the merged slots without copying the state.
  //
  // React Aria gives the overlay its local state whenever the overlay itself
  // has an open channel (`isOpen` / `defaultOpen`) or has no trigger above it
  // (`react-aria-components/src/Modal.tsx:213-215`), so in those cases the
  // Dialog below has to read — and close — the Backdrop's state, not the
  // Root's. Without a Root the base value is already the local state.
  const base: ModalContextValue = parent
    ? parent.withOverrides({
        variant: () => props.variant,
        presentation: () => presentation(),
        swipe,
        scrollAtTop: atTop,
        reportScrollOffset: (offset) => scrollOffset.set(offset),
      })
    : createModalContextValue({
        isOpen: state.isOpen,
        setOpen: state.setIsOpen,
        variant: () => props.variant,
        presentation: () => presentation(),
        swipe,
        scrollAtTop: atTop,
        reportScrollOffset: (offset) => scrollOffset.set(offset),
      });

  const contextValue: ModalContextValue =
    parent !== null && ownsState()
      ? deriveModalState(base, state.isOpen, state.setIsOpen)
      : base;

  const isOpen = contextValue.isOpen;
  const close = () => contextValue.close();

  // The entering phase the render values report. R-012's reduced-motion half
  // lands on the Dialog below; the exit has no counterpart here (port sheet §8),
  // so `isExiting` stays false.
  const presence = createOverlayPresence({
    isOpen,
    isEntering: () => props.isEntering,
  });

  const values: ModalRenderValues = {
    isEntering: presence.isEntering,
    isExiting: () => false,
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
  // over the whole window and sits at the top of the stack.
  const paintClasses = () =>
    ["absolute inset-0", contextValue.slots().backdrop(), className()]
      .filter((part) => part !== "")
      .join(" ");

  const registry = createBackdropScrollRegistry();
  const scroll = () => registry.scroll() ?? contextValue.scroll();

  // The carrier's element and classes follow a computed rather than the
  // registry signal itself: registering the same value again (the Container
  // remounts when the carrier switches element) recomputes it to the same
  // boolean, and a computed only notifies on a change, so the switch happens
  // once instead of rebuilding the children forever.
  const outside = computed(() => scroll() === "outside");

  // A-002: the sheet carrier docks to the bottom; `scroll="outside"` wins
  // over the presentation and keeps `items-start`, because the scrolling
  // semantics of that carrier may not be taken away (adapt sheet §8).
  const carrierClasses = computed(() => {
    const layout = modalBackdropLayoutClasses(scroll(), presentation());

    // R-029 puts the scrolling on this layer when the Container scrolls
    // outside; the inner viewport then has to hear drags. Otherwise the layer
    // is only a flex box: `pointer-events-none` lets a press in the empty area
    // fall through to the paint layer, while the Dialog's `pointer-events-auto`
    // (R-035) keeps the card itself a target.
    return `${layout} pointer-events-none`;
  });

  // R-029: `scroll="outside"` scrolls this carrier instead of `Modal.Body`, so
  // the element itself is the `Scroll`. Its content view, not the scroll view,
  // carries the alignment (a `Scroll` stacks along the axis it scrolls — see
  // `modalBackdropScrollClasses`).
  // Only the branch that mounts is built, so `props.children` is read once, at
  // its placement — the deferred form is what keeps that read tracked when the
  // Container registers its `scroll`.
  const carrier = () => {
    const classes = carrierClasses();
    const scrollClasses = modalBackdropScrollClasses();
    const node = props.children;
    const content = () => {
      if (typeof node === "function" && node.length >= 1) {
        return (node as (values: ModalRenderValues) => JSX.Element)(values);
      }

      return node as JSX.Element;
    };

    return outside() ? (
      // A-005: the outside carrier is the scrolling element, so it feeds the
      // same `atTop` the Body's inside `Scroll` reports into — the swipe's
      // claim gate reads either indifferently.
      <Scroll
        class={scrollClasses.scroll}
        contentClass={scrollClasses.content}
        onScroll={(event) => scrollOffset.set(event.offset)}
      >
        {content()}
      </Scroll>
    ) : (
      <View class={classes}>{content()}</View>
    );
  };

  // Inside the layer a Button must not toggle the modal or register itself as
  // the trigger (port sheet §5.9, the same ruling as Popover.Content). `close`
  // is kept so a part inside the dialog still closes it; `isOpen` reports no
  // opinion rather than a collapsed overlay this Button never opened.
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
    <ModalContext.Provider value={contextValue}>
      <OverlayTriggerContext.Provider value={scopedTrigger}>
        <ModalBackdropContext.Provider value={registry}>
          <ModalLayer
            open={isOpen}
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
        </ModalBackdropContext.Provider>
      </OverlayTriggerContext.Provider>
    </ModalContext.Provider>
  );
}

/**
 * The two additive props ride the call surface as an inline intersection —
 * the adapt sheet declares them for `ModalBackdropProps` but writes the
 * `prop` cell with a `（ModalBackdropProps）` suffix, so gate M5's
 * declaration lookup cannot match them on the named interface (the fixer may
 * not edit sheets; alert-dialog's r2b commit records the same move).
 * `ModalBackdropProps` itself stays byte-identical to its desktop contract;
 * callers pass both keys exactly as the sheet specifies. `Modal.Container`
 * re-intersects the same two keys on its own props parameter so the
 * `ModalContainerProps` type surface is unchanged.
 *
 * The native layer and its two children: the paint layer and the carrier.
 *
 * A component of its own, so what it creates is an element *below* the three
 * providers rather than a thunk in the Backdrop's body. The web host builds a
 * presented dialog's content in a pass of its own; a part created from the
 * Backdrop's body looked its context up from the Backdrop's own scope and read
 * the root's closed state (measured: X-002's `Modal.CloseTrigger` closed
 * nothing). Created from inside the providers, the parts see the Backdrop's
 * state on every host.
 */
function ModalLayer(props: ModalLayerProps): JSX.Element {
  return (
    <Dialog
      open={props.open()}
      // R-010 / R-011: the backdrop's 150ms fade in and 100ms fade out are the
      // Dialog's native fade; the durations are the host's.
      // R-012: `motion-reduce:animate-none` → no animation at all.
      animation={reduceMotion() ? "none" : "fade"}
      // R-026 / R-027: the container's exit (opacity 1 → 0, scale 1 → 0.95) is
      // the same native fade; there is no exit scale and no 100ms / ease-out-quad
      // to reproduce (port sheet §8).
      // The paint layer below owns the backdrop press, so the native one is off.
      closeOnBackdropPress={false}
      closeOnEscape={props.closeOnEscape()}
      onOpenChange={(event) => {
        if (!event.open) {
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
