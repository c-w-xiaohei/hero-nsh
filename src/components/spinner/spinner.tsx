import { Canvas, computed, Path2D, split, token, View } from "nsh";
import type {
  AccessibilityRole,
  CanvasRenderingContext2D,
  CanvasSize,
  JSX,
  ViewProps,
} from "nsh";

import { spinnerVariants, type SpinnerVariants } from "./spinner.styles";

/* -------------------------------------------------------------------------------------------------
 * Internal
 * -------------------------------------------------------------------------------------------------
 * Spinner icon
 *
 * HeroUI draws the icon as an inline `<svg>` with two `<path>`s, each filled
 * with its own vertical `linearGradient` in `objectBoundingBox` units. NSH has
 * no `<svg>` element, so the same two paths and the same two gradients are
 * replayed on the core `Canvas` (port sheet §3.1): `Path2D` parses the path
 * data, and the gradient coordinates are the path's own bounding box, which is
 * what `objectBoundingBox` means.
 * -----------------------------------------------------------------------------------------------*/

// The two visible arcs of `spinner.tsx` (paths 2 and 3; path 1 has no fill and
// no stroke under `<g fill="none">`, so it never shows and is not drawn). The
// data is copied verbatim, including the `translate(1.5 1.625)` each carries.
const LEFT_ARC = new Path2D(
  "M8.749.021a1.5 1.5 0 0 1 .497 2.958A7.5 7.5 0 0 0 3 10.375a7.5 7.5 0 0 0 7.5 7.5v3c-5.799 0-10.5-4.7-10.5-10.5C0 5.23 3.726.865 8.749.021",
);

const RIGHT_ARC = new Path2D(
  "M15.392 2.673a1.5 1.5 0 0 1 2.119-.115A10.48 10.48 0 0 1 21 10.375c0 5.8-4.701 10.5-10.5 10.5v-3a7.5 7.5 0 0 0 5.007-13.084a1.5 1.5 0 0 1-.115-2.118",
);

/**
 * Draws the icon at the canvas's measured size.
 *
 * `paint` is the resolved color (see `paint` in `SpinnerRoot`). Both arcs'
 * gradients are built in the local coordinate space after the SVG
 * `translate(1.5 1.625)`, and their stops are the upstream percentages.
 *
 * Alpha is composed rather than written as semi-transparent stops, because
 * `currentColor`/token colors arrive as a single string: the left arc is laid
 * down at 0.55 and a full-opacity gradient (`1 → 0`) is drawn over it, giving
 * `α = g + 0.55(1-g)` from 1 down to 0.55; the right arc is one gradient
 * (`0 → 1`) at `globalAlpha = 0.55`, giving `0.55g` from 0 up to 0.55. Both
 * match the SVG's stop opacities (`1 → 0.55` and `0 → 0.55`).
 */
function drawSpinner(cx: CanvasRenderingContext2D, size: CanvasSize, paint: string) {
  cx.clearRect(0, 0, size.width, size.height);
  cx.save();
  // The SVG viewBox is 0 0 24 24.
  cx.scale(size.width / 24, size.height / 24);
  cx.translate(1.5, 1.625);

  // Left arc: bbox y 0.0047 … 20.875, gradient y1 = 5.271%, y2 = 91.793%.
  cx.globalAlpha = 0.55;
  cx.fillStyle = paint;
  cx.fill(LEFT_ARC);
  const leftGradient = cx.createLinearGradient(0, 0.0047, 0, 20.875);
  leftGradient.addColorStop(0.05271, paint);
  leftGradient.addColorStop(0.91793, "transparent");
  cx.globalAlpha = 1;
  cx.fillStyle = leftGradient;
  cx.fill(LEFT_ARC);

  // Right arc: bbox y 2.1742 … 20.875, gradient y1 = 15.24%, y2 = 87.15%.
  const rightGradient = cx.createLinearGradient(0, 2.1742, 0, 20.875);
  rightGradient.addColorStop(0.1524, "transparent");
  rightGradient.addColorStop(0.8715, paint);
  cx.globalAlpha = 0.55;
  cx.fillStyle = rightGradient;
  cx.fill(RIGHT_ARC);

  cx.restore();
}

function SpinnerIcon(props: { paint: () => string }): JSX.Element {
  return (
    <Canvas
      testID="spinner-icon"
      // Replaces the SVG's `aria-hidden`: the arc is decorative, the root
      // carries the accessible name.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      class="h-full w-full"
      draw={(cx, size) => drawSpinner(cx, size, props.paint())}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * Spinner Root
 * -----------------------------------------------------------------------------------------------*/

/** Every `aria-*` attribute, kept for API parity; only `aria-label` has a channel. */
interface SpinnerAriaProps {
  [key: `aria-${string}`]: unknown;
}

/** Every `data-*` attribute: NSH has no attribute passthrough (port sheet §8). */
interface SpinnerDataProps {
  [key: `data-${string}`]: unknown;
}

/**
 * The props of `Spinner.Root`: HeroUI 3.2.7's `SpinnerRootProps`, a `span`'s
 * native attributes plus the two variant dimensions, expressed with NSH's
 * view host props.
 *
 * The DOM-only members of the upstream props are accepted so code written
 * against HeroUI keeps compiling; the port sheet §1 and §8 say what each can
 * and cannot do here.
 */
export interface SpinnerRootProps
  extends Omit<ViewProps, "children" | "class" | "role">,
    SpinnerAriaProps,
    SpinnerDataProps {
  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** The spinner's color; `accent` by default. */
  color?: SpinnerVariants["color"];

  /** The spinner's size; `md` (24 pt) by default. */
  size?: SpinnerVariants["size"];

  /**
   * The accessible role. HeroUI hard-codes `status`, which NSH's role list
   * does not have; `progressbar` is the nearest, and a caller's own role still
   * wins, as upstream's `{...props}` override does.
   */
  role?: AccessibilityRole;

  /** The accessible name; overrides `accessibilityLabel`, `"Loading"` by default. */
  "aria-label"?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM title attribute. */
  title?: string;

  /** Accepted, no effect: NSH focus stops come from `focusable`, not a tab index. */
  tabIndex?: number;
}

/**
 * `Spinner.Root` / `SpinnerRoot`: the whole Spinner component, as in HeroUI
 * 3.2.7. There is no interaction state; the two props pick classes and the
 * root's text color, and the turn is a host keyframe animation.
 */
export function SpinnerRoot(props: SpinnerRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "className",
    "color",
    "size",
    "role",
    "aria-label",
    "accessibilityLabel",
    "id",
    "nativeID",
    "style",
    "ref",
    "render",
    "slot",
    "title",
    "tabIndex",
  ] as const);

  const classes = computed(() =>
    spinnerVariants({
      className: local.className,
      color: local.color,
      size: local.size,
    }),
  );

  /**
   * The color the arcs are painted with.
   *
   * The sheet's first choice is `currentColor`, but NSH's color type is
   * `#rgb…`/`rgb()`/named colors only and an invalid paint drops the
   * operation, and the probe it asks for needs a real platform screenshot,
   * which headless `nsh test` cannot take. The theme's own tokens are the
   * exact colors the `text-*` classes resolve to, so the four named variants
   * match HeroUI pixel for pixel; `current` uses `foreground`, the inherited
   * text color of a normal surface (port sheet §5, §8).
   *
   * The canvas re-runs `draw` when what it reads changes, so this stays
   * reactive to the appearance and to a reactive `color` prop.
   */
  const paint = computed(() => {
    const color = local.color ?? "accent";

    return color === "current" ? token("foreground") : token(color);
  });

  return (
    <View
      {...rest}
      ref={local.ref}
      nativeID={local.id ?? local.nativeID}
      role={local.role ?? "progressbar"}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel ?? "Loading"}
      // R-001: `.spinner` turns once every 0.75 s. NSH's `animate-spin` is a
      // fixed 1 s keyframe, so the class keeps the animation's name, timing and
      // repetition, and the duration is the one inline value; `motion-reduce:`
      // stays in the class string, and inline style never touches the name.
      style={[{ animationDuration: 750 }, local.style]}
      // NSH has no `role="status"`; on Android a polite live region is the
      // nearest announcement behaviour, and a caller's own value still wins.
      android={{ accessibilityLiveRegion: "polite", ...rest.android }}
      class={classes()}
    >
      <SpinnerIcon paint={paint} />
    </View>
  );
}
