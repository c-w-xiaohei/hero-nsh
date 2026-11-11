import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { shadow } from "../../tokens/geometry";

/**
 * Tabs' variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/tabs/tabs.styles.ts` plus the declarations of
 * `packages/styles/components/tabs.css` (port sheet §4).
 *
 * HeroUI's table has ten slots and two dimensions (`align`: `center` / `start` /
 * `end`, `variant`: `primary` / `secondary`). Orientation lives in CSS attribute
 * selectors upstream (`[data-orientation="…"]`), which NSH has no way to read;
 * since `orientation` is HeroUI's own public prop, it becomes a third dimension
 * here instead of a `data-*` rule (port sheet §1). BEM class names are not
 * carried over (D18), so each slot holds the declarations its block applied.
 * Every colour is a theme token, so light and dark switch by themselves; the
 * one shadow pair comes from `shadow.surface` in `src/tokens/geometry.ts`.
 */
export const tabsVariants = tv({
  slots: {
    // R-001: `.tabs` → `@apply flex gap-2`.
    // R-002 / R-003: the two `[data-orientation]` rules → the `orientation`
    // dimension's `flex-col` / `flex-row` below.
    base: "flex gap-2",
    // R-004: `.tabs__list-container` → `@apply relative bg-default`.
    // R-005: `border-radius: calc(var(--radius) * 2.5)` → `rounded-[20px]`;
    // the theme's `--radius` is 8, so the default theme lands on the same 20px
    // (a theme that changes `--radius` does not follow; port sheet §8).
    // R-057: `.tabs--secondary > .tabs__list-container` → `rounded-none
    // bg-transparent`, on the `variant` dimension below.
    // R-063 / R-064: the secondary border (`border-b` / `border-s`) is in the
    // compound entries at the bottom.
    tabListContainer: "relative bg-default rounded-[20px]",
    // R-009: `.tabs__list-container > .scroll-prev/.scroll-next` default
    // `display: none` → the `hidden` half of the buttons' classList in
    // `tabs-list-container.tsx`; display has exactly one owner there.
    // R-007: both chevron buttons → the slot strings below. Upstream's
    // `cursor-(--cursor-interactive)` is the literal `cursor-pointer`.
    // R-008: `border-0` is deleted: a View has no UA border to reset.
    // R-010: `transition: opacity 150ms var(--ease-smooth)` →
    // `transition-opacity duration-150 ease-[…]`.
    // R-011: `motion-reduce:transition-none`.
    // R-012: the `@media (hover: hover) &:hover` `opacity: .7` →
    // `hover:opacity-70`.
    // R-013: the `@media (hover: hover)` wrapper is deleted: NSH reports hover
    // only where a pointer exists (desktop and the web).
    // R-014: `:focus-visible` → `status-focused` (`ring-2 ring-focus`, the
    // theme's 2px offset). The buttons are `focusable={false}`, so it never
    // paints; it stays for parity with upstream.
    scrollPrev:
      "absolute z-2 size-4 cursor-pointer items-center justify-center rounded-full bg-transparent p-0 text-foreground outline-none transition-opacity duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
    scrollNext:
      "absolute z-2 size-4 cursor-pointer items-center justify-center rounded-full bg-transparent p-0 text-foreground outline-none transition-opacity duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
    // R-006: `.tabs__list-container > .scroller[data-orientation="vertical"]`
    // `height: 100%` → the `orientation.vertical` entry below.
    scroller: "",
    // R-043: `.tabs__separator` → `pointer-events-none absolute rounded-sm
    // bg-muted/25`.
    // R-044: its `transition: opacity 150ms var(--ease-smooth)` and
    // `motion-reduce:transition-none`.
    // R-045 / R-046: the orientation-specific geometry below.
    separator:
      "pointer-events-none absolute rounded-sm bg-muted/25 transition-opacity duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none",
    // R-027: `.tabs__tab` → `relative flex h-8 items-center justify-center
    // rounded-3xl px-4 text-center text-sm font-medium text-muted outline-none`.
    // Upstream's `w-full` is the horizontal `flex-1` further down: NSH does not
    // shrink a row item whose width is a percentage, so `w-full` on every tab
    // would make each one as wide as the whole list (measured). `flex-1` gives
    // the same equal shares upstream's `width: 100%` + `flex-shrink` produces,
    // at the cost of a consumer's own `w-*` on a tab (registered, port sheet §8).
    // R-028: `no-highlight` is deleted: it is a web-only tap highlight.
    // R-029: `z-index: 1` → `z-1` (the indicator sits at `z-[-1]`).
    // R-030: `cursor: var(--cursor-interactive)` → `cursor-pointer`.
    // R-031: the four `transition` entries collapse into NSH's single
    // `transition` (colour, background, shadow and opacity) with one curve;
    // upstream's box-shadow used `--ease-out` while the rest used
    // `--ease-smooth` (port sheet §8).
    // R-032: `motion-reduce:transition-none`.
    // R-036: `:disabled` / `[aria-disabled]` → `status-disabled` over the
    // View's own `disabled` state: `opacity-50 cursor-not-allowed`; the
    // pointer-events half is the host's own refusal of presses.
    // R-037: the conditional `hover:opacity-70` is a classList entry in
    // `tab.tsx` ("not selected and not disabled" cannot be a plain variant).
    // R-038: that rule's `@media (hover: hover)` wrapper is deleted, as R-013.
    // R-039: `status-focused` for `:focus-visible` is a classList entry in
    // `tab.tsx`, gated by the interaction modality (NSH's `focus-visible:` is
    // the same as `focus:` on a view, so only the modality tells a pointer
    // press from a keyboard focus).
    tab: "relative flex h-8 items-center justify-center rounded-3xl px-4 text-center text-sm font-medium text-muted outline-none z-1 cursor-pointer transition duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed",
    // R-051: `.tabs__indicator` → `absolute start-0 top-0 size-full
    // rounded-3xl bg-segment` plus `box-shadow: var(--surface-shadow)`, both
    // halves of which come from `shadow.surface` in `src/tokens/geometry.ts`.
    // R-052: `z-index: -1` → `z-[-1]`.
    // R-053 / R-054 / R-055: the transition is inline style in
    // `tab-indicator.tsx` (NSH does not transition translate or layout).
    // R-062: the secondary look is on the `variant` dimension below.
    tabIndicator:
      `absolute start-0 top-0 size-full rounded-3xl bg-segment ${shadow.surface.both} z-[-1]`,
    // R-022: `.tabs__list` → `@apply inline-flex p-1`.
    // R-023: `width: max-content` is deleted: NSH has no `max-content`; an
    // inline flex row is already content sized, and `min-w-full` keeps the
    // "at least the container" half.
    // R-024 / R-025: the orientation rules below.
    // R-058: `.tabs--secondary .tabs__list` `padding: 0` → `p-0`.
    tabList: "inline-flex p-1",
    // R-047: `.tabs__panel` → `w-full p-2 outline-none`.
    // R-048: `[data-exiting="true"]` is deleted: an unselected panel unmounts,
    // so there is no exit animation to place (port sheet §8).
    // R-049 / R-050: the orientation spacing below.
    tabPanel: "w-full p-2 outline-none",
  },
  variants: {
    align: {
      // R-040: `.tabs--align-start … .tabs__tab` → `justify-start text-start`.
      start: { tab: "justify-start text-start" },
      // R-041: `.tabs--align-end … .tabs__tab` → `justify-end text-end`.
      end: { tab: "justify-end text-end" },
      // `center` adds no class: the tab slot already centers its content.
      center: {},
    },
    variant: {
      // R-033: `[data-selected="true"]` → `text-segment-foreground` through
      // the View's native `selected:` state.
      primary: { tab: "selected:text-segment-foreground" },
      // R-057: the container.
      // R-058: the list padding.
      // R-060: `.tabs--secondary .tabs__tab` → `rounded-none`.
      // R-061: `[data-selected="true"]` → `text-foreground`.
      // R-062: `.tabs--secondary .tabs__indicator` → `rounded-none bg-accent
      // shadow-none`.
      secondary: {
        tabListContainer: "rounded-none bg-transparent",
        tabList: "p-0",
        tab: "rounded-none selected:text-foreground",
        tabIndicator: "rounded-none bg-accent shadow-none",
      },
    },
    orientation: {
      // R-002: horizontal is a column of a list container and a panel.
      horizontal: {
        base: "flex-col",
        // R-015: `:has([data-orientation="horizontal"]) > .scroll-prev` →
        // `start-1 top-1/2 -translate-y-1/2`.
        // R-016: the mirrored `scroll-next` → `end-1 top-1/2 -translate-y-1/2`.
        // R-017: `rtl:rotate-180` on both buttons.
        scrollPrev: "start-1 top-1/2 -translate-y-1/2 rtl:rotate-180",
        scrollNext: "end-1 top-1/2 -translate-y-1/2 rtl:rotate-180",
        // R-024: `min-width: 100%` and `flex-direction: row`. The minimum is
        // inline style in `tab-list.tsx`, from the measured viewport: a
        // percentage inside NSH's content-sized scroll box resolves to `auto`.
        // R-027's `w-full` half: the equal shares.
        tabList: "flex-row",
        tab: "flex-1",
        // R-045: `.tabs__separator` in a horizontal list → `start-0 top-1/4
        // h-1/2 w-px`.
        separator: "start-0 top-1/4 h-1/2 w-px",
        // R-049: `.tabs__panel[data-orientation="horizontal"]` → `mt-4`.
        tabPanel: "mt-4",
      },
      // R-003: vertical is a row of a list container and a panel.
      vertical: {
        base: "flex-row",
        // R-006: the scroller fills the constrained container height.
        scroller: "h-full",
        // R-018: `top-1 left-1/2 -translate-x-1/2` on the start chevron.
        scrollPrev: "top-1 left-1/2 -translate-x-1/2",
        // R-019: `bottom-1 left-1/2 -translate-x-1/2` on the end chevron.
        scrollNext: "bottom-1 left-1/2 -translate-x-1/2",
        // R-025: `flex-direction: column; gap: .25rem` on the list.
        tabList: "flex-col gap-1",
        // R-026: `.tabs__list[data-orientation="vertical"] .tabs__tab`
        // `min-width: 5rem` → `min-w-20` on the tab. `w-full` is the column's
        // cross axis, where a percentage does resolve.
        tab: "min-w-20 w-full",
        // R-046: the separator in a vertical list → `start-[5%] top-0 h-px
        // w-[90%]`.
        separator: "start-[5%] top-0 h-px w-[90%]",
        // R-050: `.tabs__panel[data-orientation="vertical"]` → `ms-4`.
        tabPanel: "ms-4",
      },
    },
  },
  compoundVariants: [
    // R-063: `.tabs--secondary[data-orientation="horizontal"] >
    // .tabs__list-container` gets `border-bottom: 1px solid var(--border)`,
    // and its indicator becomes `top: auto; bottom: 0; height: .125rem`.
    {
      variant: "secondary",
      orientation: "horizontal",
      class: {
        tabListContainer: "border-b border-border",
        tabIndicator: "top-auto bottom-0 h-0.5",
      },
    },
    // R-064: the vertical mirror: `border-inline-start`, and the indicator is
    // `start-0 top-0 h-full w-0.5`.
    {
      variant: "secondary",
      orientation: "vertical",
      class: {
        tabListContainer: "border-s border-border",
        tabIndicator: "start-0 top-0 h-full w-0.5",
      },
    },
  ],
  defaultVariants: {
    align: "center",
    variant: "primary",
    orientation: "horizontal",
  },
});

export type TabsVariants = VariantProps<typeof tabsVariants>;
