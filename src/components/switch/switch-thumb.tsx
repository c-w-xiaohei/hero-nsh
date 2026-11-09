import type { Bounds, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, reduceMotion, signal, split, View } from "nsh";

import { FALLBACK_SWITCH_CONTEXT, SwitchContext } from "./switch-context";
import { switchVariants } from "./switch.styles";

/** `var(--spacing)` from HeroUI's offset formula: one quarter of a rem. */
const SPACING = 4;

/**
 * The props of `Switch.Thumb`: HeroUI 3.2.7's `SwitchThumbProps`, a `span` that
 * draws the moving dot.
 */
export interface SwitchThumbProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** Style of the dot; `translate` and `transitionProperty` are the component's own. */
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The dot's view, as `ComponentPropsWithRef` gives upstream. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

/**
 * Switch.Thumb / SwitchThumb: the dot. HeroUI slides it with
 * `inset-inline-start: calc(100% - thumb width - var(--spacing))`; NSH cannot
 * animate a layout property and has no `calc()` class, so the dot's own width
 * and position are measured and the difference becomes a `translate`
 * (port sheet §5).
 *
 * The children go through one content wrapper, reproducing
 * `.switch__thumb > * { flex size-full items-center justify-center }` (R-046).
 */
export function SwitchThumb(props: SwitchThumbProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "render",
    "onLayout",
  ] as const);

  const ctx = SwitchContext() ?? FALLBACK_SWITCH_CONTEXT;

  // R-037 / R-038: the laid-out dot gives the offset its width and its side.
  // Both are read back from `onLayout`, so the slide matches whatever size
  // variant and track width the caller ended up with.
  const thumbWidth = signal(0);
  const thumbX = signal(0);

  const offset = computed(() => {
    const track = ctx.trackWidth();
    const width = thumbWidth();

    if (track <= 0 || width <= 0) {
      return 0;
    }

    const distance = track - width - SPACING;

    // The direction is decided from the centres, not from the resting start:
    // at md an RTL thumb starts at 16 points, which is less than the track's
    // half width of 20 and would look like LTR.
    const isRtl = thumbX() + width / 2 > track / 2;

    return isRtl ? -distance : distance;
  });

  // R-037 / R-038: unchecked rests at 0, checked slides by the measured
  // difference. Before the first layout both measurements are 0, so the value
  // stays at the resting place; the transition is switched off for that frame
  // so an initially selected switch does not slide in.
  const translate = () => (ctx.isSelected() ? offset() : 0);

  // R-040: `transition: inset-inline-start 300ms var(--ease-out-fluid),
  // background-color 200ms var(--ease-out)`. The property list is the one
  // thing only an inline style can own; duration and curve come from the class
  // string. NSH keeps one duration for both properties, so background-color
  // moves to 300ms `ease-out-fluid` (port sheet §8). Inline style beats a
  // class, so `motion-reduce:transition-none` in the variant string needs this
  // runtime gate as well.
  const transitionProperty = () => {
    if (reduceMotion() || thumbWidth() === 0 || ctx.trackWidth() === 0) {
      return "none";
    }

    return "transform, background-color";
  };

  const classes = computed(() =>
    [
      switchVariants({ size: ctx.size() }).thumb(),
      // R-042: checked → `bg-accent-foreground text-accent` and the three-layer
      // shadow. Later classes win over the base, so one string stays the owner.
      ctx.isSelected()
        ? "bg-accent-foreground text-accent shadow-[0px_0px_5px_0px_rgb(0_0_0_/_0.02),0px_2px_10px_0px_rgb(0_0_0_/_0.06),0px_0px_1px_0px_rgb(0_0_0_/_0.3)]"
        : "",
      // R-010: `.switch[data-disabled="true"] .switch__thumb` →
      // `bg-default-foreground/20`; a checked thumb keeps its checked colour,
      // which the stylesheet declares later.
      ctx.isDisabled() && !ctx.isSelected() ? "bg-default-foreground/20" : "",
      // R-017: disabled and checked → `opacity: 0.4`, on top of the root's 0.5.
      ctx.isDisabled() && ctx.isSelected() ? "opacity-40" : "",
      local.className ?? "",
    ]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  const handleLayout = (event: { bounds: Bounds }) => {
    thumbX.set(event.bounds.origin.x);
    thumbWidth.set(event.bounds.size.width);
    local.onLayout?.(event);
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={[
        { translate: [translate(), 0], transitionProperty: transitionProperty() },
        local.style,
      ]}
      onLayout={handleLayout}
    >
      {/* R-046: `.switch__thumb > *` — the content wrapper every child sits in. */}
      <View class="flex h-full w-full items-center justify-center">{local.children}</View>
    </View>
  );
}
