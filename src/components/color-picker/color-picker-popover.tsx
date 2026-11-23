import type {
  Bounds,
  JSX,
  OverlayPosition,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, effect, Overlay, signal, split } from "nsh";

import { createControllableBooleanSignal } from "../../primitives/create-controllable-signal";
import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import type { OverlayTriggerContextValue } from "../../primitives/create-overlay-trigger";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { createPresentation } from "../../primitives/presentation";
import { renderChildren } from "../popover/children";
import type {
  PopoverContentContextValue,
  PopoverPositionContextValue,
} from "../popover/popover-context";
import {
  PopoverContentContext,
  PopoverContext,
  PopoverPositionContext,
} from "../popover/popover-context";
import type { PopoverPlacement, PopoverSide } from "../popover/popover-placement";
import { resolvePopoverPlacement } from "../popover/popover-placement";
import type { PopoverRenderValues } from "../popover";
import { SheetBackdrop } from "../sheet/sheet-backdrop";
import { SheetBody } from "../sheet/sheet-body";
import { SheetContent } from "../sheet/sheet-content";
import { SheetRoot } from "../sheet/sheet-root";
import { SurfaceContext } from "../surface";
import { joinClassNames } from "./class-names";
import { ColorPickerContext } from "./color-picker-context";
import { colorPickerVariants } from "./color-picker.styles";
import type { AriaProps, DataProps, GlobalDomProps } from "./dom-props";

/* -------------------------------------------------------------------------------------------------
 * Popover
 * -----------------------------------------------------------------------------------------------*/

// Inline owners for the two transition properties NSH has no single class
// for (R-010/R-011, PopoverContent's constants): the property list, and the
// shorter exit duration. `as const` keeps the literal types `ViewStyle`
// accepts.
const TRANSITION_STYLE = { transitionProperty: "opacity, transform" } as const;
const EXIT_DURATION_STYLE = { transitionDuration: "100ms" } as const;

/**
 * The props of `ColorPicker.Popover`: HeroUI 3.2.7's `ColorPickerPopoverProps`,
 * which is React Aria Components' `Popover` minus `children` plus a required
 * children prop. `placement` defaults to `"bottom left"` upstream, as here.
 */
export interface ColorPickerPopoverProps
  extends AriaProps,
    DataProps,
    GlobalDomProps {
  /** The popover's content: any color parts, the swatch picker included. */
  children: JSX.Element;

  /** Appended after the `popover` slot class; a function receives the render values. */
  className?: string | ((values: PopoverRenderValues) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: PopoverRenderValues) => StyleProp<ViewStyle>);

  /** The overlay view; `focus()` and `measure()` reach it. */
  ref?: (node: ViewRef) => void;

  /** React Aria placement (default `"bottom left"`). */
  placement?: PopoverPlacement;

  /** The content's own open state; given, it overrides the root's (RAC semantics). */
  isOpen?: boolean;

  defaultOpen?: boolean;

  onOpenChange?: (isOpen: boolean) => void;

  /** The gap between the trigger and the popover (default 8). */
  offset?: number;

  /** The safe-area margin (default 12; React Aria's `containerPadding`). */
  containerPadding?: number;

  /** Accepted, no effect: the core Overlay has no separate cross-axis offset. */
  crossOffset?: number;

  /** Accepted, no effect: the core Overlay always flips when the other side fits. */
  shouldFlip?: boolean;

  /** Removes the underlay and the focus move. */
  isNonModal?: boolean;

  /** When `true`, Escape does not close. */
  isKeyboardDismissDisabled?: boolean;

  /**
   * The container the layer presents as (A-001). `"auto"` runs the shared
   * `createPresentation` rule — touch plus a compact short side picks
   * `"sheet"`, everything else `"panel"`. `"panel"` is the anchored overlay
   * this part has always been; `"sheet"` is the `Sheet` carrier. The domain
   * narrows to the two carriers this overlay supports, following the
   * Popover/Menu two-state convention (`fullscreen` / `"dialog"` are not in
   * the domain).
   * @default "auto"
   */
  presentation?: "auto" | "panel" | "sheet";

  /** Accepted, no effect: NSH has no element object to hand to the predicate. */
  shouldCloseOnInteractOutside?: (element: unknown) => boolean;

  /** Forces the exit state; the presence computes it otherwise (port sheet §1.2). */
  isExiting?: boolean;

  /** Forces the enter state (a custom enter animation). */
  isEntering?: boolean;

  /** Skips the enter and exit phases. */
  shouldSkipAnimation?: boolean;

  /** Accepted, no effect: the overlay renders in its own root view. */
  UNSTABLE_portalContainer?: unknown;

  /** Accepted, no effect: the core Overlay positions against the registered trigger. */
  boundaryElement?: unknown;

  /** Accepted, no effect: NSH's overlay has no max-height clamp. */
  maxHeight?: number;

  /** Accepted, no effect: NSH has no overlay arrow size. */
  arrowSize?: number;

  /** A standalone popover can be anchored to a trigger ref directly. */
  triggerRef?: ViewRef | null;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  nativeID?: string;

  testID?: string;

  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

/**
 * ColorPicker.Popover / ColorPickerPopover: the `color-picker__popover` slot
 * layer inside a default `Surface`, as upstream.
 *
 * A-002 (adapt sheet §2): the presentation pipeline lands here. `PopoverContent`
 * does not yet carry the `presentation` channel on this branch — its adapt is
 * an unmerged sibling unit (sheet §5) — so this part builds the two carriers
 * the way the date-picker unit's A-003/A-004 precedent does: the panel branch
 * is PopoverContent's own chain verbatim (modal underlay + anchored content
 * overlay + presence + focus-on-open + scoped trigger context), and the sheet
 * branch composes the existing Sheet parts around a controlled `SheetRoot`.
 * When popover's presentation merge lands, the carrier mechanics consolidate
 * there (§5 records the dependency); the contract this file exposes is the
 * same either way.
 *
 * R-110 / R-114 … R-118 live in the popover slot (styles file); R-111
 * (transform origin), R-112 (scrollbar) and R-113 (overflow) are deleted there.
 * The animations are the presence's, one owner per property:
 * R-119 enter (150ms `ease-smooth`, `opacity-0 scale-90` start; upstream's
 * keyframe starts at 0.95, registered in port sheet §8), R-120 … R-123 the
 * per-side 4pt translation (chosen from `side()` where upstream used
 * `[data-placement^=…]`), R-124 the 100ms exit hold with `pointer-events-none`.
 */
export function ColorPickerPopover(
  props: ColorPickerPopoverProps,
): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "placement",
    "isOpen",
    "defaultOpen",
    "onOpenChange",
    "offset",
    "containerPadding",
    "crossOffset",
    "shouldFlip",
    "isNonModal",
    "isKeyboardDismissDisabled",
    "presentation",
    "shouldCloseOnInteractOutside",
    "isExiting",
    "isEntering",
    "shouldSkipAnimation",
    "UNSTABLE_portalContainer",
    "boundaryElement",
    "maxHeight",
    "arrowSize",
    "triggerRef",
    "id",
    "nativeID",
    "testID",
    "aria-label",
    "render",
    "slot",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  const rootTrigger = OverlayTriggerContext();
  const popover = PopoverContext();

  const slots = ColorPickerContext()?.slots ?? colorPickerVariants();

  /* -------------------------------------------------------------------------------------------
   * Open state: React Aria's rule, a Content that gets its own isOpen /
   * defaultOpen (or has no trigger state at all) controls itself — verbatim
   * PopoverContent semantics, needed here because the presentation latch and
   * the sheet carrier read `isOpen` / write through `setOpen` directly.
   * ----------------------------------------------------------------------------------------- */
  const ownsState = () =>
    local.isOpen !== undefined || local.defaultOpen !== undefined || !rootTrigger;

  const [ownIsOpen, setOwnIsOpen] = createControllableBooleanSignal({
    value: () => (ownsState() ? local.isOpen : undefined),
    defaultValue: () => (ownsState() ? local.defaultOpen : undefined),
    onChange: (value) => {
      if (ownsState()) {
        local.onOpenChange?.(value);
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

  const isNonModal = () => local.isNonModal ?? false;
  const isKeyboardDismissDisabled = () => local.isKeyboardDismissDisabled ?? false;

  /* -------------------------------------------------------------------------------------------
   * Presence, placement and geometry — the panel branch's own machinery,
   * copied from PopoverContent one property per owner (R-119 … R-124 above).
   * ----------------------------------------------------------------------------------------- */
  const presence = createOverlayPresence({
    isOpen,
    durationMs: () => 100,
    skip: () => local.shouldSkipAnimation,
    isEntering: () => local.isEntering,
    isExiting: () => local.isExiting,
  });

  /* -------------------------------------------------------------------------------------------
   * Presentation (A-002): the carrier the open layer takes. The value is
   * evaluated once on `isOpen`'s false→true edge and latched until close, so
   * a rotation or a scope change can never swap the container mid-open.
   *
   * `isNonModal` folds into the pin: a non-modal layer has no sheet
   * semantics (upstream's bottom-sheet is always modal), so under `"auto"`
   * it resolves to `"panel"` — while an explicit `presentation="sheet"`
   * still pins, the caller's stated intent winning over the derived rule
   * (the conservative ruling popover's and date-picker's sheets record).
   * ----------------------------------------------------------------------------------------- */
  const presentation = createPresentation<"panel" | "sheet">({
    pin: () =>
      isNonModal() && (local.presentation === undefined || local.presentation === "auto")
        ? "panel"
        : local.presentation,
    isOpen,
    allowed: () => ["panel", "sheet"],
  });

  const resolved = computed(() =>
    resolvePopoverPlacement(local.placement ?? "bottom left"),
  );
  const positionedSide = signal<PopoverSide | undefined>(undefined);

  const side = computed(() => positionedSide() ?? resolved().side);

  const anchorBounds = signal<Bounds | undefined>(undefined);
  const overlayBounds = signal<Bounds | undefined>(undefined);

  const anchor = () => local.triggerRef ?? rootTrigger?.triggerRef();

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
   * Focus: RAC focuses the popover itself on open unless it is non-modal.
   * NSH has no focus channel on the content root, so a `Popover.Dialog`
   * written inside registers itself here (PopoverContent's chain, verbatim).
   * ----------------------------------------------------------------------------------------- */
  const dialogRef = signal<ViewRef | undefined>(undefined);
  const dialogFocused = signal(false);
  let focusedForOpen = false;

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

    let frame = requestAnimationFrame(() => {
      if (dialogFocused()) {
        return;
      }

      dialog.focus();

      frame = requestAnimationFrame(() => {
        if (!dialogFocused()) {
          dialog.focus();
        }
      });
    });

    return () => cancelAnimationFrame(frame);
  });

  const contentContextValue: PopoverContentContextValue = {
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
   * Scoped trigger context (PopoverContent's ruling): inside the content a
   * Button must not toggle the popover or steal the anchor, and inside the
   * sheet carrier it must not pose as the Sheet's own trigger.
   * `isOpen` reports "no opinion" (`undefined`) rather than `false`, so an
   * inner Button keeps its own `aria-expanded`.
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
    trigger: () => popover?.trigger ?? null,
    placement: () => positionedSide() ?? null,
    isEntering: presence.isEntering,
    isExiting: presence.isExiting,
  };

  const className = (vals: PopoverRenderValues) =>
    joinClassNames(
      slots.popover(),
      typeof local.className === "function"
        ? local.className(vals)
        : local.className,
    );

  const resolvedStyle = (vals: PopoverRenderValues) => {
    const value = local.style;

    return typeof value === "function" ? value(vals) : value;
  };

  // R-119 / R-124: the entering start classes come off one frame after mount;
  // the exit classes stay for the 100ms hold. The per-side translation start
  // classes are the classList forms of R-120 … R-123 below.
  const classList = computed(() => {
    const list: Record<string, boolean> = {};
    const current = side();

    if (presence.isEntering()) {
      list["opacity-0 scale-90"] = true;

      if (current === "top") {
        // R-120: enter from below, up into place.
        list["translate-y-1"] = true;
      } else if (current === "bottom") {
        // R-121: enter from above, down into place.
        list["-translate-y-1"] = true;
      } else if (current === "left") {
        // R-122: enter from the right, leftwards into place.
        list["translate-x-1"] = true;
      } else if (current === "right") {
        // R-123: enter from the left, rightwards into place.
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
    // R-124: the exit is 100ms while the base class keeps 150ms for the enter.
    presence.isExiting() ? EXIT_DURATION_STYLE : undefined,
    { transformOrigin: transformOrigin() },
    resolvedStyle(values),
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

  // A-002: the carrier probes. Each branch derives its `testID` from the
  // caller's — `<id>-panel` on the anchored overlay, `<id>-sheet` on the
  // Sheet panel — so `app.shows`/`count` can tell which carrier the resolved
  // presentation mounted (the popover unit's `<id>-panel` convention).
  const panelTestID = () => (local.testID !== undefined ? `${local.testID}-panel` : undefined);
  const sheetTestID = () => (local.testID !== undefined ? `${local.testID}-sheet` : undefined);

  // HeroUI wraps the popover in a default Surface; nothing consumes the value
  // today (surface.md §5), but it is part of the upstream contract.
  const surface = { variant: () => "default" as const };

  // One read of `props.children`, at the placement inside the carrier.
  const contentOverlay = (
    <Overlay
      ref={(node) => local.ref?.(node)}
      anchor={anchor() ?? null}
      placement={resolved().side}
      align={resolved().align}
      offset={local.offset ?? 8}
      margin={local.containerPadding ?? 12}
      testID={panelTestID()}
      nativeID={local.id ?? local.nativeID}
      accessibilityLabel={local["aria-label"] as string | undefined}
      class={className(values)}
      classList={classList()}
      style={style()}
      onPressOutside={close}
      onCancel={handleCancel}
      onPosition={handlePosition}
    >
      <OverlayTriggerContext.Provider value={scopedTrigger}>
        <PopoverContentContext.Provider value={contentContextValue}>
          <PopoverPositionContext.Provider value={positionContext}>
            {renderChildren(local.children)}
          </PopoverPositionContext.Provider>
        </PopoverContentContext.Provider>
      </OverlayTriggerContext.Provider>
    </Overlay>
  );

  // A-002 panel branch: the pre-existing render chain, verbatim — the modal
  // underlay plus the anchored content overlay `PopoverContent` wrapped for
  // us before. `"panel"` *is* the upstream layer, so nothing about its
  // structure changes.
  const panelBranch = (
    <If when={!isNonModal()} else={contentOverlay}>
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
    <SurfaceContext.Provider value={surface}>
      <If when={presence.isPresent()}>
        {/* A-002 sheet branch: the sheet carrier composes the existing Sheet
            parts. This layer keeps owning the open state — `SheetRoot` is a
            controlled shell fed `isOpen`, and its `onOpenChange` writes back
            through the same `setOpen` the underlay and Escape take.
            `SheetBackdrop`'s dismissable paint layer replaces the underlay;
            `SheetContent` carries the layer's own look (`slots.popover()`
            plus the caller's class/style, the `aria-label` and the
            id/testID); `SheetBody` is the scroll container the children land
            in. `local.isExiting` reaches the backdrop so the retained-mount
            contract holds on this carrier too, and `isKeyboardDismissDisabled`
            goes with it so the contract prop gates Escape on the sheet
            carrier exactly as `handleCancel` gates it on the panel chain.
            The panel-only machinery — anchor geometry, `onPosition`,
            `transformOrigin`, `triggerRef` — is simply not referenced here
            (§6's sheet-side geometry note). */}
        <If when={presentation() === "sheet"} else={panelBranch}>
          <SheetRoot isOpen={isOpen()} onOpenChange={setOpen}>
            <SheetBackdrop
              isExiting={local.isExiting}
              isKeyboardDismissDisabled={isKeyboardDismissDisabled()}
            >
              <SheetContent
                ref={(node) => local.ref?.(node)}
                testID={sheetTestID()}
                nativeID={local.id ?? local.nativeID}
                accessibilityLabel={local["aria-label"] as string | undefined}
                className={className(values)}
                style={resolvedStyle(values)}
              >
                {/* `SheetRoot` provides its own `OverlayTriggerContext`, which
                    would shadow this scope: a Button written in the content
                    would then pose as the sheet's trigger. Re-supplying
                    `scopedTrigger` keeps the same contract the panel branch
                    gives its children — `close` still reaches this layer's
                    `setOpen`, `isOpen` still reports "no opinion".
                    `PopoverPositionContext` is deliberately not re-provided:
                    a sheet has no anchor geometry, so an arrow written inside
                    falls back to its default position (popover A-007). */}
                <OverlayTriggerContext.Provider value={scopedTrigger}>
                  <PopoverContentContext.Provider value={contentContextValue}>
                    <SheetBody>{renderChildren(local.children)}</SheetBody>
                  </PopoverContentContext.Provider>
                </OverlayTriggerContext.Provider>
              </SheetContent>
            </SheetBackdrop>
          </SheetRoot>
        </If>
      </If>
    </SurfaceContext.Provider>
  );
}
