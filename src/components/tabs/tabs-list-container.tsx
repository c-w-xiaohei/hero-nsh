import type { Bounds, JSX, ScrollEvent, ScrollRef, Size, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, signal, split, View } from "nsh";

import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp } from "../icons";
import { ScrollShadow, type ScrollShadowVisibility } from "../scroll-shadow";
import { renderChildren } from "./children";
import { TabsContext } from "./tabs-context";

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Tabs.ListContainer`: HeroUI 3.2.7's `TabListContainerProps`,
 * which is a `div`'s attributes plus `children` and `className`.
 *
 * Upstream the container is injected into `Tabs.List` through a collection
 * slot; here it is a real view that renders the scroller and the two chevron
 * buttons itself and places its children inside the scroller (port sheet §3).
 */
export interface TabListContainerProps {
  /** Usually `Tabs.List`; read once at the placement inside the scroller. */
  children?: JSX.Element;

  /** Appended after the container slot classes; later classes win. */
  className?: string;

  /** Style of the container; `dir` lands here as `direction`. */
  style?: StyleProp<ViewStyle>;

  /** The layout direction of the scroll area; the root's `dir` is the fallback. */
  dir?: "ltr" | "rtl" | "auto";

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** NSH's accessible name for the container. */
  accessibilityLabel?: string;

  /** Hides the container from assistive technologies. */
  accessibilityElementsHidden?: boolean;

  /** Accepted: NSH's accessible name through the DOM spelling. */
  "aria-label"?: string;

  /** Maps to the `hidden` class, as the DOM attribute would hide it. */
  hidden?: boolean;

  /** The container was laid out. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: a view reports presses, not DOM clicks. */
  onClick?: unknown;

  /** Accepted, no effect: a view reports presses, not pointer events. */
  onPointerDown?: unknown;
  onPointerUp?: unknown;
  onPointerMove?: unknown;

  /** Accepted, no effect: NSH has no wheel event. */
  onWheel?: unknown;

  /** Accepted, no effect: NSH derives direction from the platform / root. */
  lang?: string;

  /** Accepted, no effect: NSH has no inert subtree flag. */
  inert?: boolean;

  /** Accepted, no effect (D18: no data attributes). */
  [key: `data-${string}`]: unknown;

  /** The container view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * List container
 * -----------------------------------------------------------------------------------------------*/

/**
 * `Tabs.ListContainer` / `TabListContainer`: the pill (or underline) box that
 * holds the scrolling tab list and the two overflow chevrons.
 *
 * It owns the scroller and the scroll geometry, because upstream's `scrollBy`
 * reads `clientWidth` / `scrollWidth` / `scrollLeft` off the element it
 * rendered (port sheet §2). The chevrons' visibility comes from
 * `ScrollShadow`'s `visibility`, which replaces upstream's
 * `:has([data-left-scroll="true"])` selectors (R-020, R-021).
 */
export function TabListContainer(props: TabListContainerProps): JSX.Element | null {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "dir",
    "id",
    "nativeID",
    "testID",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "aria-label",
    "hidden",
    "onLayout",
    "render",
    "slot",
    "onClick",
    "onPointerDown",
    "onPointerUp",
    "onPointerMove",
    "onWheel",
    "lang",
    "inert",
    "ref",
  ] as const);

  const tabs = TabsContext();

  if (!tabs) {
    return null;
  }

  const isVertical = computed(() => tabs.orientation() === "vertical");
  const dir = computed<"ltr" | "rtl" | "auto" | undefined>(() => local.dir ?? tabs.dir());

  /* -------------------------------------------------------------------------------------------
   * Scroll geometry. `onScroll` gives the offset and both sizes; `onLayout` gives
   * the viewport even before the first scroll, so a chevron pressed before any
   * scroll still knows how far a page is (the content size comes from the list).
   * ----------------------------------------------------------------------------------------- */
  const offset = signal({ x: 0, y: 0 });
  const viewport = signal<Size>({ width: 0, height: 0 });
  const visibility = signal<ScrollShadowVisibility>("none");

  const content = computed<Size>(() => tabs.contentSize());

  // The viewport is shared with `Tabs.List`, whose `min-width` needs it as a
  // number (R-024).
  const publishViewport = (size: Size) => {
    if (viewport().width === size.width && viewport().height === size.height) {
      return;
    }

    viewport.set(size);
    tabs.setViewportSize(size);
  };

  const maxScroll = computed(() => {
    const vertical = isVertical();
    const contentSize = content();
    const viewportSize = viewport();

    return Math.max(
      0,
      (vertical ? contentSize.height : contentSize.width) -
        (vertical ? viewportSize.height : viewportSize.width),
    );
  });

  // R-020: `:has(> :is([data-left-scroll="true"], [data-left-right-scroll="true"],
  // [data-top-scroll="true"], [data-top-bottom-scroll="true"])) > .scroll-prev`
  // → the start edge of the `visibility` ScrollShadow reports.
  const canScrollStart = computed(() => {
    const state = visibility();

    return isVertical() ? state === "top" || state === "both" : state === "left" || state === "both";
  });

  // R-021: the mirror rule, `data-right/bottom-scroll`.
  const canScrollEnd = computed(() => {
    const state = visibility();

    return isVertical()
      ? state === "bottom" || state === "both"
      : state === "right" || state === "both";
  });

  const clamp = (value: number) => Math.min(Math.max(value, 0), maxScroll());

  let scroller: ScrollRef | undefined;

  /* -------------------------------------------------------------------------------------------
   * Upstream's `scrollBy`: 80% of a page, clamped into the scroll range, with
   * the sign flipped for a right-to-left horizontal list (port sheet §2, §5).
   *
   * NSH reports a horizontal offset as the distance from the content's left
   * edge, so a right-to-left list rests at `maxScroll` and its start side is
   * the larger offset. The flip therefore applies to the delta, and the clamp
   * stays `[0, maxScroll]` in both directions.
   * ----------------------------------------------------------------------------------------- */
  const scrollBy = (direction: 1 | -1) => {
    const vertical = isVertical();
    const viewportSize = vertical ? viewport().height : viewport().width;
    const limit = maxScroll();

    if (viewportSize <= 0 || limit <= 0) {
      return;
    }

    const isRtl = !vertical && dir() === "rtl";
    const delta = direction * viewportSize * 0.8 * (isRtl ? -1 : 1);
    const current = clamp(vertical ? offset().y : offset().x);
    const next = clamp(current + delta);

    if (next === current) {
      return;
    }

    scroller?.scrollTo(
      vertical ? { y: next, animated: true } : { x: next, animated: true },
    );
  };

  /* -------------------------------------------------------------------------------------------
   * Bring a tab into view when the keyboard focus moves to it. The bounds are in
   * the list's coordinates, which are the scroll content's coordinates; the
   * offset is where the viewport starts. A horizontal right-to-left list needs
   * no flip here: both are measured from the content's physical left edge.
   * ----------------------------------------------------------------------------------------- */
  const scrollKeyIntoView = (key: string) => {
    const tabBounds = tabs.bounds(key);
    const vertical = isVertical();
    const viewportSize = vertical ? viewport().height : viewport().width;

    if (tabBounds == null || viewportSize <= 0) {
      return;
    }

    const current = vertical ? offset().y : offset().x;
    const start = vertical ? tabBounds.origin.y : tabBounds.origin.x;
    const end = start + (vertical ? tabBounds.size.height : tabBounds.size.width);

    let next = current;

    if (start < current) {
      next = start;
    } else if (end > current + viewportSize) {
      next = end - viewportSize;
    }

    if (next === current) {
      return;
    }

    scroller?.scrollTo(
      vertical
        ? { y: clamp(next), animated: true }
        : { x: clamp(next), animated: true },
    );
  };

  tabs.registerScrollToKey(scrollKeyIntoView);
  cleanup(() => tabs.registerScrollToKey(undefined));

  /* -------------------------------------------------------------------------------------------
   * Classes
   * ----------------------------------------------------------------------------------------- */
  const classes = computed(() =>
    [tabs.slots().tabListContainer(), local.className, local.hidden === true ? "hidden" : undefined]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const style = computed<StyleProp<ViewStyle>>(() => {
    const direction = dir();

    return [direction != null && direction !== "auto" ? { direction } : undefined, local.style];
  });

  const scrollPrevClasses = computed(() => tabs.slots().scrollPrev());
  const scrollNextClasses = computed(() => tabs.slots().scrollNext());

  const scrollPrevLabel = computed(() =>
    isVertical() ? "Scroll tabs up" : "Scroll tabs left",
  );
  const scrollNextLabel = computed(() =>
    isVertical() ? "Scroll tabs down" : "Scroll tabs right",
  );

  // R-009: the default `display: none` of both chevrons.
  // R-020 / R-021: `display: inline-flex` while that side can scroll. Both
  // halves live in one classList so exactly one `display` class applies.
  const scrollPrevDisplay = computed(() => ({
    hidden: !canScrollStart(),
    "inline-flex": canScrollStart(),
  }));

  const scrollNextDisplay = computed(() => ({
    hidden: !canScrollEnd(),
    "inline-flex": canScrollEnd(),
  }));

  return (
    <View
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      testID={local.testID}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityElementsHidden={local.accessibilityElementsHidden}
      class={classes()}
      style={style()}
      onLayout={local.onLayout}
    >
      <ScrollShadow
        ref={(node) => {
          scroller = node;
        }}
        hideScrollBar
        orientation={tabs.orientation()}
        size={64}
        dir={dir()}
        className={tabs.slots().scroller()}
        onScroll={(event: ScrollEvent) => {
          if (offset().x !== event.offset.x || offset().y !== event.offset.y) {
            offset.set({ x: event.offset.x, y: event.offset.y });
          }
          publishViewport(event.size);
        }}
        onLayout={(event) => publishViewport(event.bounds.size)}
        onVisibilityChange={(state) => { visibility.set(state); }}
      >
        {renderChildren(local.children as JSX.Element)}
      </ScrollShadow>

      <View
        role="button"
        focusable={false}
        testID="tabs-scroll-prev"
        accessibilityLabel={scrollPrevLabel()}
        class={scrollPrevClasses()}
        classList={scrollPrevDisplay()}
        onPress={() => scrollBy(-1)}
      >
        <If when={isVertical()} else={<IconChevronLeft />}>
          <IconChevronUp />
        </If>
      </View>

      <View
        role="button"
        focusable={false}
        testID="tabs-scroll-next"
        accessibilityLabel={scrollNextLabel()}
        class={scrollNextClasses()}
        classList={scrollNextDisplay()}
        onPress={() => scrollBy(1)}
      >
        <If when={isVertical()} else={<IconChevronRight />}>
          <IconChevronDown />
        </If>
      </View>
    </View>
  );
}
