import { computed, createAnimatedValue, effect, signal, split, View } from "nsh";
import type {
  Bounds,
  JSX,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";

import { skeletonVariants, type SkeletonVariants } from "./skeleton.styles";

/* -------------------------------------------------------------------------------------------------
 * Skeleton Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Skeleton.Root`: HeroUI 3.2.7's `SkeletonRootProps`, a `div`'s
 * intrinsic attributes plus the `animationType` dimension, expressed with
 * NSH's view host props.
 *
 * The DOM-only members upstream are accepted so code written against HeroUI
 * keeps compiling; the port sheet §1 and §8 say what each can and cannot do
 * here.
 */
export interface SkeletonRootProps extends Omit<ViewProps, "children" | "class"> {
  /** The placeholder's content; usually empty, as upstream. */
  children?: JSX.Element;

  /** The animation; `shimmer` by default. */
  animationType?: SkeletonVariants["animationType"];

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
  const [local, rest] = split(props, [
    "children",
    "animationType",
    "className",
    "style",
    "id",
    "nativeID",
    "onLayout",
    "render",
  ] as const);

  // Prop first, then the default of the variant table; the theme variable
  // `--skeleton-animation` has no readable counterpart (port sheet §8).
  const animationType = () => local.animationType ?? "shimmer";

  // The sweep is expressed in CSS percentages upstream; a native animation
  // works in points, so the root reports its laid-out width first.
  const width = signal(0);

  const progress = createAnimatedValue(0);

  // R-009: the theme's `skeleton` keyframes are `100% { transform:
  // translateX(200%) }` over 2 s, linear, forever. R-008's start offset is the
  // same `-translate-x-full`: `translate: -100%`. The two properties add up,
  // so the net trip is from `-w` to `+w` (2w), not `-w` to `2w`. The effect
  // restarts the sweep whenever the measured width changes.
  effect(() => {
    const measured = width();

    if (animationType() !== "shimmer" || measured <= 0) {
      return;
    }

    progress.set(-measured);
    void progress.keyframes([-measured, measured], {
      duration: 2000,
      easing: "linear",
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
  const showShimmer = computed(() => animationType() === "shimmer" && width() > 0);

  const classes = computed(() =>
    [skeletonVariants({ animationType: animationType() }), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  const handleLayout = (event: { bounds: Bounds }) => {
    width.set(event.bounds.size.width);
    // The caller's `onLayout` receives the same event; the measurement is
    // recorded first and neither handler swallows the other.
    local.onLayout?.(event);
  };

  return (
    <View
      {...rest}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
      onLayout={handleLayout}
    >
      {local.children}
      <If when={showShimmer()}>
        <View
          testID="skeleton-shimmer"
          // R-007: `absolute inset-0`, the last child so it draws over the
          // content exactly as `::after` did.
          // R-010: `bg-linear-to-r from-transparent via-surface-tertiary
          // to-transparent`, the upstream gradient (its middle stop is 50%).
          class="absolute inset-0 bg-linear-to-r from-transparent via-surface-tertiary to-transparent"
          // R-008: `-translate-x-full` in points. The value is an animated
          // node, so the sweep runs on the UI thread without a signal write
          // per frame.
          style={{ translate: [progress, 0] }}
        />
      </If>
    </View>
  );
}
