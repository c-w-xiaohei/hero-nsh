import { computed, cleanup, effect, reduceMotion, signal, split, View } from "nsh";
import type { Bounds, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

import { renderChildren, type ToastRenderValues } from "./children";
import { resolveClassName, resolveStyle } from "./class-names";
import type { AriaProps, DataProps, GlobalDomProps } from "./toast-dom-props";
import { viewProps } from "./toast-dom-props";
import { ToastContext, ToastItemContext, type ToastItemContextValue, type ToastSlots } from "./toast-context";
import { toastVariants, type ToastVariants } from "./toast.styles";
import {
  DEFAULT_GAP,
  DEFAULT_MAX_VISIBLE_TOAST,
  DEFAULT_SCALE_FACTOR,
  type ToastContentValue,
  type ToastEntry,
  type ToastVariant,
} from "./toast-queue";

/* -------------------------------------------------------------------------------------------------
 * Toast (single root)
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Toast` (= `Toast.Root`): HeroUI 3.2.7's `ToastProps<T>`, which
 * extends React Aria Components' `ToastPrimitiveProps<T>` — the intrinsic
 * attributes of the toast `div` plus the `toast` entry — with the `variant` and
 * `placement` dimensions and `scaleFactor`.
 *
 * `toast` is required and is the queue entry to render (port sheet §1). The
 * DOM-only members are accepted for API parity and have no effect; `id` maps to
 * `nativeID`, `aria-label` to `accessibilityLabel`, `aria-hidden` to
 * `accessibilityElementsHidden`.
 */
export interface ToastProps<T extends object = ToastContentValue>
  extends Omit<ViewProps, "children" | "class" | "role" | "style" | "ref" | "onLayout">,
    ToastVariants,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The queue entry this toast renders. */
  toast: ToastEntry<T>;

  /** The parts: indicator, content, action, close button, or a custom layout. */
  children?: JSX.Element;

  /** Appended after the slot classes; a function gets the toast entry and the defaults. */
  className?: string | ((values: ToastRenderValues) => string);

  /** NSH style keys instead of React's `CSSProperties`; the stacking values merge first, the caller's last. */
  style?: StyleProp<ViewStyle> | ((values: ToastRenderValues) => StyleProp<ViewStyle>);

  /**
   * How much each toast behind the front one scales down.
   * @default 0.05
   */
  scaleFactor?: number;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The accessible name; defaults to `"Title, Description"`, else `"Notification"`. */
  "aria-label"?: string;

  /** Hides the toast from assistive technology; the toast is also hidden while exiting or beyond the cap. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Measured for the stack; the caller's handler runs after the internal one. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/** No exiting keys, shared so the fallback set is not rebuilt on every read. */
const EMPTY_EXITING_KEYS: ReadonlySet<string> = new Set();

/**
 * `Toast` / `Toast.Root`: one toast of the stack.
 *
 * Upstream this is React Aria's `ToastPrimitive` plus the stacking geometry it
 * feeds through CSS custom properties. NSH has no custom properties, so the
 * five numbers (`offsetCollapsed`, `offsetExpanded`, `scaleCollapsed`,
 * `frontHeight`, `toastHeight`) are computed here and written as
 * `transform` / `height` values (R-015 … R-031). The measured height is
 * reported to the region, which is what lets the collapsed stack force every
 * non-front toast to the front one's height.
 *
 * It provides `ToastItemContext` and therefore reads `props.children` inside
 * the provider, at the placement (common rules, provider exception).
 */
export function ToastRoot<T extends object = ToastContentValue>(
  props: ToastProps<T>,
): JSX.Element {
  const [local, rest] = split(props, [
    "toast",
    "children",
    "className",
    "style",
    "ref",
    "variant",
    "placement",
    "scaleFactor",
    "id",
    "nativeID",
    "aria-label",
    "accessibilityLabel",
    "aria-hidden",
    "accessibilityElementsHidden",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
    "focusable",
    "testID",
    "tooltip",
    "onLayout",
    "onMouseEnter",
    "onMouseLeave",
    "onFocus",
    "onBlur",
  ] as const);

  // The region context, read once in the body as the common rules require.
  const region = ToastContext();

  // Identity, read once: the key never changes for a mounted toast, and every
  // derived value below finds its entry by it.
  const key = local.toast.key;

  const entry = computed<ToastEntry<T>>(() => local.toast);

  const placement = computed(() => local.placement ?? region.placement?.() ?? "bottom");

  // R-040 / R-041 / R-052 … R-058: the variant drives the title and indicator
  // slots; a toast without one takes the entry's content variant, then the
  // table's default. The region's table already carries the placement.
  const variant = computed<ToastVariant>(() => {
    const content = entry().content as ToastContentValue;

    return local.variant ?? content.variant ?? "default";
  });

  const slots = computed<ToastSlots>(() => {
    const table = region.slots?.();

    return table ?? toastVariants({ placement: placement(), variant: variant() });
  });

  const gap = computed(() => region.gap?.() ?? DEFAULT_GAP);
  const scaleFactor = computed(
    () => local.scaleFactor ?? region.scaleFactor?.() ?? DEFAULT_SCALE_FACTOR,
  );
  const maxVisibleToasts = computed(
    () => region.maxVisibleToasts?.() ?? DEFAULT_MAX_VISIBLE_TOAST,
  );
  const isExpanded = computed(() => region.isExpanded?.() ?? false);
  const exitingKeys = computed<ReadonlySet<string>>(
    () => region.exitingKeys?.() ?? EMPTY_EXITING_KEYS,
  );

  /** A standalone `Toast` (outside a provider) is its own one-entry list. */
  const visibleToasts = computed<readonly ToastEntry[]>(() => {
    const list = region.visibleToasts?.();

    if (list) {
      return list;
    }

    return [entry() as unknown as ToastEntry];
  });

  /**
   * Exiting toasts leave the layout (their siblings reposition during the exit)
   * but keep their own slot while they fade (toast.tsx `layoutToasts`).
   */
  const layoutToasts = computed<readonly ToastEntry[]>(() => {
    const keys = exitingKeys();
    const list = visibleToasts();

    if (keys.size === 0) {
      return list;
    }

    return list.filter((candidate) => !keys.has(candidate.key) || candidate.key === key);
  });

  const index = computed(() => {
    const position = layoutToasts().findIndex((candidate) => candidate.key === key);

    return position < 0 ? 0 : position;
  });

  const fullIndex = computed(() => {
    const position = visibleToasts().findIndex((candidate) => candidate.key === key);

    return position < 0 ? 0 : position;
  });

  const isFrontmost = computed(() => index() <= 0);
  const isExiting = computed(() => exitingKeys().has(key));
  const isHidden = computed(() => !isExiting() && index() >= maxVisibleToasts());

  /** R-025: collapsed non-front toasts hide their content, indicator and action. */
  const contentHidden = computed(() => !isFrontmost() && !isExpanded());

  /* -------------------------------------------------------------------------------------------
   * Measured height and the entering frame
   * ----------------------------------------------------------------------------------------- */

  const measuredHeight = signal(0);

  /**
   * Upstream measures the root's content height by temporarily setting
   * `height: auto` and reading `offsetHeight` (`use-measured-height.ts`). NSH's
   * `onLayout` only reports the laid-out box, and a collapsed non-front toast's
   * box is forced to the front toast's height, so those reports are ignored:
   * the natural height is measured while the toast is frontmost or the stack
   * is expanded. A new toast is always frontmost, so every row gets its real
   * height once (port sheet §5, T-035).
   */
  const handleLayout = (event: { bounds: Bounds }) => {
    if (isFrontmost() || isExpanded()) {
      const height = event.bounds.size.height;

      if (height !== measuredHeight()) {
        measuredHeight.set(height);
      }
    }

    local.onLayout?.(event);
  };

  // R-015 / R-024 / R-027: the region needs every toast's height to stack the
  // expanded layout and to force the collapsed height to the front one's.
  effect(() => {
    const height = measuredHeight();

    if (height > 0) {
      region.registerHeight?.(key, height);
    }
  });

  cleanup(() => region.removeHeight?.(key));

  /**
   * R-020: a new toast starts one height away from its place and slides in on
   * the next frame, upstream's `data-entering` for two frames. With an
   * unmeasured height the offset is 0, as upstream's `--toast-enter` cannot
   * know the box either.
   */
  const entering = signal(true);

  effect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => entering.set(false));
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  });

  /* -------------------------------------------------------------------------------------------
   * Stacking geometry (R-015, R-020, R-024 … R-031)
   * ----------------------------------------------------------------------------------------- */

  /**
   * R-021: the stacking direction. A bottom stack grows upward, so a toast is
   * pushed down by its own offset; a top stack the other way.
   */
  const direction = computed(() => (placement().startsWith("top") ? 1 : -1));

  /** R-024 / R-027: the collapsed stack uses the front toast's height when it has none of its own. */
  const frontHeight = computed(() => {
    const heights = region.heightsByKey?.() ?? {};
    const front = layoutToasts()[0];
    const fallback = front ? heights[front.key] : undefined;

    return fallback ?? (measuredHeight() > 0 ? measuredHeight() : 0);
  });

  /** R-024: `offsetCollapsed`; R-027: `offsetExpanded` = every earlier height plus the gap before each. */
  const offset = computed(() => {
    const position = index();

    if (position <= 0) {
      return 0;
    }

    if (!isExpanded()) {
      return position * gap();
    }

    const heights = region.heightsByKey?.() ?? {};
    const list = layoutToasts();
    let before = 0;

    for (let cursor = 0; cursor < position; cursor++) {
      const earlierKey = list[cursor]?.key;

      before += (earlierKey ? heights[earlierKey] : undefined) ?? frontHeight();
    }

    return before + position * gap();
  });

  /** R-015: `--scale-collapsed`. */
  const scaleCollapsed = computed(() => 1 - index() * scaleFactor());

  /** R-020: `--toast-enter`, expressed as a height instead of `-100%`. */
  const enterOffset = computed(() => (entering() ? -measuredHeight() : 0));

  /** R-015: `transform: translateY(dir * (y + enter)) scale(scale)`. */
  const translateY = computed(() => {
    // R-029: the frontmost exiting toast leaves the way it arrived, one height
    // away, at full scale.
    if (isExiting() && isFrontmost()) {
      return direction() * -measuredHeight();
    }

    return direction() * (offset() + enterOffset());
  });

  /** R-015 / R-027 / R-029 … R-031. */
  const scale = computed(() => {
    if (isExiting()) {
      if (isFrontmost()) {
        return 1;
      }

      return (isExpanded() ? 1 : scaleCollapsed()) * 0.96;
    }

    if (isExpanded() || isFrontmost()) {
      return 1;
    }

    return scaleCollapsed();
  });

  /** R-015 / R-024 / R-027: `height: var(--toast-height, auto)`; collapsed non-front use the front height. */
  const resolvedHeight = computed(() => {
    const height = measuredHeight();

    if (isExpanded() || isFrontmost()) {
      return height > 0 ? height : undefined;
    }

    return frontHeight();
  });

  /** R-015: `zIndex: visibleToasts.length - fullIndex`; exiting toasts drop to 0. */
  const zIndex = computed(() => (isExiting() ? 0 : visibleToasts().length - fullIndex()));

  /**
   * R-019 / R-028 / R-030 / R-031: the transition. NSH supports
   * `transition-[…]` only for the named groups (colors, opacity, shadow,
   * transform) and never for height, so the property list is inline; the
   * timing curve comes from the slot's `ease-out-fluid`. Reduce-motion turns
   * the property off inline, because an inline value beats the class.
   */
  const transitionStyle = computed<ViewStyle>(() => {
    if (reduceMotion()) {
      return { transitionProperty: "none" };
    }

    const duration = isExiting() ? (isFrontmost() ? "250ms" : "200ms") : "350ms";

    return {
      transitionDuration: duration,
      transitionProperty: "transform, height, opacity",
    };
  });

  const stackingStyle = computed<ViewStyle>(() => {
    const style: ViewStyle = {
      transform: [{ translateY: translateY() }, { scale: scale() }],
      zIndex: zIndex(),
    };
    const height = resolvedHeight();

    if (height !== undefined) {
      style.height = height;
    }

    return style;
  });

  /* -------------------------------------------------------------------------------------------
   * Accessible name and text registration
   * ----------------------------------------------------------------------------------------- */

  const titleText = signal<(() => string) | undefined>(undefined);
  const descriptionText = signal<(() => string) | undefined>(undefined);

  /** R-040 / R-041: `"Title, Description"`, else `"Notification"` (port sheet §5). */
  const accessibilityLabel = computed(() => {
    const parts = [titleText()?.(), descriptionText()?.()].filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    );

    return parts.length > 0 ? parts.join(", ") : "Notification";
  });

  const registerText = (slot: "title" | "description", text: () => string): (() => void) => {
    const target = slot === "title" ? titleText : descriptionText;

    target.set(text);

    return () => {
      if (target() === text) {
        target.set(undefined);
      }
    };
  };

  /* -------------------------------------------------------------------------------------------
   * Indicator registration (R-049)
   * ----------------------------------------------------------------------------------------- */

  const indicatorCount = signal(0);

  const registerIndicator = (): (() => void) => {
    indicatorCount.set(indicatorCount() + 1);

    let registered = true;

    return () => {
      if (!registered) {
        return;
      }

      registered = false;
      indicatorCount.set(indicatorCount() - 1);
    };
  };

  const hasIndicator = computed(() => indicatorCount() > 0);

  /* -------------------------------------------------------------------------------------------
   * Focus registration and handoff (port sheet §2)
   * ----------------------------------------------------------------------------------------- */

  let node: ViewRef | undefined;

  const unregisterFocusable = region.registerFocusable?.(key, () => node);

  if (unregisterFocusable) {
    cleanup(unregisterFocusable);
  }

  effect(() => {
    if (!isExiting() && !isHidden()) {
      return;
    }

    // Only the toast that held the focus hands it on; a pointer-dismissed toast
    // had none (a pointer press does not focus a view in NSH).
    if (region.focusedKey?.() !== key) {
      return;
    }

    if (region.moveFocusFrom) {
      region.moveFocusFrom(key);
    } else {
      node?.blur();
    }
  });

  /* -------------------------------------------------------------------------------------------
   * Render values
   * ----------------------------------------------------------------------------------------- */

  const renderValues = (): ToastRenderValues => ({
    defaultClassName: slots().toast({ variant: variant() }),
    toast: entry() as unknown as ToastEntry,
  });

  const classes = computed(() =>
    resolveClassName(local.className as ToastProps<T>["className"], renderValues()),
  );

  // R-024: `overflow: hidden` on a collapsed non-front toast.
  // R-028: `opacity-0` while exiting.
  // R-032: `pointer-events-none` and `opacity-0` beyond the visible cap.
  // R-049: without an indicator the toast has a single track (`sm:` two).
  // The exit durations (250 / 200ms) live in `transitionStyle`, one owner.
  const classList = computed(() => ({
    "opacity-0": isExiting() || isHidden(),
    "pointer-events-none": isHidden(),
    "overflow-hidden": !isFrontmost() && !isExpanded(),
    "grid-cols-1": !hasIndicator(),
    "sm:grid-cols-[minmax(0,1fr)_auto]": !hasIndicator(),
  }));

  const itemContext: ToastItemContextValue = {
    close: () => region.close?.(key),
    contentHidden,
    hasIndicator,
    index,
    isExpanded,
    isExiting,
    isFrontmost,
    isHidden,
    registerIndicator,
    registerText,
    toast: entry as unknown as ToastItemContextValue["toast"],
    variant,
  };

  const tooltip = local.tooltip;

  return (
    <ToastItemContext.Provider value={itemContext}>
      <View
        {...viewProps(rest)}
        // A callback only: NSH writes into a ref store, and an undefined one
        // would throw at mount on the web target (common rules, real hosts).
        ref={(next) => {
          node = next;
          local.ref?.(next);
        }}
        testID={local.testID}
        nativeID={local.id ?? local.nativeID}
        tooltip={tooltip}
        // R-* (§8): NSH has no `alertdialog`; `alert` is the nearest role and
        // keeps the announcement.
        role="alert"
        // R-032: hidden and exiting toasts leave the accessibility tree.
        accessibilityElementsHidden={
          local["aria-hidden"] ??
          local.accessibilityElementsHidden ??
          (isHidden() || isExiting())
        }
        accessibilityLabel={
          local["aria-label"] ?? local.accessibilityLabel ?? accessibilityLabel()
        }
        focusable={
          local.focusable ??
          (isFrontmost() || (isExpanded() && !isHidden() && !isExiting()))
        }
        class={classes()}
        classList={classList()}
        // R-015: the caller's style wins over the stacking values, as upstream's
        // `composeRenderProps` spreads the user style last.
        style={[
          stackingStyle(),
          transitionStyle(),
          resolveStyle(local.style as ToastProps<T>["style"], renderValues()),
        ]}
        // R-022: no `::after` hit area bridges the gap, so leaving a toast only
        // schedules the collapse; a sibling's enter cancels it on the next frame.
        onMouseEnter={(event) => {
          region.pointerEnter?.();
          local.onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          region.pointerLeave?.();
          local.onMouseLeave?.(event);
        }}
        // Focus is reported, not cleared on blur: Tab from a toast root into
        // its own close button blurs the root, and the handoff still has to
        // know the toast held the focus (port sheet §2).
        onFocus={() => {
          region.setFocusedKey?.(key);
          local.onFocus?.();
        }}
        onBlur={() => local.onBlur?.()}
        onLayout={handleLayout}
      >
        {/*
          The provider exception: the item context wraps the children, so
          `props.children` is read here, at the placement, and nowhere else.
        */}
        {renderChildren(local.children)}
      </View>
    </ToastItemContext.Provider>
  );
}
