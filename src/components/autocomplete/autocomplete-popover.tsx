import type {
  Accessor,
  Bounds,
  JSX,
  OverlayPosition,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, effect, Overlay, Scroll, signal, split } from "nsh";

import { createControllableBooleanSignal } from "../../primitives/create-controllable-signal";
import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { createPresentation } from "../../primitives/presentation";
import { renderChildren } from "../list-box/children";
import { SheetBackdrop } from "../sheet/sheet-backdrop";
import { SheetBody } from "../sheet/sheet-body";
import { SheetContent } from "../sheet/sheet-content";
import { SheetRoot } from "../sheet/sheet-root";
import {
  ListBoxContainerContext,
  type ListBoxContainerContextValue,
} from "../list-box/list-box-context";
import type { PopoverPositionContextValue } from "../popover/popover-context";
import { PopoverPositionContext } from "../popover/popover-context";
import type {
  PopoverPlacement,
  PopoverSide,
} from "../popover/popover-placement";
import { resolvePopoverPlacement } from "../popover/popover-placement";
import { SurfaceContext, type SurfaceContextValue } from "../surface";
import { AutocompleteContext } from "./autocomplete-context";

/** What a popover `className` / `style` function receives (RAC's `PopoverRenderProps`). */
export interface AutocompletePopoverRenderProps {
  /** The component that opened the popover (default `"Autocomplete"`). */
  trigger: Accessor<string>;
  /** The side the overlay ended up on, `null` before the first placement. */
  placement: Accessor<PopoverSide | null>;
  isEntering: Accessor<boolean>;
  isExiting: Accessor<boolean>;
}

/** The props of `Autocomplete.Popover`: React Aria's `Popover`, `placement` default `"bottom"`. */
export interface AutocompletePopoverProps {
  /** The popover's content (the caller's Filter); read once at the placement. */
  children: JSX.Element;

  /** Appended after the popover slot classes; function form gets accessors. */
  className?: string | ((values: AutocompletePopoverRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: AutocompletePopoverRenderProps) => StyleProp<ViewStyle>);

  /** The overlay view; `focus()` and `measure()` reach it. */
  ref?: (node: ViewRef) => void;

  /** RAC placement (default `"bottom"`), mapped to the overlay's side and align. */
  placement?: PopoverPlacement;

  /** The gap between the trigger and the overlay (default 8). */
  offset?: number;

  /** Accepted, no effect: the core Overlay has no cross-axis offset. */
  crossOffset?: number;

  /** Accepted, no effect: the core Overlay always flips when the other side fits. */
  shouldFlip?: boolean;

  /** The safe-area margin (default 12; RAC's `containerPadding`). */
  containerPadding?: number;

  /** The popover's own open state (overrides the field's, as in React Aria). */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;

  /** Modal by default (RAC): a backdrop absorbs the presses outside. */
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

  /**
   * The container the popover presents as (A-005). `"auto"` runs the shared
   * `createPresentation` rule — touch plus a compact short side picks
   * `"sheet"`, everything else `"panel"`. `"panel"` is the anchored overlay
   * upstream's `Popover` is; `"sheet"` carries the same content in the
   * `Sheet` parts, upstream's bottom-sheet state (action-list §4). The domain
   * is narrowed to these two states — `"fullscreen"` is not a member
   * (create-presentation sheet §3, the same narrowing select took).
   */
  presentation?: "auto" | "panel" | "sheet";

  /** The name of the trigger, for render values (default `"Autocomplete"`). */
  trigger?: string;

  /** Anchors a standalone popover directly. */
  triggerRef?: ViewRef | null;

  /** Accepted, no effect: the overlay renders in its own root view. */
  UNSTABLE_portalContainer?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;

  "aria-label"?: string;
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH resolves no accessible names from ids. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

// Owners of the two transition properties NSH cannot express as one class: the
// property list every phase animates (R-021 … R-026, opacity and transform),
// and the exit's shorter duration (R-026: 100ms against the slot's 150ms).
const TRANSITION_STYLE = { transitionProperty: "opacity, transform" } as const;
const EXIT_DURATION_STYLE = { transitionDuration: "100ms" } as const;

// HeroUI wraps the popover in a `SurfaceContext` with the default variant
// (port sheet §3). Nothing reads it today; it is part of the upstream contract.
const SURFACE_VALUE: SurfaceContextValue = { variant: () => "default" };

/**
 * Autocomplete.Popover / AutocompletePopover: the field's overlay. Upstream it
 * is React Aria's `Popover` carrying `.autocomplete__popover` (22pt corners,
 * `pt-2`, the measured trigger width), so this port builds it on the core
 * `Overlay` plus `createOverlayPresence` (port sheet §3, B1–B4).
 *
 * The subtree stays mounted while the field is closed, as in Select: NSH builds
 * the list's collection from mounted parts, and the Filter's text, its focus
 * entry and the list's selection state must survive a close. `hidden` is what
 * the closed layer gets; `presence` only drives the enter and exit classes.
 *
 * R-029's "only the list scrolls, the search field stays put" cannot be
 * expressed here: the Filter's children (SearchField + ListBox) are one tree
 * and cannot be split, so one `Scroll` wraps both and its `maxHeight` is the
 * room the core Overlay reports on the chosen side (port sheet §8).
 */
export function AutocompletePopover(
  props: AutocompletePopoverProps,
): JSX.Element | null {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "placement",
    "offset",
    "crossOffset",
    "shouldFlip",
    "containerPadding",
    "isOpen",
    "defaultOpen",
    "onOpenChange",
    "isNonModal",
    "isKeyboardDismissDisabled",
    "shouldCloseOnInteractOutside",
    "isEntering",
    "isExiting",
    "shouldSkipAnimation",
    "presentation",
    "trigger",
    "triggerRef",
    "UNSTABLE_portalContainer",
    "id",
    "nativeID",
    "testID",
    "aria-label",
    "accessibilityLabel",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const autocomplete = AutocompleteContext();
  const overlayTrigger = OverlayTriggerContext();

  if (!autocomplete) {
    return null;
  }

  /* -------------------------------------------------------------------------------------------
   * Open state: React Aria's rule — a popover that was given its own `isOpen` /
   * `defaultOpen` (or has no trigger state at all) controls itself.
   * ----------------------------------------------------------------------------------------- */
  const ownsState = () =>
    local.isOpen !== undefined ||
    local.defaultOpen !== undefined ||
    !overlayTrigger;

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
    ownsState() ? ownIsOpen() : (overlayTrigger?.isOpen() ?? false),
  );

  const close = () => {
    // The field owns the list's focus and reports the open change; a popover
    // with its own state closes its own channel too, as React Aria's does.
    if (ownsState()) {
      setOwnIsOpen(false);
    }

    autocomplete.close();
  };

  const isNonModal = () => local.isNonModal ?? false;
  const isKeyboardDismissDisabled = () =>
    local.isKeyboardDismissDisabled ?? false;

  /* -------------------------------------------------------------------------------------------
   * A-006: the presentation seam — the carrier the open popover takes. The
   * value is evaluated once on `isOpen`'s false→true edge (the field's
   * synthesized `isOpen`, so a standalone popover's own channel latches too)
   * and held until close: a rotation or an environment change can never swap
   * the container mid-open.
   *
   * `isNonModal` folds into the pin (popover A-002's conservative ruling): a
   * non-modal overlay has no sheet semantics — upstream's bottom-sheet is
   * always modal — so under `"auto"` it resolves `"panel"`, while an
   * explicit `presentation="sheet"` still pins, the caller's stated intent
   * winning over the derived rule (§8).
   * ----------------------------------------------------------------------------------------- */
  const presentation = createPresentation<"panel" | "sheet">({
    pin: () =>
      isNonModal() &&
      (local.presentation === undefined || local.presentation === "auto")
        ? "panel"
        : local.presentation,
    isOpen,
    allowed: () => ["panel", "sheet"],
  });

  /* -------------------------------------------------------------------------------------------
   * Presence, placement and geometry
   * ----------------------------------------------------------------------------------------- */
  const presence = createOverlayPresence({
    isOpen,
    // R-026: the exit keeps the layer for 100ms; the enter is the slot's.
    durationMs: () => 100,
    skip: () => local.shouldSkipAnimation,
    isEntering: () => local.isEntering,
    isExiting: () => local.isExiting,
  });

  const resolved = computed(() => resolvePopoverPlacement(local.placement));
  const positionedSide = signal<PopoverSide | undefined>(undefined);

  const side = computed(() => positionedSide() ?? resolved().side);

  const anchorBounds = signal<Bounds | undefined>(undefined);
  const overlayBounds = signal<Bounds | undefined>(undefined);
  const triggerWidth = signal<number | undefined>(undefined);
  const availableHeight = signal<number | undefined>(undefined);

  const anchor = () => local.triggerRef ?? overlayTrigger?.triggerRef();

  // The ResizeObserver's stand-in (port sheet §2): the anchor is measured when
  // the layer opens, after every placement and whenever the trigger moves (the
  // core re-places a following overlay and reports it through `onPosition`).
  const measureAnchor = () => {
    const trigger = anchor();

    if (!trigger) {
      return;
    }

    void trigger.measure().then((measured) => {
      if (!measured) {
        return;
      }

      anchorBounds.set({
        origin: measured.pagePosition,
        size: measured.bounds.size,
      });
      // R-019: `w-(--trigger-width)` / `max-w-(--trigger-width)` are measured
      // values, so both live inline.
      triggerWidth.set(measured.bounds.size.width);
    });
  };

  effect(() => {
    if (!isOpen()) {
      return;
    }

    measureAnchor();
  });

  const handlePosition = (event: OverlayPosition) => {
    positionedSide.set(event.placement);
    overlayBounds.set(event.bounds);
    availableHeight.set(event.available.height);
    measureAnchor();
  };

  // R-027 / R-028: autocomplete.css's last popover rules match an
  // `[data-slot="popover-overlay-arrow"]` a caller nests in the content
  // (`autocomplete.css:174-189`): the arrow takes the overlay's fill and turns
  // with the side the layer landed on. NSH has no descendant styling, so the
  // fill is the arrow's own `bg-overlay` and the rotation its own `rotate-*`
  // classes, driven by the side handed down here — the same position context
  // `Popover.Content` gives `Popover.Arrow` (`popover-content.tsx:399-404`,
  // `popover-arrow.tsx:133-138`). Without it a nested arrow keeps the arrow
  // part's `bottom` fallback and never turns for an overlay placed above the
  // trigger.
  const arrowPosition: PopoverPositionContextValue = {
    anchorBounds,
    overlayBounds,
    side,
    placement: () => positionedSide() ?? null,
  };

  // R-021: `transform-origin: var(--trigger-anchor-point)`, computed from the
  // trigger's centre in the overlay's own frame (Popover.Content's algorithm).
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
   * Render values, classes and styles
   * ----------------------------------------------------------------------------------------- */
  const values: AutocompletePopoverRenderProps = {
    trigger: () => local.trigger ?? "Autocomplete",
    placement: () => positionedSide() ?? null,
    isEntering: presence.isEntering,
    isExiting: presence.isExiting,
  };

  const resolvedClassName = () => {
    const value = local.className;

    return (typeof value === "function" ? value(values) : value) ?? "";
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(values) : value;
  };

  const classes = computed(() =>
    [autocomplete.slots().popover(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-021 … R-026: the enter starting classes come off one frame after mount;
  // the exit classes stay for the 100ms hold and make the layer inert. The
  // closed layer is `hidden`, because the list below stays mounted.
  const classList = computed(() => {
    const list: Record<string, boolean> = {
      hidden: !presence.isPresent(),
    };
    const current = side();

    if (presence.isEntering()) {
      // R-021: `opacity: 0`, `transform: scale(0.95)`.
      list["opacity-0 scale-95"] = true;

      if (current === "top") {
        // R-022: enter from below.
        list["translate-y-1"] = true;
      } else if (current === "bottom") {
        // R-023: enter from above.
        list["-translate-y-1"] = true;
      } else if (current === "left") {
        // R-024: enter from the right.
        list["translate-x-1"] = true;
      } else {
        // R-025: enter from the left.
        list["-translate-x-1"] = true;
      }
    }

    if (presence.isExiting()) {
      // R-026
      list["opacity-0 scale-95 pointer-events-none"] = true;
    }

    return list;
  });

  const style = () => [
    TRANSITION_STYLE,
    // R-026: the exit runs 100ms while the slot keeps 150ms for the enter.
    presence.isExiting() ? EXIT_DURATION_STYLE : undefined,
    {
      transformOrigin: transformOrigin(),
      width: triggerWidth(),
      maxWidth: triggerWidth(),
    },
    resolvedStyle(),
  ];

  // R-029: the one scroll viewport of the popover, capped by the room the core
  // Overlay reports on the chosen side.
  const scrollStyle = (): StyleProp<ViewStyle> => ({
    maxHeight: availableHeight(),
  });

  const containerValue: ListBoxContainerContextValue = {
    // R-029: `.autocomplete__popover [data-slot="list-box"]` → the list's own
    // padding and focus ring suppression.
    listClass: () => "p-1.5 outline-none",
    // R-030: `.autocomplete__popover [data-slot="list-box-item"]` → `px-2.5`.
    itemClass: () => "px-2.5",
    // R-032: the indicator does not transition in a single-select field.
    suppressIndicatorTransition: () =>
      autocomplete.selectionMode() !== "multiple",
    // The popover's `aria-labelledby` points at the field's label upstream;
    // NSH hands the registered text down instead.
    accessibilityLabel: () => autocomplete.labelText(),
  };

  const handleCancel = () => {
    if (!isKeyboardDismissDisabled()) {
      close();
    }
  };

  // A-008: the carrier probe. The panel keeps `testID` verbatim (desktop zero
  // drift); the sheet carrier derives `<id>-sheet`, the `arrow` part's
  // `-default` convention's sibling, so `shows`/`count` discriminate the
  // mounted presentation (`id:ac-pop` / `id:ac-pop-sheet`).
  const sheetTestID = () =>
    local.testID !== undefined ? `${local.testID}-sheet` : undefined;

  // One read of `props.children`, at the placement inside the scroll viewport
  // and the contexts the Filter's SearchField and ListBox read.
  const content = (
    <Scroll
      scrollbar={true}
      class="w-full"
      style={scrollStyle()}
      onLayout={local.onLayout}
    >
      <ListBoxContainerContext.Provider value={containerValue}>
        <PopoverPositionContext.Provider value={arrowPosition}>
          {renderChildren(local.children)}
        </PopoverPositionContext.Provider>
      </ListBoxContainerContext.Provider>
    </Scroll>
  );

  const contentOverlay = (
    <Overlay
      ref={(node) => local.ref?.(node)}
      anchor={anchor() ?? null}
      placement={resolved().side}
      align={resolved().align}
      offset={local.offset ?? 8}
      margin={local.containerPadding ?? 12}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      class={classes()}
      classList={classList()}
      style={style()}
      onPressOutside={isOpen() ? close : undefined}
      onCancel={isOpen() ? handleCancel : undefined}
      onPosition={handlePosition}
    >
      {content}
    </Overlay>
  );

  // A-007: the panel branch is the pre-existing render chain, verbatim — the
  // modal underlay plus the anchored content overlay. `"panel"` *is* the
  // upstream popover, so nothing about its structure changes: the `testID`
  // binding stays `local.testID` itself, and `placement` / `offset` /
  // `measureAnchor` / `transformOrigin` / `PopoverPositionContext` keep their
  // anchored semantics.
  const panelBranch = (
    <If when={!isNonModal()} else={contentOverlay}>
      {/* The modal underlay: the second overlay that absorbs presses outside
          the field, as RAC's `usePopover` underlay. It has to be the outer
          overlay with the content nested inside it (two sibling overlays
          both claim the press on the web target). It exists only while
          something is shown: a closed field keeps the content in the tree,
          but hidden, so the Filter and the list survive (port sheet §5,
          third change). */}
      <Overlay
        class="inset-0"
        classList={{
          hidden: !presence.isPresent(),
          "pointer-events-none": !isOpen(),
        }}
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

  // Before the first open the whole subtree stays out of the tree, as RAC's
  // `Popover` does: a `SearchField` inside a closed field autofocuses at mount,
  // and NSH would hand it the keyboard focus while it is hidden, taking the
  // field's Tab stop away from the trigger (`_common`'s NSH input facts). The
  // root's `shouldMountPopover` keeps it mounted from the first open on (the
  // collection and the closed trigger's text live there) and right away when a
  // `value` / `defaultValue` has to be shown.
  return (
    <SurfaceContext.Provider value={SURFACE_VALUE}>
      <If when={autocomplete.shouldMountPopover()}>
        {/* A-008: the sheet carrier composes the existing Sheet parts
            (popover A-004 the same shape). The field keeps owning the open
            state — `SheetRoot` is a controlled shell fed `isOpen`, and its
            `onOpenChange` closes through the same `close()` the underlay and
            Escape take. `SheetBackdrop`'s dismissable paint layer replaces
            the underlay (`isDismissable` takes its default, the same
            press-outside / Escape semantics the panel chain has);
            `isExiting` reaches the backdrop so the subtree-retained contract
            the field's `shouldMountPopover` needs holds on this carrier too
            — `isExiting` unset means "the field's own rule", which is `!isOpen()`
            after the first open — and `isKeyboardDismissDisabled` goes with
            it so the contract prop gates Escape on the sheet carrier exactly
            as `handleCancel` gates it on the panel chain (§1 parity). */}
        <If when={presentation() === "sheet"} else={panelBranch}>
          <SheetRoot
            isOpen={isOpen()}
            onOpenChange={(next) => {
              if (!next) {
                close();
              }
            }}
          >
            <SheetBackdrop
              isExiting={
                local.isExiting === undefined ? !isOpen() : local.isExiting
              }
              isKeyboardDismissDisabled={isKeyboardDismissDisabled()}
            >
              <SheetContent
                ref={(node) => local.ref?.(node)}
                testID={sheetTestID()}
                nativeID={local.id ?? local.nativeID}
                accessibilityLabel={
                  local["aria-label"] ?? local.accessibilityLabel
                }
                className={classes()}
                style={resolvedStyle()}
              >
                {/* `SheetRoot` provides its own `OverlayTriggerContext`,
                    which would shadow this field's: a nested part's
                    `toggle`/`isOpen`/`expanded` reads would then point at the
                    sheet's channel instead of the autocomplete's. Re-supplying
                    the field's own `overlayTrigger` value keeps the contract
                    the panel branch gives its children (a standalone popover
                    supplies `undefined`, the absent-context value itself).
                    `ListBoxContainerContext` re-provides the R-029…R-032
                    container contract the caller's ListBox reads, identical
                    on this carrier. `PopoverPositionContext` is deliberately
                    not re-provided: a sheet has no anchor geometry, so an
                    `Arrow` written inside falls back to its
                    `DEFAULT_POSITION` (popover A-007). */}
                <OverlayTriggerContext.Provider value={overlayTrigger}>
                  <ListBoxContainerContext.Provider value={containerValue}>
                    {/* `SheetBody` is the scroll container the children land
                        in — the panel's `Scroll` and its `maxHeight` cap are
                        anchored-overlay concerns; the body's detent keeps it
                        `scrollable`. `onLayout` forwards so the popover's
                        content-box probe survives the carrier swap. */}
                    <SheetBody onLayout={local.onLayout}>
                      {renderChildren(local.children)}
                    </SheetBody>
                  </ListBoxContainerContext.Provider>
                </OverlayTriggerContext.Provider>
              </SheetContent>
            </SheetBackdrop>
          </SheetRoot>
        </If>
      </If>
    </SurfaceContext.Provider>
  );
}
