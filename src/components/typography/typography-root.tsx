import { computed, split, Text } from "nsh";
import type { AccessibilityRole, JSX, TextProps, ViewRef } from "nsh";

import { textProps } from "./typography-dom-props";
import type { AriaProps, DataProps, GlobalDomProps } from "./typography-dom-props";
import { typographyVariants } from "./typography.styles";
import type { TypographyVariants } from "./typography.styles";

/* -------------------------------------------------------------------------------------------------
 * Typography types
 * -----------------------------------------------------------------------------------------------*/

/** The `type` dimension of the variant table. */
export type TypographyType = NonNullable<TypographyVariants["type"]>;
/** The `align` dimension of the variant table. */
export type TypographyAlign = NonNullable<TypographyVariants["align"]>;
/** The `color` dimension of the variant table. */
export type TypographyColor = NonNullable<TypographyVariants["color"]>;
/** The `weight` dimension of the variant table. */
export type TypographyWeight = NonNullable<TypographyVariants["weight"]>;

/* -------------------------------------------------------------------------------------------------
 * Shared props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props every text part (`Root`, `Heading`, `Paragraph`, `Code`) shares:
 * NSH's text host props plus HeroUI 3.2.7's DOM-only surface.
 *
 * The DOM-only members (`id`, `slot`, `title`, `render`, `aria-*`, `data-*`,
 * `dir` / `lang` / `hidden` / `inert` / `translate`) are accepted so code
 * written against HeroUI keeps compiling; see the port sheet §1 and §8 for what
 * they can and cannot do here. `ref` reaches the root `Text`, as
 * `ComponentPropsWithRef` does upstream.
 */
export interface TypographyTextProps
  extends Omit<TextProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The content. The root is a `Text`: strings, numbers and nested `Text`
   * spans render; reading it happens once, at the placement.
   */
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /**
   * A DOM id upstream; maps to `nativeID`, the name other elements refer to.
   */
  id?: string;

  /**
   * React Aria's collection slot. Accepted, no effect: NSH has no slot
   * collection, and these parts are placed by hand.
   */
  slot?: string;

  /**
   * A DOM attribute upstream (the browser's native hover hint). Accepted, no
   * effect: NSH has no `title`; pass `tooltip` for a visible hint.
   */
  title?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /**
   * Only the callback form, as the common rules require: handing an undefined
   * value to `ref` makes NSH treat it as a ref store, which throws on the web.
   */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Typography Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Typography` / `Typography.Root` / `TypographyRoot`: HeroUI
 * 3.2.7's `TypographyRootProps` (React Aria's `Text` minus `className` and
 * `elementType`, plus the five variant dimensions).
 */
export interface TypographyRootProps extends TypographyTextProps {
  /** Text alignment, default `"start"`; start / end follow the layout direction. */
  align?: TypographyAlign;

  /** `"default"` (`text-foreground`) or `"muted"` (`text-muted`), default `"default"`. */
  color?: TypographyColor;

  /** What kind of text this is: decides the size / weight classes and, for `h*`, the heading level. */
  type?: TypographyType;

  /** One line with a tail ellipsis and no wrapping. */
  truncate?: boolean;

  /** Weight, unset by default; a heading's `font-semibold` stays unless a weight is given. */
  weight?: TypographyWeight;
}

/**
 * `Typography` / `Typography.Root`: HeroUI's `TypographyRoot`, the shared text
 * renderer of the four parts.
 *
 * It holds no state, reads no context and dispatches no events: the whole
 * component is a class-string computation plus a semantic mapping (port sheet
 * §2). `type` decides the visual variant; for `h1`–`h6` it also makes the
 * element a heading (`role="header"` + `accessibilityLevel`), since NSH has no
 * `<h1>`–`<h6>` elements (port sheet §3, §8).
 */
export function TypographyRoot(props: TypographyRootProps): JSX.Element {
  return renderTypography(props, () => props.type ?? "body");
}

/* -------------------------------------------------------------------------------------------------
 * Shared renderer
 * -----------------------------------------------------------------------------------------------*/

/**
 * What the shared renderer may see: the text part props plus the dimensions
 * the convenience parts derive (`level` for Heading, `size` for Paragraph).
 */
interface TypographyRenderProps extends TypographyTextProps {
  align?: TypographyAlign;
  color?: TypographyColor;
  type?: TypographyType;
  truncate?: boolean;
  weight?: TypographyWeight;
  level?: number;
  size?: string;
}

/**
 * The props a text part splits off before handing the rest to `Text`. `level`
 * and `size` are listed even though the renderer does not use them: leaving
 * them in `rest` would forward unknown props to the host.
 */
const TEXT_SPLIT_KEYS = [
  "children",
  "className",
  "style",
  "id",
  "nativeID",
  "ref",
  "focusable",
  "role",
  "accessibilityLevel",
  "align",
  "color",
  "truncate",
  "type",
  "weight",
  "level",
  "size",
  "title",
  "slot",
  "render",
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
] as const;

/**
 * Renders the root `Text` of a Typography part.
 *
 * `type` is an accessor so `Heading` / `Paragraph` can derive it from their own
 * props while this function stays the single renderer; it is read inside the
 * computed below, which keeps a changing `level` / `size` / `type` reactive.
 */
export function renderTypography(
  props: TypographyRenderProps,
  type: () => TypographyType,
): JSX.Element {
  const [local, rest] = split(props, TEXT_SPLIT_KEYS);

  const resolvedType = computed(() => type());

  // R-003–R-008, R-021–R-026: an `h1`–`h6` type is a heading. NSH has no
  // `<h1>`–`<h6>`; `role="header"` plus `accessibilityLevel` carries the
  // heading level instead.
  const headingLevel = computed<number | undefined>(() => {
    const match = /^h([1-6])$/.exec(resolvedType());

    return match === null ? undefined : Number(match[1]);
  });

  const role = computed<AccessibilityRole | undefined>(() =>
    headingLevel() === undefined ? undefined : "header",
  );

  // R-001 / R-002 / R-009 / R-015 / R-021–R-041: the variant table resolves the
  // slot class; the caller's `className` is passed through the slot function,
  // so it lands last and wins (port sheet §1).
  const classes = computed(() =>
    typographyVariants({
      align: local.align,
      color: local.color,
      truncate: local.truncate,
      type: resolvedType(),
      weight: local.weight,
    }).base({ className: local.className }),
  );

  return (
    <Text
      {...textProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // A `<p>` / `<h1>` / `<code>` is not a keyboard focus stop upstream;
      // without this a pressable Text would become one. A caller's own
      // `focusable` still wins.
      focusable={local.focusable ?? false}
      role={local.role ?? role()}
      accessibilityLevel={local.accessibilityLevel ?? headingLevel()}
      class={classes()}
      style={local.style}
    >
      {/* The single read of `children`, at the placement: a read builds new
          native views (research 4.1, 4.6). Nothing else needs them. */}
      {local.children}
    </Text>
  );
}
