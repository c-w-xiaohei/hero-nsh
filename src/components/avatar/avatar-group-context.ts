import { context } from "nsh";
import type { Accessor } from "nsh";

import type {
  AvatarGroupVariants,
  AvatarVariants,
  avatarGroupVariants,
} from "./avatar.styles";

/**
 * Marks direct children of AvatarGroup in HeroUI (it is set with
 * `cloneElement`). NSH cannot clone elements, so the runtime does not read it
 * at all: membership is decided by the nearest `AvatarGroupContext` (port sheet
 * §1, §8). The constant is exported only so code and type declarations written
 * against HeroUI keep compiling.
 */
export const AVATAR_GROUP_CHILD = "__avatar_group_child";

/**
 * What `AvatarGroup.Root` hands down (port sheet §2).
 *
 * HeroUI's context only carries the dimensions and the slot table, because it
 * classifies and slices children during render. NSH has no way to inspect or
 * clone children, so the group also owns an ordered registry: each `Avatar`
 * registers itself in its component body and asks for its rank, each written
 * `AvatarGroup.Count` registers the existence of an explicit count, and the
 * group derives `max` slicing and the automatic `+N` from those two counts.
 */
export interface AvatarGroupContextValue {
  /** The group's resolved slot table (`base`, `count`). */
  slots: Accessor<ReturnType<typeof avatarGroupVariants>>;
  /** Size for avatars that omit their own. */
  size: Accessor<AvatarVariants["size"] | undefined>;
  /** Color for avatars that omit their own. */
  color: Accessor<AvatarVariants["color"] | undefined>;
  /** Variant for avatars that omit their own. */
  variant: Accessor<AvatarVariants["variant"] | undefined>;
  /** How many avatars render; `undefined` renders them all. */
  max: Accessor<number | undefined>;
  /** Overlap style; both values draw the same 2pt background ring in NSH. */
  overlap: Accessor<NonNullable<AvatarGroupVariants["overlap"]>>;
  /** `true` disables overlap, ring and optical nudge. */
  isGrid: Accessor<boolean>;
  /**
   * Registers one avatar in creation order and returns its rank and the
   * current total. Ranks compress when an avatar unregisters.
   */
  registerAvatar: (id: string) => {
    rank: Accessor<number>;
    total: Accessor<number>;
  };
  /** Removes an avatar from the registry. */
  unregisterAvatar: (id: string) => void;
  /**
   * Registers one user-written `AvatarGroup.Count`. The automatic `+N` never
   * calls this: it is created by the group itself, never came from `children`,
   * and must not suppress itself.
   */
  registerExplicitCount: () => void;
  /** Removes a user-written `AvatarGroup.Count` registration. */
  unregisterExplicitCount: () => void;
  /** Avatars that actually render after `max` slicing; count slots read it. */
  visibleCount: Accessor<number>;
  /**
   * A copy of this context for the Avatar inside `Count` (explicit and
   * automatic): registration is a no-op there, so the count never takes an
   * avatar rank.
   */
  withoutRegistration: AvatarGroupContextValue;
}

type AvatarGroupVariantsLike = {
  overlap?: "clip" | "ring";
};

export const AvatarGroupContext = context<AvatarGroupContextValue | undefined>(
  undefined,
);
