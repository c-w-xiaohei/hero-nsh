import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * The tag-group convenience parts' variant table: upstream's `tag-group.css`
 * `tagLabel`/`tagBackground` blocks (`tag-group.styles.ts`), which the port's
 * own `tagVariants`/`tagGroupVariants` do not cover because `tag/` is
 * read-only for this unit.
 *
 * - `label` — `.tag-group__tag-label { font-medium, field-foreground }`,
 *   `text-xs|sm|base` by `size`, `accent-soft-foreground` while selected.
 * - `background` — `.tag-group__tag-background { absolute inset-0,
 *   overflow-hidden }`, radius by `size`. Upstream's `inset-0` fills the
 *   tag's whole pill; this port's tag interposes a `cell` view between the
 *   root and the parts (`tag-root.tsx`), so the layer anchors to the
 *   content box — the negative `-inset-x-2 -inset-y-1` (the tag root's own
 *   `px-2 py-1` padding) restores the fill to the pill's edge. The radius
 *   steps follow this port's own `tagVariants` (`rounded-xl` sm/md,
 *   `rounded-2xl` lg) rather than upstream's `rounded-xl|2xl|3xl` — the
 *   layer sits behind THIS library's tag and must match its shape (sheet
 *   A-013; the upstream steps are the same convention on its own tag's
 *   larger radii).
 * - `removeButton` — `.tag-group__remove-button { rounded-lg, items-center,
 *   justify-center }`.
 */
export const tagGroupItemVariants = tv({
  slots: {
    label: "font-medium text-field-foreground",
    background: "absolute -inset-x-2 -inset-y-1 overflow-hidden",
    removeButton: "items-center justify-center rounded-lg",
  },
  variants: {
    size: {
      sm: {
        label: "text-xs",
        background: "rounded-xl -inset-x-2 -inset-y-0.5",
      },
      md: {
        label: "text-sm",
        background: "rounded-xl -inset-x-2 -inset-y-1",
      },
      lg: {
        label: "text-base",
        background: "rounded-2xl -inset-x-2.5 -inset-y-1.5",
      },
    },
    isSelected: {
      true: {
        label: "text-accent-soft-foreground",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type TagGroupItemVariants = VariantProps<typeof tagGroupItemVariants>;
