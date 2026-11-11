import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { ease, shadow } from "../../tokens/geometry";

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
      `inline-block w-fit outline-none cursor-pointer duration-[250ms] ${ease.outQuart} motion-reduce:transition-none`,
    // R-014 `.dropdown__popover` → `bg-overlay p-0 text-sm`.
    // R-017 `border-radius: min(32px, calc(var(--radius-2xl) + 1.5 * spacing))`
    // → this theme's radius-2xl (16) + 6 = 22, written as a literal because
    // NSH arbitrary values take lengths, not `calc()` / `var()`.
    // R-018 `box-shadow: var(--overlay-shadow)` → the overlay shadow pair.
    // R-020 keeps the enter duration and curve on the resting class, so the
    // starting classes can come off while the transition still has its
    // duration at the destination.
    popover:
      `bg-overlay p-0 text-sm rounded-[22px] ${shadow.overlay.both} duration-150 ${ease.smooth}`,
    // R-031 `.dropdown__popover [data-slot="dropdown-menu"]` → `p-1.5
    // outline-none`, written by `Dropdown.Menu` after Menu's own base classes
    // (later wins, so it overrides `.menu`'s `p-1`).
    // R-033 `.dropdown__menu` → `gap-0.5` (the other declarations of that
    // block are already in Menu's base: `relative flex w-full flex-col`,
    // `overflow-clip` → `overflow-hidden`).
    menu: "p-1.5 outline-none gap-0.5",
  },
});

export type DropdownVariants = VariantProps<typeof dropdownVariants>;
