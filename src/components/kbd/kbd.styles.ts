import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Kbd's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/kbd/kbd.styles.ts` plus the declarations of
 * `packages/styles/components/kbd.css`.
 *
 * HeroUI's table has one dimension (`variant`) and three BEM slots whose CSS
 * lives on the element selectors. NSH has no BEM class names (D18), so each
 * slot carries the declarations its selector applied, and `variant.light`
 * overrides the root slot's background.
 */
export const kbdVariants = tv({
  slots: {
    // R-001: `.kbd` → `inline-flex h-6 items-center rounded-lg bg-default px-2
    // text-center font-sans text-sm font-medium whitespace-nowrap text-muted`;
    // `inline-flex` becomes `flex` (NSH has no inline layout context, so it is
    // a block-level row) plus `w-fit` for the shrink-to-content width it had in
    // a line. `h-6` is 24, `rounded-lg` is the theme's 8, `px-2` is 8, and
    // `text-sm` is 14 / 20. The inline-participation difference is port sheet
    // §8.
    // R-002: `.kbd` → `space-x-0.5 rtl:space-x-reverse` (2 between children)
    // → `gap-0.5`: the children are the row's flex items, where `gap` equals
    // the space-between and needs no RTL counterpart.
    // R-003: `.kbd` → `word-spacing: -0.25rem` is deleted: NSH has neither that
    // class nor a `wordSpacing` style key, so multi-word labels ("Page Up")
    // keep the default spacing (port sheet §8).
    base: "flex w-fit h-6 items-center gap-0.5 rounded-lg bg-default px-2 text-center font-sans text-sm font-medium whitespace-nowrap text-muted",
    // R-005: `.kbd__abbr` → `display: flex; justify-content: center;
    // align-items: center; width: 100%; height: 100%; text-decoration: none`.
    // `shrink` restores CSS's default `flex-shrink: 1` (NSH defaults to 0), so
    // several abbreviations in one root share the width instead of overflowing.
    // `text-decoration: none` has no counterpart to write: NSH text has no
    // underline and there is no `abbr[title]` UA style.
    abbr: "flex h-full w-full shrink items-center justify-center",
    // R-007: `.kbd__content` → `display: flex; justify-content: center;
    // align-items: center`; the `<span>` → `View` change does not alter the
    // visible result because it stays a shrink-to-content flex item.
    content: "flex items-center justify-center",
  },
  variants: {
    variant: {
      // R-009: `.kbd--default` exists only as a class name in
      // `kbd.styles.ts`; the CSS block has no rule, so the variant value is
      // empty and the variant surface stays identical to HeroUI's.
      default: "",
      // R-008: `.kbd--light` → `@apply bg-transparent`; painted on the root
      // slot, later than `bg-default`, so it wins.
      light: { base: "bg-transparent" },
    },
  },
  defaultVariants: {},
});

export type KbdVariants = VariantProps<typeof kbdVariants>;
