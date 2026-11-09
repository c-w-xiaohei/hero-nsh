import { computed, cleanup, signal, split, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./avatar-children";
import { AvatarContext } from "./avatar-context";
import type { AvatarContextValue, ImageLoadingStatus } from "./avatar-context";
import { AVATAR_GROUP_CHILD, AvatarGroupContext } from "./avatar-group-context";
import { avatarVariants } from "./avatar.styles";
import type { AvatarVariants } from "./avatar.styles";
import type { AriaProps, DataProps, GlobalDomProps } from "./avatar-dom-props";
import { viewProps } from "./avatar-dom-props";
import { joinClassNames } from "./class-names";

/* -------------------------------------------------------------------------------------------------
 * Avatar Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Avatar.Root` (= `Avatar`): HeroUI 3.2.7's `AvatarRootProps`,
 * which is Radix Avatar Root's `<span>` attributes plus `color`, `size`,
 * `variant` and the group child marker, expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`render`, `aria-*`, `data-*`, `dir` / `lang` …)
 * are accepted so code written against HeroUI keeps compiling; see the port
 * sheet §1 and §8 for what they can and cannot do here.
 */
export interface AvatarRootProps
  extends Omit<ViewProps, "children" | "class" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The parts. A bare string is not wrapped here: only the fallback draws text. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Fallback text color (and, with `variant="soft"`, fallback background). @default "default" */
  color?: AvatarVariants["color"];

  /** Avatar size. @default "md" */
  size?: AvatarVariants["size"];

  /** Avatar variant. @default "default" */
  variant?: AvatarVariants["variant"];

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the element from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /**
   * HeroUI's internal marker, set by `AvatarGroup` with `cloneElement`. NSH
   * decides group membership by context instead, so this is accepted and does
   * nothing (port sheet §1, §8).
   */
  [AVATAR_GROUP_CHILD]?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  asChild?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/** One id per Avatar instance, so a group can order them. */
let nextAvatarId = 0;

export function AvatarRoot(props: AvatarRootProps): JSX.Element {
  // The nearest group, if any. `Avatar.Image` / `Avatar.Fallback` still throw
  // outside a root; only the root is allowed to stand alone.
  const group = AvatarGroupContext();

  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "color",
    "size",
    "variant",
    "id",
    "nativeID",
    "ref",
    "focusable",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "aria-label",
    "aria-hidden",
    "asChild",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
    AVATAR_GROUP_CHILD,
  ] as const);

  // HeroUI's registry replaces `React.Children` + `cloneElement`: an Avatar
  // registers itself in its component body, so the group sees it before it
  // computes the same frame's automatic `+N` (port sheet §2 / §5). Rank and
  // total stay accessors, so removing an avatar compresses the ranks of the
  // ones after it.
  const avatarId = `nsh-avatar-${nextAvatarId++}`;
  const registration = group?.registerAvatar(avatarId);

  if (group !== undefined) {
    cleanup(() => group.unregisterAvatar(avatarId));
  }

  const rank = registration?.rank ?? (() => -1);

  // Effective dimensions: own prop, else the group's, else Avatar's default.
  const size = computed(() => local.size ?? group?.size() ?? "md");
  const color = computed(() => local.color ?? group?.color() ?? "default");
  const variant = computed(() => local.variant ?? group?.variant());

  const slots = computed(() =>
    avatarVariants({ color: color(), size: size(), variant: variant() }),
  );

  // The loading state lives on the avatar instance: `Avatar.Image` writes it and
  // `Avatar.Fallback` reads it (Kobalte `image-root.tsx` owns the same signal).
  const status = signal<ImageLoadingStatus>("idle");

  // R-036: clip mode nudges the fallback glyphs of every avatar that has a
  // later visible avatar by 2.8pt (8pt × 0.35). A grid has no overlap and an
  // unregistered avatar (the one inside Count) has no rank to compare.
  const nudge = computed(() => {
    if (group === undefined || group.isGrid()) {
      return false;
    }

    return (
      group.overlap() === "clip" &&
      rank() >= 0 &&
      rank() < group.visibleCount() - 1
    );
  });

  // R-029 / R-032: the CSS child rules that overlap avatars and draw the 2pt
  // background ring are emitted here as classes, because NSH has no BEM hooks
  // and no `mask`. Both overlap values use the ring: on a flat background it
  // reproduces the seam, on a patterned one it cannot (port sheet §5, §8).
  const positionClasses = computed(() => {
    if (group === undefined || group.isGrid()) {
      return "";
    }

    const classes = ["relative", "ring-2", "ring-background"];

    if (rank() > 0) {
      classes.push("-ms-2");
    }

    return classes.join(" ");
  });

  const classes = computed(() =>
    joinClassNames(
      slots().base({ className: local.className }),
      positionClasses(),
    ),
  );

  const contextValue: AvatarContextValue = {
    slots,
    status,
    setStatus: (next) => status.set(next),
    nudge,
  };

  // R-030 / R-033: a count sits on the same overlap. Count reads
  // `visibleCount` because the first rendered avatar is not offset; see
  // `avatar-group-count-view.tsx`.

  // `max` slicing: an avatar past the limit renders nothing, while staying
  // registered so the group's total (and therefore `+N`) is right.
  const visible = computed(() => {
    const max = group?.max();

    return max == null || rank() < Math.max(0, max);
  });

  // A sliced avatar draws nothing, like HeroUI's removed element. The class is
  // a binding rather than a root-level `<If when={visible()}>`: a direct signal
  // read in the body is tracked by the insertion computation that created this
  // avatar, and re-creating it would re-register it with the group (measured
  // with the delay timer in `avatar-fallback.tsx`).
  const rootClass = computed(() => (visible() ? classes() : "hidden"));

  return (
    <AvatarContext.Provider value={contextValue}>
      <View
        {...viewProps(rest)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        // A `<span>` is not a focus stop upstream; leave it out of the Tab
        // order unless the caller asks for it explicitly.
        focusable={local.focusable ?? false}
        accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
        accessibilityElementsHidden={
          local["aria-hidden"] ?? local.accessibilityElementsHidden
        }
        class={rootClass()}
        style={local.style}
      >
        {/*
          The single read of `children`, inside the provider and at the
          placement (research 4.1, 4.6, and the provider exception in the
          common rules): the parts below resolve `AvatarContext`, so a
          computed created in the body would evaluate outside the provider.
          A sliced avatar renders none of them.
        */}
        {() => (visible() ? renderChildren(local.children) : null)}
      </View>
    </AvatarContext.Provider>
  );
}
