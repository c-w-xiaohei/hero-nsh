import { split, Text } from "nsh";
import type { JSX, TextProps } from "nsh";

import { headerVariants } from "./header.styles";

/* -------------------------------------------------------------------------------------------------
 * Header Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Header` / `HeaderRoot`: HeroUI 3.2.7's `HeaderRootProps`, which
 * is React Aria Components' `Header` (`HTMLAttributes<HTMLElement>` plus
 * `render`) and the empty variant surface, expressed with NSH's text host props.
 *
 * The DOM-only members upstream (`id`, `render`) are accepted so code written
 * against HeroUI keeps compiling; see the port sheet §1 and §8 for what they
 * can and cannot do here. `ref` and `role` come from `TextProps` and reach the
 * root `Text`, as `ComponentPropsWithRef` does upstream.
 */
export interface HeaderRootProps extends Omit<TextProps, "children" | "class"> {
  /**
   * The title content. The root is a `Text`: strings, nested `Text` spans and
   * inline `View` / `Image` render; upstream's `<header>` also takes block
   * content, which becomes an inline fragment here (port sheet §8).
   */
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

/**
 * `Header` / `HeaderRoot`: HeroUI's `HeaderPrimitive` (React Aria's `Header`, a
 * collection leaf upstream) as a plain section title. It holds no state, reads
 * no context and dispatches no events; the Section that would name its group
 * with this text upstream is another unit, and NSH has no cross-element ids
 * (port sheet §2, §5, §8).
 */
export function HeaderRoot(props: HeaderRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "focusable",
    "role",
    "render",
  ] as const);

  return (
    <Text
      {...rest}
      ref={local.ref}
      nativeID={local.id ?? local.nativeID}
      style={local.style}
      // R-001–R-008 in `header.styles.ts`, then the caller's class: later wins.
      class={headerVariants({ className: local.className })}
      // Upstream `<header>` carries an implicit HTML landmark role; NSH has no
      // banner / contentinfo value, so the documented "section title" role
      // stands in. A caller's own `role` wins, as `rest` does upstream.
      role={local.role ?? "header"}
      // A `<header>` is not a keyboard focus stop upstream; without this a
      // pressable Text would become one (Tab moves between pressables).
      focusable={local.focusable ?? false}
    >
      {/* The single read of `children`, at the placement: a read builds new
          native views (research 4.1, 4.6). Nothing else needs them. */}
      {local.children}
    </Text>
  );
}
