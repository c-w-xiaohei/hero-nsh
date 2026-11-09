import { tv } from "tailwind-variants";

/**
 * Header's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/header/header.styles.ts`.
 *
 * The upstream table is `tv({ base: "header" })`: one static BEM block and no
 * variant dimensions at all. Its eight declarations are expanded here in
 * source order (D18: BEM class names are not carried over). HeroUI passes the
 * caller's `className` through `headerVariants({ className })`, so it lands
 * after `base` and wins without a merge.
 */
export const headerVariants = tv({
  // R-001: `.header` → `w-full`.
  // R-002: `.header` → `px-2` (padding-inline: 8).
  // R-003: `.header` → `pt-1.5` (padding-top: 6).
  // R-004: `.header` → `pb-1` (padding-bottom: 4).
  // R-005: `.header` → `text-start` (text-align: start).
  // R-006: `.header` → `text-xs` (font-size 12, line-height 16).
  // R-007: `.header` → `font-medium` (font-weight 500).
  // R-008: `.header` → `text-muted` (semantic color; follows the appearance).
  base: "w-full px-2 pt-1.5 pb-1 text-start text-xs font-medium text-muted",
});
