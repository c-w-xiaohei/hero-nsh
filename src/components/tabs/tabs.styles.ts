import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

// `shadow.surface.both` of `src/tokens/geometry.ts` written out: the M2 class
// walker imports this file through Node ESM, which does not resolve
// extensionless relative specifiers, so the geometry module cannot be imported
// from a `.styles.ts`. Same pattern as `tooltip.styles.ts` /
// `switch.styles.ts`; keep in sync with `SHADOW_VALUES.surface`.
const SHADOW_SURFACE_BOTH =
  "shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06),0_0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_0_transparent_inset]";

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
 *
 * Mobile adaptation (encapsulation.md §1, 样式管线): the environment adds two
 * variant axes the Root feeds from `createInput()` / `createDensity()`.
 * `input` owns the visible hit minimum and the removal of hover dependence;
 * `density` owns the spacing literals, which have no token-mapping exit and
 * move out of the base / `orientation` slots into density cells (adapt sheet
 * A-001 — the breadcrumbs A-002 precedent). Callers never set either axis.
 */
export const tabsVariants = tv({
  slots: {
    // R-001: `.tabs` → `@apply flex gap-2`; the gap moved into the `density`
    // axis below (A-001).
    // R-002 / R-003: the two `[data-orientation]` rules → the `orientation`
    // dimension's `flex-col` / `flex-row` below.
    base: "flex",
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
    // `hover:opacity-70`, now in the `input: "pointer"` cell (A-001/A-002):
    // a touch environment must not resolve a hover effect at all, so web's
    // sticky hover cannot pin a chevron after a press.
    // R-013: the `@media (hover: hover)` wrapper is deleted: NSH reports hover
    // only where a pointer exists (desktop and the web).
    // R-014: `:focus-visible` → `status-focused` (`ring-2 ring-focus`, the
    // theme's 2px offset). The buttons are `focusable={false}`, so it never
    // paints; it stays for parity with upstream.
    scrollPrev:
      "absolute z-2 size-4 cursor-pointer items-center justify-center rounded-full bg-transparent p-0 text-foreground outline-none transition-opacity duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
    scrollNext:
      "absolute z-2 size-4 cursor-pointer items-center justify-center rounded-full bg-transparent p-0 text-foreground outline-none transition-opacity duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
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
    // rounded-3xl px-4 text-center text-sm font-medium text-muted outline-none`;
    // `px-4` moved into the `density` axis (A-001).
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
    tab: "relative flex h-8 items-center justify-center rounded-3xl text-center text-sm font-medium text-muted outline-none z-1 cursor-pointer transition duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed",
    // R-051: `.tabs__indicator` → `absolute start-0 top-0 size-full
    // rounded-3xl bg-segment` plus `box-shadow: var(--surface-shadow)`, both
    // halves of which come from `shadow.surface` in `src/tokens/geometry.ts`.
    // R-052: `z-index: -1` → `z-[-1]`.
    // R-053 / R-054 / R-055: the transition is inline style in
    // `tab-indicator.tsx` (NSH does not transition translate or layout).
    // R-062: the secondary look is on the `variant` dimension below.
    tabIndicator:
      `absolute start-0 top-0 size-full rounded-3xl bg-segment ${SHADOW_SURFACE_BOTH} z-[-1]`,
    // R-022: `.tabs__list` → `@apply inline-flex p-1`; `p-1` moved into the
    // `density` axis (A-001). R-058's secondary `p-0` moved into compound
    // entries so it still resolves after the density cell.
    // R-023: `width: max-content` is deleted: NSH has no `max-content`; an
    // inline flex row is already content sized, and `min-w-full` keeps the
    // "at least the container" half.
    // R-024 / R-025: the orientation rules below.
    tabList: "inline-flex",
    // R-047: `.tabs__panel` → `w-full p-2 outline-none`; `p-2` moved into the
    // `density` axis (A-001).
    // R-048: `[data-exiting="true"]` is deleted: an unselected panel unmounts,
    // so there is no exit animation to place (port sheet §8).
    // R-049 / R-050: the orientation spacing is a compound of `orientation`
    // and `density` below.
    tabPanel: "w-full outline-none",
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
      // R-058: the list padding is a compound with `density` below, so `p-0`
      // still resolves after the density cell.
      // R-060: `.tabs--secondary .tabs__tab` → `rounded-none`.
      // R-061: `[data-selected="true"]` → `text-foreground`.
      // R-062: `.tabs--secondary .tabs__indicator` → `rounded-none bg-accent
      // shadow-none`.
      secondary: {
        tabListContainer: "rounded-none bg-transparent",
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
        // R-049's `mt-4` moved into the `orientation` × `density` compounds.
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
        // R-050's `ms-4` moved into the `orientation` × `density` compounds.
      },
    },
    // A-001: the `input` axis owns interaction usability (encapsulation.md
    // §1). `pointer` is the desktop resolution: every cell either empty or
    // carrying exactly the class it took over from a slot, so the default
    // environment resolves verbatim. `touch` lifts the tab and the two
    // chevrons' visible hit minimum to 44×44 pt (`min-*` on top of the base's
    // `h-8` / `size-4` — the icons stay 16 pt, centred by the base's
    // `items-center justify-center`) and keeps the chevrons off the desktop's
    // `hover:opacity-70` (it lives in the `pointer` cell — hover dependence
    // is an `input` concern, same ruling as switch A-003).
    input: {
      pointer: {
        // R-012, moved off the chevron slots: the `@media (hover: hover)`
        // `opacity: .7` applies only where a pointer exists.
        scrollPrev: "hover:opacity-70",
        scrollNext: "hover:opacity-70",
      },
      touch: {
        tab: "min-h-11",
        scrollPrev: "min-h-11 min-w-11",
        scrollNext: "min-h-11 min-w-11",
      },
    },
    // A-001: the `density` axis owns the visual spacing literals (the
    // `base.gap-2`, `tabList.p-1`, `tab.px-4` and `tabPanel.p-2` that have no
    // token-mapping exit — the breadcrumbs A-002 precedent). `default`
    // resolves to the shipped values; `compact` tightens each one step.
    density: {
      default: {
        base: "gap-2",
        tabList: "p-1",
        tab: "px-4",
        tabPanel: "p-2",
      },
      compact: {
        base: "gap-1",
        tabList: "p-0.5",
        tab: "px-3",
        tabPanel: "p-1",
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
    // A-001: R-058's `p-0` moved out of the `variant` cell so it resolves
    // after the `density` cell (compound classes land last): a secondary list
    // keeps its zero padding at every density.
    {
      variant: "secondary",
      density: "default",
      class: { tabList: "p-0" },
    },
    {
      variant: "secondary",
      density: "compact",
      class: { tabList: "p-0" },
    },
    // A-001: R-049 / R-050 moved off the `orientation` cells — the panel
    // spacing is direction-dependent *and* a density literal, so it takes an
    // `orientation` × `density` compound, one per resolved pair.
    {
      orientation: "horizontal",
      density: "default",
      class: { tabPanel: "mt-4" },
    },
    {
      orientation: "horizontal",
      density: "compact",
      class: { tabPanel: "mt-2" },
    },
    {
      orientation: "vertical",
      density: "default",
      class: { tabPanel: "ms-4" },
    },
    {
      orientation: "vertical",
      density: "compact",
      class: { tabPanel: "ms-2" },
    },
  ],
  defaultVariants: {
    align: "center",
    variant: "primary",
    orientation: "horizontal",
    input: "pointer",
    density: "default",
  },
});

export type TabsVariants = VariantProps<typeof tabsVariants>;
