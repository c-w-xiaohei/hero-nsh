import { split, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./render-children";
import { viewProps } from "./typography-dom-props";
import type { AriaProps, DataProps, GlobalDomProps } from "./typography-dom-props";
import { typographyVariants } from "./typography.styles";

/* -------------------------------------------------------------------------------------------------
 * Typography Prose
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Typography.Prose`: HeroUI 3.2.7's `ProseProps`, which is
 * React's `<div>` attributes minus `color`. `children` is required upstream and
 * stays required here.
 *
 * `render` is absent on purpose: upstream's Prose is a bare `<div>` and has no
 * `render` prop. The other DOM-only members (`id`, `title`, `aria-*`, `data-*`,
 * `dir` / `lang` / `hidden` / `inert` / `translate`) are accepted for API parity
 * and have no effect (port sheet §1, §8).
 */
export interface TypographyProseProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The article content. A bare string / number becomes a `Text`, because a
   * `View` draws none (port sheet §1, §3).
   */
  children: JSX.Element;

  /** Appended after the environment typography; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /**
   * A DOM attribute upstream (the browser's native hover hint). Accepted, no
   * effect: NSH has no `title`; pass `tooltip` for a visible hint.
   */
  title?: string;

  /**
   * Only the callback form, as the common rules require: handing an undefined
   * value to `ref` makes NSH treat it as a ref store, which throws on the web.
   */
  ref?: (node: ViewRef) => void;
}

const PROSE_SPLIT_KEYS = [
  "children",
  "className",
  "style",
  "id",
  "nativeID",
  "ref",
  "focusable",
  "title",
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
] as const;

/**
 * `Typography.Prose`: HeroUI's `Prose`, the article container.
 *
 * It is a `View`, not a `Text`: a `Text` would make the headings inside it
 * inline spans of one paragraph, while a `View` carries the environment
 * typography (`text-foreground text-base leading-7`, R-002 / R-009 / R-015) down
 * to the child `Text` elements and lets them stack as blocks (port sheet §3,
 * §5).
 *
 * Upstream styles the descendants of `<div class="typography-prose">` by HTML
 * element name; NSH has neither those elements nor element descendant
 * selectors, so headings and code bring their own classes through their parts
 * (R-003–R-008, R-010) and links, quotes, lists, rules, code blocks, emphasis
 * and images are written by the caller with `Text` / `View` / `Scroll` / `Image`
 * (R-011–R-014, R-016–R-020; port sheet §5, §8).
 */
export function TypographyProse(props: TypographyProseProps): JSX.Element {
  const [local, rest] = split(props, PROSE_SPLIT_KEYS);

  // R-002 / R-009 / R-015 live in the `prose` slot of `typography.styles.ts`.
  // The caller's class is passed through the slot function, so it lands last.
  const classes = typographyVariants().prose({ className: local.className });

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // A `<div>` is not a keyboard focus stop upstream; without this a
      // pressable View would become one. A caller's own `focusable` still wins.
      focusable={local.focusable ?? false}
      class={classes}
      style={local.style}
    >
      {/* The single read of `children`, at the placement. `renderChildren`
          turns a bare string / number into a `Text` (a View draws none) and
          keeps a reactive child reactive (research 4.1, 4.6). */}
      {renderChildren(local.children)}
    </View>
  );
}
