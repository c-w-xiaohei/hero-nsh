import type { JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import {
  cleanup,
  computed,
  createAnimatedValue,
  effect,
  LayoutAnimation,
  reduceMotion,
  signal,
  split,
  untracked,
  View,
} from "nsh";

import { renderChildren } from "./children";
import { TabContext, TabsContext } from "./tabs-context";

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Tabs.Indicator`: HeroUI 3.2.7's `TabIndicatorProps`, which is
 * React Aria Components' `SelectionIndicator` (`className`, `style`,
 * `isSelected`, `children`, `ref`, `render`, `slot`).
 */
export interface TabIndicatorProps {
  /** The indicator's content; normally empty. */
  children?: JSX.Element;

  /** Appended after the indicator slot classes; later classes win. */
  className?: string;

  /** Style of the indicator; the animation owns `translate` after this. */
  style?: StyleProp<ViewStyle>;

  /**
   * Overrides the selected state of the tab the indicator sits in. HeroUI
   * reads the enclosing tab's state when this is omitted.
   */
  isSelected?: boolean;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** Accepted, no effect: the indicator is decorative. */
  accessibilityLabel?: string;

  /** Hides the indicator from assistive technologies (it is decorative). */
  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect (D18: no data attributes). */
  [key: `data-${string}`]: unknown;

  /** The indicator view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Constants
 * ----------------------------------------------------------------------------------------------- */

/** `--ease-out-fluid: cubic-bezier(0.32, 0.72, 0, 1)`, the curve `EASE_VALUES.outFluid` carries in `src/tokens/geometry.ts`. */
const INDICATOR_EASING: [number, number, number, number] = [0.32, 0.72, 0, 1];

/** Upstream's `transition-duration: 250ms`. */
const INDICATOR_DURATION = 250;

/* -------------------------------------------------------------------------------------------------
 * Indicator
 * -----------------------------------------------------------------------------------------------*/

/**
 * `Tabs.Indicator` / `TabIndicator`: the pill (or underline) behind the
 * selected tab's label.
 *
 * Upstream is React Aria's `SelectionIndicator`, whose cross-tab slide is a
 * shared element transition: the browser measures the old and the new
 * element and animates `translate`, `width` and `height` for 250ms. NSH has no
 * shared elements, so each tab carries its own indicator view, and the one
 * that mounts at selection starts at the previous tab's frame and animates to
 * its own (port sheet §4, R-053 … R-056):
 *
 * - the translate is an `AnimatedValue` timing with `--ease-out-fluid`'s exact
 *   four-point curve;
 * - the size is a `LayoutAnimation` around the width / height write, because
 *   NSH's `transition` covers neither layout nor translate.
 *
 * The starting frame exists only when there was a previous selection, the
 * indicator is ready and the user did not ask for less motion (`R-054`,
 * `R-055`).
 */
export function TabIndicator(props: TabIndicatorProps): JSX.Element | null {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "isSelected",
    "id",
    "nativeID",
    "testID",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "render",
    "slot",
    "ref",
  ] as const);

  const tabs = TabsContext();
  const tab = TabContext();

  const isSelected = computed(() => {
    if (local.isSelected !== undefined) {
      return local.isSelected;
    }

    return tab?.isSelected() ?? false;
  });

  // The inline size while a slide is running; an empty object leaves the
  // slot's own `size-full` (and the secondary variant's height / width) in
  // charge, which is the final state.
  const size = signal<{ width?: number; height?: number }>({});

  const translateX = createAnimatedValue(0);
  const translateY = createAnimatedValue(0);

  let frame: number | undefined;
  let settle: number | undefined;

  const vertical = () => tabs?.orientation() === "vertical";
  const secondary = () => tabs?.variant() === "secondary";

  /**
   * The starting frame: where the indicator of the previously selected tab
   * was, relative to this tab. `undefined` when there is nothing to animate
   * from.
   */
  const computeStart = () => {
    if (tabs == null || tab == null) {
      return undefined;
    }

    if (!tabs.isIndicatorReady() || reduceMotion()) {
      return undefined;
    }

    const source = tabs.transitionSource();

    if (source == null || source === tab.key) {
      return undefined;
    }

    const from = tabs.bounds(source);
    const own = tabs.bounds(tab.key);

    if (from == null || own == null) {
      return undefined;
    }

    const dx = from.origin.x - own.origin.x;

    // The secondary horizontal indicator is bottom-aligned, so its origin
    // follows the tab's bottom edge rather than its top.
    const dy =
      secondary() && !vertical()
        ? from.origin.y + from.size.height - (own.origin.y + own.size.height)
        : from.origin.y - own.origin.y;

    // Only the axis the tabs run along changes size; across it the indicator
    // keeps its own size from the slot (2px for the secondary variant).
    const startSize = secondary()
      ? vertical()
        ? { height: from.size.height }
        : { width: from.size.width }
      : { width: from.size.width, height: from.size.height };

    return { dx, dy, startSize };
  };

  effect(() => {
    if (!isSelected() || tabs == null || tab == null) {
      size.set({});
      translateX.set(0);
      translateY.set(0);

      return;
    }

    const start = untracked(computeStart);

    if (start == null) {
      // R-054 / R-055: reduced motion, or the first frame after mount: write
      // the final place and size, with no animation.
      size.set({});
      translateX.set(0);
      translateY.set(0);

      return;
    }

    // R-056: mount at the previous tab's frame …
    size.set(start.startSize);
    translateX.set(start.dx);
    translateY.set(start.dy);

    // … and move to this tab's frame on the next frame, so the first layout
    // has settled before the animation starts.
    frame = requestAnimationFrame(() => {
      const own = untracked(() => tabs.bounds(tab.key));

      const finalSize = own
        ? secondary()
          ? vertical()
            ? { height: own.size.height }
            : { width: own.size.width }
          : { width: own.size.width, height: own.size.height }
        : {};

      // R-053: `transition-property: translate, width, height` with
      // `250ms var(--ease-out-fluid)`. The translate half uses the exact
      // curve; `LayoutAnimation` takes only built-in easing names, so the
      // size half uses the closest one (port sheet §8).
      if (!reduceMotion()) {
        LayoutAnimation.configureNext({
          duration: INDICATOR_DURATION,
          update: { type: "easeOut" },
        });
      }

      size.set(finalSize);

      void translateX.timing(0, {
        duration: INDICATOR_DURATION,
        easing: INDICATOR_EASING,
      });
      void translateY.timing(0, {
        duration: INDICATOR_DURATION,
        easing: INDICATOR_EASING,
      });

      // Once it lands, drop the inline size so the slot's `size-full` (or the
      // variant's own height / width) follows a later tab resize again.
      settle = setTimeout(() => size.set({}), INDICATOR_DURATION + 50);
    });

    return () => {
      if (frame != null) {
        cancelAnimationFrame(frame);
        frame = undefined;
      }

      if (settle != null) {
        clearTimeout(settle);
        settle = undefined;
      }
    };
  });

  cleanup(() => {
    if (frame != null) {
      cancelAnimationFrame(frame);
    }

    if (settle != null) {
      clearTimeout(settle);
    }
  });

  const classes = computed(() =>
    [tabs?.slots().tabIndicator(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const style = computed<StyleProp<ViewStyle>>(() => {
    const current = size();
    const inline: ViewStyle = { translate: [translateX, translateY] };

    if (current.width !== undefined) {
      inline.width = current.width;
    }

    if (current.height !== undefined) {
      inline.height = current.height;
    }

    return [local.style, inline];
  });

  return (
    <If when={isSelected()}>
      <View
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        testID={local.testID}
        accessibilityLabel={local.accessibilityLabel}
        accessibilityElementsHidden={local.accessibilityElementsHidden ?? true}
        class={classes()}
        style={style()}
      >
        {renderChildren(local.children as JSX.Element)}
      </View>
    </If>
  );
}
