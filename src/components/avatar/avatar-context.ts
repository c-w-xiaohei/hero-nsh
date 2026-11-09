import { context } from "nsh";
import type { Accessor } from "nsh";

import type { avatarVariants } from "./avatar.styles";

/**
 * The image loading status shared by the three Avatar parts. The names and
 * meanings are Radix Avatar's (and Kobalte `image/types.ts`'s):
 *
 * - `idle`: nothing has been asked yet;
 * - `loading`: a `src` is set and the host is fetching it;
 * - `loaded`: the image is ready to draw;
 * - `error`: no `src`, or the load failed.
 *
 * Exported from `avatar-context.ts` only: HeroUI does not export this type
 * either (port sheet §1).
 */
export type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error";

/**
 * What `Avatar.Root` hands to `Avatar.Image` and `Avatar.Fallback` (the shape of
 * Kobalte's `ImageContextValue`, moved to HeroUI's prop locations).
 *
 * `slots` is the root's resolved slot table; `status` / `setStatus` are the
 * image loading state the Image writes and the Fallback reads; `nudge` is the
 * clip-mode optical compensation derived from the group rank, read by the
 * Fallback.
 *
 * Not exported from the package entry: HeroUI keeps `AvatarContext` private
 * (port sheet §2).
 */
export interface AvatarContextValue {
  /** The slot table resolved from the root's effective color / size / variant. */
  slots: Accessor<ReturnType<typeof avatarVariants>>;
  /** The image loading state. */
  status: Accessor<ImageLoadingStatus>;
  /** `Avatar.Image` reports a new state here. */
  setStatus: (status: ImageLoadingStatus) => void;
  /** Whether the fallback needs the 2.8pt optical nudge (R-036). */
  nudge: Accessor<boolean>;
}

export const AvatarContext = context<AvatarContextValue | undefined>(undefined);
