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
import { createPresentation } from "../../primitives/presentation";
import { SheetBody } from "../sheet/sheet-body";
import { SheetContent } from "../sheet/sheet-content";
import { SheetBackdrop } from "../sheet/sheet-backdrop";
import { SheetRoot } from "../sheet/sheet-root";
import { renderChildren } from "./children";
import type { PopoverContextValue, PopoverPositionContextValue } from "./popover-context";
import {
  PopoverContext,
  PopoverContentContext,
  PopoverPositionContext,
} from "./popover-context";
import type { PopoverPlacement, PopoverSide } from "./popover-placement";
import { resolvePopoverPlacement } from "./popover-placement";
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
  /**
   * The component that opened the content, React Aria's
   * `PopoverRenderProps.trigger`: `"DialogTrigger"` under a root, `null` for a
   * standalone Content unless the caller names one.
   */
  trigger: Accessor<string | null>;
  /**
   * React Aria's `PlacementAxis`: the side the overlay ended up on, `null`
   * until the core Overlay has positioned it (`react-aria-components/src/
   * Popover.tsx`, `PopoverRenderProps`).
   */
  placement: Accessor<PopoverSide | null>;
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

  /**
   * The container the content presents as (A-001). `"auto"` runs the shared
   * `createPresentation` rule — touch plus a compact short side picks
   * `"sheet"`, everything else `"panel"`. `"panel"` is the anchored overlay
   * upstream calls `'popover'`; `"sheet"` is the `Sheet` carrier upstream
   * calls `'bottom-sheet'` (action-list §4). The domain is narrowed to these
   * two states because the upstream discriminated union knows only
   * `popover`/`bottom-sheet` — `"fullscreen"` is not a member.
   */
  presentation?: "auto" | "panel" | "sheet";

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

  /* -------------------------------------------------------------------------------------------
   * Presentation: the carrier the open content takes (A-002). The value is
   * evaluated once on `isOpen`'s false→true edge and latched until close, so
   * a rotation or a scope change can never swap the container mid-open.
   *
   * `isNonModal` folds into the pin: a non-modal popover has no sheet
   * semantics (upstream's bottom-sheet is always modal), so under `"auto"`
   * it resolves to `"panel"` — while an explicit `presentation="sheet"`
   * still pins, the caller's stated intent winning over the derived rule
   * (the conservative ruling the sheet §6 margin note records).
   * ----------------------------------------------------------------------------------------- */
  const presentation = createPresentation<"panel" | "sheet">({
    pin: () =>
      isNonModal() && (props.presentation === undefined || props.presentation === "auto")
        ? "panel"
        : props.presentation,
    isOpen,
    allowed: () => ["panel", "sheet"],
  });

  const resolved = computed(() => resolvePopoverPlacement(props.placement));
  const positionedSide = signal<PopoverSide | undefined>(undefined);

  const side = computed(() => positionedSide() ?? resolved().side);

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
  const dialogFocused = signal(false);
  let focusedForOpen = false;

  // The carrier that owns the native overlay window: the panel's content
  // `Overlay` or the sheet's `SheetContent`. Focusing the Dialog alone leaves
  // the window unfocused on Android, so its nested pressables never join the
  // native registry (run 45565096745: `pop-close` had no native view even
  // after the Dialog focus attempts).
  let carrierNode: ViewRef | undefined;
  const handleCarrierRef = (node: ViewRef) => {
    carrierNode = node;
    props.ref?.(node);
  };

  effect(() => {
    const open = isOpen();
    const dialog = dialogRef();

    if (!open) {
      focusedForOpen = false;
      dialogFocused.set(false);

      return;
    }

    if (focusedForOpen || dialog === undefined || isNonModal()) {
      return;
    }

    focusedForOpen = true;
    dialogFocused.set(false);

    // Try the opening commit first: Android's manual-clock runs can go quiet
    // before a deferred frame, leaving the dialog unfocused and its nested
    // pressables out of the native registry (run 45562711636: M-008/M-009's
    // close had no native view while the panel was up). A real Windows window
    // registers the dialog after the opening commit, so the same call is a
    // no-op there; the deferred retry below remains that host's path (T-014).
    // The carrier goes first: it owns the native window, and the Dialog's
    // focus cannot register the content until that window is key.
    carrierNode?.focus();
    dialog.focus();

    let frame = requestAnimationFrame(() => {
      if (dialogFocused()) {
        return;
      }

      carrierNode?.focus();
      dialog.focus();

      frame = requestAnimationFrame(() => {
        if (!dialogFocused()) {
          carrierNode?.focus();
          dialog.focus();
        }
      });
    });

    return () => cancelAnimationFrame(frame);
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
    markDialogFocused: () => dialogFocused.set(true),
  };

  /* -------------------------------------------------------------------------------------------
   * Scoped trigger context (controller ruling): inside the content a Button
   * must not toggle the popover or steal the anchor; the Dialog still closes.
   * `isOpen` reports "no opinion" (`undefined`) rather than `false`, so an
   * inner Button keeps its own `aria-expanded` instead of being forced to
   * report a collapsed popover it is not the trigger of. React Aria's
   * `Popover` clears its `PopoverContext` for the same reason
   * (`react-aria-components/src/Popover.tsx`, the `clearContexts` loop).
   * ----------------------------------------------------------------------------------------- */
  const scopedTrigger: OverlayTriggerContextValue = {
    isOpen: () => undefined,
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
    trigger: () => props.trigger ?? popover?.trigger ?? null,
    placement: () => positionedSide() ?? null,
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
  // the exit classes stay for the 100ms hold. The per-side translation start
  // classes are the classList forms of R-006 … R-009 below. The property list
  // is inline (Button's solved pattern) so the duration stays on the base
  // class while the starting classes come off.
  const classList = computed(() => {
    const list: Record<string, boolean> = {};
    const current = side();

    if (presence.isEntering()) {
      list["opacity-0 scale-90"] = true;

      if (current === "top") {
        // R-006: enter from below, up into place.
        list["translate-y-1"] = true;
      } else if (current === "bottom") {
        // R-007: enter from above, down into place.
        list["-translate-y-1"] = true;
      } else if (current === "left") {
        // R-008: enter from the right, leftwards into place.
        list["translate-x-1"] = true;
      } else {
        // R-009: enter from the left, rightwards into place.
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
    placement: () => positionedSide() ?? null,
  };

  const handleCancel = () => {
    if (!isKeyboardDismissDisabled()) {
      close();
    }
  };

  // The underlay only hit-tests while the popover is open; during the exit hold
  // it stays mounted around the content but lets the trigger take the press.
  const underlayClassList = computed(() => ({ "pointer-events-none": !isOpen() }));

  // A-003/A-004/A-010: the carrier probe. Each branch derives its `testID`
  // from the caller's — `<id>-panel` on the anchored overlay, `<id>-sheet`
  // on the Sheet panel — so `app.shows`/`count` can tell which carrier the
  // resolved presentation mounted (the `arrow` part's `<id>-default`
  // convention; the fixture passes `testID="pop"` so the probes read
  // `id:pop-panel` / `id:pop-sheet`). `nativeID` keeps its verbatim mapping.
  const panelTestID = () => (props.testID !== undefined ? `${props.testID}-panel` : undefined);
  const sheetTestID = () => (props.testID !== undefined ? `${props.testID}-sheet` : undefined);

  // One read of `props.children`, at its placement inside the carrier.
  const contentOverlay = (
    <Overlay
      ref={handleCarrierRef}
      anchor={anchor() ?? null}
      placement={resolved().side}
      align={resolved().align}
      offset={props.offset ?? 8}
      margin={props.containerPadding ?? 12}
      testID={panelTestID()}
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
  );

  // A-003: the panel branch is the pre-existing render chain, verbatim — the
  // modal underlay plus the anchored content overlay. `"panel"` *is* the
  // upstream popover, so nothing about its structure changes.
  const panelBranch = (
    <If when={!isNonModal()} else={contentOverlay}>
      {/* Modal underlay: the second overlay that absorbs presses, as RAC's
          `usePopover` underlay and the core Overlay docs describe. It has to be
          the outer overlay, with the content overlay nested inside it: two
          sibling overlays both claim the press on the web target, where the
          earlier full-screen one wins the hit test, so the content would never
          see a press. While the popover closes, the underlay ignores pointer
          events (X-003: the trigger is reachable during the exit hold) and its
          `onPress` is dead with it. The content stays mounted for the hold and
          is gone with the underlay afterwards. */}
      <Overlay
        class="inset-0"
        classList={underlayClassList()}
        focusable={false}
        onPress={() => {
          if (isOpen()) {
            close();
          }
        }}
      >
        {contentOverlay}
      </Overlay>
    </If>
  );

  return (
    <If when={presence.isPresent()}>
      {/* A-004: the sheet carrier composes the existing Sheet parts. The
          popover keeps owning the open state — `SheetRoot` is a controlled
          shell fed `isOpen`, and its `onOpenChange` writes back through the
          same `setOpen` the underlay and Escape take (M-006's channel).
          `SheetBackdrop`'s dismissable paint layer replaces the underlay;
          `SheetContent` carries the popover's own look (`slots.base()` plus
          the caller's class/style, the `aria-label` and the id/testID); and
          `SheetBody` is the scroll container the children land in, the
          upstream `contentContainer` counterpart (§8). `props.isExiting`
          reaches the backdrop so the retained-mount contract holds on this
          carrier too, and `isKeyboardDismissDisabled` goes with it so the
          contract prop gates Escape on the sheet carrier exactly as
          `handleCancel` gates it on the panel chain (§1 baseline — the
          prop keeps its documented effect under `presentation="sheet"`). */}
      <If when={presentation() === "sheet"} else={panelBranch}>
        <SheetRoot isOpen={isOpen()} onOpenChange={setOpen}>
          <SheetBackdrop
            isExiting={props.isExiting}
            isKeyboardDismissDisabled={isKeyboardDismissDisabled()}
          >
            <SheetContent
              ref={handleCarrierRef}
              testID={sheetTestID()}
              nativeID={props.id ?? props.nativeID}
              accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
              className={classes()}
              style={resolvedStyle()}
            >
              {/* `SheetRoot` provides its own `OverlayTriggerContext`, which
                  would shadow this popover's: a `Popover.Dialog` written in
                  the content would then close the sheet's channel, silently
                  losing the popover's close, and a Button inside would pose
                  as the sheet's trigger. Re-supplying `scopedTrigger` keeps
                  the same contract the panel branch gives its children —
                  `close` still reaches this content's `setOpen`, `isOpen`
                  still reports "no opinion". `PopoverPositionContext` is
                  deliberately not re-provided: a sheet has no anchor
                  geometry, so an `Arrow` written inside falls back to its
                  `DEFAULT_POSITION` (A-007). */}
              <OverlayTriggerContext.Provider value={scopedTrigger}>
                <PopoverContentContext.Provider value={contentContextValue}>
                  <SheetBody>{renderChildren(props.children)}</SheetBody>
                </PopoverContentContext.Provider>
              </OverlayTriggerContext.Provider>
            </SheetContent>
          </SheetBackdrop>
        </SheetRoot>
      </If>
    </If>
  );
}
