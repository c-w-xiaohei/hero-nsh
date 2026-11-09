import { Canvas, computed, Path2D, split, View } from "nsh";
import type {
  CanvasRenderingContext2D,
  CanvasSize,
  JSX,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";

import { themeToken } from "../../theme";
import {
  FALLBACK_CHECKBOX_CONTEXT,
  type CheckboxFieldRenderProps,
  CheckboxContext,
} from "./checkbox-context";
import { checkboxVariants } from "./checkbox.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Default drawing
 * -----------------------------------------------------------------------------------------------*/

/**
 * The check, as the SVG polyline `points="1 9 7 14 15 4"` of
 * `checkbox.tsx:149-163`, parsed once at module load. NSH has no SVG, so the
 * polyline is stroked on the core `Canvas` (port sheet R-011, §5).
 */
const CHECKMARK_PATH = new Path2D("M1 9 L7 14 L15 4");

/** The indeterminate bar, as the SVG line `(3 12) → (21 12)` (R-015). */
const INDETERMINATE_PATH = new Path2D("M3 12 L21 12");

const CHECKMARK_VIEW_BOX = { width: 17, height: 18 } as const;
const INDETERMINATE_VIEW_BOX = { width: 24, height: 24 } as const;

/**
 * Replays a path at the canvas's measured size, centring it the way an SVG's
 * default `preserveAspectRatio="xMidYMid meet"` does.
 */
function drawPath(
  cx: CanvasRenderingContext2D,
  size: CanvasSize,
  path: Path2D,
  viewBox: { width: number; height: number },
  lineWidth: number,
  paint: string,
): void {
  cx.clearRect(0, 0, size.width, size.height);

  if (size.width <= 0 || size.height <= 0) {
    return;
  }

  const scale = Math.min(size.width / viewBox.width, size.height / viewBox.height);
  const dx = (size.width - viewBox.width * scale) / 2;
  const dy = (size.height - viewBox.height * scale) / 2;

  cx.save();
  cx.translate(dx, dy);
  cx.scale(scale, scale);
  cx.strokeStyle = paint;
  // `strokeWidth={2}` in the SVG is `stroke-[2.5px]` from the stylesheet in
  // viewBox user units; both are scaled by the transform above (R-011).
  cx.lineWidth = lineWidth;
  cx.lineCap = "round";
  cx.lineJoin = "round";
  cx.stroke(path);
  cx.restore();
}

/* -------------------------------------------------------------------------------------------------
 * Checkbox Indicator
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Checkbox.Indicator`: HeroUI 3.2.7's `CheckboxIndicatorProps`, a
 * `span` placed inside `Checkbox.Control` that draws the check and, while
 * indeterminate, the bar.
 *
 * `children` is the HeroUI render prop (a function with parameters) receiving
 * the field state (D17); a plain element replaces the default drawing, and an
 * empty one restores it.
 */
export interface CheckboxIndicatorProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Custom content, or a render prop called once with accessors. */
  children?: JSX.Element | ((values: CheckboxFieldRenderProps) => JSX.Element);

  /** Appended after the indicator slot classes. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  ref?: (node: ViewRef) => void;

  /** The DOM attribute upstream; `true` unless the caller overrides it. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** Hides the indicator from assistive technologies; `aria-hidden` wins. */
  accessibilityElementsHidden?: boolean;

  /** An identifier for UI tests, on the indicator. */
  testID?: string;

  /** The name other elements refer to; also set by `id`. */
  nativeID?: string;
}

/**
 * Checkbox.Indicator / CheckboxIndicator: `relative z-10 flex size-3` inside
 * the square. Without children it draws the default check (only while
 * selected) and, while indeterminate, the bar; with children — including a
 * render prop that returns nothing — it draws only them, as upstream.
 *
 * The decorative default is hidden from assistive technologies by default, the
 * `aria-hidden="true"` HeroUI hard-codes on `dom.span`
 * (`checkbox.tsx:183`); a caller may override it, as `{...props}` does there.
 */
export function CheckboxIndicator(
  props: CheckboxIndicatorProps,
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "aria-hidden",
    "slot",
    "render",
    "accessibilityElementsHidden",
    "testID",
    "nativeID",
  ] as const);

  const ctx = CheckboxContext() ?? FALLBACK_CHECKBOX_CONTEXT;

  // One read of `children` (common rules): the same value decides whether the
  // default drawing shows and, when it is a render prop, what it renders.
  const children = computed(() => local.children);

  const isRenderProp = computed(() => {
    const value = children();

    return typeof value === "function" && value.length >= 1;
  });

  const fieldRenderProps: CheckboxFieldRenderProps = {
    isSelected: ctx.isSelected,
    isIndeterminate: ctx.isIndeterminate,
    isDisabled: ctx.isDisabled,
    isReadOnly: ctx.isReadOnly,
    isInvalid: ctx.isInvalid,
    isRequired: ctx.isRequired,
  };

  // The render prop runs inside the `computed` rather than under `untracked`,
  // because HeroUI calls it on every render and a body may return a
  // conditional tree (`children(state)` in `checkbox.tsx:144`, so
  // `({ isSelected }) => isSelected() ? <Check /> : null` is legal usage). With
  // the call untracked, that whole tree is decided once and freezes; tracking it
  // re-runs the body when the state it read at the top level changes.
  // A body that reads the state only inside its child expressions still reads
  // nothing here (the expressions are NSH's reactive children), so the common
  // case is still built once and left alone.
  const custom = computed(() => {
    const value = children();

    if (typeof value === "function" && value.length >= 1) {
      return (value as (values: CheckboxFieldRenderProps) => JSX.Element)(fieldRenderProps);
    }

    return value as JSX.Element;
  });

  // Upstream only falls back to its own drawing when `children` is absent:
  // `typeof children === 'function' ? children(state) : children ? children :
  // default` (`checkbox.tsx:144-179`). A render prop that returns nothing
  // therefore leaves the indicator empty, and the empty indicator must not
  // bring the check back.
  const showsDefault = computed(() => {
    const value = children();

    if (typeof value === "function" && value.length >= 1) {
      return false;
    }

    return value === undefined || value === null || value === false;
  });

  // R-010: `[data-selected="true"] .checkbox__indicator,
  // [data-indeterminate="true"] .checkbox__indicator { border-color:
  // var(--accent-foreground) }`. There is no border width upstream either: only
  // a caller's bordered custom indicator shows it.
  const classes = computed(() =>
    [
      checkboxVariants({ variant: ctx.variant() }).indicator(),
      ctx.isSelected() || ctx.isIndeterminate() ? "border-accent-foreground" : "",
      local.className ?? "",
    ]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  // R-011: the check paints only in the selected terminal state (upstream's
  // `strokeDashoffset` 44); the draw-in animation and the 150ms dashoffset
  // transition cannot be replayed on a canvas (R-012, R-013, §5).
  // R-014: invalid + selected paints it with `--danger-foreground`.
  const drawCheckmark = (cx: CanvasRenderingContext2D, size: CanvasSize) => {
    if (!ctx.isSelected()) {
      cx.clearRect(0, 0, size.width, size.height);

      return;
    }

    drawPath(
      cx,
      size,
      CHECKMARK_PATH,
      CHECKMARK_VIEW_BOX,
      2.5,
      themeToken(ctx.isInvalid() ? "danger-foreground" : "accent-foreground"),
    );
  };

  // R-015 / R-016: the bar, `absolute size-3`, mounted only while
  // indeterminate, painted `--danger-foreground` when the field is invalid.
  const drawIndeterminate = (cx: CanvasRenderingContext2D, size: CanvasSize) => {
    drawPath(
      cx,
      size,
      INDETERMINATE_PATH,
      INDETERMINATE_VIEW_BOX,
      3,
      themeToken(ctx.isInvalid() ? "danger-foreground" : "accent-foreground"),
    );
  };

  // The upstream `aria-hidden="true"` is a default a caller can override,
  // because HeroUI spreads `{...props}` after it.
  const hidden = computed(
    () => local["aria-hidden"] ?? local.accessibilityElementsHidden ?? true,
  );

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.nativeID}
      accessibilityElementsHidden={hidden()}
      importantForAccessibility={hidden() ? "no-hide-descendants" : "auto"}
      class={classes()}
      style={local.style}
    >
      {/* The custom content comes first; while it exists neither default
          graphic mounts (`showsDefault`). */}
      {renderChildren(custom())}
      {/* R-033: `.checkbox__indicator svg { size-full }` also outranks the
          check's own `size-2.5`, so the canvas fills the 12pt indicator. */}
      <If when={showsDefault()}>
        <Canvas
          testID="checkbox-default-indicator--checkmark"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          class="size-full"
          draw={drawCheckmark}
        />
      </If>
      <If when={showsDefault() && ctx.isIndeterminate()}>
        <Canvas
          testID="checkbox-default-indicator--indeterminate"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          class="absolute size-3"
          draw={drawIndeterminate}
        />
      </If>
    </View>
  );
}
