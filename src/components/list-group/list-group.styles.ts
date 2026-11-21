import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * ListGroup's variant table: upstream's `list-group.css`
 * (`list-group__root { padding: 0 }`, `list-group__item { flex-row,
 * items-center, padding 4·spacing, gap 3·spacing }`, `item-content { flex: 1 }`,
 * `item-title { text-base, foreground, font-medium, text-left }`,
 * `item-description { text-sm, muted, text-left }`, `item-suffix-icon` the
 * chevron's wrap) plus the `input` axis — `touch` gives the pressable row the
 * 44 pt minimum visible height the hit-area path requires (the `hitSlop`
 * half lives in `createPressFeedback`).
 *
 * (sheet A-008). `flex-1` on `itemContent` follows the upstream `flex: 1`; NSH's `flex-1`
 * is `1 1 0` against Tailwind's `1 1 0%`, which collapses only when the
 * content must drive the row's width — a settings row fills the surface, so
 * the zero basis is the upstream behavior. `rtl:-scale-x-100` on the
 * chevron has no `dir` channel and is registered in sheet §5.
 */
export const listGroupVariants = tv({
  slots: {
    root: "p-0",
    item: "flex flex-row items-center gap-3 p-4",
    itemPrefix: "",
    itemContent: "flex-1",
    itemTitle: "text-left text-base font-medium text-foreground",
    itemDescription: "text-left text-sm text-muted",
    itemSuffixIcon: "",
  },
  variants: {
    input: {
      pointer: {},
      touch: {
        item: "min-h-11",
      },
    },
  },
});

export type ListGroupVariants = VariantProps<typeof listGroupVariants>;
