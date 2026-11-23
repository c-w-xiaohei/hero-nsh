import type {
  Accessor,
  Bounds,
  JSX,
  OverlayPosition,
  Point,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, effect, Overlay, Scroll, signal, split, untracked } from "nsh";

import { createControllableBooleanSignal } from "../../primitives/create-controllable-signal";
import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import type { OverlayTriggerContextValue } from "../../primitives/create-overlay-trigger";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { createPresentation } from "../../primitives/presentation";
import { SheetBackdrop } from "../sheet/sheet-backdrop";
import { SheetBody } from "../sheet/sheet-body";
import { SheetContent } from "../sheet/sheet-content";
import { SheetDialog } from "../sheet/sheet-dialog";
import { SheetRoot } from "../sheet/sheet-root";
import type {
  PopoverPlacement,
  PopoverSide,
} from "../popover/popover-placement";
import { resolvePopoverPlacement } from "../popover/popover-placement";
import type { DropdownPopoverContextValue } from "./dropdown-context";
import {
  DropdownContext,
  DropdownPopoverContext,
  DropdownSubmenuLayerContext,
} from "./dropdown-context";
import { dropdownVariants } from "./dropdown.styles";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/** What a popover `className` / `style` function receives (RAC's `PopoverRenderProps`). */
export interface DropdownPopoverRenderProps {
  /** The component that opened the content: `"MenuTrigger"` or `"SubmenuTrigger"`. */
  trigger: Accessor<string>;
  /** The side the overlay ended up on, `null` before the first placement. */
  placement: Accessor<PopoverSide | null>;
  isEntering: Accessor<boolean>;
  isExiting: Accessor<boolean>;
}

/* -------------------------------------------------------------------------------------------------
 * Popover
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Dropdown.Popover` / `DropdownPopover`: React Aria Components'
 * `Popover`, which HeroUI wraps. The content is a scrolling viewport (the
 * upstream `overflow-y-auto`), so this part is built on the core `Overlay`
 * plus `Scroll` rather than on `Popover.Content` (port sheet §1.2, §3).
 */
export interface DropdownPopoverProps {
  /** The menu (or anything else) inside the layer; read once at the placement. */
  children: JSX.Element;

  /** Appended after the slot classes; function form gets accessors. */
  className?: string | ((values: DropdownPopoverRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: DropdownPopoverRenderProps) => StyleProp<ViewStyle>);

  /** The overlay view; `focus()` and `measure()` reach it. */
  ref?: (node: ViewRef) => void;

  /** The overlay's own open state (overrides the trigger's, as in React Aria). */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;

  /** Modal by default: a backdrop absorbs the presses outside. */
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

  /** The name of the trigger, for render values. */
  trigger?: string;

  /** Anchors the layer directly, instead of the registered trigger. */
  triggerRef?: ViewRef | null;

  /** React Aria placement (default `"bottom start"`; `"end top"` in a submenu). */
  placement?: PopoverPlacement;

  /** The gap between anchor and overlay (default 8). */
  offset?: number;

  /** Accepted, no effect: the core Overlay has no cross-axis offset. */
  crossOffset?: number;

  /** Accepted, no effect: the core Overlay always flips when the other side fits. */
  shouldFlip?: boolean;

  /** The safe-area margin (default 12; RAC's `containerPadding`). */
  containerPadding?: number;

  /** Maps to `accessibilityLabel`; the layer has no dialog role (§5). */
  "aria-label"?: string;
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH resolves no accessible names from ids. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  /**
   * The container the popover presents as (A-002). `"auto"` runs the shared
   * `createPresentation` rule — touch plus a compact short side picks
   * `"sheet"`, everything else `"panel"`. `"panel"` is the anchored overlay
   * upstream calls `'popover'`; `"sheet"` is the `Sheet` carrier upstream
   * calls `'bottom-sheet'`. The domain narrows to these two states because
   * upstream's `Menu` `presentation` knows only `popover`/`bottom-sheet`
   * (`menu.types.ts`) — `"fullscreen"`/`"dialog"` are not members.
   */
  presentation?: "auto" | "panel" | "sheet";

  /** Accepted, no effect: the arrow is not part of a dropdown upstream. */
  arrowSize?: number;

  /** Accepted, no effect: the overlay renders in its own root view. */
  UNSTABLE_portalContainer?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
  /** Accepted, no effect: layout direction comes from the host's variants. */
  dir?: "ltr" | "rtl";
  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  /**
   * Accepted, no effect: NSH has no focus-within event channel
   * (`focus-within:` styles exist, the callbacks do not).
   */
  onFocusWithin?: () => void;
  onBlurWithin?: () => void;
  onFocusWithinChange?: (isFocusWithin: boolean) => void;

  onLayout?: (event: { bounds: Bounds }) => void;
}

// Inline owners of the transition properties NSH cannot express as one class:
// the property list (every phase) and the shorter exit duration (R-025). The
// base class keeps the enter duration and curve (R-020).
const TRANSITION_STYLE = { transitionProperty: "opacity, transform" } as const;
const EXIT_DURATION_STYLE = { transitionDuration: "100ms" } as const;

/**
 * Dropdown.Popover / DropdownPopover: React Aria's `Popover` with
 * `.dropdown__popover`. Anchored to the registered trigger (or the context
 * menu point, or the submenu's row), it scrolls its content within the room
 * the core Overlay reports, and moves the focus into the menu root one frame
 * after opening (with one retry: a real Windows window registers the menu
 * after the opening commit).
 */
export function DropdownPopover(props: DropdownPopoverProps) {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "isOpen",
    "defaultOpen",
    "onOpenChange",
    "isNonModal",
    "isKeyboardDismissDisabled",
    "shouldCloseOnInteractOutside",
    "isEntering",
    "isExiting",
    "shouldSkipAnimation",
    "trigger",
    "triggerRef",
    "placement",
    "offset",
    "crossOffset",
    "shouldFlip",
    "containerPadding",
    "presentation",
    "aria-label",
    "accessibilityLabel",
    "aria-labelledby",
    "aria-describedby",
    "arrowSize",
    "UNSTABLE_portalContainer",
    "id",
    "nativeID",
    "testID",
    "slot",
    "dir",
    "render",
    "onFocusWithin",
    "onBlurWithin",
    "onFocusWithinChange",
    "onLayout",
  ] as const);

  const dropdown = DropdownContext();
  const submenu = DropdownSubmenuLayerContext();
  const overlayTrigger = OverlayTriggerContext();

  const slots = () => dropdown?.slots() ?? dropdownVariants();

  /* -------------------------------------------------------------------------------------------
   * Open state: React Aria's rule — a popover given its own `isOpen` /
   * `defaultOpen` (or with no trigger state at all) controls itself; inside a
   * submenu the submenu's state is the nearest owner.
   * ----------------------------------------------------------------------------------------- */
  const ownsState = () =>
    local.isOpen !== undefined ||
    local.defaultOpen !== undefined ||
    (!overlayTrigger && !submenu);

  const [ownIsOpen, setOwnIsOpen] = createControllableBooleanSignal({
    value: () => (ownsState() ? local.isOpen : undefined),
    defaultValue: () => (ownsState() ? local.defaultOpen : undefined),
    onChange: (isOpen) => {
      if (ownsState()) {
        local.onOpenChange?.(isOpen);
      }
    },
  });

  const isOpen = computed(() => {
    if (ownsState()) {
      return ownIsOpen();
    }

    return submenu ? submenu.isOpen() : (overlayTrigger?.isOpen() ?? false);
  });

  const setOpen = (next: boolean) => {
    if (ownsState()) {
      setOwnIsOpen(next);
    } else if (submenu) {
      submenu.setIsOpen(next);
    } else {
      overlayTrigger?.setIsOpen(next);
    }
  };

  const close = () => setOpen(false);

  const isNonModal = () => local.isNonModal ?? (submenu ? true : false);
  const isKeyboardDismissDisabled = () =>
    local.isKeyboardDismissDisabled ?? false;

  /* -------------------------------------------------------------------------------------------
   * Presence, placement and geometry
   * ----------------------------------------------------------------------------------------- */
  const presence = createOverlayPresence({
    isOpen,
    durationMs: () => 100,
    skip: () => local.shouldSkipAnimation,
    isEntering: () => local.isEntering,
    isExiting: () => local.isExiting,
  });

  const resolved = computed(() =>
    resolvePopoverPlacement(local.placement ?? (submenu ? "end top" : "bottom start")),
  );

  /* -------------------------------------------------------------------------------------------
   * Presentation: the carrier the open popover takes (A-003). The value is
   * evaluated once on `isOpen`'s false→true edge and latched until close, so
   * a rotation or a scope change can never swap the container mid-open.
   *
   * Two folds into the pin, in order:
   *
   *   1. `submenu` — a submenu's layer is always a panel, regardless of env
   *      or an explicit `"sheet"` pin: Native `SubMenu` does not support
   *      bottom-sheet, so the over-domain combination lands on panel rather
   *      than on a broken carrier (§8).
   *   2. `isNonModal` — under `"auto"` it resolves to `"panel"`: a non-modal
   *      popover has no sheet semantics (upstream's bottom-sheet is always
   *      modal), while an explicit `presentation="sheet"` still pins, the
   *      caller's stated intent winning over the derived rule.
   * ----------------------------------------------------------------------------------------- */
  const presentation = createPresentation<"panel" | "sheet">({
    pin: () => {
      if (submenu) {
        return "panel";
      }

      if (
        isNonModal() &&
        (local.presentation === undefined || local.presentation === "auto")
      ) {
        return "panel";
      }

      return local.presentation;
    },
    isOpen,
    allowed: () => ["panel", "sheet"],
  });

  const positionedSide = signal<PopoverSide | undefined>(undefined);
  const side = computed(() => positionedSide() ?? resolved().side);

  const anchorBounds = signal<Bounds | undefined>(undefined);
  const overlayBounds = signal<Bounds | undefined>(undefined);
  const availableWidth = signal<number | undefined>(undefined);
  const availableHeight = signal<number | undefined>(undefined);

  // The context-menu point only anchors while the root is in that mode, so a
  // later press-open goes back to the trigger.
  const contextMenuAnchor = (): Point | undefined =>
    dropdown?.triggerMode() === "contextMenu"
      ? dropdown.contextMenuPoint()
      : undefined;

  const anchor = () =>
    local.triggerRef ??
    submenu?.anchor() ??
    contextMenuAnchor() ??
    overlayTrigger?.triggerRef();

  const measureAnchor = () => {
    const trigger = local.triggerRef ?? submenu?.anchor() ?? overlayTrigger?.triggerRef();

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
    availableWidth.set(event.available.width);
    availableHeight.set(event.available.height);
    measureAnchor();
  };

  // R-009: `transform-origin: var(--trigger-anchor-point)`, computed from the
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
   * Focus: RAC's focus scope moves the focus into the menu on open. NSH's
   * overlay root takes no focus, so the menu registers itself here and the
   * move is retried once (a real Windows window mounts the menu after this
   * commit). A submenu opened by hover keeps the focus in the parent menu.
   * ----------------------------------------------------------------------------------------- */
  const menuFocus = signal<{ run: () => void } | undefined>(undefined);
  const menuFocused = signal(false);
  let focusedForOpen = false;

  effect(() => {
    const open = isOpen();
    const registered = menuFocus();

    if (!open) {
      focusedForOpen = false;
      menuFocused.set(false);

      return;
    }

    if (focusedForOpen || registered === undefined) {
      return;
    }

    if (submenu && !submenu.focusOnOpen()) {
      return;
    }

    focusedForOpen = true;
    menuFocused.set(false);

    let frame = requestAnimationFrame(() => {
      if (menuFocused()) {
        return;
      }

      registered.run();

      frame = requestAnimationFrame(() => {
        if (!menuFocused()) {
          registered.run();
        }
      });
    });

    return () => cancelAnimationFrame(frame);
  });

  const popoverContext: DropdownPopoverContextValue = {
    registerMenuFocus: (focus) => {
      const registration = { run: focus };
      menuFocus.set(registration);

      return () => {
        if (menuFocus() === registration) {
          menuFocus.set(undefined);
        }
      };
    },
    markMenuFocused: () => menuFocused.set(true),
    close,
    isOpen,
    presentation,
  };

  /* -------------------------------------------------------------------------------------------
   * Render values, classes and styles
   * ----------------------------------------------------------------------------------------- */
  const values: DropdownPopoverRenderProps = {
    trigger: () => local.trigger ?? (submenu ? "SubmenuTrigger" : "MenuTrigger"),
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
    [slots().popover(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-020 … R-025: the enter starting classes come off one frame after mount;
  // the exit classes stay for the 100ms hold and make the layer inert.
  const classList = computed(() => {
    const list: Record<string, boolean> = {
      // Closed, or past the exit hold: the layer stays mounted (the menu's
      // collection and its submenu state live in it) and is hidden instead.
      hidden: !presence.isPresent(),
    };
    const current = side();

    if (presence.isEntering()) {
      // R-020: `opacity: 0`, `transform: scale(0.9)`.
      list["opacity-0 scale-90"] = true;

      if (current === "top") {
        // R-021: enter from below.
        list["translate-y-1"] = true;
      } else if (current === "bottom") {
        // R-022: enter from above.
        list["-translate-y-1"] = true;
      } else if (current === "left") {
        // R-023: enter from the right.
        list["translate-x-1"] = true;
      } else {
        // R-024: enter from the left.
        list["-translate-x-1"] = true;
      }
    }

    if (presence.isExiting()) {
      // R-025
      list["opacity-0 scale-95 pointer-events-none"] = true;
    }

    return list;
  });

  // R-015 / R-016: the min width is a measured value, so it is inline.
  // `available.width` already excludes the safe-area margin. No `maxWidth`:
  // a max-width the layout can satisfy inside the reported `available` makes
  // the layer always fit the asked-for side, so the flip check ("the other
  // side when only that one has room", R-016) never sees the room it would
  // have needed — a full-width sheet carrier leaves the anchor's right edge
  // at the screen edge and the submenu collapses to the leftover sliver
  // instead of flipping left or overflowing at its natural width.
  const minWidth = () => {
    const available = availableWidth();

    return available == null ? 220 : Math.min(220, available);
  };

  const style = () => [
    TRANSITION_STYLE,
    // R-025: the exit is 100ms while the base class keeps 150ms for the enter.
    presence.isExiting() ? EXIT_DURATION_STYLE : undefined,
    { transformOrigin: transformOrigin(), minWidth: minWidth() },
    resolvedStyle(),
  ];

  const scrollStyle = (): StyleProp<ViewStyle> => ({
    // R-012: `.dropdown__popover`'s `overflow-y-auto` capped by the room the
    // core Overlay reports on the chosen side.
    maxHeight: availableHeight(),
  });

  const handleCancel = () => {
    if (isKeyboardDismissDisabled()) {
      return;
    }

    // Escape in a submenu closes that submenu alone and puts the focus back on
    // its trigger row (`useSubmenuTrigger.ts:161-169`); the root's `onClose`
    // never runs for it.
    if (submenu) {
      submenu.closeAndFocusRow();

      return;
    }

    close();
  };

  // The underlay only hit-tests while the layer is open; during the exit hold
  // it stays mounted around the content but lets the trigger take the press.
  const underlayClassList = computed(() => ({
    hidden: !presence.isPresent(),
    "pointer-events-none": !isOpen(),
  }));

  /* Scoped trigger context (A-005; popover's same ruling): `SheetRoot`
   * provides its own `OverlayTriggerContext`, which would shadow this
   * popover's — a Button or a row written inside the sheet would register
   * as the sheet's trigger or close the wrong channel. Re-supplied inside
   * `SheetContent`, `isOpen` reports "no opinion" (`undefined`) and `close`
   * still reaches this popover's `close`, the same contract the panel
   * branch's own `Overlay` already gives its children. */
  const scopedTrigger: OverlayTriggerContextValue = {
    isOpen: () => undefined,
    setIsOpen: () => {},
    toggle: () => {},
    close: () => close(),
    registerTrigger: () => () => {},
    triggerRef: () => undefined,
  };

  // A-003/A-005: the carrier probe. Each branch derives its `testID` from
  // the caller's — `<id>-panel` on the anchored overlay, `<id>-sheet` on
  // the Sheet content — so `shows`/`count` discriminate which carrier the
  // resolved presentation mounted (the popover unit's `<id>-panel`/
  // `<id>-sheet` convention; `nativeID` keeps its verbatim mapping).
  const panelTestID = () =>
    local.testID !== undefined ? `${local.testID}-panel` : undefined;
  const sheetTestID = () =>
    local.testID !== undefined ? `${local.testID}-sheet` : undefined;

  // One read of `props.children` per carrier, at its placement inside the
  // scroll viewport and the context the menu reads. The content stays
  // mounted while the layer is closed, as Select's list does: NSH builds a
  // collection from mounted parts, and remounting it on every open would
  // also re-create the `SubmenuTrigger` parts below it and lose their open
  // state. The panel wraps it in the measured `Scroll`; the sheet carrier
  // wraps its own copy of the provider subtree in `SheetBody`, whose paired
  // Scroll takes the scroller's place (A-005) — a shared element node mounts
  // under one parent only, so the two carriers cannot hold one constant.
  const content = (
    <Scroll
      // R-011: `.dropdown__popover`'s `scrollbar` → the core Scroll's own.
      scrollbar={true}
      class="w-full"
      style={scrollStyle()}
      onMouseEnter={() => submenu?.contentEnter()}
      onMouseLeave={() => submenu?.contentLeave()}
      onLayout={local.onLayout}
    >
      <DropdownPopoverContext.Provider value={popoverContext}>
        {local.children}
      </DropdownPopoverContext.Provider>
    </Scroll>
  );

  const contentOverlay = (
    <Overlay
      ref={(node) => local.ref?.(node)}
      anchor={anchor() ?? null}
      placement={resolved().side}
      align={resolved().align}
      // React Aria's `MenuTrigger` passes `offset: 0` for `trigger="contextMenu"`
      // (`Menu.tsx:162`), so the menu sits at the pointer rather than 8pt away.
      offset={
        local.offset ??
        (dropdown?.triggerMode() === "contextMenu" ? 0 : 8)
      }
      margin={local.containerPadding ?? 12}
      testID={panelTestID()}
      nativeID={local.id ?? local.nativeID}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      class={classes()}
      classList={classList()}
      style={style()}
      // The content stays mounted while closed (port sheet §6.1), so a layer
      // that is not open must not take the dismissal channels: NSH hands
      // Escape to the top overlay that listens, and this hidden one would
      // swallow it before the dialog above (or the root menu) sees it.
      onPressOutside={isOpen() ? close : undefined}
      onCancel={isOpen() ? handleCancel : undefined}
      onPosition={handlePosition}
    >
      {content}
    </Overlay>
  );

  // A-004: the panel branch is the pre-existing render chain, verbatim — the
  // modal underlay plus the anchored content overlay. `"panel"` *is* the
  // upstream popover, so nothing about its structure changes.
  //
  // The modal underlay: the second overlay that absorbs presses outside the
  // layer, as RAC's `usePopover` underlay. It has to be the outer overlay with
  // the content nested inside it (two sibling overlays both claim the press on
  // the web target, so the content would never see one). `isNonModal` is read
  // when the layer shows, not tracked afterwards, as in React Aria.
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

  /* A-005: the sheet carrier composes the existing Sheet parts, upstream's
   * `bottom-sheet` state. The popover keeps owning the open state —
   * `SheetRoot` is a controlled shell fed `isOpen`, and a sheet dismissal
   * (backdrop press, swipe, Escape, back) reports `onOpenChange(false)`
   * into the same `close()` the underlay and `handleCancel` take.
   *
   * `SheetBackdrop` gets `isExiting` forced (plus the `-backdrop` testID
   * convention select's carrier uses for the outside-press probe): this
   * popover's contract keeps
   * the menu collection and the submenu state mounted while the layer is
   * closed (`DropdownMenu`'s focus registration, `registerRow` handles and
   * `SubmenuTrigger`'s `isOpen`/timers all live in `content`), so a sheet
   * must not unmount them on close — without retention a once-opened sheet
   * would unregister `rowRegistry`, typeahead and every submenu channel
   * (the heaviest ruling of this unit, sheet §6 margin note; `isExiting`
   * is the existing `retentionProps` / Native `forceMount` counterpart —
   * no new prop). `isKeyboardDismissDisabled` goes with it so the contract
   * prop gates Escape on this carrier exactly as `handleCancel` gates it on
   * the panel chain.
   *
   * `SheetContent` carries the popover's own look (`slots.popover()` plus
   * the caller's class/style) and the id / testID / label forwards;
   * `SheetDialog` is the panel — the `SheetContentPanContext` supply point,
   * which is what lets the content area drag the detent and arbitrate with
   * `SheetBody`'s paired Scroll under touch (`panHandlers()` is an empty
   * object under pointer, so no gesture path exists there); `SheetBody`
   * wraps the same `content` subtree, replacing the panel branch's `Scroll`
   * with its own paired one — the `DropdownPopoverContext.Provider` chain
   * inside it is unchanged. `local.isEntering`/`isExiting`/
   * `shouldSkipAnimation` are not forwarded: the carrier always retains its
   * mount, so the caller's exit intent has no semantics here (§8). */
  /* `If`'s children position takes a function child, which runs only while
   * `when` holds. The function form matters here: as a constant element the
   * sheet copy of the children subtree exists while the panel carrier is
   * the one showing (the two carriers each need their own provider subtree —
   * one element mounts under one parent), and parts inside the copy run
   * their bodies without ever mounting; `Dropdown.Menu`'s body-time
   * `registerMenuFocus` then binds `menuFocus` to a node that never mounts
   * and the panel's menu loses the open-time focus handoff. Realizing the
   * carrier inside `If`'s function child keeps one copy of the subtree in
   * existence, matching the mounted carrier. */
  const sheetBranch = () => (
    <SheetRoot
      isOpen={isOpen()}
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
    >
      <SheetBackdrop
        isExiting={true}
        isKeyboardDismissDisabled={isKeyboardDismissDisabled()}
        testID={
          local.testID !== undefined ? `${local.testID}-backdrop` : undefined
        }
      >
        <SheetContent
          ref={(node) => local.ref?.(node)}
          testID={sheetTestID()}
          nativeID={local.id ?? local.nativeID}
          accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
          className={classes()}
          style={resolvedStyle()}
        >
          <OverlayTriggerContext.Provider value={scopedTrigger}>
            <SheetDialog>
              <SheetBody
                onMouseEnter={() => submenu?.contentEnter()}
                onMouseLeave={() => submenu?.contentLeave()}
                onLayout={local.onLayout}
              >
                <DropdownPopoverContext.Provider value={popoverContext}>
                  {local.children}
                </DropdownPopoverContext.Provider>
              </SheetBody>
            </SheetDialog>
          </OverlayTriggerContext.Provider>
        </SheetContent>
      </SheetBackdrop>
    </SheetRoot>
  );

  return (
    <If when={presentation() === "sheet"} else={panelBranch}>
      {sheetBranch}
    </If>
  );
}
