import { computed, split, View } from "nsh";
import type { JSX, ViewProps } from "nsh";

import { SeparatorContext } from "./context";
import { separatorVariants } from "./separator.styles";

/* -------------------------------------------------------------------------------------------------
 * Separator Root
 * -----------------------------------------------------------------------------------------------*/

/** The axis a Separator runs along, as upstream's React Aria type. */
export type SeparatorOrientation = "horizontal" | "vertical";

/** The color dimension, as upstream's `SeparatorVariants`. */
export type SeparatorVariant = "default" | "secondary" | "tertiary";

/**
 * The props of `Separator.Root`: HeroUI 3.2.7's `SeparatorRootProps`, which is
 * React Aria Components' `Separator` plus the variant surface itself, expressed
 * with NSH's view host props.
 *
 * The DOM-only members upstream (`elementType`, `slot`, `render`, `role`, the
 * `aria-*` relations, `data-*`) are accepted so code written against HeroUI
 * keeps compiling; see the port sheet §1 and §8 for what they can and cannot
 * do here. `className` and `style` keep the HeroUI names and reach the root
 * `View` as `class` and `style`.
 */
export interface SeparatorRootProps
  extends Omit<ViewProps, "children" | "class" | "role"> {
  /** Appended after the variant classes and the container's classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** The axis. @default "horizontal" */
  orientation?: SeparatorOrientation;

  /** The color. @default "default" */
  variant?: SeparatorVariant;

  /** Whether the divider is purely visual and hidden from assistive technology. @default false */
  isDecorative?: boolean;

  /** Accepted, no effect: NSH has one kind of host view, so `div` and `hr` are the same. */
  elementType?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: upstream forces `role="separator"`, which NSH's role table does not have. */
  role?: string;

  /** The accessible name upstream; maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-controls"?: string;

  /** Hides the separator from assistive technology; `isDecorative` sets the same thing. */
  "aria-hidden"?: boolean;
}

export function SeparatorRoot(props: SeparatorRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "orientation",
    "variant",
    "isDecorative",
    "elementType",
    "slot",
    "render",
    "role",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-controls",
    "aria-hidden",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "importantForAccessibility",
  ] as const);

  // Read once, in the body: the classes a container root (Toolbar) hands down
  // in place of a CSS descendant selector (port sheet §5). Undefined outside
  // such a container, which leaves the looks unchanged.
  const container = SeparatorContext();

  // Kobalte's default (`packages/core/src/separator/separator-root.tsx`), kept
  // as the authority for the default value; HeroUI resolves the same fallback.
  const orientation = computed(() => local.orientation ?? "horizontal");

  // `isDecorative` is a pure accessibility switch upstream: it never changes
  // the screen, only whether assistive technology can reach the divider.
  const isDecorative = computed(() => local.isDecorative === true);

  // Upstream writes `aria-hidden="true"` and `role="presentation"` in
  // decorative mode, and leaves a caller's own `aria-hidden` in place
  // otherwise. NSH's equivalent of `aria-hidden` is
  // `accessibilityElementsHidden`; `importantForAccessibility` additionally
  // keeps the whole subtree out of the accessibility tree (port sheet §5).
  const isHidden = computed(
    () =>
      isDecorative() ||
      local["aria-hidden"] === true ||
      local.accessibilityElementsHidden === true,
  );

  const importantForAccessibility = computed(() =>
    isDecorative() ? "no-hide-descendants" : local.importantForAccessibility,
  );

  return (
    <View
      {...rest}
      ref={local.ref}
      nativeID={local.id ?? local.nativeID}
      style={local.style}
      // R-001 … R-016 in `separator.styles.ts`, then the container's classes,
      // then the caller's: three segments in that order, later winning
      // (port sheet §4; HeroUI passes `className` into the same `tv()` call).
      class={separatorVariants({
        orientation: orientation(),
        variant: local.variant,
        className: [container?.partClass?.(), local.className]
          .filter((name): name is string => typeof name === "string" && name.length > 0)
          .join(" "),
      })}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityElementsHidden={isHidden()}
      importantForAccessibility={importantForAccessibility()}
    />
  );
}
