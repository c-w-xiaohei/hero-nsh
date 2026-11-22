import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

// `ease.outQuart` of `src/tokens/geometry.ts` written out: a `.styles.ts`
// imports only `tailwind-variants` (the M2 class walker loads this file with
// plain Node, which cannot resolve an extensionless relative import). Same
// precedent as `EASE_SMOOTH` in switch/pagination styles.
const EASE_OUT_QUART = "ease-[cubic-bezier(0.165,0.84,0.44,1)]";

/**
 * The three Menu variant tables of `@heroui/styles` 3.2.7
 * (`packages/styles/src/components/{menu,menu-item,menu-section}/*.styles.ts`),
 * expanded to the declarations their BEM blocks apply (D18: BEM class names are
 * not carried over; the port sheet section 4 lists each rule).
 *
 * Mobile adaptation (encapsulation.md §1, 样式管线): the environment adds two
 * variant axes the Root / Item feed from `createDensity()` / `createInput()`.
 * `input` owns interaction usability only (adapt sheet A-001): the visible
 * hit minimum and the removal of hover dependence. `density` owns visual
 * density: the gap / padding literals move out of the base slots into
 * `density` cells so a `compact` preset tightens them one step (spacing
 * literals have no token exit, the tabs A-001 precedent).
 */
export const menuVariants = tv({
  // R-001: `.menu` → `relative flex w-full flex-col gap-1 overflow-clip p-1`;
  // `overflow-clip` is `overflow: hidden` in NSH, and `no-highlight` (the web
  // tap highlight) has no counterpart. The `gap-1`/`p-1` literals moved into
  // the `density` axis (A-001).
  base: "relative flex w-full flex-col overflow-hidden",
  variants: {
    // A-001: `default` is the upstream value; `compact` tightens one step.
    density: {
      default: "gap-1 p-1",
      compact: "gap-0.5 p-0.5",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

export type MenuVariants = VariantProps<typeof menuVariants>;

export const menuItemVariants = tv({
  slots: {
    // R-003: `.menu-item` → the row box; `select-none` once on the row replaces
    // the two `[data-slot]` descendant rules (R-007 / R-008). The `px-2
    // py-1.5 gap-3` literals moved into the `density` axis (A-001).
    // R-004: transform 250ms `--ease-out-quart` plus box-shadow 150ms
    // `--ease-out`; NSH has one duration and one curve, so both become 250ms
    // out-quart (registered in port sheet section 8).
    // R-005: `cursor: var(--cursor-interactive)` → `cursor-pointer`.
    // R-015: the hover background moved into the `input: "pointer"` cell
    // (A-001): NSH's `hover:` is pointer-only, so upstream's
    // `@media (hover: hover)` wrapper has no counterpart, and on a touch
    // input the effect must not resolve at all so a held press leaves no
    // sticky hover behind (web sticky hover, sheet §6).
    item: [
      "relative flex min-h-9 w-full items-center justify-start rounded-2xl text-foreground outline-none select-none",
      `transition duration-[250ms] ${EASE_OUT_QUART} motion-reduce:transition-none cursor-pointer`,
    ].join(" "),
    // R-019: the indicator slot, pinned to `start-2` and vertically centered.
    // R-020: its 250ms transition (upstream's `duration-250` is not a standard
    // step, so it is written as an arbitrary value).
    indicator: [
      "absolute start-2 inset-y-0 flex w-4 shrink-0 items-center justify-center text-muted",
      "transition duration-[250ms] motion-reduce:transition-none",
    ].join(" "),
    // R-023: the submenu slot keeps `text-muted`.
    // R-024: it is mounted only while `hasSubmenu` is true, so it writes
    // `end-2` directly and never adds `start-2` (the net effect of
    // `start-auto end-2`). The remaining slot classes are the `.menu-item__indicator`
    // ones it also carries upstream (R-019 / R-020).
    submenuIndicator: [
      "absolute end-2 inset-y-0 flex w-4 shrink-0 items-center justify-center text-muted",
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
      // R-026: `.menu-item--default` has no declarations; the dimension stays
      // with no class of its own.
      default: { item: "" },
      // The danger look reaches the indicator and the Label through the item
      // context (R-027 / R-028), not through a class on the row.
      danger: { item: "" },
    },
    // A-001: the `input` axis carries interaction usability — the pointer
    // cell keeps the hover background; the touch cell lifts the visible hit
    // minimum to 44 pt (variant classes apply after the base slot).
    input: {
      pointer: {
        item: "hover:bg-default",
      },
      touch: {
        item: "min-h-11",
      },
    },
    // A-001: the `density` axis carries the spacing literals of the item
    // slot. `default` is the upstream value; `compact` tightens one step.
    density: {
      default: { item: "px-2 py-1.5 gap-3" },
      compact: { item: "px-2 py-1 gap-2" },
    },
  },
});

export type MenuItemVariants = VariantProps<typeof menuItemVariants>;

export const menuSectionVariants = tv({
  // R-029: `.menu-section` → `flex flex-col items-start gap-0`.
  base: "flex flex-col items-start gap-0",
});

export type MenuSectionVariants = VariantProps<typeof menuSectionVariants>;
