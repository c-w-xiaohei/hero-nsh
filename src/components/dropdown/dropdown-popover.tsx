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
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import type {
  PopoverPlacement,
  PopoverSide,
} from "../popover/popover-placement";
import { resolvePopoverPlacement } from "../popover/popover-placement";
import type { DropdownPopoverContextValue } from "./dropdown-context";
import {
  DropdownContext,
  DropdownPopoverContext,
  DropdownSubmenuContext,
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
  const submenu = DropdownSubmenuContext();
  const overlayTrigger = OverlayTriggerContext();

  const slots = dropdown?.slots ?? dropdownVariants();

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
    [slots.popover(), resolvedClassName()]
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

  // R-015 / R-016: the min and max width are measured values, so they are
  // inline. `available.width` already excludes the safe-area margin.
  const minWidth = () => {
    const available = availableWidth();

    return available == null ? 220 : Math.min(220, available);
  };

  const maxWidth = () => availableWidth();

  const style = () => [
    TRANSITION_STYLE,
    // R-025: the exit is 100ms while the base class keeps 150ms for the enter.
    presence.isExiting() ? EXIT_DURATION_STYLE : undefined,
    { transformOrigin: transformOrigin(), minWidth: minWidth(), maxWidth: maxWidth() },
    resolvedStyle(),
  ];

  const scrollStyle = (): StyleProp<ViewStyle> => ({
    // R-012: `.dropdown__popover`'s `overflow-y-auto` capped by the room the
    // core Overlay reports on the chosen side.
    maxHeight: availableHeight(),
  });

  const handleCancel = () => {
    if (!isKeyboardDismissDisabled()) {
      close();
    }
  };

  // The underlay only hit-tests while the layer is open; during the exit hold
  // it stays mounted around the content but lets the trigger take the press.
  const underlayClassList = computed(() => ({
    hidden: !presence.isPresent(),
    "pointer-events-none": !isOpen(),
  }));

  // One read of `props.children`, at its placement inside the scroll viewport
  // and the context the menu reads. The content stays mounted while the layer
  // is closed, as Select's list does: NSH builds a collection from mounted
  // parts, and remounting it on every open would also re-create the
  // `SubmenuTrigger` parts below it and lose their open state.
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
      offset={local.offset ?? 8}
      margin={local.containerPadding ?? 12}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      class={classes()}
      classList={classList()}
      style={style()}
      onPressOutside={close}
      onCancel={handleCancel}
      onPosition={handlePosition}
    >
      {content}
    </Overlay>
  );

  // The modal underlay: the second overlay that absorbs presses outside the
  // layer, as RAC's `usePopover` underlay. It has to be the outer overlay with
  // the content nested inside it (two sibling overlays both claim the press on
  // the web target, so the content would never see one). `isNonModal` is read
  // when the layer shows, not tracked afterwards, as in React Aria.
  return (
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
}
