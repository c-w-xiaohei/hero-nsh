import type { Accessor } from "nsh";
import { computed, context, effect, reduceMotion, signal, windowSize } from "nsh";

import type { SheetPlacement, SheetSwipeDirection } from "./sheet.styles";
import {
  animateSheetValue,
  nearestSheetSnap,
  resolveSheetSnapPoints,
  sheetAxisFor,
  sheetDismissTarget,
  sheetDragLength,
  sheetScrollPosition,
} from "./sheet.utils";

/** `m-2` of a detached sheet, in points (0.5rem each side). */
const DETACHED_MARGIN = 8;

/**
 * What `Sheet.Content` gives the parts inside it: the sheet's current detent
 * and the handle drag that moves it.
 *
 * HeroUI gets all of this from React Aria's scroll-snap Sheet (a scroll offset
 * plus `data-expanded`). NSH has no scroll-snap and no scroll-progress
 * timeline, so the same state is a signal here (port sheet §5): the *length*
 * along the sheet's axis that is revealed, in points, from 0 (hidden) to
 * `fullLength`. `Sheet.Content` reads it as the clip box's axial size,
 * `Sheet.Dialog` reports its natural length for the dismissal threshold, and
 * `Sheet.Handle` moves it.
 *
 * It lives at the component level rather than at `src/primitives/`, as the
 * batch rule requires for new shared code (port sheet §5).
 */
export interface SheetDetentState {
  /** The axis the sheet reveals along: x for left / right, y for top / bottom. */
  axis: Accessor<"x" | "y">;

  /**
   * The swipe direction in force: the Backdrop's `swipeDirection` when given,
   * the placement otherwise (port sheet §2). It decides the drag axis (T-014).
   */
  direction: Accessor<SheetSwipeDirection>;

  /** The carrier's length along the axis: the window's height or width. */
  extent: Accessor<number>;

  /** The length a fully expanded sheet takes (`extent`, minus the detached margins). */
  fullLength: Accessor<number>;

  /** Ascending resting lengths, the first snap point first and full last. */
  detents: Accessor<number[]>;

  /** Whether any partial resting position exists, i.e. the length is a runtime value. */
  hasPartialDetents: Accessor<boolean>;

  /** The revealed length along the axis, in points. */
  length: Accessor<number>;

  /** How far the panel is pushed toward closed: `fullLength - length`. */
  offset: Accessor<number>;

  /** The length reached the full detent, so the body may scroll (R-032). */
  isExpanded: Accessor<boolean>;

  /** A handle drag is in progress (R-035's cursor). */
  dragging: Accessor<boolean>;

  /** `Sheet.Dialog` reports its natural length here, for the dismissal threshold. */
  registerPanelLength: (length: number) => void;

  /** Moves to a detent, animating as a release does. */
  goToDetent: (index: number) => void;

  /** The Handle's responder channel. */
  beginDrag: (position: number, timestamp: number) => void;
  moveDrag: (position: number, timestamp: number) => void;
  endDrag: (position: number, timestamp: number) => void;
  cancelDrag: () => void;
}

/** What `createSheetDetent` takes: the dimensions the Root owns and the close channel. */
export interface CreateSheetDetentProps {
  placement: Accessor<SheetPlacement>;
  /** The Backdrop's `swipeDirection`, when it gave one. */
  swipeDirection: Accessor<SheetSwipeDirection | undefined>;
  isDetached: Accessor<boolean>;
  isDismissable: Accessor<boolean>;
  snapPoints: Accessor<Array<number | string> | undefined>;
  isOpen: Accessor<boolean>;
  close: () => void;
}

/** The context itself; `null` outside a `Sheet.Content`. */
export const SheetDetentContext = context<SheetDetentState | null>(null);

interface HandleDragState {
  startPosition: number;
  startLength: number;
  startedAt: number;
  lastLength: number;
  lastTime: number;
  /** Points per millisecond, positive while the sheet grows. */
  velocity: number;
}

/**
 * The detent and drag state of one sheet.
 *
 * Upstream `useSheetHandleDrag` writes `scrollTop` / `scrollLeft` on React
 * Aria's scroller and lets `scroll-snap` do the settling; the numeric policies
 * (`nearestSheetSnap`, `sheetDismissTarget`, `animateSheetValue`) are the same
 * functions here, applied to the reveal length, and the animation writes the
 * length frame by frame because a size is not a CSS transition (port sheet §5).
 */
export function createSheetDetent(props: CreateSheetDetentProps): SheetDetentState {
  const direction = (): SheetSwipeDirection =>
    props.swipeDirection() ?? props.placement();

  const axis = computed(() => sheetAxisFor(direction()));

  const extent = computed(() => {
    const size = windowSize();

    return axis() === "x" ? size.width : size.height;
  });

  const fullLength = computed(() =>
    Math.max(0, extent() - (props.isDetached() ? DETACHED_MARGIN * 2 : 0)),
  );

  const detents = computed<number[]>(() => {
    const full = fullLength();
    const resolved = resolveSheetSnapPoints(props.snapPoints(), extent())
      .map((point) => Math.min(point, full))
      .sort((left, right) => left - right)
      // A point at (or past) the full detent is the implicit last resting
      // position, not a second one, and duplicates would make the snap
      // ambiguous.
      .filter((point, index, list) => point < full - 0.5 && (index === 0 || point - list[index - 1] > 0.5));

    return [...resolved, full];
  });

  const hasPartialDetents = computed(() => detents().length > 1);

  const firstDetent = () => detents()[0] ?? 0;

  const length = signal(firstDetent());
  const dragging = signal(false);
  const panelLength = signal(0);

  const offset = computed(() => Math.max(0, fullLength() - length()));

  const isExpanded = computed(() => fullLength() > 0 && length() >= fullLength() - 0.5);

  let drag: HandleDragState | undefined;
  let cancelAnimation: (() => void) | undefined;

  const stopAnimation = () => {
    cancelAnimation?.();
    cancelAnimation = undefined;
  };

  const animate = (target: number, complete?: () => void) => {
    stopAnimation();

    cancelAnimation = animateSheetValue(
      length(),
      target,
      (value) => length.set(value),
      () => {
        cancelAnimation = undefined;
        complete?.();
      },
      reduceMotion(),
    );
  };

  // A reopen always starts at the first resting position (port sheet T-027):
  // the retained subtree keeps its content, not its detent.
  let wasOpen = props.isOpen();

  effect(() => {
    const open = props.isOpen();

    if (open === wasOpen) return;

    wasOpen = open;

    stopAnimation();
    drag = undefined;
    dragging.set(false);

    if (open) {
      length.set(firstDetent());
    }
  });

  effect(() => () => {
    stopAnimation();
    drag = undefined;
    dragging.set(false);
  });

  const goToDetent = (index: number) => {
    const list = detents();
    const target = list[Math.min(Math.max(index, 0), list.length - 1)];

    if (target !== undefined) animate(target);
  };

  const beginDrag = (position: number, timestamp: number) => {
    if (!props.isOpen()) return;

    stopAnimation();

    const startLength = length();

    drag = {
      lastLength: startLength,
      lastTime: timestamp,
      startLength,
      startPosition: position,
      startedAt: timestamp,
      velocity: 0,
    };
    dragging.set(true);
  };

  const moveDrag = (position: number, timestamp: number) => {
    const state = drag;

    if (!state) return;

    const next = Math.min(
      Math.max(
        sheetDragLength({
          placement: props.placement(),
          startLength: state.startLength,
          swipeDirection: direction(),
          travel: position - state.startPosition,
        }),
        0,
      ),
      fullLength(),
    );
    const elapsed = timestamp - state.lastTime;

    if (elapsed > 0) {
      state.velocity = (next - state.lastLength) / elapsed;
    }

    state.lastLength = next;
    state.lastTime = timestamp;
    length.set(next);
  };

  const release = (position: number, timestamp: number, cancelled: boolean) => {
    const state = drag;

    if (!state) return;

    drag = undefined;
    dragging.set(false);

    const travel = position - state.startPosition;
    const current = length();
    const full = fullLength();
    const list = detents();

    if (!cancelled && list.length > 1) {
      // With resting positions the release only chooses one of them, as
      // upstream's `nearestSheetSnap` branch does: a handle drag never closes a
      // snap sheet (T-027 closes through the close trigger).
      const target = nearestSheetSnap(list, current, -state.velocity);

      animate(target ?? state.startLength);

      return;
    }

    if (cancelled) {
      animate(state.startLength);

      return;
    }

    // Without resting positions the release either dismisses or goes back to
    // the resting length; `sheetDismissTarget` decides on the same two
    // thresholds (25% of the panel, 0.4 points/ms), in the scroll space its
    // signature speaks.
    //
    // A `horizontal` / `vertical` swipe has two closed ends — React Aria's
    // scroller is two viewports long on that axis (`Sheet.tsx`, `getSwipeConfig`
    // `containerOffset`) — so the side the pointer left through names the edge
    // the scroll coordinate closes at. Without that, `sheetDismissTarget`
    // answers `extent`, which is where the rest position already sits, and the
    // drag would read as "back to rest" in half of the directions (T-014's
    // leftward and upward cases).
    const swipe = direction();
    const scrollDirection: SheetSwipeDirection =
      swipe === "horizontal"
        ? travel >= 0
          ? "bottom"
          : "top"
        : swipe === "vertical"
          ? travel >= 0
            ? "right"
            : "left"
          : swipe;
    const restScroll = sheetScrollPosition(state.startLength, full, scrollDirection);
    const dismissed =
      sheetDismissTarget({
        current: sheetScrollPosition(current, full, scrollDirection),
        elapsed: timestamp - state.startedAt,
        extent: full,
        isDismissable: props.isDismissable(),
        rest: restScroll,
        size: panelLength(),
        swipeDirection: direction(),
        travel,
        viewport: extent(),
      }) !== restScroll;

    if (dismissed) {
      // The panel slides out over the release curve, then the sheet closes; the
      // host dialog's own exit follows (port sheet §2).
      animate(0, () => props.close());

      return;
    }

    animate(state.startLength);
  };

  return {
    axis,
    direction,
    extent,
    fullLength,
    detents,
    hasPartialDetents,
    length,
    offset,
    isExpanded,
    dragging,
    registerPanelLength: (value) => panelLength.set(value),
    goToDetent,
    beginDrag,
    moveDrag,
    endDrag: (position, timestamp) => release(position, timestamp, false),
    cancelDrag: () => {
      const state = drag;

      if (!state) return;

      drag = undefined;
      dragging.set(false);
      animate(state.startLength);
    },
  };
}
