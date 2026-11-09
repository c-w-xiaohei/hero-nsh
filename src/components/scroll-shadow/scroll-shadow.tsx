import type {
  Bounds,
  JSX,
  ScrollEvent,
  ScrollProps,
  ScrollRef,
  StyleProp,
  ViewStyle,
} from "nsh";
import { computed, signal, split, Scroll, View } from "nsh";

import {
  createScrollShadow,
  type ScrollShadowOrientation,
  type ScrollShadowVisibility,
} from "../../primitives/create-scroll-shadow";
import { renderChildren } from "./children";
import {
  scrollShadowVariants,
  type ScrollShadowVariants,
} from "./scroll-shadow.styles";

export type { ScrollShadowVisibility };

/* -------------------------------------------------------------------------------------------------
 * ScrollShadow Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ScrollShadow.Root`: HeroUI 3.2.7's `ScrollShadowRootProps`,
 * which is a `div`'s attributes (minus `size`) plus the variant surface itself,
 * expressed with NSH's scroll host props.
 *
 * The DOM-only members upstream (`aria-*`, `data-*`, `lang`, `hidden`, the
 * `dir` attribute's effect on descendants) are accepted so code written
 * against HeroUI keeps compiling; port sheet §1 and §8 say what each one can
 * and cannot do here. `className` and `style` keep the HeroUI names and reach
 * the root `Scroll` as `class` and `style`.
 */
export interface ScrollShadowRootProps
  extends Omit<
    ScrollProps,
    "children" | "class" | "style" | "size" | "horizontal" | "scrollbar" | "onScroll" | "onLayout"
  > {
  /**
   * The content. Optional although HeroUI's type requires it, because an empty
   * scroll box is valid upstream; bare strings and numbers become `Text` at the
   * placement (research 4.1, 4.6).
   */
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** The scroll host's ref (`scrollTo`, `zoomTo`), forwarded as a callback. */
  ref?: (node: ScrollRef) => void;

  /**
   * The scroll indicator: `false` hides it; a theme object gives the view its
   * own built-in bar. `hideScrollBar` takes precedence.
   */
  scrollbar?: ScrollProps["scrollbar"];

  /**
   * Root style, merged after the computed `maskImage` and `direction`, so a
   * caller can still override the fade — the same precedence upstream gives its
   * inline size/offset variables (port sheet §1).
   */
  style?: StyleProp<ViewStyle>;

  /** The axis. @default "vertical" */
  orientation?: ScrollShadowOrientation;

  /**
   * Hides the scroll indicator; the equivalent of upstream's `scrollbar-none`
   * block (`<Scroll scrollbar={false}>`).
   * @default false
   */
  hideScrollBar?: boolean;

  /**
   * The fade length in pixels.
   * @default 40
   */
  size?: number;

  /**
   * Pixels scrolled before a fade appears on that side.
   * @default 0
   */
  offset?: number;

  /**
   * `"auto"` detects the fade from the scroll geometry; every other value is
   * controlled and paints a fixed fade.
   * @default "auto"
   */
  visibility?: ScrollShadowVisibility;

  /**
   * Whether detection runs. `false` paints no automatic fade, while an explicit
   * `visibility` still applies.
   * @default true
   */
  isEnabled?: boolean;

  /** Called when the detected state changes; never called in controlled mode. */
  onVisibilityChange?: (visibility: ScrollShadowVisibility) => void;

  /**
   * The visual variant. The only value is `"fade"` and it draws no class here:
   * the fade is the computed mask (R-020).
   * @default "fade"
   */
  variant?: ScrollShadowVariants["variant"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /**
   * The element's layout direction upstream, which also picks the physical side
   * of a horizontal fade. Maps to the root's `direction` style; `"auto"` leaves
   * it inherited. An inherited direction from an ancestor is not readable in
   * NSH (port sheet §8).
   */
  dir?: "ltr" | "rtl" | "auto";

  /**
   * A DOM `tabIndex` upstream: `>= 0` makes the box a Tab stop, so the platform
   * can scroll it with the arrow keys. NSH has no three-way `tabIndex`; `>= 0`
   * sets `focusable`, `-1` and omission leave it alone (port sheet §8).
   */
  tabIndex?: number;

  /** Accepted, no effect: NSH has no DOM attribute channel. */
  [key: `aria-${string}`]: unknown;

  /** Accepted, no effect: NSH has no DOM attribute channel; `testID` names a view. */
  [key: `data-${string}`]: unknown;

  /** Accepted, no effect: the DOM's `lang`; NSH reads the application locale. */
  lang?: string;

  /** Accepted, no effect: NSH shows and hides content with control flow, not a `hidden` attribute. */
  hidden?: boolean;

  /** The scroll position changed: the measurement runs first, then this handler. */
  onScroll?: (event: ScrollEvent) => void;

  /** The viewport's frame: the measurement runs first, then this handler. */
  onLayout?: (event: { bounds: Bounds }) => void;
}

/**
 * ScrollShadow.Root / ScrollShadowRoot: the scroll container, its overflow
 * measurement and the fade it paints from the scroll position.
 *
 * It is a core `Scroll` rather than an nsh/base component: nsh/base's
 * `Scrollbar` is a bar you place, not a scroll container, and upstream's whole
 * behaviour is "the scrolling element itself" (port sheet §3). The content is
 * wrapped in one `static` measuring `View`, NSH's stand-in for upstream's
 * ResizeObserver + MutationObserver over the same box.
 */
export function ScrollShadowRoot(props: ScrollShadowRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "dir",
    "tabIndex",
    "focusable",
    "variant",
    "orientation",
    "hideScrollBar",
    "size",
    "offset",
    "visibility",
    "isEnabled",
    "onVisibilityChange",
    "onScroll",
    "onLayout",
    "scrollbar",
  ] as const);

  // Read-only inputs with their HeroUI defaults (port sheet §2).
  const orientation = computed<ScrollShadowOrientation>(
    () => local.orientation ?? "vertical",
  );
  const hideScrollBar = computed(() => local.hideScrollBar === true);

  // NSH cannot read an inherited `direction` (it is a style key with no
  // accessor), and a horizontal scroll view in a right-to-left layout reports
  // its offset from the content's left edge, so both the fade side and the
  // start/end meaning need the direction. The own `dir` prop wins; otherwise a
  // zero-size child at the row's inline start reports the physical side it was
  // laid out on: x 0 is left to right, x = the row's width is right to left.
  // This restores upstream's inherited `:dir(rtl)` (port sheet §8).
  const probedRtl = signal(false);
  const resolvedDir = computed<"ltr" | "rtl">(() => {
    if (local.dir === "ltr" || local.dir === "rtl") return local.dir;
    return probedRtl() ? "rtl" : "ltr";
  });

  const state = createScrollShadow({
    orientation: () => local.orientation,
    offset: () => local.offset,
    size: () => local.size,
    visibility: () => local.visibility,
    isEnabled: () => local.isEnabled,
    dir: () => resolvedDir(),
    // A wrapper, not the prop itself: the primitive calls it when a state
    // change happens, and this read then returns the newest prop, as upstream's
    // `onVisibilityChangeRef` does (port sheet 4b, T-014).
    onVisibilityChange: (visibility) => local.onVisibilityChange?.(visibility),
  });

  // R-009 / R-010: the orientation block is the `Scroll` host, not a class.
  const resolvedClassName = computed(() =>
    scrollShadowVariants({
      hideScrollBar: hideScrollBar(),
      orientation: orientation(),
      variant: local.variant,
    }).base({ className: local.className }),
  );

  // The root style: our computed mask first, then the caller's `dir` as
  // `direction`, then the caller's style, which wins on a conflict.
  const style = computed<StyleProp<ViewStyle>>(() => {
    const root: ViewStyle = {};
    const maskImage = state.maskImage();

    if (maskImage !== undefined) root.maskImage = maskImage;
    if (local.dir === "ltr" || local.dir === "rtl") root.direction = local.dir;

    return [root, local.style];
  });

  // R-019: `scrollbar-none`; a caller's own theme still applies when the bar is
  // not hidden.
  const scrollbar = computed(() =>
    hideScrollBar() ? false : local.scrollbar,
  );

  // A `tabIndex` of `>= 0` is a Tab stop upstream; NSH spells that `focusable`.
  // Omission and `-1` leave the host's default alone.
  const focusable = computed(() => {
    const tabIndex = local.tabIndex;

    if (tabIndex !== undefined) return tabIndex >= 0;
    return local.focusable;
  });

  // The measuring content layer mirrors the scroll axis, so a horizontal box
  // still lays its children in a row; `static` keeps absolute children anchored
  // to the root, as upstream's positioned `div` does (port sheet §3).
  const contentClass = computed(() =>
    orientation() === "horizontal" ? "flex-row" : undefined,
  );

  return (
    <Scroll
      {...rest}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // R-009 / R-010: vertical by default, sideways for `orientation`.
      horizontal={orientation() === "horizontal"}
      scrollbar={scrollbar()}
      focusable={focusable()}
      class={resolvedClassName()}
      style={style()}
      onScroll={(event) => {
        // Both must run: our measurement never swallows the caller's handler.
        state.onScroll(event);
        local.onScroll?.(event);
      }}
      onLayout={(event) => {
        state.onViewportLayout(event);
        local.onLayout?.(event);
      }}
    >
      <View
        class={contentClass()}
        // `static`: absolute children of the scroll box anchor to the root, as
        // they do in upstream's DOM, where the scroll container is their
        // containing block. This layer only reports the content box.
        style={{ position: "static" }}
        onLayout={(event) => state.onContentLayout(event)}
      >
        <If when={orientation() === "horizontal"}>
          {/* The direction probe: a zero-size child at the row's inline start.
              Its x is 0 when the row runs left to right and the row's width
              when it runs right to left; NSH has no accessor for an inherited
              `direction` (port sheet §8). */}
          <View
            style={{ width: 0, height: 0 }}
            onLayout={(event) => probedRtl.set(event.bounds.origin.x > 0.5)}
          />
        </If>
        {renderChildren(local.children)}
      </View>
    </Scroll>
  );
}
