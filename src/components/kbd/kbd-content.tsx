import { computed, split, View } from "nsh";
import type { JSX, ViewProps } from "nsh";

import { joinClassNames } from "./class-names";
import { KbdContext } from "./context";
import type { AriaProps, DataProps, GlobalDomProps } from "./kbd-dom-props";
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
  ] as const);

  // R-006: HeroUI's `<span>` becomes a `View`, and `renderChildren` normalizes
  // what goes inside it: a bare string / number becomes a `Text` (a `View`
  // draws none) while elements pass through. The read of `props.children` is
  // cached in this computed so the placement below reads it exactly once, and a
  // dynamic child such as `<Kbd.Content>{key()}</Kbd.Content>` keeps updating.
  const children = computed(() => local.children);

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
      {...rest}
      nativeID={local.id ?? local.nativeID}
      focusable={local.focusable ?? false}
      class={classes()}
      style={local.style}
    >
      {renderChildren(children())}
    </View>
  );
}
