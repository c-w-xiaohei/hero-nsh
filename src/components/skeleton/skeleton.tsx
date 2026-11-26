import { computed, createAnimatedValue, effect, signal, split, View } from "nsh";
import type {
  AccessibilityState,
  Bounds,
  Easing,
  JSX,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";

import {
  getAnimationState,
  getRootAnimationState,
  type Animation,
  type AnimationRoot,
} from "../../primitives/pressable";
import { type AriaProps, type GlobalDomProps } from "./dom-props";
import { skeletonVariants, type SkeletonVariants } from "./skeleton.styles";

/* -------------------------------------------------------------------------------------------------
 * Animation prop (E: the shimmer channel's configuration subset)
 * -----------------------------------------------------------------------------------------------*/

/**
 * The shimmer channel's configuration, the subset of upstream's
 * `SkeletonShimmerAnimation` (`skeleton.types.ts:13-30`) NSH can host: `duration`
 * and `speed` parameterize the `keyframes` timing, `highlightColor` repaints the
 * gradient's middle stop, `easing` is NSH's `Easing` (not a Reanimated
 * `EasingFunction`). Upstream's `pulse`/`entering`/`exiting` channels are not
 * implemented (sheet §7).
 */
export type SkeletonShimmerAnimation = Animation<{
  /** One sweep's duration in milliseconds. @default 2000 (this port's sweep; upstream's own default is 1500) */
  duration?: number;

  /** Speed multiplier; the effective duration is `duration / speed`. @default 1 */
  speed?: number;

  /** The gradient's middle stop; any CSS color. @default `via-surface-tertiary` */
  highlightColor?: string;

  /** The sweep's easing. @default "linear" */
  easing?: Easing;
}>;

/**
 * The root `animation` prop: `AnimationRoot` over `{ shimmer }`. `false` /
 * `"disabled"` / `"disable-all"` turn every animated channel off (the pulse
 * class is dropped and the shimmer never mounts); a config's own `state`
 * behaves the same. Only the shimmer channel is configurable.
 */
export type SkeletonRootAnimation = AnimationRoot<{
  shimmer?: SkeletonShimmerAnimation;
}>;

/* -------------------------------------------------------------------------------------------------
 * Skeleton Root
 * -----------------------------------------------------------------------------------------------*/

/* -------------------------------------------------------------------------------------------------
 * Skeleton Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Skeleton.Root`: HeroUI 3.2.7's `SkeletonRootProps`, a `div`'s
 * intrinsic attributes plus the `animationType` dimension, expressed with
 * NSH's view host props.
 *
 * The DOM-only members upstream are accepted so code written against HeroUI
 * keeps compiling; the port sheet §1 says which ones map to an NSH host prop
 * (`aria-label`, `aria-hidden`, the `aria-*` states) and which are no-ops.
 */
export interface SkeletonRootProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    GlobalDomProps {
  /**
   * The placeholder's content; usually empty, as upstream. Rendered only while
   * `isLoading` is false — a loading skeleton paints the placeholder, not the
   * content (`skeleton.tsx:132`, upstream).
   */
  children?: JSX.Element;

  /** The animation; `shimmer` by default. */
  animationType?: SkeletonVariants["animationType"];

  /**
   * Whether the placeholder is loading. `true` (the default, upstream's own)
   * keeps the existing always-placeholder behavior; `false` swaps it for the
   * children in a bare `View`.
   */
  isLoading?: boolean;

  /**
   * Upstream's name for `animationType` (`skeleton.types.ts:118`). An alias:
   * an explicit `animationType` wins over it.
   */
  variant?: SkeletonVariants["animationType"];

  /** The shimmer channel's configuration (`SkeletonRootAnimation`). */
  animation?: SkeletonRootAnimation;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** The placeholder's own view, as `ComponentPropsWithRef` gives upstream. */
  ref?: ViewRef | ((node: ViewRef) => void);

  /** Style of the placeholder; the shimmer overlay keeps its own. */
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Maps to `accessibilityState.disabled`. */
  "aria-disabled"?: boolean;

  /** Maps to the matching `accessibilityState` field. */
  "aria-busy"?: boolean;
  "aria-checked"?: boolean | "mixed";
  "aria-expanded"?: boolean;
  "aria-pressed"?: boolean | "mixed";
  "aria-selected"?: boolean;
  "aria-current"?: AccessibilityState["current"];

  /** Accepted, no effect: a `div`'s tooltip is the browser's, not an NSH `tooltip` node. */
  title?: string;

  /** Accepted, no effect: NSH moves focus between pressables, not through a `tabIndex`. */
  tabIndex?: number;

  /** Accepted, no effect: the placeholder ignores the pointer (`pointer-events-none` upstream too). */
  onClick?: (event: unknown) => void;
}

/**
 * Skeleton.Root / SkeletonRoot: a placeholder block with one animation
 * dimension. Upstream draws the shimmer with `::after` and plays it with the
 * theme's `animate-skeleton` keyframes. NSH has neither pseudo-elements nor
 * custom keyframe classes, so the overlay is a real child view and the sweep
 * is a native animated value; both are measured in points, hence the width
 * read from `onLayout` (port sheet §2, §5).
 */
export function SkeletonRoot(props: SkeletonRootProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "animationType",
    "isLoading",
    "variant",
    "animation",
    "className",
    "style",
    "id",
    "nativeID",
    "onLayout",
    "render",
    "accessibilityState",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "aria-label",
    "aria-hidden",
    "aria-disabled",
    "aria-busy",
    "aria-checked",
    "aria-expanded",
    "aria-pressed",
    "aria-selected",
    "aria-current",
    "title",
    "tabIndex",
    "onClick",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // Prop first, then the default of the variant table; the theme variable
  // `--skeleton-animation` has no readable counterpart (port sheet §8).
  // `variant` is upstream's name for the same dimension and loses to an
  // explicit `animationType` (sheet A-010).
  const animationType = () => local.animationType ?? local.variant ?? "shimmer";

  // `isLoading` defaults to upstream's `true`: existing always-placeholder
  // usage is untouched.
  const isLoading = () => local.isLoading ?? true;

  // The `animation` prop's three-tier flow. A root-level off (false /
  // "disabled" / "disable-all", or a config's own `state`) silences every
  // animated channel — the shimmer never mounts and the pulse class drops —
  // while a `shimmer: "disabled"` config silences only the overlay (sheet
  // §5/A-010; `getIsAnimationDisabledValue` would overfire on the channel's
  // own flag).
  const { animationConfig, isAllAnimationsDisabled, isAnimationDisabled } =
    getRootAnimationState(local.animation);
  const rootDisabled = isAllAnimationsDisabled || isAnimationDisabled;
  const { isAnimationDisabled: shimmerDisabled } = getAnimationState(
    animationConfig?.shimmer,
  );

  // `shimmer` resolves to its config object only (a boolean / "disabled"
  // tier configures nothing and is already consumed by the flags above).
  const shimmerConfig =
    typeof animationConfig?.shimmer === "object"
      ? (animationConfig.shimmer as {
          duration?: number;
          speed?: number;
          highlightColor?: string;
          easing?: Easing;
        })
      : undefined;

  const shimmerDuration = shimmerConfig?.duration ?? 2000;
  const shimmerSpeed = shimmerConfig?.speed ?? 1;
  const shimmerEasing = shimmerConfig?.easing ?? "linear";
  const shimmerHighlight = shimmerConfig?.highlightColor ?? "";

  // What the variant table sees: the resolved type, except that a root-level
  // animation off drops the animated `pulse` class as well.
  const effectiveType = () =>
    rootDisabled ? ("none" as const) : animationType();

  // The sweep is expressed in CSS percentages upstream; a native animation
  // works in points, so the root reports its laid-out width first.
  const width = signal(0);

  const progress = createAnimatedValue(0);

  // R-009: the theme's `skeleton` keyframes are `100% { transform:
  // translateX(200%) }` over 2 s, linear, forever — configurable through
  // `animation.shimmer` (`duration`, divided by `speed`, and `easing`).
  // R-008's start offset is the same `-translate-x-full`: `translate: -100%`.
  // The two properties add up, so the net trip is from `-w` to `+w` (2w),
  // not `-w` to `2w`. The effect restarts the sweep whenever the measured
  // width or the gating changes.
  effect(() => {
    const measured = width();

    if (!isLoading() || effectiveType() !== "shimmer" || shimmerDisabled || measured <= 0) {
      return;
    }

    progress.set(-measured);
    void progress.keyframes([-measured, measured], {
      duration: shimmerDuration / Math.max(shimmerSpeed, 0.0001),
      easing: shimmerEasing,
      iterations: "infinite",
    });

    return () => {
      void progress.stop();
    };
  });

  // R-006 / R-007: `::after` becomes a real child view, mounted only once the
  // width is known and only for `shimmer`; the condition lives in `when`
  // because an `<If>` function child runs untracked. Until then the overlay
  // would sit at its starting frame in the middle of an unmeasured box.
  const showShimmer = computed(
    () => isLoading() && effectiveType() === "shimmer" && !shimmerDisabled && width() > 0,
  );

  const classes = computed(() =>
    skeletonVariants({ animationType: effectiveType() }).base({
      className: local.className,
    }),
  );

  // Port sheet §1: the DOM accessibility aliases map onto the root's NSH
  // accessibility props, with the aria name winning when both are given (as
  // `{...rest}` forwarding `aria-*` over a host prop would upstream).
  const accessibilityState = computed<AccessibilityState>(() => {
    const own = local.accessibilityState ?? {};

    return {
      ...own,
      busy: local["aria-busy"] ?? own.busy,
      checked: local["aria-checked"] ?? own.checked,
      current: local["aria-current"] ?? own.current,
      disabled: local["aria-disabled"] ?? own.disabled,
      expanded: local["aria-expanded"] ?? own.expanded,
      pressed: local["aria-pressed"] ?? own.pressed,
      selected: local["aria-selected"] ?? own.selected,
    };
  });

  const handleLayout = (event: { bounds: Bounds }) => {
    width.set(event.bounds.size.width);
    // The caller's `onLayout` receives the same event; the measurement is
    // recorded first and neither handler swallows the other.
    local.onLayout?.(event);
  };

  // The placeholder half of the `isLoading` gate: `isLoading={false}` mounts
  // upstream's `!isLoading` branch instead (`skeleton.tsx:132-138`) — a bare
  // container holding only the children, no placeholder classes, no shimmer,
  // no measurement (upstream's `style`, `className` and `restProps` stay on
  // the skeleton element, which that branch does not mount). `testID` is
  // forwarded there so the content root can still be addressed.
  const placeholder = (
    <View
      ref={(node) => (typeof props.ref === "function" ? props.ref(node) : undefined)}
      testID={props.testID}
      nativeID={local.id ?? local.nativeID}
      role={props.role}
      tooltip={props.tooltip}
      focusable={props.focusable}
      disabled={props.disabled}
      accessible={props.accessible}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityHint={props.accessibilityHint}
      accessibilityValue={props.accessibilityValue}
      accessibilityState={accessibilityState()}
      accessibilityElementsHidden={local["aria-hidden"] ?? local.accessibilityElementsHidden}
      accessibilityActions={props.accessibilityActions}
      accessibilityLevel={props.accessibilityLevel}
      importantForAccessibility={props.importantForAccessibility}
      hitSlop={props.hitSlop}
      delayLongPress={props.delayLongPress}
      pan={props.pan}
      panActivation={props.panActivation}
      pinch={props.pinch}
      rotation={props.rotation}
      selectable={props.selectable}
      class={classes()}
      classList={props.classList}
      style={local.style}
      activeStyle={props.activeStyle}
      hoverStyle={props.hoverStyle}
      focusStyle={props.focusStyle}
      focusWithinStyle={props.focusWithinStyle}
      disabledStyle={props.disabledStyle}
      selectedStyle={props.selectedStyle}
      checkedStyle={props.checkedStyle}
      indeterminateStyle={props.indeterminateStyle}
      expandedStyle={props.expandedStyle}
      pressedStyle={props.pressedStyle}
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      onPressDown={props.onPressDown}
      onPressUp={props.onPressUp}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      onMouseMove={props.onMouseMove}
      onContextMenu={props.onContextMenu}
      onFileDragEnter={props.onFileDragEnter}
      onFileDragLeave={props.onFileDragLeave}
      onFileDrop={props.onFileDrop}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      onAccessibilityAction={props.onAccessibilityAction}
      onPanStart={props.onPanStart}
      onPanEnd={props.onPanEnd}
      onPinchStart={props.onPinchStart}
      onPinchEnd={props.onPinchEnd}
      onRotationStart={props.onRotationStart}
      onRotationEnd={props.onRotationEnd}
      ios={props.ios}
      android={props.android}
      desktop={props.desktop}
      web={props.web}
      onLayout={handleLayout}
    >
      {/* While loading, the placeholder replaces the children entirely —
          upstream renders `{children}` only under `!isLoading`
          (`skeleton.tsx:155`). */}
      <If when={showShimmer()}>
        <View
          testID="skeleton-shimmer"
          // R-007: `absolute inset-0`, the last child so it draws over the
          // content exactly as `::after` did.
          // R-010: `bg-linear-to-r from-transparent via-surface-tertiary
          // to-transparent`, the upstream gradient (its middle stop is 50%);
          // `animation.shimmer.highlightColor` repaints that stop inline.
          class={shimmerHighlight
            ? "absolute inset-0"
            : "absolute inset-0 bg-linear-to-r from-transparent via-surface-tertiary to-transparent"}
          // R-008: `-translate-x-full` in points. The value is an animated
          // node, so the sweep runs on the UI thread without a signal write
          // per frame.
          style={[
            { translate: [progress, 0] },
            shimmerHighlight
              ? {
                  backgroundImage: `linear-gradient(to right, transparent, ${shimmerHighlight}, transparent)`,
                }
              : undefined,
          ]}
        />
      </If>
    </View>
  );

  return (
    <>
      <If when={isLoading()}>{placeholder}</If>
      <If when={!isLoading()}>
        <View testID={props.testID}>{local.children}</View>
      </If>
    </>
  );
}
