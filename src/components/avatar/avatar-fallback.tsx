import { computed, effect, signal, split, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./avatar-children";
import { AvatarContext } from "./avatar-context";
import type { AvatarVariants } from "./avatar.styles";
import type { AriaProps, DataProps, GlobalDomProps } from "./avatar-dom-props";
import { viewProps } from "./avatar-dom-props";
import { joinClassNames } from "./class-names";

/* -------------------------------------------------------------------------------------------------
 * Avatar Fallback
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Avatar.Fallback`: HeroUI 3.2.7's `AvatarFallbackProps`, which is
 * Radix Avatar Fallback's `<span>` attributes plus a `color` override, and
 * `delayMs` (Radix's `delayMs`, which HeroUI passes straight through). Both
 * live on the Fallback upstream; Kobalte keeps them on Root, and HeroUI wins
 * (port sheet §1).
 */
export interface AvatarFallbackProps
  extends Omit<ViewProps, "children" | "class" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The initials / icon. A bare string or number becomes a `Text`. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Overrides the root's fallback color for this fallback only. */
  color?: AvatarVariants["color"];

  /**
   * Delay in milliseconds before the fallback may appear. Without it the
   * fallback renders immediately (`canRender` starts `true`, as Kobalte's
   * `image-fallback.tsx`).
   */
  delayMs?: number;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the element from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  asChild?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the fallback `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

export function AvatarFallback(props: AvatarFallbackProps): JSX.Element {
  const ctx = AvatarContext();

  if (ctx === undefined) {
    throw new Error(
      "[hero-nsh]: `Avatar.Fallback` must be used within an `Avatar` component",
    );
  }

  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "color",
    "delayMs",
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
  ] as const);

  // Kobalte's `canRender`: true at once without a delay, otherwise after the
  // timer. A `delayMs` change starts a new timer but never hides an already
  // visible fallback, matching `image-fallback.tsx`.
  const canRender = signal(local.delayMs === undefined);

  effect(() => {
    const delayMs = local.delayMs;

    if (delayMs === undefined) {
      return;
    }

    const timer = setTimeout(() => canRender.set(true), delayMs);

    return () => clearTimeout(timer);
  });

  // Kobalte's render condition: the delay elapsed and the image is not loaded
  // (loading and error both show the fallback).
  const visible = computed(() => canRender() && ctx.status() !== "loaded");

  // R-036: clip mode's optical nudge, 8pt × 0.35 = 2.8pt.
  const classes = computed(() =>
    joinClassNames(
      ctx.slots().fallback(
        local.color === undefined ? undefined : { color: local.color },
      ),
      local.className,
      ctx.nudge() ? "pe-[2.8px]" : "",
    ),
  );

  // The fallback's box itself is the reactive surface: while hidden it carries
  // `hidden` (display none) and no content, so nothing paints and nothing is
  // laid out. The read lives in this binding rather than in the body, because
  // the Avatar root creates its children inside an insertion computation; a
  // body-level read would tie that computation to `canRender()` and re-create
  // the fallback every time the delay timer fired (measured).
  const rootClass = computed(() => (visible() ? classes() : "hidden"));

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      focusable={local.focusable ?? false}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden
      }
      class={rootClass()}
      style={local.style}
    >
      {/*
        The single read of `children`, at the placement, and only while the
        fallback shows (Kobalte's render condition).
      */}
      {() => (visible() ? renderChildren(local.children) : null)}
    </View>
  );
}
