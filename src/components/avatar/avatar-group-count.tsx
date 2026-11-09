import { cleanup, split } from "nsh";
import type { JSX } from "nsh";

import { AvatarGroupCountView } from "./avatar-group-count-view";
import { AvatarGroupContext } from "./avatar-group-context";
import type { AvatarRootProps } from "./avatar-root";
import type { AvatarVariants } from "./avatar.styles";

/* -------------------------------------------------------------------------------------------------
 * AvatarGroup Count
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `AvatarGroup.Count`: HeroUI 3.2.7's `AvatarGroupCountProps`, which
 * is every Avatar root prop except `color` and `children`, which it redeclares.
 * Everything else is forwarded to the internal Avatar root.
 */
export interface AvatarGroupCountProps
  extends Omit<AvatarRootProps, "color" | "children"> {
  /** The fallback content (`+9` in the "server total" pattern). */
  children?: JSX.Element;

  /** Overrides the group's color for this count. */
  color?: AvatarVariants["color"];
}

export function AvatarGroupCount(props: AvatarGroupCountProps): JSX.Element {
  const group = AvatarGroupContext();

  const [local, rest] = split(props, [
    "children",
    "className",
    "color",
    "size",
    "variant",
    "ref",
  ] as const);

  /*
   * HeroUI classifies a user-written Count out of `children` and then renders
   * it in place of the automatic count. NSH cannot inspect children, so the
   * part registers its existence here, in its component body: the group reads
   * children before it evaluates the automatic count, so the two are decided in
   * the same frame (port sheet §2 / §5). This registration is what suppresses
   * `+N`; the group's own automatic count never calls it.
   */
  group?.registerExplicitCount();

  if (group !== undefined) {
    cleanup(() => group.unregisterExplicitCount());
  }

  // HeroUI resolves each dimension against the group's value before handing it
  // to the internal Avatar; the Avatar's own defaults close the rest.
  const size = () => local.size ?? group?.size();
  const color = () => local.color ?? group?.color();
  const variant = () => local.variant ?? group?.variant();

  return (
    <AvatarGroupCountView
      className={local.className}
      size={size()}
      color={color()}
      variant={variant()}
      passThrough={rest as unknown as Record<string, unknown>}
      ref={(node) => local.ref?.(node)}
    >
      {local.children}
    </AvatarGroupCountView>
  );
}
