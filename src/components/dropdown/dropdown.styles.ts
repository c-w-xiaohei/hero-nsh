import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

// `ease.outQuart`, `ease.smooth` and `shadow.overlay.both` of
// `src/tokens/geometry.ts` written out: a `.styles.ts` imports only
// `tailwind-variants` (the M2 class walker loads this file with plain Node,
// which cannot resolve an extensionless relative import). Same precedent as
// `EASE_OUT_QUART` in menu styles and `SHADOW_OVERLAY_BOTH` in popover styles.
const EASE_OUT_QUART = "ease-[cubic-bezier(0.165,0.84,0.44,1)]";
const EASE_SMOOTH = "ease-[cubic-bezier(0.25,0.1,0.25,1)]";
const SHADOW_OVERLAY_BOTH =
  "shadow-[0_2px_8px_0_rgba(0,0,0,0.06),0_-6px_12px_0_rgba(0,0,0,0.03),0_14px_28px_0_rgba(0,0,0,0.08)] dark:shadow-[0_0_1px_0_rgba(255,255,255,0.3)_inset]";

/**
 * Dropdown's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/dropdown/dropdown.styles.ts` and the CSS
 * block `packages/styles/components/dropdown.css`.
 *
 * Upstream has no variant axis: four slots carry the four variant classes, and
 * nothing else.
 */
export const dropdownVariants = tv({
  slots: {
    // R-001 `.dropdown` → `flex flex-col gap-1`. No part mounts this slot:
    // upstream's `MenuTrigger` renders no element, and neither does our Root;
    // the slot stays so `dropdownVariants()` keeps its upstream shape.
    root: "flex flex-col gap-1",
    // R-002 `.dropdown__trigger` → `inline-block outline-none`. `w-fit` keeps
    // the shrink-to-content box the inline element had: a blockified
    // `inline-block` in a column parent would otherwise stretch and make the
    // empty space beside the trigger pressable (skill §4.2).
    // R-003 the transition: NSH takes one duration and one curve, so the
    // class owns them and the property list is inline in the trigger; the
    // colour / shadow properties therefore run at 250ms instead of 150ms.
    // `transform-gpu` is a no-op on NSH and is left out.
    // R-004 `cursor: var(--cursor-interactive)` → `cursor-pointer`.
    trigger:
      `inline-block w-fit outline-none cursor-pointer duration-[250ms] ${EASE_OUT_QUART} motion-reduce:transition-none`,
    // R-014 `.dropdown__popover` → `bg-overlay p-0 text-sm`.
    // R-017 `border-radius: min(32px, calc(var(--radius-2xl) + 1.5 * spacing))`
    // → this theme's radius-2xl (16) + 6 = 22, written as a literal because
    // NSH arbitrary values take lengths, not `calc()` / `var()`.
    // R-018 `box-shadow: var(--overlay-shadow)` → the overlay shadow pair.
    // R-020 keeps the enter duration and curve on the resting class, so the
    // starting classes can come off while the transition still has its
    // duration at the destination.
    popover:
      `bg-overlay p-0 text-sm text-overlay-foreground rounded-[22px] ${SHADOW_OVERLAY_BOTH} duration-150 ${EASE_SMOOTH}`,
    // R-031 `.dropdown__popover [data-slot="dropdown-menu"]` → `p-1.5
    // outline-none`, written by `Dropdown.Menu` after Menu's own base classes
    // (later wins, so it overrides `.menu`'s `p-1`) — `p-1.5` moved into the
    // `density` axis below (A-001).
    // R-033 `.dropdown__menu` → `gap-0.5` (the other declarations of that
    // block are already in Menu's base: `relative flex w-full flex-col`,
    // `overflow-clip` → `overflow-hidden`) — `gap-0.5` moved with `p-1.5`.
    menu: "outline-none",
  },
  defaultVariants: {
    input: "pointer",
    density: "default",
  },
  variants: {
    // A-001: the `input` axis is wired for the uniform `{input, density}`
    // call the Root feeds every axis'd table, but this table has no cell to
    // land: the trigger's `scale-[0.97]` press visual is JS `pressed()`
    // driven (no `hover:`/`active:` pseudo-state to move) and its hit
    // expansion goes through the trigger's `createPressFeedback` half
    // (A-006), so both cells stay empty.
    input: {
      pointer: {},
      touch: {},
    },
    // A-001: the `density` axis owns the menu row spacing — `p-1.5 gap-0.5`
    // moved out of the slot base. Spacing literals have no density-token
    // exit (list-box A-001 the same reason), and menu row spacing is the
    // visible face of collection density, which is why this table gets a
    // `density` axis at all. `default` is the shipped value; `compact`
    // tightens one step.
    density: {
      default: { menu: "p-1.5 gap-0.5" },
      compact: { menu: "p-1 gap-0" },
    },
  },
});

export type DropdownVariants = VariantProps<typeof dropdownVariants>;
