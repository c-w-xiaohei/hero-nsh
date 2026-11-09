import { Canvas, computed, split, token } from "nsh";
import type {
  AccessibilityRole,
  Bounds,
  CanvasRenderingContext2D,
  CanvasSize,
  JSX,
  Path2D,
  StyleProp,
  Tokens,
  ViewRef,
  ViewStyle,
} from "nsh";

/* -------------------------------------------------------------------------------------------------
 * Icon props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props every icon takes: HeroUI 3.2.7's `IconProps`, which extends
 * `React.SVGProps<SVGSVGElement>` and is a private type upstream (port sheet
 * §1.2). The port exports it, because the components that draw these icons as
 * their defaults need a type for the icon they accept.
 *
 * NSH has no inline SVG, so the members that describe an SVG document
 * (`fill`, `stroke`, `viewBox`, `xmlns`, the `on*` handlers) are accepted and
 * have no effect, exactly as the port sheet registers. The two members that
 * decide the drawing are new: `color` names a theme token, `paint` takes any
 * CSS color and wins over `color`; neither exists upstream, where the path is
 * filled with `currentColor` inherited from the ancestor's `text-*` class
 * (R-006, §8).
 */
export interface IconProps {
  /** Appended after the icon's default size classes; later classes win (R-013). */
  className?: string;

  /** Merged after the size props; wins over both classes and `width`/`height` (R-014). */
  style?: StyleProp<ViewStyle>;

  /**
   * A number in points, or a CSS length string. `px` and `pt` are points,
   * `rem` is 16 points, a percentage is kept; an unsupported unit such as
   * `em` is ignored (R-015, §8).
   */
  width?: number | string;

  /** As `width`. */
  height?: number | string;

  /** The theme token the glyph is painted with; `foreground` by default (R-006). */
  color?: keyof Tokens;

  /** Any CSS color; wins over `color`. The upstream `color="#333"` case. */
  paint?: string;

  /** Accepted, no effect: there is no SVG root to carry a fill (R-005). */
  fill?: string;

  /** Accepted, no effect: the paths are filled, never stroked. */
  stroke?: string;

  /** Accepted, no effect. */
  strokeWidth?: number | string;

  /** Accepted, no effect: each icon's path decides its own rule (R-007). */
  fillRule?: "nonzero" | "evenodd";

  /** Accepted, no effect: upstream never pairs it with a clip path (R-008). */
  clipRule?: "nonzero" | "evenodd";

  /** Accepted, no effect: the viewBox is the icon's own (R-004). */
  viewBox?: string;

  /** Accepted, no effect. */
  preserveAspectRatio?: string;

  /** Accepted, no effect: NSH has no XML namespace (R-011). */
  xmlns?: string;

  /** Accepted, not rendered, as upstream: the icon's own path wins. */
  children?: JSX.Element;

  /** Hidden from assistive technologies by default, as the SVG's `aria-hidden` (R-009). */
  "aria-hidden"?: boolean;

  /** The accessible name, when the icon is exposed. */
  "aria-label"?: string;

  /** Accepted: the role, written only when given. Upstream's `presentation` has no NSH value (R-010). */
  role?: AccessibilityRole;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: an icon is never a tab stop upstream. */
  tabIndex?: number;

  /** Accepted, no effect. */
  focusable?: boolean;

  /** Accepted, no effect: callers upstream never attach events to an icon. */
  onClick?: unknown;

  /** Accepted, no effect, as `onClick`. */
  onMouseEnter?: unknown;

  /** Accepted, no effect, as `onClick`. */
  onMouseLeave?: unknown;

  /** Reaches the canvas; a callback, because a ref store throws on the web target. */
  ref?: (node: ViewRef) => void;

  /** The identity of the icon; each icon has its own default (port sheet §3). */
  testID?: string;

  /** NSH's name for what `id` maps to. */
  nativeID?: string;

  /** A desktop hover tooltip. */
  tooltip?: JSX.Element;

  /** Fired whenever the canvas is laid out; this is how the geometry tests read a size. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** The accessible name through NSH's own prop. */
  accessibilityLabel?: string;

  /** The host prop behind `aria-hidden`. */
  accessibilityElementsHidden?: boolean;

  /** The host prop behind the hidden flag; defaults to hiding the subtree. */
  importantForAccessibility?: "auto" | "yes" | "no" | "no-hide-descendants";

  /** Every `aria-*` attribute, kept for API parity. */
  [key: `aria-${string}`]: unknown;

  /** Every `data-*` attribute: NSH projects none of them (D18). */
  [key: `data-${string}`]: unknown;
}

/* -------------------------------------------------------------------------------------------------
 * Lengths
 * -----------------------------------------------------------------------------------------------*/

/**
 * A CSS length from `width` / `height` as NSH points (R-015).
 *
 * A number is points. `px` and `pt` are the same number of points — NSH lays
 * out in points on every platform, so a CSS pixel has no separate meaning
 * here. `rem` is the root size, 16 points. A bare number in a string is the
 * unitless SVG presentation length, also points. A percentage asks for that
 * share of the parent and is passed through. Everything else, `em` above all,
 * has no NSH counterpart and returns `undefined`: the icon keeps its default
 * size (port sheet §8, the `IconCalendar` `1em` difference).
 */
function toLength(value: number | string | undefined): ViewStyle["width"] {
  if (value === undefined) return undefined;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const text = value.trim();

  if (text === "auto") return "auto";

  if (/^\d*\.?\d+%$/.test(text)) return text as `${number}%`;

  const match = /^(\d*\.?\d+)(px|pt|rem)?$/.exec(text);

  if (!match) return undefined;

  const amount = Number(match[1]);

  if (!Number.isFinite(amount)) return undefined;

  return match[2] === "rem" ? amount * 16 : amount;
}

/* -------------------------------------------------------------------------------------------------
 * Drawing
 * -----------------------------------------------------------------------------------------------*/

/**
 * Replays one SVG path onto a canvas at the box's measured size (R-004).
 *
 * The SVG scales its viewBox into the width × height box preserving the
 * aspect ratio and centering it, which is `xMidYMid meet`, the default. A
 * zero-sized canvas has nothing to paint.
 */
function drawIcon(
  cx: CanvasRenderingContext2D,
  size: CanvasSize,
  path: Path2D,
  viewBoxWidth: number,
  viewBoxHeight: number,
  fillRule: "nonzero" | "evenodd",
  paint: string,
): void {
  cx.clearRect(0, 0, size.width, size.height);

  if (size.width <= 0 || size.height <= 0) return;

  const scale = Math.min(size.width / viewBoxWidth, size.height / viewBoxHeight);
  const dx = (size.width - viewBoxWidth * scale) / 2;
  const dy = (size.height - viewBoxHeight * scale) / 2;

  cx.save();
  cx.translate(dx, dy);
  cx.scale(scale, scale);
  cx.fillStyle = paint;
  cx.fill(path, fillRule);
  cx.restore();
}

/* -------------------------------------------------------------------------------------------------
 * Icon canvas
 * -----------------------------------------------------------------------------------------------*/

/** The geometry and defaults one icon hands to the shared canvas. */
interface IconCanvasProps extends IconProps {
  /** The parsed path data; each icon parses its own once, at module load. */
  path: Path2D;

  /** The SVG viewBox width the path is written in. */
  viewBoxWidth: number;

  /** The SVG viewBox height. */
  viewBoxHeight: number;

  /** The path's own fill rule; the root's `fillRule` prop has no effect (R-007). */
  pathFillRule: "nonzero" | "evenodd";

  /** The size classes the SVG's `width` / `height` attributes became (R-001…R-003). */
  defaultClass: string;

  /** The identity the icon takes when the caller passes no `testID` (port sheet §3). */
  defaultTestID: string;
}

/**
 * The single component every icon renders: one `Canvas` whose `draw` fills the
 * icon's path with the resolved paint. All fifteen icons are this component
 * with different data, so the shrinking, the prop merging and the hiding are
 * written once.
 */
export function IconCanvas(props: IconCanvasProps): JSX.Element {
  const [local] = split(props, [
    "className",
    "style",
    "width",
    "height",
    "color",
    "paint",
    "aria-hidden",
    "aria-label",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "importantForAccessibility",
    "id",
    "nativeID",
    "role",
    "ref",
    "testID",
    "tooltip",
    "onLayout",
  ] as const);

  // R-015: the explicit sizes land in `style`, which wins over both the
  // default classes and the caller's `className`.
  const sizeStyle = computed<StyleProp<ViewStyle>>(() => {
    const width = toLength(local.width);
    const height = toLength(local.height);

    if (width === undefined && height === undefined) return undefined;

    const style: ViewStyle = {};

    if (width !== undefined) style.width = width;

    if (height !== undefined) style.height = height;

    return style;
  });

  // R-009: decorative by default. A caller that exposes the icon (`aria-hidden={false}`)
  // turns the hiding off and may name it through `aria-label`.
  const hidden = computed(
    () => local["aria-hidden"] ?? local.accessibilityElementsHidden ?? true,
  );

  // R-006: `currentColor` has no channel in a canvas, so the paint is a theme
  // token (`color`) or a literal (`paint`), and `token()` is read inside
  // `draw` so the appearance switch repaints. Upstream's own default is the
  // inherited text color, which is `foreground` on an ordinary surface.
  const paint = computed(() => local.paint ?? String(token(local.color ?? "foreground")));

  // A host element takes the callback through an indirection: passing the
  // split prop straight through drops it (the list-box parts do the same).
  const handleLayout = (event: { bounds: Bounds }) => {
    local.onLayout?.(event);
  };

  // R-012: the caller's class goes after the default size classes.
  const classes = computed(() =>
    local.className ? `${props.defaultClass} ${local.className}` : props.defaultClass,
  );

  return (
    <Canvas
      ref={(node) => local.ref?.(node)}
      testID={local.testID ?? props.defaultTestID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      role={local.role}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityElementsHidden={hidden()}
      importantForAccessibility={
        local.importantForAccessibility ??
        (hidden() ? "no-hide-descendants" : "auto")
      }
      class={classes()}
      style={[sizeStyle(), local.style]}
      // `props.pathFillRule` and the viewBox are fixed per icon; only `paint`
      // is reactive, and reading it here is what repaints on a theme switch.
      draw={(cx, size) =>
        drawIcon(
          cx,
          size,
          props.path,
          props.viewBoxWidth,
          props.viewBoxHeight,
          props.pathFillRule,
          paint(),
        )
      }
      // R-016: the upstream `svg` is an inline replaced box on the text
      // baseline; a `Canvas` is a block view. Every consumer lays its icons out
      // in a flex container, so the baseline takes part nowhere; the one
      // inline use, the Link's default icon, compensates with `pb-1.5` there.
      onLayout={handleLayout}
    />
  );
}
