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
 * The DOM-only members upstream are accepted so code written against HeroUI
 * keeps compiling. Three of them have an NSH channel and are mapped:
 * `aria-label` → `accessibilityLabel`, `aria-hidden` →
 * `accessibilityElementsHidden`, `hidden` → the `hidden` class. The rest
 * (`data-*`, `lang`, the unmapped `aria-*`, the `dir` attribute's effect on
 * descendants) have no channel; port sheet §1 and §8 say what each one can
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

  /** The accessible name upstream's `aria-label`; maps to NSH's channel. */
  "aria-label"?: string;

  /** Hides the element from assistive technology; maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Any other `aria-*`: accepted, no effect (NSH has no DOM attribute channel). */
  [key: `aria-${string}`]: unknown;

  /** Accepted, no effect: NSH has no DOM attribute channel; `testID` names a view. */
  [key: `data-${string}`]: unknown;

  /** Accepted, no effect: the DOM's `lang`; NSH reads the application locale. */
  lang?: string;

  /**
   * Maps to the `hidden` class (`display: none`). Kept in the class string
   * after `className`, so it wins over a display class the caller passes, the
   * way the DOM's `hidden` attribute wins over the rest of the cascade.
   */
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
    "aria-label",
    "aria-hidden",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "lang",
    "hidden",
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
  const probeMeasured = signal(false);
  const resolvedDir = computed<"ltr" | "rtl">(() => {
    if (local.dir === "ltr" || local.dir === "rtl") return local.dir;
    return probedRtl() ? "rtl" : "ltr";
  });
  // The own `dir` names the direction directly; an inherited one is only known
  // once the probe has laid out. The primitive needs to know which, because a
  // horizontal offset cannot be read before the direction model is settled.
  const isDirReady = computed(
    () => local.dir === "ltr" || local.dir === "rtl" || probeMeasured(),
  );

  const state = createScrollShadow({
    orientation: () => local.orientation,
    offset: () => local.offset,
    size: () => local.size,
    visibility: () => local.visibility,
    isEnabled: () => local.isEnabled,
    dir: () => resolvedDir(),
    isDirReady: () => isDirReady(),
    // A wrapper, not the prop itself: the primitive calls it when a state
    // change happens, and this read then returns the newest prop, as upstream's
    // `onVisibilityChangeRef` does (port sheet 4b, T-014).
    onVisibilityChange: (visibility) => local.onVisibilityChange?.(visibility),
  });

  // The DOM's `hidden` attribute is `display: none`; NSH's spelling of that is
  // the `hidden` class. It goes last so tailwind-merge lets it win over a
  // display class the caller passes with `className`, the way the attribute
  // wins over the cascade upstream.
  const hiddenClass = computed(() => {
    if (local.hidden !== true) return local.className;
    return local.className ? `${local.className} hidden` : "hidden";
  });

  // R-009 / R-010: the orientation block is the `Scroll` host, not a class.
  const resolvedClassName = computed(() =>
    scrollShadowVariants({
      hideScrollBar: hideScrollBar(),
      orientation: orientation(),
      variant: local.variant,
    }).base({ className: hiddenClass() }),
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
  // to the root, as upstream's positioned `div` does (port sheet §3). Both are
  // classes, not inline style (twref: `static`, `flex-row`).
  const contentClass = computed(() =>
    orientation() === "horizontal" ? "static flex-row" : "static",
  );

  return (
    <Scroll
      {...rest}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // `aria-label` / `aria-hidden` are HeroUI's names for NSH's own
      // accessibility channels; the explicit prop wins, as `aria-*` overrides
      // the platform attribute upstream.
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden
      }
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
        onLayout={(event) => state.onContentLayout(event)}
      >
        <If when={orientation() === "horizontal"}>
          {/* The direction probe: a zero-size child at the row's inline start.
              Its x is 0 when the row runs left to right and the row's width
              when it runs right to left; NSH has no accessor for an inherited
              `direction` (port sheet §8). Zero size is a pair of classes, so
              only the mask and `direction` remain inline. */}
          <View
            class="h-0 w-0"
            onLayout={(event) => {
              probedRtl.set(event.bounds.origin.x > 0.5);
              probeMeasured.set(true);
            }}
          />
        </If>
        {renderChildren(local.children)}
      </View>
    </Scroll>
  );
}
