import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Disclosure's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/disclosure/disclosure.styles.ts` plus the 18
 * declarations of `packages/styles/components/disclosure.css`.
 *
 * HeroUI's own table has no dimension at all: six BEM slots and empty
 * `variants` / `defaultVariants`. NSH has no BEM CSS and no descendant
 * selectors (D18), so the slot keys stay (so the public type name survives)
 * and every declaration of the stylesheet becomes a real Tailwind class: state
 * rules are `classList` entries in the part that owns them (port sheet §4).
 */
export const disclosureVariants = tv({
  slots: {
    // R-001: `.disclosure` → `@apply relative`.
    base: "relative",
    // R-022: `.disclosure__heading` is only a BEM hook upstream; the element
    // (`h{level}`) carries no declaration, so the slot is empty and the part
    // supplies `role="header"` + `accessibilityLevel` instead.
    heading: "",
    // R-002: `.disclosure__trigger` → `cursor: var(--cursor-interactive)`.
    // R-003: `inline-block` is a structural rewrite: NSH has no inline
    // formatting context, so the trigger is a block-level `flex flex-row
    // items-center` row that keeps the label and the `ms-auto` indicator on
    // one line.
    // R-006: `.disclosure__trigger:disabled` / `[aria-disabled="true"]` →
    // `status-disabled` (0.5 opacity, `not-allowed`, no pointer events). The
    // opacity is a literal because the theme has no disabled token.
    trigger:
      "flex flex-row items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
    // R-013: `.disclosure__content` → `overflow: clip` (twref maps it to
    // `overflow: hidden`), the mechanism that keeps the collapsed panel
    // mounted and invisible.
    // R-015: the opacity half of the upstream `transition` shorthand →
    // `transition-opacity duration-200 ease-out`.
    // R-016: `motion-reduce:transition-none`.
    // R-011 / R-012 / R-017 (collapsed `opacity-0`, collapsed `h-0`, expanded
    // opacity 1) are the part's `classList`, the single owner of both
    // properties.
    content: "overflow-clip transition-opacity duration-200 ease-out motion-reduce:transition-none",
    // R-019: `.disclosure__body` → `@apply p-2`, on the outer View.
    body: "p-2",
    // R-022: `.disclosure__body-inner` is a BEM hook only; the caller's
    // `className` reaches this inner View.
    bodyInner: "",
    // R-007: `.disclosure__indicator` → `@apply ms-auto size-4 shrink-0` (the
    // fourth member, `text-inherit`, is R-008 and is dropped: an NSH icon is a
    // canvas painted from a token, not an inline SVG in `currentColor`).
    // R-009: `@apply transition duration-250 motion-reduce:transition-none`.
    indicator:
      "ms-auto size-4 shrink-0 transition duration-250 motion-reduce:transition-none",
  },
  variants: {},
  defaultVariants: {},
});

// Render props are not part of the variant surface upstream either
// (`disclosure.styles.ts` omits them from `DisclosureVariants`).
type DisclosureRenderPropsKeys = "isExpanded" | "isDisabled" | "state";

export type DisclosureVariants = Omit<
  VariantProps<typeof disclosureVariants>,
  DisclosureRenderPropsKeys
>;
