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
import { HoverTriggerContext } from "../../primitives/create-overlay-trigger";
import { renderChildren } from "./children";
import type { TooltipContextValue, TooltipPositionContextValue, TooltipState } from "./tooltip-context";
import { TooltipContext, TooltipPositionContext } from "./tooltip-context";
import type { TooltipPlacement, TooltipSide } from "./tooltip-placement";
import { resolveTooltipPlacement } from "./tooltip-placement";
import { tooltipVariants } from "./tooltip.styles";

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/

// The transition property list has one inline owner; durations are classes.
const TRANSITION_STYLE = { transitionProperty: "opacity, transform" } as const;

/** The live state HeroUI hands to `Content`'s `className` and `style` functions. */
export interface TooltipRenderValues {
  /**
   * React Aria's `PlacementAxis`: the side the tip ended up on, `null` until the
   * core Overlay has positioned it once (`react-aria-components/src/
   * Tooltip.tsx`).
   */
  placement: Accessor<TooltipSide | null>;

  isEntering: Accessor<boolean>;
  isExiting: Accessor<boolean>;

  /**
   * React Aria's `TooltipTriggerState` in D17 form: an object of accessors, so
   * `isOpen` keeps following (HeroUI hands over a plain object whose fields are
   * booleans).
   */
  state: Accessor<TooltipState>;
}

export interface TooltipContentProps {
  /** Read once, inside the overlay, at the placement. */
  children: JSX.Element;

  /** Appended after the base slot classes; later classes win. */
  className?: string | ((values: TooltipRenderValues) => string);
  style?: StyleProp<ViewStyle> | ((values: TooltipRenderValues) => StyleProp<ViewStyle>);

  /** The overlay view; `measure()` reaches it. `focus()` has no target: a tip takes no focus. */
  ref?: (node: ViewRef) => void;

  /** React Aria placement (default `"top"`); mapped per port sheet §5.6. */
  placement?: TooltipPlacement;

  /**
   * The gap between anchor and tip. HeroUI's expression, truthiness included:
   * `offset ? offset : showArrow ? 7 : 3`, so `offset={0}` counts as unset.
   */
  offset?: number;

  /** The safe-area margin (default 12; React Aria's `containerPadding`). */
  containerPadding?: number;

  /** Displacement along the anchor's cross axis. */
  crossOffset?: number;

  /** Accepted, no effect: the core Overlay always flips when the other side fits. */
  shouldFlip?: boolean;

  /** Additional inset when clamping the arrow near the content's corners. */
  arrowBoundaryOffset?: number;

  /** HeroUI's own flag: it only picks the default offset (7 instead of 3). */
  showArrow?: boolean;

  /**
   * The content's own open state. React Aria uses it when the caller passes
   * `isOpen` / `defaultOpen` or when there is no trigger at all (port sheet §2).
   */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;

  /** Forces the enter state (custom animations). */
  isEntering?: boolean;

  /** Forces the exit state and keeps the content mounted. */
  isExiting?: boolean;

  /** A standalone Content can be anchored to a trigger ref directly. */
  triggerRef?: ViewRef | null;

  /** Accepted, no effect: the overlay renders in its own root view. */
  UNSTABLE_portalContainer?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;

  /** Maps to `accessibilityLabel`; NSH has no tooltip role (§5.8). */
  "aria-label"?: string;
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH resolves no accessible names from ids. */
  "aria-labelledby"?: string;
  /** Accepted, no effect: NSH resolves no descriptions from ids. */
  "aria-describedby"?: string;
  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
  /** Accepted, no effect: direction comes from the host's `ltr:` / `rtl:` variants. */
  dir?: "ltr" | "rtl";
  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;
}

/**
 * Tooltip.Content / TooltipContent: HeroUI's `Tooltip.Root` content (React
 * Aria's `Tooltip`). Built on the core `Overlay` for placement, following,
 * flipping and Escape, with the presence / exit hold from
 * `createOverlayPresence` (port sheet §3, §5.5).
 */
export function TooltipContent(props: TooltipContentProps) {
  const rootTrigger = HoverTriggerContext();
  const tooltip = TooltipContext();

  const slots = tooltip?.slots ?? tooltipVariants();

  /* -------------------------------------------------------------------------------------------
   * Open state: React Aria's rule — a Content that gets `isOpen` / `defaultOpen`,
   * or that has no trigger state above it, controls itself.
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
    ownsState() ? ownIsOpen() : (tooltip?.isOpen() ?? false),
  );

  const setOpen = (next: boolean) => {
    if (ownsState()) {
      setOwnIsOpen(next);
    } else if (next) {
      // The root's machine owns the timers and the registry, so its channel is
      // the way to take over: React Aria's Content does the same through the
      // trigger state it reads.
      tooltip?.state.open(true);
    } else {
      tooltip?.state.close(true);
    }
  };

  /**
   * HeroUI's `TooltipAnimationScope` (`tooltip.tsx:44-54`) clears React Aria's
   * warmup skip for the descendants unless Root's `shouldSkipAnimation` prop is
   * true, so both phases animate by default, a swap included. The one state that
   * may drop them is the caller opting in *and* the state machine reporting the
   * swap.
   */
  const skipsAnimation = () =>
    !ownsState() &&
    (tooltip?.shouldSkipAnimation() ?? false) &&
    (tooltip?.skipAnimation() ?? false);

  /* -------------------------------------------------------------------------------------------
   * Presence, placement and geometry (port sheet §5.5, §5.6).
   * ----------------------------------------------------------------------------------------- */
  const presence = createOverlayPresence({
    isOpen,
    durationMs: () => 100,
    isEntering: () => props.isEntering,
    isExiting: () => props.isExiting,
  });

  // React Aria's mount rule: open, or held through the exit unless the swap
  // path dropped the animation. The condition lives in `when`, never in `<If>`'s
  // child, which runs untracked.
  const mounted = computed(
    () => isOpen() || (!skipsAnimation() && presence.isPresent()),
  );

  const resolved = computed(() => resolveTooltipPlacement(props.placement));
  const positionedSide = signal<TooltipSide | undefined>(undefined);

  const side = computed(() => positionedSide() ?? resolved().side);

  const anchorBounds = signal<Bounds | undefined>(undefined);
  const overlayBounds = signal<Bounds | undefined>(undefined);

  const anchor = () => props.triggerRef ?? tooltip?.triggerRef();

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
    if (!isOpen()) {
      return;
    }

    measureAnchor();
  });

  const handlePosition = (event: OverlayPosition) => {
    positionedSide.set(event.placement);
    overlayBounds.set(event.bounds);
    measureAnchor();
  };

  // R-002: HeroUI's `origin: var(--trigger-anchor-point)`, the anchor's centre
  // in the tip's own coordinates.
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
   * Render values, classes and styles.
   * ----------------------------------------------------------------------------------------- */
  const ownState: TooltipState = {
    isOpen: ownIsOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
  };

  const values: TooltipRenderValues = {
    placement: () => positionedSide() ?? null,
    isEntering: presence.isEntering,
    isExiting: presence.isExiting,
    state: () => (ownsState() ? ownState : (tooltip?.state ?? ownState)),
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

  // R-006 … R-011: the enter starting classes come off one frame after mount;
  // the exit classes stay for the 100ms hold. HeroUI forces both animations on
  // unless Root's `shouldSkipAnimation` opts out, so only that opted-out state
  // may drop the classes.
  const classList = computed(() => {
    const list: Record<string, boolean> = {};
    const current = side();

    if (presence.isEntering() && !skipsAnimation()) {
      // R-006: `heroui-overlay-enter-90` becomes the starting classes plus the
      // base duration and curve (no keyframes in NSH). The translations below
      // are the four placement variants.
      list["opacity-0 scale-90"] = true;

      if (current === "top") {
        // R-007: `-y`, from below up into place.
        list["translate-y-1"] = true;
      } else if (current === "bottom") {
        // R-008: `-ny`, from above down into place.
        list["-translate-y-1"] = true;
      } else if (current === "left") {
        // R-009: `-x`, from the right leftwards into place.
        list["translate-x-1"] = true;
      } else {
        // R-010: `-nx`, from the left rightwards into place.
        list["-translate-x-1"] = true;
      }
    }

    if (presence.isExiting() && !skipsAnimation()) {
      // R-011: the 100ms exit, out of the pointer's way while it plays.
      list["opacity-0 scale-95 pointer-events-none duration-100"] = true;
    } else {
      list["duration-150"] = true;
    }

    return list;
  });

  const style = () => [
    TRANSITION_STYLE,
    { transformOrigin: transformOrigin() },
    {
      translate:
        side() === "top" || side() === "bottom"
          ? ([props.crossOffset ?? 0, 0] as [number, number])
          : ([0, props.crossOffset ?? 0] as [number, number]),
    },
    resolvedStyle(),
  ];

  const positionContext: TooltipPositionContextValue = {
    anchorBounds,
    overlayBounds,
    side,
    placement: () => positionedSide() ?? null,
    crossOffset: () => props.crossOffset ?? 0,
    arrowBoundaryOffset: () => props.arrowBoundaryOffset ?? 0,
  };

  /* -------------------------------------------------------------------------------------------
   * Scoped hover context (port sheet §3): inside the tip a Button must not
   * become the anchor or drive the tip; its own hover and press do nothing to
   * this root.
   * ----------------------------------------------------------------------------------------- */
  const scopedHover = {
    hoverStart: () => {},
    hoverEnd: () => {},
    focusStart: () => {},
    focusEnd: () => {},
    pressStart: () => {},
    press: () => {},
    registerTrigger: () => () => {},
  };

  const handleCancel = () => {
    setOpen(false);
  };

  // Content hover: React Aria's `useTooltip` keeps the tip while the pointer is
  // on the content, and closes after `closeDelay` when it leaves.
  const handleMouseEnter = () => {
    if (!ownsState()) {
      tooltip?.contentHoverStart();
    }
  };

  const handleMouseLeave = () => {
    if (!ownsState()) {
      tooltip?.contentHoverEnd();
    }
  };

  // One read of `props.children`, at its placement inside the content overlay.
  const contentOverlay = (
    <Overlay
      ref={(node) => props.ref?.(node)}
      anchor={anchor() ?? null}
      placement={resolved().side}
      align={resolved().align}
      offset={props.offset ? props.offset : props.showArrow ? 7 : 3}
      margin={props.containerPadding ?? 12}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      class={classes()}
      classList={classList()}
      style={style()}
      onCancel={handleCancel}
      onPosition={handlePosition}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <TooltipPositionContext.Provider value={positionContext}>
        <HoverTriggerContext.Provider value={scopedHover}>
          {renderChildren(props.children)}
        </HoverTriggerContext.Provider>
      </TooltipPositionContext.Provider>
    </Overlay>
  );

  return <If when={mounted()}>{contentOverlay}</If>;
}
