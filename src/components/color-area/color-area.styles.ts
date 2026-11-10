import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * ColorArea's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/color-area/color-area.styles.ts` plus the
 * declarations of `packages/styles/components/color-area.css`.
 *
 * Upstream's table only names BEM blocks (`color-area`, `color-area--show-dots`,
 * `color-area__thumb`) and the declarations live in the stylesheet, so the slot
 * entries below carry those declarations (D18: no BEM classes in NSH). It has
 * the same two slots and the same single variant:
 *
 * - `base`  → both Root spellings;
 * - `thumb` → both Thumb spellings (the resolved slot functions travel to the
 *   Thumb through the context, so the variant is resolved once per Root);
 * - `showDots` → adds nothing itself: the dot pattern is a structural layer
 *   (R-007 / R-008), so the true entry only keeps the surface identical to
 *   HeroUI's, where the modifier class exists for the `::after` to hang on.
 *
 * The engine and drag/focus states are not classes here: the gradient, the
 * border and the dot pattern are real child views (R-004, R-005, R-007), and
 * the thumb's size, ring and disabled look are `classList` entries so each
 * property has exactly one owner (R-016, R-017, R-018).
 */
export const colorAreaVariants = tv({
  slots: {
    base: [
      /*
       * R-001: `.color-area` → `relative w-full max-w-56 shrink-0 rounded-2xl`
       * (`no-highlight` is R-002, deleted: NSH views have no Web tap
       * highlight). The width limit is written as its resolved 224 points
       * (`max-w-[224px]`) because NSH's utility set is the shipped theme's, and
       * an unknown class would silently drop the limit (port sheet §6).
       */
      "relative w-full max-w-[224px] shrink-0 rounded-2xl",
      /*
       * R-003: `.color-area`'s `aspect-ratio: 1 / 1` → `aspect-square`. The root
       * draws no background of its own: R-004 moved it to the gradient layer.
       */
      "aspect-square",
    ].join(" "),
    thumb: [
      /*
       * R-009: `.color-area__thumb` → `rounded-xl`; its `size-4` moved to R-017's
       * `classList` so the dragging size has one owner, and `will-change` is
       * R-010 (deleted: NSH has no `willChange` key).
       */
      "absolute rounded-xl",
      /* R-012: `border: 3px solid white` → `border-[3px] border-white`. */
      "border-[3px] border-white",
      /*
       * R-013: the two comma-separated shadows, on the thumb itself (the
       * arbitrary-value form, as Switch and ColorSwatch write theirs).
       */
      "shadow-[0_0_0_1px_rgb(0_0_0_/_0.1),inset_0_0_0_1px_rgb(0_0_0_/_0.1)]",
    ].join(" "),
  },
  variants: {
    /*
     * R-007 / R-008: `.color-area--show-dots::after` is the dot layer, mounted
     * by the Root only while `showDots` is true (a structural rewrite: the
     * pattern's fixed 8-point tile and its repeat cannot be expressed with
     * NSH's `backgroundImage`, which has no size or repeat key).
     */
    showDots: {
      false: {},
      true: {},
    },
  },
  defaultVariants: {
    showDots: false,
  },
});

export type ColorAreaVariants = VariantProps<typeof colorAreaVariants>;

/*
 * Rules of port sheet §4 that are deleted outright, and where each one's
 * behaviour went. They have no class to write, so they are recorded here once:
 *
 * - R-002: `no-highlight` (`-webkit-tap-highlight-color`); NSH's native views
 *   have no Web tap highlight.
 * - R-010: the thumb's `will-change: width, height`; NSH has no `willChange`
 *   style key, and nothing transitions the size (R-014).
 * - R-014 / R-015: the 150ms width / height transition and its
 *   `motion-reduce:transition-none`; NSH does not transition size or position,
 *   so the 16 → 20 point change is immediate (port sheet §8).
 * - R-023: React Aria's two hidden `type="range"` inputs; the Thumb itself is
 *   the focus stop, the keyboard target and the accessible value.
 * - R-025: `data-disabled` / `data-dragging` / `data-hovered` /
 *   `data-focused` / `data-focus-visible`; D18 forbids data attributes, so the
 *   states are `classList` entries and render props.
 * - R-026: `forced-color-adjust: none`; NSH has no forced-colors mode.
 * - R-027: `touch-action: none`; the responder system already owns the gesture.
 * - R-028: `user-select: none`; the area draws no text, and pointers never
 *   select inside it.
 */
