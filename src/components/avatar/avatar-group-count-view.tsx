import { computed } from "nsh";
import type { JSX, ViewRef } from "nsh";

import { AvatarFallback } from "./avatar-fallback";
import { AvatarRoot } from "./avatar-root";
import { AvatarGroupContext } from "./avatar-group-context";
import type { AvatarVariants } from "./avatar.styles";
import { joinClassNames } from "./class-names";

/* -------------------------------------------------------------------------------------------------
 * AvatarGroup Count View (internal)
 * -----------------------------------------------------------------------------------------------*/

/**
 * The visual half of both count flavors: the group's automatic `+N` and the
 * user-written `AvatarGroup.Count` render the same Avatar-with-fallback here.
 *
 * It is split from the public `AvatarGroup.Count` on purpose: HeroUI creates the
 * automatic count itself, so it never passes through `countChildren` and never
 * counts as an explicit count. In NSH children register themselves, so a public
 * Count that registered on render would suppress the very automatic count that
 * created it. The public part registers; this internal view only draws, and the
 * Avatar inside it sits under `withoutRegistration` so it takes no rank.
 *
 * Not exported from the package (port sheet §2 / §3).
 */
export interface AvatarGroupCountViewProps {
  /** The fallback content (`+N` for the automatic count). */
  children?: JSX.Element;

  /** The public Count's `className`, appended after the count slot. */
  className?: string;

  size?: AvatarVariants["size"];
  color?: AvatarVariants["color"];
  variant?: AvatarVariants["variant"];

  /** Props the public Count forwards to its internal Avatar root. */
  passThrough?: Record<string, unknown>;

  /** The public Count's ref, forwarded to its internal Avatar root. */
  ref?: (node: ViewRef) => void;
}

export function AvatarGroupCountView(
  props: AvatarGroupCountViewProps,
): JSX.Element {
  const group = AvatarGroupContext();

  /*
   * R-030: a count that follows at least one rendered avatar overlaps it by
   * 8pt (`-ms-2`); with every avatar sliced away by `max` there is no previous
   * sibling to overlap.
   * R-033: the 2pt background ring is drawn in every non-grid group, exactly
   * like R-032 does for avatars.
   */
  const positionClasses = computed(() => {
    if (group === undefined || group.isGrid()) {
      return "";
    }

    const classes = ["relative", "ring-2", "ring-background"];

    if (group.visibleCount() > 0) {
      classes.push("-ms-2");
    }

    return classes.join(" ");
  });

  // R-031 reaches the count through the group's `count` slot.
  const classes = computed(() =>
    joinClassNames(
      group?.slots().count(),
      props.className,
      positionClasses(),
    ),
  );

  const avatar = () => (
    <AvatarRoot
      {...props.passThrough}
      ref={(node) => props.ref?.(node)}
      className={classes()}
      size={props.size}
      color={props.color}
      variant={props.variant}
    >
      <AvatarFallback>{props.children}</AvatarFallback>
    </AvatarRoot>
  );

  // Inside a group the inner Avatar must not register itself as one of the
  // avatars being counted. Outside one there is nothing to suppress.
  return group === undefined ? (
    avatar()
  ) : (
    <AvatarGroupContext.Provider value={group.withoutRegistration}>
      {avatar()}
    </AvatarGroupContext.Provider>
  );
}
