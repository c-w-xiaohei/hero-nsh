import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * The three ListBox variant tables of `@heroui/styles` 3.2.7
 * (`packages/styles/src/components/{list-box,list-box-item,list-box-section}/
 * *.styles.ts`), expanded to the declarations their BEM blocks apply
 * (D18: BEM class names are not carried over; the port sheet section 4 lists
 * each rule).
 */
export const listboxVariants = tv({
  // R-001: `.list-box` → `relative w-full overflow-clip p-1`; `overflow-clip`
  // is `overflow: hidden` in NSH, and `no-highlight` has no counterpart. `p-1`
  // moved into the `density` axis below (A-001).
  // R-002: `.list-box > * + *` → `space-y-1` (NSH adds a bottom margin to
  // every child but the last; no margin collapsing, same spacing) — also in
  // the `density` axis (A-001).
  // R-003: the horizontal Separator's `ms-[3%] w-[94%]` is deleted here: NSH
  // has no descendant selectors, and the indent belongs to the Separator unit
  // (port sheet section 5); scenarios draw the line with a local View.
  base: "relative w-full overflow-hidden",
  defaultVariants: {
    variant: "default",
    input: "pointer",
    density: "default",
  },
  variants: {
    // R-021: `.list-box-item--default` has no declarations; the dimension is
    // kept with no class of its own.
    // R-024: `.list-box-item--danger` only carries the two child rules that
    // R-022 / R-023 realize through context.
    // Root's `variant` is a BEM marker upstream (`list-box.css` has no
    // `--default` / `--danger` block), so both values stay empty here.
    variant: {
      default: "",
      danger: "",
    },
    // A-001: the `input` axis exists so the Root feeds one uniform
    // `{variant, input, density}` call to both tables; the root view is not
    // a hit target (the row is), so both cells stay empty.
    input: {
      pointer: "",
      touch: "",
    },
    // A-001: the `density` axis owns the container spacing literals (spacing
    // literals have no token exit — breadcrumbs A-002 / tabs A-001 the same
    // reason). `default` is the shipped `p-1 space-y-1`; `compact` tightens
    // each one step.
    density: {
      default: "p-1 space-y-1",
      compact: "p-0.5 space-y-0.5",
    },
  },
});

export type ListBoxVariants = VariantProps<typeof listboxVariants>;

export const listboxItemVariants = tv({
  slots: {
    // R-004: `.list-box-item` → the row box, with `select-none` replacing the
    // two `[data-slot]` descendant rules (R-008 / R-009).
    // R-005: transform 250ms `--ease-out-quart` + box-shadow 150ms
    // `--ease-out`; NSH has one duration and one curve, so both are 250ms
    // out-quart (registered in port sheet section 8). The curve is written
    // out instead of imported from `src/tokens/geometry.ts` (`ease.outQuart`)
    // because the class check loads this file with plain Node, which
    // resolves neither an extensionless relative import nor a `.ts` one.
    // R-006: `cursor: var(--cursor-interactive)` → `cursor-pointer`.
    // R-014: hover background (`hover:` is pointer-only in NSH, so the upstream
    // `@media (hover: hover)` wrapper has no counterpart).
    // R-008 / R-009: `w-fit`, `text-wrap` and `select-none` on the Label /
    // Description slots are realized by the row's `select-none` (R-004), the
    // Text component's own content sizing and Description's `text-wrap`.
    // R-012: `.list-box-item:focus` is an empty block; nothing to translate.
    // R-015: the selected blocks are empty too: selection has no background,
    // only the indicator (R-019 / R-020) shows it.
    item: [
      "relative flex min-h-9 w-full items-center justify-start text-foreground outline-none select-none",
      "transition duration-[250ms] ease-[cubic-bezier(0.165,0.84,0.44,1)] motion-reduce:transition-none cursor-pointer",
    ].join(" "),
    // R-017: the indicator slot, pinned to the inline end and vertically
    // centered.
    // R-018: its 250ms transition.
    indicator: [
      "absolute end-2 inset-y-0 flex w-4 shrink-0 items-center justify-center text-default-foreground",
      "transition duration-[250ms] motion-reduce:transition-none",
    ].join(" "),
  },
  defaultVariants: {
    variant: "default",
    input: "pointer",
    density: "default",
  },
  variants: {
    variant: {
      // R-021: no declarations; the item's danger look comes from R-022 /
      // R-023 through the item context.
      default: { item: "" },
      danger: { item: "" },
    },
    // A-001: the `input` axis owns interaction usability on the row — the
    // hit surface. `pointer` carries R-014's `hover:bg-default` (moved out
    // of the base: a hover dependency resolves only where a pointer exists,
    // and web's sticky hover would otherwise keep the row tinted after a
    // touch press); `touch` adds `min-h-11`, the visible half of the 44 pt
    // minimum `MIN_HIT_TARGET_BY_DENSITY` holds (the invisible `hitSlop`
    // half lives in the item's `createPressFeedback` seam).
    input: {
      pointer: { item: "hover:bg-default" },
      touch: { item: "min-h-11" },
    },
    // A-001: the `density` axis owns the row's spacing / radius literals —
    // `gap-3 px-2 py-1.5 rounded-2xl` moved out of the base for the same
    // reason as the root's (no token exit). `default` is the shipped value;
    // `compact` tightens each one step.
    density: {
      default: { item: "gap-3 px-2 py-1.5 rounded-2xl" },
      compact: { item: "gap-2 px-1.5 py-1 rounded-xl" },
    },
  },
});

export type ListBoxItemVariants = VariantProps<typeof listboxItemVariants>;

export const listboxSectionVariants = tv({
  // R-025: `.list-box-section` → `flex flex-col items-start gap-0`.
  base: "flex flex-col items-start gap-0",
});

export type ListBoxSectionVariants = VariantProps<typeof listboxSectionVariants>;
