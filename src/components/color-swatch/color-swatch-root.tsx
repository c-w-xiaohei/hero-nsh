import { computed, split, View } from "nsh";
import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, DomEventProps, GlobalDomProps } from "./color-swatch-dom-props";
import { viewProps } from "./color-swatch-dom-props";
import { COLOR_SWATCH_INTL_TRANSLATIONS } from "./color-swatch.intl";
import type {
  ColorSwatchChildren,
  ColorSwatchRenderProps,
} from "./color-swatch-render-props";
import { colorSwatchVariants } from "./color-swatch.styles";
import type { ColorSwatchVariants } from "./color-swatch.styles";
import type { Color } from "./colors";
import { parseColor } from "./colors";
import { renderColorSwatchChildren } from "./render-color-swatch-children";

/* -------------------------------------------------------------------------------------------------
 * ColorSwatch Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ColorSwatch.Root` (= `ColorSwatch`): HeroUI 3.2.7's
 * `ColorSwatchRootProps`, which is React Aria Components' `ColorSwatch` (plus
 * `colorName`) with the variant surface itself, expressed with NSH's view host
 * props.
 *
 * The DOM-only members upstream (`render`, `slot`, `aria-*`, `data-*`, `dir` /
 * `lang` …, the React DOM handlers) are accepted so code written against
 * HeroUI keeps compiling; see the port sheet §1 and §8 for what they can and
 * cannot do here.
 */
export interface ColorSwatchRootProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "style">,
    AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps {
  /**
   * The color to preview: a CSS color string or an already parsed `Color`.
   * `undefined` and `""` are both fully transparent, as upstream's
   * `value || "#fff0"`.
   */
  color?: string | Color;

  /**
   * The first half of the accessible name: a specific name for the color
   * ("Brand blue"). Without it, a name is generated from the color value, and a
   * fully transparent color is called "transparent".
   */
  colorName?: string;

  /** Appended after the slot classes; later classes win. A function receives the render props. */
  className?: string | ((renderProps: ColorSwatchRenderProps) => string);

  /**
   * The inline style. A function receives the render props. A `boxShadow` whose
   * layers are all inset moves to the border layer above the color, where an
   * inner shadow is visible; any other shadow stays on the root. Either way the
   * caller's shadow replaces the default 1px ring rather than drawing on top of
   * it (R-004).
   */
  style?:
    | StyleProp<ViewStyle>
    | ((renderProps: ColorSwatchRenderProps) => StyleProp<ViewStyle>);

  /**
   * Drawn after the color, the checkerboard and the border. A function receives
   * the render props and is called once, at this placement (D17).
   */
  children?: ColorSwatchChildren;

  /** The shape. @default "circle" */
  shape?: ColorSwatchVariants["shape"];

  /** The size. @default "md" */
  size?: ColorSwatchVariants["size"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no RAC slot context. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: a `<div>`'s native tooltip does not exist in NSH. */
  title?: string;

  /** Accepted, no effect: NSH moves focus between pressables, not through a `tabIndex`. */
  tabIndex?: number;

  /** The accessible name, appended after `colorName` with `", "`. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * - R-002 / R-003: the checkerboard layer. Upstream paints
 *   `repeating-conic-gradient(#efefef 0% 25%, #f7f7f7 0% 50%)` in a 16-point
 *   tile behind a `linear-gradient(current, current)` color layer. NSH has no
 *   `background-size` / `background-position`, so the tile is a 3×3 grid of
 *   16-point cells that covers the largest swatch (40 points): each cell is a
 *   four-quadrant conic gradient, which is the same 2×2 checkerboard at half
 *   the tile, i.e. 8-point squares. The color layer then composites over it,
 *   including the alpha. The phase starts at the top-left corner instead of
 *   upstream's `50%` position (port sheet §8).
 */
const CHECKER_CELL_CLASS =
  "size-4 bg-[conic-gradient(#efefef_0_25%,#f7f7f7_0_50%,#efefef_0_75%,#f7f7f7_0)]";

const CHECKER_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

/**
 * ColorSwatchRoot: a single-root component. The root is the sized, rounded,
 * clipped box; inside it are the checkerboard, the color, the default border
 * and then the caller's children, so each layer owns exactly one property:
 *
 * | Layer | Owns |
 * |---|---|
 * | root | size, radius, clipping, the caller's style (except an all-inset `boxShadow`) |
 * | checker | `backgroundImage` of the nine cells |
 * | color | `backgroundColor` (R-016, the only inline color) |
 * | border | the default inset ring, or the caller's all-inset `boxShadow` (R-004) |
 *
 * A caller's shadow that mixes inset and non-inset layers stays on the root:
 * one `boxShadow` has one owner, and the root's own shadow is not clipped by
 * its `overflow-hidden` (port sheet §8). Whatever its layers, a caller's shadow
 * replaces the default ring, exactly as upstream's inline `boxShadow` replaces
 * the stylesheet's `inset 0 0 0 1px rgba(0, 0, 0, 0.1)`; the ring is drawn only
 * while the caller supplies no shadow at all.
 */
export function ColorSwatchRoot(props: ColorSwatchRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "color",
    "colorName",
    "shape",
    "size",
    "id",
    "nativeID",
    "ref",
    "focusable",
    "slot",
    "render",
    "title",
    "tabIndex",
    "role",
    "aria-label",
    "accessibilityLabel",
  ] as const);

  /**
   * The resolved color: a string goes through `parseColor`, a `Color` is used
   * as it is, and both `undefined` and `""` mean upstream's `#fff0` (white at
   * alpha 0, fully transparent). It is the only derived value the render props
   * expose.
   */
  const resolvedColor = computed<Color>(() => {
    const value = local.color;

    if (value === undefined || value === "") {
      return parseColor("#fff0");
    }

    return typeof value === "string" ? parseColor(value) : value;
  });

  const renderProps: ColorSwatchRenderProps = { color: resolvedColor };

  /** R-016: the color layer's `backgroundColor`, from the same value as the name. */
  const colorCss = computed(() => resolvedColor().toString("css"));

  /**
   * The name generated from the color: upstream's `useColorSwatch` says
   * "transparent" at alpha 0, otherwise React Stately's color name ("vibrant
   * blue", "pale pink", …; the English table, port sheet §8).
   */
  const generatedName = computed(() => {
    const color = resolvedColor();

    return color.getChannelValue("alpha") === 0
      ? COLOR_SWATCH_INTL_TRANSLATIONS.transparent
      : color.getColorName();
  });

  /** `[colorName || generatedName, aria-label].filter(Boolean).join(", ")`. */
  const accessibilityLabel = computed(() => {
    // A falsy check, like upstream's `if (!colorName)`: `colorName=""` still
    // generates the name instead of leaving the label empty.
    const colorName = local.colorName || generatedName();

    return [colorName, local["aria-label"] ?? local.accessibilityLabel ?? ""]
      .filter(Boolean)
      .join(", ");
  });

  // R-001 … R-015 live in `color-swatch.styles.ts`; the caller's class comes
  // last, so it wins on any property it restates.
  const classes = computed(() =>
    joinClassNames(
      colorSwatchVariants({ shape: local.shape, size: local.size }),
      typeof local.className === "function"
        ? local.className(renderProps)
        : local.className,
    ),
  );

  // The caller's style, resolved once per color change; a function form reads
  // the accessor, which subscribes it to the color.
  const userStyle = computed<StyleProp<ViewStyle>>(() =>
    typeof local.style === "function" ? local.style(renderProps) : local.style,
  );

  const styles = computed(() => splitUserStyle(userStyle()));

  /**
   * The border layer's own props. R-004: the default ring draws only while the
   * caller supplies no `boxShadow`; any shadow of theirs, an all-inset one
   * included, takes the ring's place, never sits under it.
   */
  const borderLayer = computed(() => {
    const { border, hasShadow } = styles();

    return {
      class: hasShadow
        ? "absolute inset-0"
        : "absolute inset-0 shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.1)]",
      style: border === undefined ? undefined : { boxShadow: border },
    };
  });

  return (
    <View
      {...viewProps(rest)}
      // A callback only: NSH writes into a ref store, and an undefined one
      // would throw at mount on the web target (common rules, real hosts).
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // A `<div role="img">` is not a focus stop upstream; leave it out of the
      // Tab order unless the caller asks for it explicitly.
      focusable={local.focusable ?? false}
      // Upstream forces the role after the caller's props, so it cannot be
      // overridden; `image` is NSH's name for ARIA's `img`.
      role="image"
      accessibilityLabel={accessibilityLabel()}
      class={classes()}
      style={styles().root}
    >
      {/* R-003: the 16-point checkerboard tiles, 3×3 of them inside the 48-point box. */}
      <View class="absolute top-0 left-0 size-12 grid grid-cols-3 grid-rows-3">
        {CHECKER_CELLS.map(() => (
          <View class={CHECKER_CELL_CLASS} />
        ))}
      </View>

      {/*
        R-002 / R-016: the color, composited over the checkerboard; the only
        inline color. R-017 is deleted: RAC also writes `forced-color-adjust:
        none`, and NSH has neither a forced-colors mode nor that style key.
      */}
      <View class="absolute inset-0" style={{ backgroundColor: colorCss() }} />

      {/* R-004: the default border, above the color so the inset shadow shows. */}
      <View class={borderLayer().class} style={borderLayer().style} />

      {/*
        The single read of `children`, at the placement and after every layer.
        A render prop is called here once with the render props (D17); a bare
        string becomes a `Text`, because a `View` draws none.
      */}
      {renderColorSwatchChildren(local.children, renderProps)}
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Style ownership
 * -----------------------------------------------------------------------------------------------*/

/**
 * The caller's style, split by R-004's ownership rule: an all-inset `boxShadow`
 * moves to the border layer, everything else stays on the root together.
 *
 * `hasShadow` records that the caller supplied a `boxShadow` at all, in either
 * form; the border layer uses it to drop the default ring. Upstream writes the
 * caller's style into the same inline `style` that the stylesheet's
 * `box-shadow` sits under, so any inline shadow — `"none"`, an outer one, a
 * mixed one — replaces the ring instead of stacking on it.
 */
function splitUserStyle(style: StyleProp<ViewStyle>): {
  root: StyleProp<ViewStyle>;
  border: ViewStyle["boxShadow"];
  hasShadow: boolean;
} {
  const flattened = flattenStyle(style);
  const hasShadow =
    flattened.boxShadow !== undefined && flattened.boxShadow !== null;

  if (!isInsetOnlyShadow(flattened.boxShadow)) {
    return { root: flattened, border: undefined, hasShadow };
  }

  const { boxShadow, ...root } = flattened;

  return { root, border: boxShadow, hasShadow };
}

/** Arrays of style objects, as `StyleProp` allows, collapsed into one object. */
function flattenStyle(style: StyleProp<ViewStyle>): ViewStyle {
  if (style === null || style === undefined || style === false) {
    return {};
  }

  if (Array.isArray(style)) {
    let result: ViewStyle = {};

    for (const item of style) {
      result = { ...result, ...flattenStyle(item as StyleProp<ViewStyle>) };
    }

    return result;
  }

  return style as ViewStyle;
}

/**
 * Whether a `boxShadow` has at least one layer and every layer is inset, the
 * only case the border layer can own. An empty string, no shadow, or any
 * outset layer keeps the property on the root.
 */
function isInsetOnlyShadow(shadow: ViewStyle["boxShadow"]): boolean {
  if (shadow === undefined || shadow === null) {
    return false;
  }

  if (Array.isArray(shadow)) {
    return shadow.length > 0 && shadow.every((layer) => layer.inset === true);
  }

  const layers = splitShadowLayers(shadow);

  return layers.length > 0 && layers.every((layer) => /\binset\b/.test(layer));
}

/**
 * Splits a CSS `box-shadow` list on its top-level commas: a legacy
 * `rgba(0, 0, 0, 0.1)` color contains commas of its own.
 */
function splitShadowLayers(shadow: string): string[] {
  const layers: string[] = [];
  let depth = 0;
  let current = "";

  for (const character of shadow) {
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth = Math.max(0, depth - 1);
    }

    if (character === "," && depth === 0) {
      layers.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  if (current.trim().length > 0) {
    layers.push(current.trim());
  }

  return layers.filter((layer) => layer.length > 0);
}
