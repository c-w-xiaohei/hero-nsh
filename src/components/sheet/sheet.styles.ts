import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Sheet's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/sheet/sheet.styles.ts` and the CSS block
 * `packages/styles/components/sheet.css`.
 *
 * HeroUI declares two axes, both on the styles call every part makes:
 * `placement` (`bottom` default / `top` / `left` / `right`) and `backdrop`
 * (`opaque` default / `transparent` / `blur`). The slots are the BEM classes of
 * the CSS block; upstream every declaration lives in CSS, here each one is
 * translated per port sheet §4, and the rule id sits next to the class it
 * produces. A rule whose destination is `结构改写`, `context 下发` or `删除` is
 * commented beside the slot it replaces and carried out by the part named
 * there.
 *
 * The sheet is not a scroll-snap item here (port sheet §5): `Sheet.Content` is
 * the clip box whose length along the sheet's axis is the current detent, and
 * `Sheet.Dialog` inside it keeps its natural height. That is why the content
 * slots carry no scrolling class and why R-019 … R-022 are inline lengths the
 * Content part writes, not classes.
 *
 * Rules that are not a class at all, with the part that carries them out:
 * - R-001 (`@keyframes heroui-sheet-backdrop`, the backdrop fading in while the
 *   drag progresses) is deleted: NSH has no scroll-progress timeline. The
 *   Backdrop's enter / exit completion is its own timer; there is no fade to
 *   reproduce.
 * - R-002 (`@keyframes heroui-sheet-scale-back`, a parent sheet pushed back
 *   120px in 3D) is deleted: no 3D transform and no swipe progress here.
 * - R-036 (`[data-sheet-scroll][data-handle-dragging]` → `snap-none!`) is
 *   deleted: there is no scroll container and no snap in the clip box.
 * - R-040 (`&:disabled, &[aria-disabled="true"]` → `status-disabled`) is the
 *   CloseButton's own state classes; the Sheet side does not repeat them, so
 *   the two do not fight (port sheet §4).
 * - R-042 (`prefers-reduced-motion` → 1ms animation) becomes the Backdrop's
 *   `animation={reduceMotion() ? "none" : "fade"}`, the same ruling as Modal.
 *
 * Four of the content rules are lengths no NSH class can spell: R-010 /
 * R-016's `max-height: calc(100% - 2rem)` (`- 1rem` detached), R-013's
 * `width: min(24rem, 96vw)`, R-017's `width: calc(100% - 1rem)` and R-018's
 * `height: calc(100% - 1rem)`. Measured on NSH 0.4.0: an arbitrary value takes
 * `px` / `pt` / `rem` / `%`, but `max-h-[calc(100%-2rem)]`,
 * `w-[min(24rem,96vw)]` and `w-[calc(100%-2rem)]` are all unknown classes, and
 * a `style` length is a number or a percentage, so `Sheet.Content` writes the
 * numbers `sheet-content-box.ts` derives from `windowSize()` — the same surface
 * size `createSheetDetent` takes `extent` from.
 */
export const sheetVariants = tv({
  defaultVariants: {
    backdrop: "opaque",
    placement: "bottom",
  },
  slots: {
    // R-003 `.sheet__overlay` → `z-50` and its closed `pointer-events-none`:
    // deleted as a class. An `Overlay` is drawn above the views around it and
    // the layer is hidden while the sheet is closed, so the component writes
    // neither. The slot exists so a caller's className has a place to compose.
    overlay: "",
    // R-004 `.sheet__backdrop` → `bg-transparent`. R-005 / R-006 paint the
    // bottom-most sheet only, so the Backdrop decides between this slot's
    // variant class and `bg-transparent` from the stack index, and the
    // `backdrop` variants below hold both paints.
    backdrop: "bg-transparent",
    // R-008 `.sheet__content` → `z-1 box-content overflow-clip outline-none`.
    // R-009 (`[transform:perspective(1000px)] will-change-transform`) is
    // deleted: it only promoted stacked sheets for browser sub-pixel snapping,
    // which the clip box does not do.
    // `pointer-events-auto` is NSH-only: the carrier that aligns the panel
    // inside the overlay layer is `pointer-events-none`, so a press in the empty
    // area falls through to the paint layer that dismisses. On a real DOM that
    // none inherits, so the clip box restores the target for itself and every
    // part inside it (measured on the web target: without it every press in the
    // panel — Done, the close trigger, a plain Button — landed on the backdrop
    // and closed the sheet). Upstream needs no such class: its overlay is not
    // pointer-transparent while open.
    content: "z-1 box-content overflow-clip outline-none pointer-events-auto",
    // R-023 `.sheet__dialog` → `relative flex min-h-0 flex-col overflow-hidden
    // bg-overlay text-overlay-foreground shadow-overlay outline-none`, the
    // shadow written as the light / dark pair the theme needs.
    dialog:
      "relative flex min-h-0 flex-col overflow-hidden bg-overlay text-overlay-foreground shadow-overlay dark:shadow-overlay-dark outline-none",
    // R-029 `.sheet__header` → `flex shrink-0 flex-col gap-1 px-5 pt-4 pb-2`.
    header: "flex shrink-0 flex-col gap-1 px-5 pt-4 pb-2",
    // R-030 `.sheet__heading` → `text-lg font-semibold`.
    heading: "text-lg font-semibold",
    // R-031 `.sheet__body` → `min-h-0 flex-auto scrollbar overflow-hidden px-5
    // py-2`. `scrollbar` is `Scroll`'s own prop here, `overflow-hidden` is the
    // clip box around it (R-032: only an expanded body scrolls, so the Body
    // part renders a `Scroll` with `scrollable={isExpanded()}`). `basis-auto`
    // keeps the content-driven dialog's height honest (skill §2.5).
    body: "min-h-0 flex-auto basis-auto px-5 py-2",
    // R-033 `.sheet__footer` → `flex shrink-0 items-center justify-end gap-2
    // px-5 pt-2 pb-4`; a view is a column by default, so the row is explicit.
    footer: "flex shrink-0 flex-row items-center justify-end gap-2 px-5 pt-2 pb-4",
    // R-034 `.sheet__handle` → `relative flex shrink-0 cursor-grab items-center
    // justify-center py-3 select-none` plus `flex-row` (a view is a column by
    // default). `touch-none` (`touch-action: none`) is not an NSH class; the
    // Handle part writes `touchAction: "none"` in its style.
    handle:
      "relative flex shrink-0 flex-row cursor-grab items-center justify-center py-3 select-none",
    // R-037 `.sheet__handle-bar` → `block h-[0.3rem] w-8 rounded-full
    // bg-default`; `block` is dropped (a view is a block box).
    handleBar: "h-[0.3rem] w-8 rounded-full bg-default",
    // R-038 `.sheet__close-trigger` → `absolute top-3 right-3 z-10 cursor-pointer
    // text-muted outline-none select-none`: `cursor-(--cursor-interactive)` is
    // the pointer, `no-highlight` is `select-none`. R-039's focus ring is
    // `SHEET_CLOSE_TRIGGER_FOCUSED_CLASS` below, R-041's hover is the
    // `hover:` class.
    closeTrigger:
      "absolute top-3 right-3 z-10 cursor-pointer text-muted outline-none select-none hover:text-foreground",
  },
  variants: {
    backdrop: {
      // R-006 `.sheet__backdrop[data-stack-index="0"].sheet__backdrop--blur` →
      // `bg-background/[0.01] backdrop-blur-sm` (the blur is a no-op where the
      // host has no backdrop filter).
      blur: {
        backdrop: "bg-background/[0.01] backdrop-blur-sm",
      },
      // R-005 `.sheet__backdrop[data-stack-index="0"].sheet__backdrop--opaque`
      // → `bg-backdrop`.
      opaque: {
        backdrop: "bg-backdrop",
      },
      // R-007 `.sheet__backdrop--transparent` → `bg-transparent`.
      transparent: {
        backdrop: "bg-transparent",
      },
    },
    placement: {
      // R-010 `.sheet__content--bottom, --top` → `w-full`; the axial cap
      // `max-h-[calc(100%-2rem)]` is the inline number `sheet-content-box.ts`
      // derives. R-011 `.sheet__content--bottom` → `rounded-t-2xl`; R-025
      // `.sheet__dialog--bottom` → `rounded-t-2xl`.
      bottom: {
        content: "w-full rounded-t-2xl",
        dialog: "rounded-t-2xl",
      },
      // R-013 `.sheet__content--left, --right` → `h-full max-h-none`, with the
      // `w-[min(24rem,96vw)]` inline (`sheet-content-box.ts`); R-014
      // `.sheet__content--left` → `rounded-r-2xl`; R-027
      // `.sheet__dialog--left` → `rounded-r-2xl`.
      left: {
        content: "h-full max-h-none rounded-r-2xl",
        dialog: "rounded-r-2xl",
      },
      // R-013 again; R-015 `.sheet__content--right` → `rounded-l-2xl`; R-028
      // `.sheet__dialog--right` → `rounded-l-2xl`.
      right: {
        content: "h-full max-h-none rounded-l-2xl",
        dialog: "rounded-l-2xl",
      },
      // R-010 again (the cap is inline); R-012 `.sheet__content--top` →
      // `rounded-b-2xl`; R-026 `.sheet__dialog--top` → `rounded-b-2xl`.
      top: {
        content: "w-full rounded-b-2xl",
        dialog: "rounded-b-2xl",
      },
    },
  },
});

export type SheetVariants = VariantProps<typeof sheetVariants>;

/** The slots `sheetVariants` produces, as the parts call them. */
export type SheetSlots = ReturnType<typeof sheetVariants>;

/** HeroUI's `SheetPlacement`, the edge the sheet slides from. */
export type SheetPlacement = "top" | "bottom" | "left" | "right";

/** HeroUI's `SheetRenderProps["swipeDirection"]`, a placement or a whole axis. */
export type SheetSwipeDirection = SheetPlacement | "horizontal" | "vertical";

/**
 * The stack index a sheet paints a backdrop for: only the bottom-most open
 * sheet dims the page (R-005 / R-006). This is the class the Backdrop applies
 * when it is *not* bottom-most.
 */
export const SHEET_BACKDROP_UNPAINTED = "bg-transparent";

/**
 * R-016 `.sheet__content[data-detached]` → `m-2 rounded-2xl`; R-024
 * `.sheet__content[data-detached] .sheet__dialog` → `rounded-2xl` on the
 * dialog. The three lengths of R-016 / R-017 / R-018 (`max-h`, `w`, `h` of
 * `calc(100% - 1rem)`) are inline numbers from `sheet-content-box.ts`, because
 * 1rem of that 100% is the 8-point margin on each side.
 *
 * `isDetached` is a boolean prop, not an axis, so the margin and the radius
 * live here rather than in the table; the descendant selector of R-024 becomes
 * the Dialog reading the same prop from the context.
 */
export function sheetContentDetachedClasses(): string {
  return "m-2 rounded-2xl";
}

/** R-024: the detached dialog takes the generic radius instead of the edge one. */
export const SHEET_DIALOG_DETACHED_CLASS = "rounded-2xl";

/**
 * The class that releases the edge cap once a snap point owns the axial length:
 * R-019 / R-021 `.sheet__content--bottom[data-snap-points]` → `h-full max-h-none`
 * and R-020 / R-022 (`left` / `right`) → `w-full max-w-none`.
 *
 * The length itself is the inline `height` / `width` (a runtime detent). The
 * cap is inline too (see the header), so `Sheet.Content` simply stops writing
 * it when a partial detent exists; these two classes keep the table's own
 * `h-full` / `max-h-none` honest for the same state, as upstream writes them.
 */
export function sheetContentSnapClasses(axis: "x" | "y"): string {
  return axis === "y" ? "max-h-none" : "max-w-none";
}

/** R-035 `.sheet__handle[data-dragging]` → `cursor-grabbing`. */
export const SHEET_HANDLE_DRAGGING_CLASS = "cursor-grabbing";

/**
 * R-039 `&:focus-visible:not([data-focused]), &[data-focus-visible="true"]` →
 * `status-focused`, which HeroUI expands to `focus-ring` (`ring-2 ring-focus
 * ring-offset-* ring-offset-background outline-none`).
 *
 * The utilities are the ones `CloseButton` already paints from its own
 * `isFocusVisible()`, which is why the offsets match exactly: upstream both
 * `.sheet__close-trigger` and `.close-button` apply `status-focused` to the
 * same element, and identical utilities on the same node give the same one
 * ring. `Sheet.CloseTrigger` adds them from the condition R-039 names (focused
 * and keyboard), so the rule stays realized on the Sheet side even though the
 * button would already draw it.
 */
export const SHEET_CLOSE_TRIGGER_FOCUSED_CLASS =
  "ring-2 ring-focus ring-offset-2 ring-offset-background";
