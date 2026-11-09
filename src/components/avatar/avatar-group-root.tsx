import { computed, signal, split, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./avatar-children";
import { AvatarGroupCountView } from "./avatar-group-count-view";
import { AvatarGroupContext } from "./avatar-group-context";
import type { AvatarGroupContextValue } from "./avatar-group-context";
import { avatarGroupVariants } from "./avatar.styles";
import type { AvatarGroupVariants, AvatarVariants } from "./avatar.styles";
import type { AriaProps, DataProps, GlobalDomProps } from "./avatar-dom-props";
import { viewProps } from "./avatar-dom-props";
import { joinClassNames } from "./class-names";

/* -------------------------------------------------------------------------------------------------
 * AvatarGroup Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `AvatarGroup.Root` (= `AvatarGroup`): HeroUI 3.2.7's
 * `AvatarGroupRootProps`, which is a `render`-able `<div>` plus the group's
 * dimensions and slicing props.
 */
export interface AvatarGroupRootProps
  extends Omit<ViewProps, "children" | "class" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The avatars, and optionally one or more `AvatarGroup.Count` parts. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /**
   * Size for avatars (and the count) that omit their own. HeroUI defaults it to
   * `"md"`, matching Avatar.
   * @default "md"
   */
  size?: AvatarVariants["size"];

  /** Color for avatars (and the count) that omit their own. */
  color?: AvatarVariants["color"];

  /** Variant for avatars (and the count) that omit their own. */
  variant?: AvatarVariants["variant"];

  /**
   * Maximum number of avatars to render. Omit to render all of them and never
   * show an automatic count. A negative value counts as `0`.
   */
  max?: number;

  /**
   * How stacked avatars overlap.
   * - `"clip"` — a seam along the next avatar's outline upstream; NSH draws the
   *   same 2pt background ring (no `mask`).
   * - `"ring"` — a solid background-colored outline.
   *
   * Both values look the same in NSH (port sheet §5, §8). Has no effect when
   * `isGrid` is true.
   * @default "clip"
   */
  overlap?: AvatarGroupVariants["overlap"];

  /** Lays avatars out in a wrapping row with a 12pt gap instead of overlapping. @default false */
  isGrid?: boolean;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the element from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the group `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

export function AvatarGroupRoot(props: AvatarGroupRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "size",
    "color",
    "variant",
    "max",
    "overlap",
    "isGrid",
    "id",
    "nativeID",
    "ref",
    "focusable",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "aria-label",
    "aria-hidden",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  const isGrid = computed(() => local.isGrid ?? false);
  const overlap = computed<NonNullable<AvatarGroupVariants["overlap"]>>(
    () => local.overlap ?? "clip",
  );

  const slots = computed(() =>
    avatarGroupVariants({ isGrid: isGrid(), overlap: overlap() }),
  );

  /*
   * HeroUI's `React.Children.toArray` classification and `cloneElement` become
   * an ordered registry (research 4.2, port sheet §5). Avatars register in
   * creation order; `rank()` is the live index, so removing one compresses the
   * ranks after it. User-written counts register separately and never take a
   * rank.
   */
  const avatarIds = signal<readonly string[]>([]);
  const explicitCounts = signal(0);

  const registerAvatar = (id: string) => {
    avatarIds.set([...avatarIds(), id]);

    return {
      rank: () => avatarIds().indexOf(id),
      total: () => avatarIds().length,
    };
  };

  const unregisterAvatar = (id: string) => {
    avatarIds.set(avatarIds().filter((current) => current !== id));
  };

  const registerExplicitCount = () => {
    explicitCounts.set(explicitCounts() + 1);
  };

  const unregisterExplicitCount = () => {
    explicitCounts.set(Math.max(0, explicitCounts() - 1));
  };

  /*
   * `max` slicing and the automatic count are both derived from the registry:
   * `visibleCount` is how many avatars actually render (`min(total, max)`), and
   * `remaining` is what HeroUI writes as `+N`. `max < 0` counts as 0, so no
   * avatar renders and the count shows the whole total.
   */
  const visibleCount = computed(() => {
    const max = local.max;
    const total = avatarIds().length;

    return max == null ? total : Math.min(total, Math.max(0, max));
  });

  const remaining = computed(() => {
    const max = local.max;

    if (max == null) {
      return 0;
    }

    return Math.max(0, avatarIds().length - Math.max(0, max));
  });

  // A user-written Count suppresses the automatic one, as `hasExplicitCount`
  // does upstream; the automatic count itself must not register, or it would
  // suppress the very count it is.
  const showAutomaticCount = computed(
    () => remaining() > 0 && explicitCounts() === 0,
  );

  /*
   * The Avatar inside a count (explicit or automatic) is presentation only: it
   * must not take a rank, must not be sliced by `max`, and must not receive the
   * overlap margin or the fallback nudge a real avatar would. `isGrid` and an
   * unregistered rank switch all three off; the count view draws its own ring
   * and margin (R-030, R-033).
   */
  const withoutRegistration: AvatarGroupContextValue = {
    slots,
    size: () => local.size,
    color: () => local.color,
    variant: () => local.variant,
    max: () => local.max,
    overlap: () => overlap(),
    isGrid: () => true,
    registerAvatar: () => ({ rank: () => -1, total: () => -1 }),
    unregisterAvatar: () => {},
    registerExplicitCount: () => {},
    unregisterExplicitCount: () => {},
    visibleCount,
    get withoutRegistration() {
      return withoutRegistration;
    },
  };

  const groupContext: AvatarGroupContextValue = {
    slots,
    size: () => local.size,
    color: () => local.color,
    variant: () => local.variant,
    max: () => local.max,
    overlap: () => overlap(),
    isGrid: () => isGrid(),
    registerAvatar,
    unregisterAvatar,
    registerExplicitCount,
    unregisterExplicitCount,
    visibleCount,
    withoutRegistration,
  };

  const classes = computed(() =>
    joinClassNames(slots().base({ className: local.className })),
  );

  return (
    <AvatarGroupContext.Provider value={groupContext}>
      <View
        {...viewProps(rest)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        // A `<div>` is not a focus stop upstream.
        focusable={local.focusable ?? false}
        accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
        accessibilityElementsHidden={
          local["aria-hidden"] ?? local.accessibilityElementsHidden
        }
        class={classes()}
        style={local.style}
      >
        {/*
          The single read of `children`, inside the provider and at the
          placement (research 4.1, 4.6). It runs the avatars' bodies, and with
          them their registration, before the automatic count below asks how
          many are left.
        */}
        {renderChildren(local.children)}
        {/*
          R-034 is deleted: clip's transparent crescent is a CSS `mask`, which
          NSH does not have. The automatic count and the avatars share the 2pt
          background ring described in `avatar.styles.ts`.
        */}
        <If when={showAutomaticCount()}>
          <AvatarGroupCountView>{() => `+${remaining()}`}</AvatarGroupCountView>
        </If>
      </View>
    </AvatarGroupContext.Provider>
  );
}
