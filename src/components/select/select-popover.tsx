import type {
  Accessor,
  Bounds,
  JSX,
  OverlayPosition,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, effect, Overlay, Scroll, signal, split, View, windowSize } from "nsh";

import { createControllableBooleanSignal } from "../../primitives/create-controllable-signal";
import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import type { OverlayTriggerContextValue } from "../../primitives/create-overlay-trigger";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { createPresentation } from "../../primitives/presentation";
import {
  ListOwnerContext,
  type ListOwner,
} from "../../primitives";
import { SheetBody } from "../sheet/sheet-body";
import { SheetContent } from "../sheet/sheet-content";
import { SheetBackdrop } from "../sheet/sheet-backdrop";
import { SheetDialog } from "../sheet/sheet-dialog";
import { SheetRoot } from "../sheet/sheet-root";
import { renderChildren } from "../list-box/children";
import {
  ListBoxContainerContext,
  type ListBoxContainerContextValue,
} from "../list-box/list-box-context";
import type {
  PopoverPlacement,
  PopoverSide,
} from "../popover/popover-placement";
import { resolvePopoverPlacement } from "../popover/popover-placement";
import {
  SelectCarrierContext,
  SelectContext,
  type SelectCarrier,
} from "./select-context";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/** What a popover `className` / `style` function receives (RAC's `PopoverRenderProps`). */
export interface SelectPopoverRenderProps {
  /** The component that opened the popover; `"Select"` by default. */
  trigger: Accessor<string>;
  /** The side the overlay ended up on, `null` before the first placement. */
  placement: Accessor<PopoverSide | null>;
  isEntering: Accessor<boolean>;
  isExiting: Accessor<boolean>;
}

export interface SelectPopoverProps {
  /** The popover's content (the caller's ListBox); read once at the placement. */
  children: JSX.Element;

  /** Appended after the popover slot classes; function form gets accessors. */
  className?: string | ((values: SelectPopoverRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: SelectPopoverRenderProps) => StyleProp<ViewStyle>);

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
   * The container the popover presents as (A-002). `"auto"` runs the shared
   * `createPresentation` rule — touch plus a compact short side picks
   * `"sheet"`, everything else `"panel"`. `"panel"` is the anchored overlay
   * upstream calls `'popover'`; `"sheet"` is the `Sheet` carrier upstream
   * calls `'bottom-sheet'`; `"fullscreen"` is the centered dialog upstream
   * calls `'dialog'` (Native `SelectContent`'s three states, action-list §4).
   * The single prop sits on the part that owns the carrier — upstream splits
   * it across `SelectRoot` / `SelectContent` (§8).
   */
  presentation?: "auto" | "panel" | "sheet" | "fullscreen";

  /** The name of the trigger, for render values (default `"Select"`). */
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

  /** Accepted, no effect: NSH has no `aria-details` channel. */
  "aria-details"?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

// Owners of the two transition properties NSH cannot express as one class
// (R-036 / R-037): the property list, and the shorter exit duration.
const TRANSITION_STYLE = { transitionProperty: "opacity, transform" } as const;
const EXIT_DURATION_STYLE = { transitionDuration: "100ms" } as const;

/**
 * Select.Popover / SelectPopover: the field's overlay. Upstream it is React
 * Aria's `Popover` with `.select__popover` (not HeroUI's Popover: 22pt corners,
 * no padding, its own scroll), so this port builds it on the core `Overlay`
 * plus `createOverlayPresence` (port sheet §3, B1–B4; §5, sixth change).
 *
 * The list subtree stays mounted while the field is closed: NSH builds its
 * collections from mounted parts, and a closed Select must still typeahead and
 * place the first focus (port sheet §5, third change). `hidden` is what the
 * closed layer gets; `presence` only drives the enter and exit classes.
 */
export function SelectPopover(props: SelectPopoverProps): JSX.Element {
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

  const select = SelectContext();
  const overlayTrigger = OverlayTriggerContext();

  if (!select) {
    return null;
  }

  /* -------------------------------------------------------------------------------------------
   * Open state: React Aria's rule — a popover that was given its own
   * `isOpen` / `defaultOpen` (or has no trigger state at all) controls itself.
   * ----------------------------------------------------------------------------------------- */
  const ownsState = () =>
    props.isOpen !== undefined ||
    props.defaultOpen !== undefined ||
    !overlayTrigger;

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
    ownsState() ? ownIsOpen() : (overlayTrigger?.isOpen() ?? false),
  );

  const close = () => {
    // The field's state is the one that owns the list's focus and reports the
    // change; a popover with its own open state only closes its own channel
    // (writing the field's would report a second time in controlled mode).
    if (ownsState()) {
      setOwnIsOpen(false);
    }

    select.close();
  };

  const isNonModal = () => props.isNonModal ?? false;
  const isKeyboardDismissDisabled = () =>
    props.isKeyboardDismissDisabled ?? false;

  /* -------------------------------------------------------------------------------------------
   * Presence, placement and geometry
   * ----------------------------------------------------------------------------------------- */
  const presence = createOverlayPresence({
    isOpen,
    durationMs: () => 100,
    skip: () => props.shouldSkipAnimation,
    isEntering: () => props.isEntering,
    isExiting: () => props.isExiting,
  });

  /* -------------------------------------------------------------------------------------------
   * Presentation: which of the three carriers the open popover takes (A-003).
   * The value evaluates once on `isOpen`'s false→true edge and latches until
   * close — a rotation can never swap the container mid-open.
   *
   * `isNonModal` folds into the pin: a non-modal popover has no sheet / dialog
   * semantics (upstream's two non-panel carriers are always modal), so under
   * `"auto"` it resolves to `"panel"`; an explicit `presentation="sheet"` /
   * `"fullscreen"` still pins, the caller's stated intent winning over the
   * derived rule (popover / date-picker's same ruling, sheet §6 margin note).
   * ----------------------------------------------------------------------------------------- */
  const presentation = createPresentation<"panel" | "sheet" | "fullscreen">({
    pin: () =>
      isNonModal() &&
      (props.presentation === undefined || props.presentation === "auto")
        ? "panel"
        : props.presentation,
    isOpen,
    allowed: () => ["panel", "sheet", "fullscreen"],
  });

  // A-002's retained-mount corollary: each carrier branch below holds its own
  // ListBox (an element mounts under one parent only, so no shared node can
  // travel between carriers), and all three register with the field. The
  // branch whose `carrier` tag matches the carrier this open resolves is the
  // registration `selectionManager` / `findItem` / the focus placement read.
  // The tag tracks `presentation()` continuously — while closed the accessor
  // previews the carrier the next open will latch, so `open()`'s `markFocus`
  // (which runs before `setIsOpen` commits) already resolves the carrier the
  // open is about to show; gating on `isOpen` left the tag one edge stale and
  // placed the highlight and the view focus in a hidden copy (the web host's
  // M3 failures). While open the latch holds the same value, so the tracking
  // is a no-op there.
  const owner = ListOwnerContext();

  effect(() => {
    select.setActiveCarrier(presentation());
  });

  // The owner the children inside `carrier`'s branch see: identical to the
  // field's except registration carries the branch's tag.
  const carrierOwner = (carrier: SelectCarrier): ListOwner | undefined =>
    owner === undefined
      ? undefined
      : {
          ...owner,
          registerList: (state, controls) =>
            owner.registerList(state, controls, carrier),
        };

  const resolved = computed(() => resolvePopoverPlacement(props.placement));
  const positionedSide = signal<PopoverSide | undefined>(undefined);

  const side = computed(() => positionedSide() ?? resolved().side);

  const anchorBounds = signal<Bounds | undefined>(undefined);
  const overlayBounds = signal<Bounds | undefined>(undefined);
  const triggerWidth = signal<number | undefined>(undefined);
  const availableHeight = signal<number | undefined>(undefined);

  const anchor = () => props.triggerRef ?? overlayTrigger?.triggerRef();

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
      // R-047: `min-w-(--trigger-width)` is a measured value, so it is inline.
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
    // The sheet's §2 `--available-height`: the scrolling viewport may not grow
    // past the room on the placement's side (`.select__popover`'s
    // `overflow-y-auto`).
    availableHeight.set(event.available.height);
    measureAnchor();
    // The focus placement runs here as well as in the field state's open
    // effect: on the web host a `focus()` command issued inside the mount
    // commit is dropped (a defaultOpen / controlled-open field's `onFocus`
    // never arrived — T-045/T-046), while `onPosition` arrives once the
    // overlay is laid out and interactive. Re-focusing an already-focused
    // list is a no-op (`onFocusIn` returns while `manager.isFocused()`), so
    // the press-open path sees no duplicate.
    select.listControls()?.focusList();
  };

  // R-048: `transform-origin: var(--trigger-anchor-point)`, computed from the
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
  const values: SelectPopoverRenderProps = {
    trigger: () => local.trigger ?? "Select",
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
    [select.slots().popover(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-032 … R-035 / R-036 / R-037: the enter start classes come off one frame
  // after mount; the exit classes stay for the 100ms hold. The closed layer is
  // `hidden` — the list below stays mounted (port sheet §5, third change).
  const classList = computed(() => {
    const list: Record<string, boolean> = {
      hidden: !presence.isPresent(),
    };
    const current = side();

    if (presence.isEntering()) {
      list["opacity-0 scale-95"] = true;

      if (current === "top") {
        // R-032
        list["translate-y-1"] = true;
      } else if (current === "bottom") {
        // R-033
        list["-translate-y-1"] = true;
      } else if (current === "left") {
        // R-034
        list["translate-x-1"] = true;
      } else {
        // R-035
        list["-translate-x-1"] = true;
      }
    }

    if (presence.isExiting()) {
      // R-037: the exit keeps the layer painted but inert.
      list["opacity-0 scale-95 pointer-events-none"] = true;
    }

    return list;
  });

  const style = () => [
    TRANSITION_STYLE,
    presence.isExiting() ? EXIT_DURATION_STYLE : undefined,
    { transformOrigin: transformOrigin(), minWidth: triggerWidth() },
    resolvedStyle(),
  ];

  const scrollStyle = (): StyleProp<ViewStyle> => ({
    maxHeight: availableHeight(),
  });

  const containerValue: ListBoxContainerContextValue = {
    // R-042: `.select__popover [data-slot="list-box"]`.
    listClass: () => "p-1.5 outline-none",
    // R-043: `.select__popover [data-slot="list-box-item"]`.
    itemClass: () => "px-2.5",
    // R-045: `:not([aria-multiselectable="true"])` → single-select only.
    suppressIndicatorTransition: () => select.selectionMode() !== "multiple",
    // The listbox's name: upstream `aria-labelledby` points at the field's
    // label; NSH hands the registered text down instead.
    accessibilityLabel: () => select.labelText(),
  };

  const handleCancel = () => {
    if (!isKeyboardDismissDisabled()) {
      close();
    }
  };

  // A-004/A-005/A-006: the carrier probes. Each branch derives its `testID`
  // from the caller's — `<id>-panel` on the anchored overlay, `<id>-sheet` on
  // the SheetContent, `<id>-dialog` on the fullscreen box — so `shows`/`count`
  // discriminate which carrier `presentation` mounted (the popover unit's
  // `<id>-default` convention). The A-013 fixture mounts
  // `testID="sel-pop"` to read them, and the A-014 assertion files are what
  // these observable ids answer to.
  const panelTestID = () =>
    local.testID !== undefined ? `${local.testID}-panel` : undefined;
  const sheetTestID = () =>
    local.testID !== undefined ? `${local.testID}-sheet` : undefined;
  const dialogTestID = () =>
    local.testID !== undefined ? `${local.testID}-dialog` : undefined;

  /* Scoped trigger context (popover A-003's controller ruling): inside the
   * Sheet carrier a Button / ListBox must not pose as the sheet's own trigger
   * or close the wrong channel — `isOpen` reports "no opinion" (`undefined`),
   * `close` still reaches this popover's `close`, and registration is inert.
   * Re-supplied inside `SheetContent` where `SheetRoot`'s own context would
   * otherwise shadow the field's. */
  const scopedTrigger: OverlayTriggerContextValue = {
    isOpen: () => undefined,
    setIsOpen: () => {},
    toggle: () => {},
    close: () => close(),
    registerTrigger: () => () => {},
    triggerRef: () => undefined,
  };

  // One read of `props.children` per carrier, at the placement inside the
  // container that tells the list which classes and switches it gets. A
  // factory, not a shared element: an element node mounts under one parent
  // only, so each retained carrier branch holds its own copy of the subtree
  // — a shared node left the panel's Scroll empty (the later branch
  // references claimed it first). The carrier-scoped providers name which
  // copy this is: `SelectCarrierContext` for parts that ask, and the wrapped
  // owner so the copy's ListBox registers under this carrier's tag.
  const list = (carrier: SelectCarrier) => (
    <SelectCarrierContext.Provider value={carrier}>
      <ListOwnerContext.Provider value={carrierOwner(carrier)}>
        <ListBoxContainerContext.Provider value={containerValue}>
          {renderChildren(local.children)}
        </ListBoxContainerContext.Provider>
      </ListOwnerContext.Provider>
    </SelectCarrierContext.Provider>
  );

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
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      class={classes()}
      classList={classList()}
      style={style()}
      onPressOutside={isOpen() ? close : undefined}
      onCancel={isOpen() ? handleCancel : undefined}
      onPosition={handlePosition}
      onLayout={local.onLayout}
    >
      <Scroll
        scrollbar={true}
        class="w-full"
        style={scrollStyle()}
      >
        {list("panel")}
      </Scroll>
    </Overlay>
  );

  // A-004: the panel branch is the pre-existing render chain, verbatim — the
  // modal underlay plus the anchored content overlay. `"panel"` *is* the
  // upstream popover, so nothing about its structure changes; `measureAnchor`
  // / `handlePosition` / `transformOrigin` / `triggerWidth` / `availableHeight`
  // are only referenced on this carrier. The underlay exists only while
  // something is shown: the closed field keeps the content mounted in the
  // tree, but hidden, so the list's collection survives (port sheet §5, third
  // and sixth changes).
  const panelBranch = (
    <If when={!isNonModal()} else={contentOverlay}>
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

  /* A-005: the sheet carrier composes the existing Sheet parts, upstream's
   * `bottom-sheet` state. The popover keeps owning the open state — `SheetRoot`
   * is a controlled shell fed `isOpen`, and a sheet dismissal (backdrop press,
   * swipe, Escape) reports `onOpenChange(false)` into the same `close()` the
   * underlay and `handleCancel` take, which still runs the two write paths
   * (`setOwnIsOpen` + `select.close()`).
   *
   * `SheetBackdrop` gets `isExiting` forced: the select contract keeps the
   * list mounted across every close (typeahead / first focus / `Value`
   * read-back), and on this carrier only the backdrop's retention keeps the
   * subtree — without it a once-opened sheet would unmount the `ListBox`,
   * unregister the collection and lose `selectionManager` (the heaviest
   * ruling of this unit, sheet §6 margin note; `isExiting` is the existing
   * `retentionProps` / Native `forceMount` counterpart — no new prop).
   * `isKeyboardDismissDisabled` goes with it so the contract prop gates
   * Escape on this carrier exactly as `handleCancel` gates it on the panel
   * chain.
   *
   * `SheetContent` carries the popover's own look and the id / testID / label
   * forwards; `SheetDialog` is the panel — the `SheetContentPanContext`
   * supply point, which is what makes the sheet input scenario participate
   * in G (content-area pan + `keyboardDismissMode: "interactive"` reaching
   * `SheetBody`'s paired Scroll through `scrollProps`); `SheetBody` wraps the
   * same `{list}` subtree, replacing the panel branch's `Scroll` slot for
   * slot. `props.isExiting` / `isEntering` / `shouldSkipAnimation` are not
   * forwarded: the carrier always retains its mount, so the caller's exit
   * intent has no semantics here (§8). */
  const sheetBranch = (
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
          accessibilityLabel={
            local["aria-label"] ?? local.accessibilityLabel
          }
          className={classes()}
          style={resolvedStyle()}
        >
          <OverlayTriggerContext.Provider value={scopedTrigger}>
            <SheetDialog>
              <SheetBody>{list("sheet")}</SheetBody>
            </SheetDialog>
          </OverlayTriggerContext.Provider>
        </SheetContent>
      </SheetBackdrop>
    </SheetRoot>
  );

  /* A-006: the fullscreen carrier, upstream's `dialog` state — Native's
   * `SelectContentDialog` wrapper is an absolute-fill layer with a centered
   * content box and no anchor geometry. Here it is the same two-Overlay chain
   * the panel draws — a dead underlay layer plus an inner `Overlay` as the
   * box — except the inner one is un-anchored (`anchor` `null` → a
   * `position: fixed` box of the root view) and centers itself the way the
   * codebase's centered boxes do: `left-1/2 top-1/2` plus the two
   * `-translate-*-1/2` classes (a translate percentage is of the view's own
   * box). `inset-0 m-auto` was the first attempt and it stretches instead of
   * centering: the four inset pins fix the box's height to the window's, so
   * `m-auto` centres only the maxHeight slack — the box reported 12→756 on a
   * 768 viewport, no "outside" worth the name. `w-full` gives it the content
   * width, the content gives the height.
   *
   * The box carries the popover look, the id / testID / label / ref forwards
   * and the same `hidden` class semantics; its bounds come from the viewport
   * inset by `containerPadding` — `availableHeight`'s counterpart on a
   * carrier with no placement (§8). The dismissal channels are the panel's,
   * verbatim: `onPressOutside` and `onCancel` — an overlay's own surface is
   * not a press target in NSH (measured: neither `onPress` on an `Overlay`
   * nor on a paint `View` inside it ever fires for the `app.press` that
   * resolves to the page; only `onPressOutside` sees it). The inner overlay
   * goes inert with `pointer-events-none` while closed, so the exit hold
   * never covers the trigger; the outer underlay keeps the retention and
   * press pass-through rules the panel's underlay has. Retention is the
   * panel's: `hidden`, not unmount. */
  const dialogInset = () => (local.containerPadding ?? 12) * 2;
  const dialogStyle = (): StyleProp<ViewStyle> => [
    TRANSITION_STYLE,
    presence.isExiting() ? EXIT_DURATION_STYLE : undefined,
    {
      maxWidth: windowSize().width - dialogInset(),
      maxHeight: windowSize().height - dialogInset(),
      minWidth: triggerWidth(),
    },
    resolvedStyle(),
  ];

  const fullscreenBranch = (
    <Overlay
      class="inset-0"
      classList={{
        hidden: !presence.isPresent(),
        "pointer-events-none": !isOpen(),
      }}
      focusable={false}
    >
      <Overlay
        ref={(node) => local.ref?.(node)}
        anchor={null}
        class={`left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full ${classes()}`}
        classList={{ ...classList(), "pointer-events-none": !isOpen() }}
        style={dialogStyle()}
        testID={dialogTestID()}
        nativeID={local.id ?? local.nativeID}
        accessibilityLabel={
          local["aria-label"] ?? local.accessibilityLabel
        }
        onPressOutside={isOpen() ? close : undefined}
        onCancel={isOpen() ? handleCancel : undefined}
        onLayout={local.onLayout}
      >
        <Scroll
          scrollbar={true}
          class="w-full"
          style={{
            maxHeight: windowSize().height - dialogInset(),
          }}
        >
          {list("fullscreen")}
        </Scroll>
      </Overlay>
    </Overlay>
  );

  return (
    <If
      when={presentation() === "sheet"}
      else={
        <If when={presentation() === "fullscreen"} else={panelBranch}>
          {fullscreenBranch}
        </If>
      }
    >
      {sheetBranch}
    </If>
  );
}
