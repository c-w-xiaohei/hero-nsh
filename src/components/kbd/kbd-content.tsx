import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps } from "nsh";

import { joinClassNames } from "./class-names";
import { KbdContext } from "./context";
import type { AriaProps, DataProps, GlobalDomProps } from "./kbd-dom-props";
import { viewProps } from "./kbd-dom-props";
import { kbdVariants } from "./kbd.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Kbd Content
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Kbd.Content`: HeroUI 3.2.7's `KbdContentProps`, which is
 * React's `<span>` attributes plus `children` and `className`.
 *
 * `render`, `aria-*` and `data-*` are accepted for API parity and have no
 * effect (port sheet §1, §8).
 */
export interface KbdContentProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  children: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /**
   * Upstream this is the DOM `title` attribute of `<span>`: the browser's
   * native hover tooltip. NSH has no `title`, so it feeds `tooltip` (the
   * visible hint) and `accessibilityHint`, exactly as `Kbd.Abbr` does.
   */
  title?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

export function KbdContent(props: KbdContentProps): JSX.Element {
  const ctx = KbdContext();

  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "focusable",
    "title",
    "tooltip",
    "accessibilityHint",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // R-006: HeroUI's `<span>` becomes a `View`, and `renderChildren` normalizes
  // what goes inside it: a bare string / number becomes a `Text` (a `View`
  // draws none) while elements pass through. The read of `props.children` is
  // cached in this computed so the placement below reads it exactly once, and a
  // dynamic child such as `<Kbd.Content>{key()}</Kbd.Content>` keeps updating.
  const children = computed(() => local.children);

  // `<span title>` shows the browser's native hint; NSH draws it with
  // `tooltip` and describes it with `accessibilityHint` (port sheet §8, R-004).
  const titleText = computed(() => {
    const text = local.title;

    return text !== undefined && text.length > 0 ? text : undefined;
  });
  const titleTooltip = computed(() => {
    const text = titleText();

    return text === undefined ? undefined : <Text>{text}</Text>;
  });

  // R-007 (the slot class) lives in `kbd.styles.ts`; without a root there are
  // no slot classes upstream either, only the caller's `className`.
  const classes = computed(() =>
    joinClassNames(
      ctx ? kbdVariants({ variant: ctx.variant() }).content() : "",
      local.className,
    ),
  );

  return (
    <View
      {...viewProps(rest)}
      nativeID={local.id ?? local.nativeID}
      focusable={local.focusable ?? false}
      accessibilityHint={local.accessibilityHint ?? titleText()}
      tooltip={local.tooltip ?? titleTooltip()}
      class={classes()}
      style={local.style}
    >
      {renderChildren(children())}
    </View>
  );
}
