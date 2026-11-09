import type {
  Accessor,
  Bounds,
  JSX,
  OverlayPosition,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, effect, Overlay, signal } from "nsh";

import { createControllableBooleanSignal } from "../../primitives/create-controllable-signal";
import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import type { OverlayTriggerContextValue } from "../../primitives/create-overlay-trigger";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { renderChildren } from "./children";
import type { PopoverContextValue, PopoverPositionContextValue } from "./popover-context";
import {
  PopoverContext,
  PopoverContentContext,
  PopoverPositionContext,
} from "./popover-context";
import type { PopoverPlacement, PopoverSide } from "./popover-placement";
import {
  popoverPlacementString,
  resolvePopoverPlacement,
} from "./popover-placement";
import { popoverVariants } from "./popover.styles";

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/

// Inline owners for the two transition properties NSH has no single class for:
// the property list (every phase) and the shorter exit duration (R-010). `as
// const` keeps the literal types `ViewStyle` accepts.
const TRANSITION_STYLE = { transitionProperty: "opacity, transform" } as const;
const EXIT_DURATION_STYLE = { transitionDuration: "100ms" } as const;

/** The live state HeroUI hands to `Content`'s `className` and `style` functions. */
export interface PopoverRenderValues {
  /** The trigger that opened it (`"DialogTrigger"` unless the caller says otherwise). */
  trigger: Accessor<string>;
  /** The resolved React Aria placement string. */
  placement: Accessor<PopoverPlacement>;
  isEntering: Accessor<boolean>;
  isExiting: Accessor<boolean>;
}

export interface PopoverContentProps {
  /** Read once, inside the overlay's providers, at the placement. */
  children: JSX.Element;

  /** Appended after the base slot classes; later classes win. */
  className?: string | ((values: PopoverRenderValues) => string);
  style?: StyleProp<ViewStyle> | ((values: PopoverRenderValues) => StyleProp<ViewStyle>);

  /** The overlay view; `focus()` and `measure()` reach it. */
  ref?: (node: ViewRef) => void;

  /** React Aria placement (default `"bottom"`); mapped per port sheet §5.6. */
  placement?: PopoverPlacement;

  /** The gap between anchor and overlay (default 8). */
  offset?: number;

  /** The safe-area margin (default 12; React Aria's `containerPadding`). */
  containerPadding?: number;

  /** Accepted, no effect: the core Overlay has no separate cross-axis offset. */
  crossOffset?: number;

  /** Accepted, no effect: the core Overlay always flips when the other side fits. */
  shouldFlip?: boolean;

  /** The content's own open state (overrides the root's, as in React Aria). */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;

  /** Modal by default, as in React Aria; `true` removes the backdrop and the focus move. */
  isNonModal?: boolean;

  /** When `true`, Escape does not close (the `onCancel` channel still fires). */
  isKeyboardDismissDisabled?: boolean;

  /** Accepted, no effect: NSH has no element object to hand to the predicate. */
  shouldCloseOnInteractOutside?: (element: unknown) => boolean;

  /** Forces the enter state (custom animations). */
  isEntering?: boolean;

  /** Forces the exit state and keeps the content mounted. */
  isExiting?: boolean;

  /** Skips the enter and exit phases entirely. */
  shouldSkipAnimation?: boolean;

  /** The name of the trigger, for render values (default `"DialogTrigger"`). */
  trigger?: string;

  /** A standalone Content can be anchored to a trigger ref directly. */
  triggerRef?: ViewRef | null;

  /** Accepted, no effect: the overlay renders in its own root view. */
  UNSTABLE_portalContainer?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;

  /** Maps to `accessibilityLabel`; the container has no dialog role (§5.8). */
  "aria-label"?: string;
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH resolves no accessible names from ids. */
  "aria-labelledby"?: string;
  /** Accepted, no effect: NSH resolves no descriptions from ids. */
  "aria-describedby"?: string;
  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
  /** Accepted, no effect: layout direction comes from the host's `ltr:` / `rtl:` variants. */
  dir?: "ltr" | "rtl";
  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  /**
   * Accepted, no effect: NSH has no focus-within event channel (`focus-within:`
   * styles exist, the callbacks do not); see port sheet §5.7.
   */
  onFocusWithin?: () => void;
  onBlurWithin?: () => void;
  onFocusWithinChange?: (isFocusWithin: boolean) => void;
}

/**
 * Popover.Content / PopoverContent: HeroUI's `PopoverPrimitive`. Built on the
 * core `Overlay` (port sheet §3 B1–B4), with the presence and exit hold from
 * `createOverlayPresence` and the modal underlay RAC draws itself.
 */
export function PopoverContent(props: PopoverContentProps) {
  const rootTrigger = OverlayTriggerContext();
  const popover = PopoverContext();

  const slots = popover?.slots ?? popoverVariants();

  /* -------------------------------------------------------------------------------------------
   * Open state: React Aria's rule, a Content that gets its own isOpen /
   * defaultOpen (or has no trigger state at all) controls itself.
   * ----------------------------------------------------------------------------------------- */
  const ownsState = () =>
    props.isOpen !== undefined || props.defaultOpen !== undefined || !rootTrigger;

  const [ownIsOpen, setOwnIsOpen] = createControllableBooleanSignal({
    value: () => (ownsState() ? props.isOpen : undefined),
    defaultValue: () => (ownsState() ? props.defaultOpen : undefined),
    onChange: (value) => {
      if (ownsState()) {
        props.onOpenChange?.(value);
      }
    },
  });

  const isOpen = computed(() =>
    ownsState() ? ownIsOpen() : (rootTrigger?.isOpen() ?? false),
  );

  const setOpen = (next: boolean) => {
    if (ownsState()) {
      setOwnIsOpen(next);
    } else {
      rootTrigger?.setIsOpen(next);
    }
  };

  const close = () => setOpen(false);

  const isNonModal = () => props.isNonModal ?? false;
  const isKeyboardDismissDisabled = () => props.isKeyboardDismissDisabled ?? false;

  /* -------------------------------------------------------------------------------------------
   * Presence, placement and geometry.
   * ----------------------------------------------------------------------------------------- */
  const presence = createOverlayPresence({
    isOpen,
    durationMs: () => 100,
    skip: () => props.shouldSkipAnimation,
    isEntering: () => props.isEntering,
    isExiting: () => props.isExiting,
  });

  const resolved = computed(() => resolvePopoverPlacement(props.placement));
  const positionedSide = signal<PopoverSide | undefined>(undefined);

  const side = computed(() => positionedSide() ?? resolved().side);
  const placement = computed(() => popoverPlacementString(side(), resolved().align));

  const anchorBounds = signal<Bounds | undefined>(undefined);
  const overlayBounds = signal<Bounds | undefined>(undefined);

  const anchor = () => props.triggerRef ?? rootTrigger?.triggerRef();

  const measureAnchor = () => {
    const trigger = anchor();

    if (!trigger) {
      return;
    }

    void trigger.measure().then((measured) => {
      if (measured) {
        anchorBounds.set({ origin: measured.pagePosition, size: measured.bounds.size });
      }
    });
  };

  effect(() => {
    const open = isOpen();

    if (!open) {
      return;
    }

    measureAnchor();
  });

  const handlePosition = (event: OverlayPosition) => {
    positionedSide.set(event.placement);
    overlayBounds.set(event.bounds);
    measureAnchor();
  };

  const transformOrigin = () => {
    const anchorBox = anchorBounds();
    const overlayBox = overlayBounds();

    if (!anchorBox || !overlayBox) {
      return undefined;
    }

    const x = anchorBox.origin.x + anchorBox.size.width / 2 - overlayBox.origin.x;
    const y = anchorBox.origin.y + anchorBox.size.height / 2 - overlayBox.origin.y;

    return `${x}px ${y}px`;
  };

  /* -------------------------------------------------------------------------------------------
   * Focus: RAC focuses the popover itself on open unless it is non-modal
   * (`react-aria-components/src/Popover.tsx`), and restores the trigger on
   * close (the root's `createOverlayTrigger` does that part). NSH has no focus
   * channel on the content root, so the Dialog part registers itself here.
   * ----------------------------------------------------------------------------------------- */
  const dialogRef = signal<ViewRef | undefined>(undefined);
  let focusedForOpen = false;

  effect(() => {
    const open = isOpen();
    const dialog = dialogRef();

    if (!open) {
      focusedForOpen = false;

      return;
    }

    if (focusedForOpen || dialog === undefined || isNonModal()) {
      return;
    }

    dialog.focus();
    focusedForOpen = true;
  });

  const contentContextValue = {
    registerDialog: (ref: ViewRef) => {
      dialogRef.set(ref);

      return () => {
        if (dialogRef() === ref) {
          dialogRef.set(undefined);
        }
      };
    },
  };

  /* -------------------------------------------------------------------------------------------
   * Scoped trigger context (controller ruling): inside the content a Button
   * must not toggle the popover or steal the anchor; the Dialog still closes.
   * ----------------------------------------------------------------------------------------- */
  const scopedTrigger: OverlayTriggerContextValue = {
    isOpen: () => false,
    setIsOpen: () => {},
    toggle: () => {},
    close: () => close(),
    registerTrigger: () => () => {},
    triggerRef: () => undefined,
  };

  /* -------------------------------------------------------------------------------------------
   * Render values, classes and styles.
   * ----------------------------------------------------------------------------------------- */
  const values: PopoverRenderValues = {
    trigger: () => props.trigger ?? "DialogTrigger",
    placement,
    isEntering: presence.isEntering,
    isExiting: presence.isExiting,
  };

  const className = () => {
    const value = props.className;

    return (typeof value === "function" ? value(values) : value) ?? "";
  };

  const resolvedStyle = () => {
    const value = props.style;

    return typeof value === "function" ? value(values) : value;
  };

  const classes = () =>
    [slots.base(), className()].filter((part) => part !== "").join(" ");

  // R-005 / R-010: the entering start classes come off one frame after mount;
  // the exit classes stay for the 100ms hold. R-006 … R-009 add the placement
  // translation. The property list is inline (Button's solved pattern) so the
  // duration stays on the base class while the starting classes come off.
  const classList = computed(() => {
    const list: Record<string, boolean> = {};
    const current = side();

    if (presence.isEntering()) {
      list["opacity-0 scale-90"] = true;

      if (current === "top") {
        list["translate-y-1"] = true;
      } else if (current === "bottom") {
        list["-translate-y-1"] = true;
      } else if (current === "left") {
        list["translate-x-1"] = true;
      } else {
        list["-translate-x-1"] = true;
      }
    }

    if (presence.isExiting()) {
      list["opacity-0 scale-95 pointer-events-none"] = true;
    }

    return list;
  });

  const style = () => [
    TRANSITION_STYLE,
    // R-010: the exit is 100ms while the base class keeps 150ms for the enter.
    presence.isExiting() ? EXIT_DURATION_STYLE : undefined,
    { transformOrigin: transformOrigin() },
    resolvedStyle(),
  ];

  const positionContext: PopoverPositionContextValue = {
    anchorBounds,
    overlayBounds,
    side,
    placement,
  };

  const handleCancel = () => {
    if (!isKeyboardDismissDisabled()) {
      close();
    }
  };

  return (
    <>
      {/* Modal underlay: the second overlay that absorbs presses, as RAC's
          `usePopover` underlay and the core Overlay docs describe. */}
      <If when={!isNonModal() && presence.isPresent()}>
        <Overlay class="inset-0" focusable={false} onPress={close} />
      </If>

      <If when={presence.isPresent()}>
        <Overlay
          ref={props.ref}
          anchor={anchor() ?? null}
          placement={resolved().side}
          align={resolved().align}
          offset={props.offset ?? 8}
          margin={props.containerPadding ?? 12}
          testID={props.testID}
          nativeID={props.id ?? props.nativeID}
          accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
          class={classes()}
          classList={classList()}
          style={style()}
          onPressOutside={close}
          onCancel={handleCancel}
          onPosition={handlePosition}
        >
          <OverlayTriggerContext.Provider value={scopedTrigger}>
            <PopoverContentContext.Provider value={contentContextValue}>
              <PopoverPositionContext.Provider value={positionContext}>
                {renderChildren(props.children)}
              </PopoverPositionContext.Provider>
            </PopoverContentContext.Provider>
          </OverlayTriggerContext.Provider>
        </Overlay>
      </If>
    </>
  );
}
