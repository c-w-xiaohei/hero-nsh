import { cleanup, computed, effect, signal, split, View } from "nsh";
import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

import { renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import type { ToastContentValue, ToastVariant } from "./toast-queue";
import { ToastContext, ToastItemContext } from "./toast-context";
import type { AriaProps, DataProps, GlobalDomProps } from "./toast-dom-props";
import { viewProps } from "./toast-dom-props";
import { DangerIcon, InfoIcon, SuccessIcon, WarningIcon } from "../icons";
import { Spinner } from "../spinner";
import type { ThemeColorToken } from "../../theme";

/* -------------------------------------------------------------------------------------------------
 * Default icon
 * -----------------------------------------------------------------------------------------------*/

/**
 * The paint of each variant's default icon.
 *
 * Upstream the `svg` path is filled with `currentColor`, so the ancestor's
 * `text-*-soft-foreground` class colors it. A Canvas does not inherit a text
 * color, so every variant that writes the class in `toast.styles.ts` must name
 * the same token here; the two lists are one mapping and have to stay in step
 * (R-054 / R-056 / R-058, port sheet §4 note). `default` and `accent` keep
 * `overlay-foreground`, exactly as upstream leaves the indicator without a
 * variant rule for `accent`.
 */
const DEFAULT_ICON_COLOR: Record<ToastVariant, ThemeColorToken> = {
  default: "overlay-foreground",
  accent: "overlay-foreground",
  success: "success-soft-foreground",
  warning: "warning-soft-foreground",
  danger: "danger-soft-foreground",
};

/**
 * Upstream's `getDefaultIcon()`: the glyph the variant shows when the indicator
 * gets no children. A plain function, called at the placement, so the variant
 * accessor is read inside the tracked content expression.
 *
 * R-036: the icons' own `h-4 w-4` is upstream's `size-4`; their `box-content`
 * has nothing to change because they carry no padding or border.
 */
function defaultIcon(variant: ToastVariant): JSX.Element {
  const color = DEFAULT_ICON_COLOR[variant];

  switch (variant) {
    case "success":
      return <SuccessIcon color={color} />;
    case "warning":
      return <WarningIcon color={color} />;
    case "danger":
      return <DangerIcon color={color} />;
    default:
      // `default` and `accent` both show the information disc upstream.
      return <InfoIcon color={color} />;
  }
}

/* -------------------------------------------------------------------------------------------------
 * Toast Indicator
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Toast.Indicator` (= `ToastIndicator`): HeroUI 3.2.7's
 * `ToastIndicatorProps<E>` = `DOMRenderProps<E, undefined>` plus `children`,
 * `className` and `variant`.
 *
 * `render` and the `E` parameter are accepted for type parity and have no
 * effect: NSH has no DOM render function (port sheet §8).
 */
export interface ToastIndicatorProps<E extends string = "div">
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The indicator. `null` or `undefined` draws the default icon for the
   * variant; `false` and `""` render as they are.
   */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** NSH style keys instead of React's `CSSProperties`. */
  style?: StyleProp<ViewStyle>;

  /** The variant that picks the default icon and its colour. */
  variant?: ToastVariant;

  /** Accepted, no effect: no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: the `E` type parameter has no runtime meaning. */
  elementType?: E;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the indicator from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Forwarded to the indicator `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * `Toast.Indicator` / `ToastIndicator`: the status mark at the start of a toast.
 *
 * Inside a toast it takes the region's `indicator` slot class for the variant
 * in force, registers itself so the root keeps its first grid track (R-049),
 * and fades out while collapsed (R-025). Its content is wrapped in one `View`
 * that carries the swap transition (R-039 / R-059 / R-060); upstream puts the
 * animation on the indicator's own children through a descendant selector, and
 * NSH has neither that selector nor `@keyframes`.
 */
export function ToastIndicator<E extends string = "div">(
  props: ToastIndicatorProps<E>,
): JSX.Element {
  // Read once, in the body: the region's slot table and the single toast's
  // state, when this indicator sits inside a toast (port sheet §2).
  const region = ToastContext();
  const item = ToastItemContext();

  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "variant",
    "render",
    "elementType",
    "focusable",
    "id",
    "nativeID",
    "aria-label",
    "aria-hidden",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
    "testID",
    "tooltip",
  ] as const);

  /** The variant in force: the prop, else the toast's, else the table's default. */
  const variant = computed<ToastVariant>(
    () => local.variant ?? item.variant?.() ?? "default",
  );

  // R-035, plus the variant's indicator colour (R-054 / R-056 / R-058).
  const classes = computed(() =>
    joinClassNames(region.slots?.().indicator({ variant: variant() }), local.className),
  );

  // R-049: the root watches its rows for an indicator and falls back to a
  // single grid track without one.
  const unregister = item.registerIndicator?.();

  cleanup(() => unregister?.());

  /**
   * The queued content. It is the only signal this part has for "the toast's
   * content was replaced": NSH children carry no element type to compare the
   * way upstream's `children.type` does, so the entry's content object (new on
   * every `queue.update`) is the swap marker (port sheet §1, §5).
   */
  const entryContent = (): ToastContentValue | undefined =>
    item.toast?.()?.content as ToastContentValue | undefined;

  const isLoading = computed(() => entryContent()?.isLoading === true);

  // The single read of `children`, shared by the content below (research 4.1 /
  // 4.6). It stays a computed so a reactive child keeps updating.
  const children = computed(() => local.children);

  /**
   * Upstream is `children ?? getDefaultIcon()`, and the provider hands the
   * loading spinner down as children. A hand-written `<Toast.Indicator />` in
   * a loading toast gets the same spinner here; a caller's own children always
   * win over it (R-036 / R-037 / R-038).
   */
  const content = computed<JSX.Element>(() => {
    const node = children();

    if (node != null) {
      return renderChildren(node);
    }

    if (isLoading()) {
      // R-037: `size="sm"` is upstream's `size-4`; `color="current"` follows
      // the indicator's text colour, as the `<svg>` did (port sheet §5).
      return <Spinner size="sm" color="current" />;
    }

    return defaultIcon(variant());
  });

  /**
   * R-039 / R-059 / R-060: upstream runs two keyframes — `opacity: 0 → 1` over
   * 150ms and `scale: 0.92 → 1` over 200ms — on the indicator's children when
   * their content is replaced, and never on the first paint. NSH has no
   * `@keyframes`, so the start frame is applied on the frame the content
   * changes and the end frame on the next one, with the transition carrying the
   * difference. The spinner is exempt, as upstream's `:not(spinner)` selector
   * says.
   */
  const swapping = signal(false);

  let previousContent = entryContent();
  let swapFrame = 0;

  effect(() => {
    const next = entryContent();

    if (next === previousContent) {
      return;
    }

    previousContent = next;

    if (isLoading()) {
      return;
    }

    swapping.set(true);
    cancelAnimationFrame(swapFrame);
    swapFrame = requestAnimationFrame(() => swapping.set(false));
  });

  cleanup(() => cancelAnimationFrame(swapFrame));

  return (
    <View
      {...viewProps(rest)}
      ref={(next) => local.ref?.(next)}
      nativeID={local.id ?? local.nativeID}
      // A `<div>` is not a keyboard focus stop upstream.
      focusable={local.focusable ?? false}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden
      }
      testID={local.testID}
      tooltip={local.tooltip}
      // R-025: a collapsed non-front toast fades its indicator out.
      class={classes()}
      classList={{ "opacity-0": item.contentHidden?.() ?? false }}
      style={local.style}
    >
      <View
        class="flex items-center justify-center"
        classList={{
          // R-059 / R-060: the start frame of the swap.
          "opacity-0": swapping(),
          "scale-[0.92]": swapping(),
          // The end frame, and the resting state.
          "opacity-100": !swapping(),
          "scale-100": !swapping(),
          // R-039: NSH gives an element one `transitionProperty`, so the
          // upstream `transition-opacity` + `transition-transform` pair is the
          // merged `transition` (colours, opacity, shadow, transform) at 200ms
          // with the fluid curve; the lost 150ms opacity half is registered in
          // §8. It is absent on the start frame so the reset cannot animate
          // out of the old value.
          "transition duration-200 ease-out-fluid motion-reduce:transition-none":
            !swapping(),
        }}
      >
        {content()}
      </View>
    </View>
  );
}
