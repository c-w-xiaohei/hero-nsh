import type { VariantProps } from "tailwind-variants";
import { tv } from "tailwind-variants";

import { ease, shadow } from "../../tokens/geometry";

// HeroUI 3.2.7 drawer slots and the two public variant axes.
export const drawerVariants = tv({
  slots: {
    // R-001, R-002, R-035, R-004, R-005
    trigger: `inline-block w-fit cursor-pointer duration-[250ms] ${ease.outQuart} motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.97]`,
    // R-006, R-036, R-007, R-037, R-038, R-008, R-009, R-010
    backdrop: "absolute inset-0",
    // R-011, R-039, R-040, R-012, R-013, R-014
    content: "flex flex-col flex-1 w-full min-w-0 pointer-events-none",
    // R-015, R-041, R-016, R-017, R-042, R-018, R-019, R-020, R-021, R-022
    dialog: `relative flex flex-col bg-overlay ${shadow.overlay.both} outline-none p-6 pointer-events-auto transition duration-[250ms] ${ease.outQuart} motion-reduce:transition-none`,
    // R-023
    header: "flex flex-col gap-3 mb-0",
    // R-024
    heading: "text-base font-medium text-foreground",
    // R-025, R-043, R-044
    body: "min-h-0 flex-auto basis-auto text-sm leading-[1.43] text-muted -m-[3px] my-0 p-[3px]",
    // R-026: `.drawer__footer` has `mt-0`; the gap belongs to the adjacency
    // rules below, not to the slot.
    footer: "flex flex-row items-center justify-end gap-2 mt-0",
    // R-027, R-028, R-045
    handle: "flex items-center justify-center pb-2",
    closeTrigger: "absolute z-10 end-4 top-4",
  },
  variants: {
    placement: {
      bottom: { dialog: "w-full max-h-[85%] rounded-t-2xl" },
      top: { dialog: "w-full max-h-[85%] rounded-b-2xl pb-2", handle: "pb-0" },
      left: { dialog: "h-full rounded-none w-80 max-w-[85%] sm:w-96" },
      right: { dialog: "h-full rounded-none w-80 max-w-[85%] sm:w-96" },
    },
    variant: {
      opaque: { backdrop: "bg-backdrop" },
      transparent: { backdrop: "bg-transparent" },
      blur: { backdrop: "bg-backdrop backdrop-blur-md" },
    },
  },
  defaultVariants: { placement: "bottom", variant: "opaque" },
});

/**
 * R-030 `.drawer__header + .drawer__body` → `mt-2`. NSH has no adjacent
 * sibling selector, so `Drawer.Body` asks `Drawer.Dialog` which part was
 * written before it (create-drawer-part-order.ts).
 */
export const drawerBodyAfterHeaderClasses = "mt-2";

/**
 * R-031 `.drawer__header + .drawer__footer` → `mt-5` and R-032
 * `.drawer__body + .drawer__footer` → `mt-5`: the footer's gap depends on
 * which part precedes it. Both rules land on `mt-5` but stay separate
 * constants because they are separate rules upstream.
 */
export const drawerFooterAfterHeaderClasses = "mt-5";
export const drawerFooterAfterBodyClasses = "mt-5";

export type DrawerVariants = VariantProps<typeof drawerVariants>;
export type DrawerSlots = ReturnType<typeof drawerVariants>;
export type DrawerPlacement = "top" | "bottom" | "left" | "right";
