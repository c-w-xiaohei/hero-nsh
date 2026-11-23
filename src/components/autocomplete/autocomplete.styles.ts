import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { ease, radius, shadow } from "../../tokens/geometry";

/**
 * Autocomplete's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/autocomplete/autocomplete.styles.ts` and the
 * declarations of `packages/styles/components/autocomplete.css` (port sheet §4,
 * R-001 … R-044; D18 drops the BEM class names, so each slot carries the
 * declarations the block applied).
 *
 * Two dimensions, as upstream: `variant` (`primary` / `secondary`, the latter
 * swaps the trigger's background) and `fullWidth` (the root and the trigger
 * grow to the field's width).
 *
 * `searchField` and `emptyState` are not upstream slots: the stylesheet reaches
 * the parts inside the popover with descendant selectors
 * (`[data-slot="search-field"]`, `[data-slot="empty-state"]`), which NSH does
 * not have. The `SearchField` slot string travels through the SearchField owner
 * channel; the empty state's is registered as a difference (§8) because
 * `EmptyState` reads no container of ours.
 *
 * Two environment axes join the upstream dimensions (adapt sheet A-001):
 * `input` owns interaction usability — the trigger's 44pt touch minimum and
 * the clear button's hover class, which resolves only where a pointer exists;
 * `density` owns the spacing / padding / radius literals, which have no token
 * exit (tabs A-001 / list-box A-001 the same ruling), so they moved out of the
 * base slots into `density` cells (`default` is the shipped value).
 */
export const autocompleteVariants = tv({
  slots: {
    // R-001: `.autocomplete` → `flex flex-col gap-1`; the gap moved into the
    // `density` axis below (A-001).
    // R-035: `.autocomplete--full-width` → `w-full`, on the `fullWidth`
    // dimension.
    base: "flex flex-col",
    // R-002: `.autocomplete__trigger` → the 36pt field box. `border-0` is
    // deliberate: upstream's default theme has `--field-border-width: 0px`, so
    // the resting trigger draws no line, and `border` would add 2pt of height
    // (the colour still comes from `border-field-border`, R-004). `isolate`,
    // `no-highlight` and `inline-flex` have no counterpart; the trigger is a
    // block-level row here, and its width follows the root or `fullWidth`.
    // `outline-none` from the upstream base is dropped: NSH reads a style class
    // anywhere in the string, so it would defeat the invalid and focus states,
    // and NSH draws no outline unless a class asks for one.
    // R-003: background / border / shadow at 150ms `--ease-smooth`; upstream
    // gives the shadow `--ease-out`, which NSH's one-transition model cannot
    // express separately (§8). The property list is inline in the trigger (as
    // in Select) because `transition-colors` omits the shadow and
    // `transition-all` adds radius and border width.
    // R-036: `.autocomplete__trigger--full-width` → `w-full`.
    // `px-3 py-2` moved into the `density` axis (A-001); `min-h-9` stays: the
    // touch minimum is the `input` axis' `min-h-11` cell (A-001).
    trigger: [
      `relative flex min-h-9 items-center ${radius.field} border-0 border-field-border bg-field text-sm text-field-foreground ${shadow.field.both} select-none cursor-pointer`,
      `duration-150 ${ease.smooth} motion-reduce:transition-none`,
    ].join(" "),
    // R-012: `.autocomplete__value` → `flex-1 text-start text-base
    // wrap-break-word text-current sm:text-sm`. `wrap-break-word` is dropped:
    // NSH has neither the class nor an `overflowWrap` style key (§8).
    // `flex-auto basis-auto` instead of `flex-1`: NSH's `flex-1` is
    // `flex-basis: 0`, which collapses the value inside a shrink-to-fit trigger
    // (the same decision as Select's value).
    value: "flex-auto basis-auto text-left text-base text-current sm:text-sm",
    // R-015: `.autocomplete__indicator` → pinned to the inline end, vertically
    // centered, coloured like the placeholder.
    // R-016: the interactive cursor.
    // Only the transform changes (R-017's open rotation), so the transition is
    // `transition-transform` at the rule's 150ms; upstream's bare
    // `transition` lists every property.
    indicator:
      "absolute inset-y-0 end-2 my-auto flex shrink-0 items-center justify-center text-field-placeholder transition-transform duration-150 cursor-pointer",
    // R-019: `.autocomplete__popover` → the overlay card, a flex column with
    // no padding of its own and `pt-2` above the filter's content. The measured
    // trigger width and the anchor-derived transform origin are inline in the
    // Popover part; `scroll-py-1`, `overscroll-contain` and `w-(--trigger-width)`
    // have no NSH counterpart and are registered (§8).
    // R-020: `outline-none` is dropped; NSH draws no outline unless a class
    // asks for one.
    // R-021 … R-026: the enter / exit transitions of `createOverlayPresence`;
    // upstream's custom keyframes are registered (§8).
    // `pt-2` and `rounded-[22px]` moved into the `density` axis (A-001).
    popover: [
      `flex flex-col bg-overlay p-0 text-sm ${shadow.overlay.both} overflow-hidden`,
      `duration-150 ${ease.smooth}`,
    ].join(" "),
    // R-037: `.autocomplete__clear-button` → the small cross inside the
    // trigger; `isolate`, `no-highlight` and `transform-gpu` have no
    // counterpart. `h-6 w-6` from the same block is overridden by R-038's
    // `size-5`, which is what the final box is.
    // R-038: `me-0 size-5 shrink-0 self-center bg-transparent`.
    // R-039: the interactive cursor.
    // R-040: `opacity 150ms` only while the button is not empty; the empty
    // state switches the transition off (`transition-none`, set by the part).
    // R-043: `@media (hover: hover) { &:hover }` → moved into the `input:
    // "pointer"` cell (A-001): a hover dependency resolves only where a
    // pointer exists, and web's sticky hover would otherwise pin the fill
    // after a touch press.
    // R-044: `:active` → `transform: scale(0.93)` stays: it is the press visual
    // both inputs share, and the seam's `scale` channel never writes `style`
    // here (no second writer).
    // `p-1 rounded-xl` moved into the `density` axis (A-001).
    clearButton: [
      "relative flex size-5 shrink-0 origin-center items-center justify-center self-center bg-transparent text-muted select-none cursor-pointer",
      "active:scale-[0.93]",
      `transition-opacity duration-150 ${ease.smooth} motion-reduce:transition-none`,
    ].join(" "),
    // Upstream's `filter` slot carries a BEM class with no declarations: the
    // React Aria `Autocomplete` primitive renders no element of its own, so
    // this part has no host view and no classes here.
    filter: "",
    // R-033: `.autocomplete__popover [data-slot="search-field"]` →
    // `shrink-0 px-3 py-1 outline-none`. The popover cannot reach the caller's
    // SearchField, so the Filter hands this string to it through the
    // SearchField owner channel. `px-3 py-1` moved into the `density` axis
    // (A-001).
    searchField: "shrink-0 outline-none",
  },
  defaultVariants: {
    fullWidth: false,
    variant: "primary",
    input: "pointer",
    density: "default",
  },
  variants: {
    // A-001: the `input` axis owns interaction usability — `pointer` re-hangs
    // R-043's `hover:bg-default-hover` (moved out of the clear button's base:
    // a hover dependency resolves only where a pointer exists, and web's
    // sticky hover would otherwise keep the fill after a touch press);
    // `touch` lifts the trigger's `min-h-9` 36pt field box to the 44pt touch
    // hit height (`min-h` overrides `min-h`, search-field / date-input-group
    // A-001 the same). The clear button's own hit surface stays `size-5`: its
    // invisible expansion is the `hitSlop` half tv() cannot produce, which
    // the part's `createPressFeedback` seam computes (A-003).
    input: {
      pointer: {
        clearButton: "hover:bg-default-hover",
      },
      touch: {
        trigger: "min-h-11",
      },
    },
    // A-001: the `density` axis owns the spacing / padding / radius literals
    // (no token exit — `radius.field` / `ease.smooth` are tokens and stay in
    // the base). `default` is the shipped value; `compact` tightens each one
    // step. `filter`, `indicator` and `value` carry no spacing literals, so
    // nothing moves for them.
    density: {
      default: {
        base: "gap-1",
        trigger: "px-3 py-2",
        popover: "pt-2 rounded-[22px]",
        clearButton: "p-1 rounded-xl",
        searchField: "px-3 py-1",
      },
      compact: {
        base: "gap-0.5",
        trigger: "px-2 py-1.5",
        popover: "pt-1.5 rounded-[18px]",
        clearButton: "p-0.5 rounded-lg",
        searchField: "px-2 py-0.5",
      },
    },
    fullWidth: {
      false: {},
      // R-035, R-036.
      true: {
        base: "w-full",
        trigger: "w-full",
      },
    },
    variant: {
      // R-010: `.autocomplete--primary` has no declarations.
      primary: {},
      // R-011: `.autocomplete--secondary .autocomplete__trigger` → `shadow-none`
      // and the default background token; the hover / focus / invalid
      // background of the same block is a state class in the Trigger.
      secondary: {
        trigger: "shadow-none bg-default",
      },
    },
  },
});

export type AutocompleteVariants = VariantProps<typeof autocompleteVariants>;
