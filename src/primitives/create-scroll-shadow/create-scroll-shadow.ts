/*
 * Portions of this file are based on code from HeroUI.
 * Apache License Version 2.0, Copyright (c) 2024 HeroUI.
 *
 * Credits to the HeroUI team:
 * https://github.com/heroui-inc/heroui/blob/v3.2.7/packages/react/src/components/scroll-shadow/use-scroll-shadow.ts
 * https://github.com/heroui-inc/heroui/blob/v3.2.7/packages/styles/components/scroll-shadow.css
 *
 * Adapted to NSH: the DOM reads (`scrollTop`, `clientHeight`, `scrollHeight`,
 * the `data-*` attributes, `requestAnimationFrame`) become a geometry snapshot
 * fed by host events, and the two CSS paths (the scroll timeline and the
 * `data-*` fallback) collapse into one computed `maskImage`.
 */

import type { Accessor, Bounds, ScrollEvent } from "nsh";
import { computed, effect, signal } from "nsh";

/** The axis the shadow travels along. */
export type ScrollShadowOrientation = "vertical" | "horizontal";

/**
 * The shadow state HeroUI exposes, unchanged.
 * `"auto"` is the detection mode; every other value is controlled.
 */
export type ScrollShadowVisibility =
  | "auto"
  | "both"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "none";

export interface CreateScrollShadowProps {
  /** The scroll axis. HeroUI's `orientation`, default `"vertical"`. */
  orientation: Accessor<ScrollShadowOrientation | undefined>;

  /** Pixels scrolled before the start edge fades. HeroUI's `offset`, default `0`. */
  offset: Accessor<number | undefined>;

  /** The fade length in pixels. HeroUI's `size`, default `40`. */
  size: Accessor<number | undefined>;

  /** `"auto"` (detect) or a fixed state. HeroUI's `visibility`, default `"auto"`. */
  visibility: Accessor<ScrollShadowVisibility | undefined>;

  /** Whether detection runs. HeroUI's `isEnabled`, default `true`. */
  isEnabled: Accessor<boolean | undefined>;

  /**
   * The root's layout direction (`"ltr"` / `"rtl"`), which picks the physical
   * side of the horizontal fade and the meaning of the horizontal offset. NSH
   * cannot read an inherited direction, so the component resolves it from its
   * own `dir` or from the direction probe (port sheet §8). Absent means left
   * to right.
   */
  dir?: Accessor<"ltr" | "rtl" | "auto" | undefined>;

  /**
   * Whether `dir` is settled rather than a default guess: `true` when the
   * component's own `dir` names a direction, or once the direction probe has
   * laid out. A horizontal offset cannot be interpreted before that. Defaults
   * to `true`.
   */
  isDirReady?: Accessor<boolean>;

  /**
   * Called with the new state when the pair (can scroll before, can scroll
   * after) changes. The component passes a wrapper that reads the newest prop
   * at call time, as HeroUI's `onVisibilityChangeRef` does.
   */
  onVisibilityChange?: (visibility: ScrollShadowVisibility) => void;
}

export interface CreateScrollShadowState {
  /** The root's `maskImage`; `undefined` when no fade is drawn. */
  maskImage: Accessor<string | undefined>;

  /** The resolved state, `"auto"` included only until geometry arrives. */
  visibility: Accessor<ScrollShadowVisibility>;

  /** `<Scroll onScroll>`: the offset and both sizes in one event. */
  onScroll: (event: ScrollEvent) => void;

  /** `<Scroll onLayout>`: the viewport box. */
  onViewportLayout: (event: { bounds: Bounds }) => void;

  /** The measuring content view's `onLayout`: the content box. */
  onContentLayout: (event: { bounds: Bounds }) => void;
}

const DEFAULT_SIZE = 40;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

/** A linear gradient that fades both ends of the box, in points. */
function fadeGradient(
  orientation: ScrollShadowOrientation,
  rtl: boolean,
  length: number,
  startFade: number,
  endFade: number,
): string {
  // `180deg` runs top to bottom; `90deg` left to right, `270deg` right to left,
  // which is the horizontal start edge in a right-to-left layout. R-011,
  // R-015, R-021, R-022.
  const angle = orientation === "vertical" ? 180 : rtl ? 270 : 90;
  const end = Math.max(0, length - endFade);
  const viewport = Math.max(0, length);

  // Absolute stop points instead of `calc()`: the same geometry as upstream's
  // `transparent 0, #000 var(--start), #000 calc(100% - var(--end)),
  // transparent 100%` with the variable substituted.
  return (
    `linear-gradient(${angle}deg, transparent 0px, #000 ${startFade}px, ` +
    `#000 ${end}px, transparent ${viewport}px)`
  );
}

/**
 * The scroll-shadow state machine: a geometry snapshot fed by the scroll host
 * and the measuring content view, the HeroUI thresholds over it, and the mask
 * that the CSS scroll timeline and the `data-*` fallback draw upstream.
 *
 * Inputs are accessors, outputs are accessors and event handlers; it holds no
 * element object (research 4.4). The returned handlers are the only writers.
 */
export function createScrollShadow(
  props: CreateScrollShadowProps,
): CreateScrollShadowState {
  const isVertical = computed(() => (props.orientation() ?? "vertical") === "vertical");
  const offset = computed(() => props.offset() ?? 0);
  const size = computed(() => props.size() ?? DEFAULT_SIZE);
  const isEnabled = computed(() => props.isEnabled() ?? true);
  const requestedVisibility = computed<ScrollShadowVisibility>(
    () => props.visibility() ?? "auto",
  );

  // The three measurements. `scroll` is an offset, the other two are extents.
  const scroll = signal({ x: 0, y: 0 });
  const viewport = signal({ width: 0, height: 0 });
  const content = signal({ width: 0, height: 0 });

  // A first layout event carries no usable content extent: the two boxes
  // arrive in two events, and comparing after either one alone reports a fake
  // "none" first (HeroUI reads both from the DOM in one effect). Detection
  // starts only once a content extent is known (port sheet §2).
  const hasContentSize = signal(false);

  // Whether the host has reported its own offset. NSH's horizontal offset is
  // the distance from the content's left edge, so a right-to-left view rests at
  // `x = maxScroll`; the signal's placeholder is `0`. Until the host reports (or
  // the direction is settled), a horizontal box is at its logical start, whose
  // `scrollStart` is 0 in both directions. Reading the placeholder as a real
  // offset would call a resting RTL box "scrolled to the end" and publish a
  // false start-edge state and mask before the host's first `onScroll`
  // (review round 1; the upstream layout effect reads the settled `scrollLeft`).
  const hasOffset = signal(false);

  // Upstream measures `scrollTop` and `Math.abs(scrollLeft)`. Vertical offsets
  // are the distance from the top in both directions. A horizontal NSH scroll
  // reports its offset from the content's left edge whether the layout is left
  // to right or right to left, and a right-to-left view rests at the right end
  // (`x = maxScroll`), so the distance from the logical start is the distance
  // to that end there. On the web this replaces the browser's negative
  // `scrollLeft` model that upstream's `Math.abs` corrects for (port sheet §8).
  const rtl = computed(() => props.dir?.() === "rtl");

  const isDirReady = computed(() => props.isDirReady?.() ?? true);

  // The axis offset is only interpretable once the direction model is settled.
  // Vertical offsets mean the same thing both ways, so only horizontal waits.
  const isAxisOffsetReady = computed(
    () => isVertical() || (hasOffset() && isDirReady()),
  );

  const clientSize = computed(() =>
    isVertical() ? viewport().height : viewport().width,
  );

  const contentSize = computed(() =>
    isVertical() ? content().height : content().width,
  );

  // R-020's `animation-range` endpoints, resolved against the real scroll
  // range instead of a scroll timeline. Both axes are kept, because a clamp
  // has to use the range of the axis it clamps even while the other one is
  // the rendered axis.
  const maxScrollX = computed(() => Math.max(0, content().width - viewport().width));
  const maxScrollY = computed(() => Math.max(0, content().height - viewport().height));
  const maxScroll = computed(() => (isVertical() ? maxScrollY() : maxScrollX()));

  // The effective offset, not the cached one. HeroUI reads `el.scrollTop` /
  // `el.scrollLeft` on every check (use-scroll-shadow.ts:44), and the browser
  // clamps those to the range on the spot: when the content shrinks below the
  // viewport, or the viewport grows past it, the position becomes `0` without
  // a scroll event. NSH reports the offset through `onScroll` only, so the
  // cached signal can outlive its range (review round 3, finding 1). Clamping
  // here makes every read — the two thresholds, the fades and the mask —
  // follow the host's clamped position, and because the clamp reads the sizes
  // it re-runs on every content/viewport change. In RTL the host offset is
  // the distance from the content's left edge, so it is clamped before it is
  // mirrored into the distance from the logical start.
  const scrollStart = computed(() => {
    if (isVertical()) return clamp(scroll().y, 0, maxScrollY());

    // Not measured yet: the view is resting at its logical start, whichever
    // direction it lays out in.
    if (!isAxisOffsetReady()) return 0;

    const x = clamp(Math.abs(scroll().x), 0, maxScrollX());

    return rtl() ? Math.max(0, maxScrollX() - x) : x;
  });

  const hasScrollBefore = computed(() => scrollStart() > offset());

  // The `-1` tolerance is upstream's, kept verbatim.
  const hasScrollAfter = computed(
    () => scrollStart() + clientSize() + offset() < contentSize() - 1,
  );

  const detectedVisibility = computed<ScrollShadowVisibility>(() => {
    const before = hasScrollBefore();
    const after = hasScrollAfter();

    if (before && after) return "both";

    if (isVertical()) {
      if (before) return "top";
      return after ? "bottom" : "none";
    }

    if (before) return "left";
    return after ? "right" : "none";
  });

  const visibility = computed<ScrollShadowVisibility>(() =>
    requestedVisibility() === "auto" ? detectedVisibility() : requestedVisibility(),
  );

  // `clamp(scrollStart - offset, 0, size)`: the start fade grows across the
  // first `size` pixels past the offset (R-007's keyframes).
  const startFade = computed(() =>
    clamp(scrollStart() - offset(), 0, size()),
  );

  // `clamp(maxScroll - scrollStart - offset, 0, size)`: the end fade shrinks
  // to nothing over the last `size` pixels before the offset (R-008).
  const endFade = computed(() =>
    clamp(maxScroll() - scrollStart() - offset(), 0, size()),
  );

  const maskImage = computed<string | undefined>(() => {
    const mode = requestedVisibility();
    const vertical = isVertical();
    const length = vertical ? viewport().height : viewport().width;

    // No viewport extent yet: the viewport signal starts at `{0, 0}` and the
    // first `onLayout` is what gives it a size. Every stop of a point-based
    // gradient would then be `0px`, which is a fully transparent mask, and NSH
    // draws a view only where its mask is opaque — so the whole scroll box
    // would disappear until the first measurement (review round 3, finding 2).
    // Upstream's auto gradient is percentage-based
    // (scroll-shadow.css:185-188: `transparent 0, #000 var(--start-fade),
    // #000 calc(100% - var(--end-fade)), transparent 100%`), which is fully
    // opaque at zero size; drawing no mask for that one frame is the nearest
    // equivalent. This applies to the controlled states too: they are point
    // gradients as well.
    if (!(length > 0)) return undefined;

    if (mode === "auto") {
      // Detection off: upstream clears every `data-*` attribute and sets
      // `data-scroll-shadow-mode="manual"`, so no fade is painted (T-031).
      if (!isEnabled()) return undefined;

      // Auto mode always resolves a gradient, even with nothing to scroll, so
      // the root stays a stacking context as it does upstream (R-020).
      return fadeGradient(
        vertical ? "vertical" : "horizontal",
        rtl(),
        length,
        startFade(),
        endFade(),
      );
    }

    // Controlled: the fixed state draws a full-length fade on its own axis and
    // nothing on the other one, exactly the `[data-*-scroll="true"]` rules
    // (R-012, R-013, R-016, R-017, R-018, and R-014 for `both`). `isEnabled`
    // does not matter here: upstream applies explicit visibility whether
    // detection is on or off.
    let start = 0;
    let end = 0;

    if (vertical) {
      if (mode === "top") start = size();
      else if (mode === "bottom") end = size();
      else if (mode === "both") {
        start = size();
        end = size();
      } else return undefined;
    } else {
      if (mode === "left") start = size();
      else if (mode === "right") end = size();
      else if (mode === "both") {
        start = size();
        end = size();
      } else return undefined;
    }

    return fadeGradient(
      vertical ? "vertical" : "horizontal",
      rtl(),
      length,
      start,
      end,
    );
  });

  // The cached pair, exactly upstream's `prevStateRef`: an unchanged pair does
  // not notify. A plain variable, not a signal, because nothing renders it.
  let previous: { before: boolean; after: boolean } | null = null;

  // One notification per settled measurement batch, after the geometry has
  // landed. Reading the accessors here is what makes the initial layout event
  // and every later scroll/resize run through the same path.
  effect(() => {
    const enabled = isEnabled();
    const mode = requestedVisibility();

    // Controlled mode and disabled detection do not notify, and clear the
    // cache so that turning detection back on reports the current state once,
    // as upstream's cleanup does.
    if (!enabled || mode !== "auto") {
      previous = null;
      return;
    }

    if (!hasContentSize()) return;

    const before = hasScrollBefore();
    const after = hasScrollAfter();

    if (previous && previous.before === before && previous.after === after) {
      return;
    }

    previous = { before, after };

    // Read at call time: the component's wrapper reads the newest prop, so a
    // callback from a later render wins over the one captured at mount
    // (upstream keeps it in a ref for the same reason).
    props.onVisibilityChange?.(detectedVisibility());
  });

  return {
    maskImage,
    visibility,

    onScroll(event) {
      scroll.set({ x: event.offset.x, y: event.offset.y });
      content.set({ width: event.contentSize.width, height: event.contentSize.height });
      viewport.set({ width: event.size.width, height: event.size.height });
      hasContentSize.set(true);
      hasOffset.set(true);
    },

    onViewportLayout(event) {
      viewport.set({
        width: event.bounds.size.width,
        height: event.bounds.size.height,
      });
    },

    onContentLayout(event) {
      content.set({
        width: event.bounds.size.width,
        height: event.bounds.size.height,
      });
      hasContentSize.set(true);
    },
  };
}
