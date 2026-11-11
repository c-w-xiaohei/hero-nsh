import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { ease, shadow } from "../../tokens/geometry";

/**
 * Modal's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/modal/modal.styles.ts` and the CSS block
 * `packages/styles/components/modal.css`.
 *
 * Ten slots and the three axes HeroUI declares (`variant` on Backdrop, `size`
 * and `scroll` on Container, all merged into one call here). Placement is not
 * an axis upstream — it is the `data-placement` attribute the Dialog reads —
 * so it stays out of the table and its class strings live in
 * `modalPlacementClasses` below, which the Dialog consumes as a `classList`.
 *
 * Every rule id of port sheet section 4 appears once, in full, at the place it
 * is realized. The rules that are a structural rewrite rather than a class
 * (R-007, R-010, R-011, R-012, R-026, R-027, R-054) are commented next to the
 * slot they replace and are carried out by the parts named there.
 */
export const modalVariants = tv({
  defaultVariants: {
    scroll: "inside",
    size: "md",
    variant: "opaque",
  },
  slots: {
    // R-013 `.modal__backdrop--transparent` → `bg-transparent`; R-014
    // `.modal__backdrop--opaque` → `bg-backdrop`; R-015
    // `.modal__backdrop--blur` → `bg-backdrop backdrop-blur-md`. The slot is
    // the paint layer only: R-008 / R-009 (the centering flex box) sit on the
    // carrier around the parts, see `modalBackdropLayoutClasses`. R-007
    // (fixed inset-0 z-index) is not written: nsh/base `Dialog` is already a
    // layer over the whole window at the top of the stack.
    backdrop: "",
    // R-053 `.modal__body` → `min-h-0 flex-1 text-sm leading-[1.43]
    // text-muted -m-[3px] my-0 overflow-visible p-[3px]`. R-054 (the scroll
    // element replacing `overflow-y-auto`) is in `modal-body.tsx`: the
    // `inside` variant renders a `Scroll`.
    // `flex-auto` instead of `flex-1`: the dialog's height is content driven
    // (the carrier row centers it, so it never stretches), and NSH's zero
    // *length* basis makes the body contribute 0 to the dialog's cross-axis
    // size — the header and footer would be the whole dialog (skill §2.5).
    body: "min-h-0 flex-auto text-sm leading-[1.43] text-muted -m-[3px] my-0 overflow-visible p-[3px]",
    // R-057 `.modal__close-trigger` → `absolute end-4 top-4`. `z-10` is not
    // in R-057: it carries the stacking the browser gives an absolutely
    // positioned button over the in-flow siblings written after it. NSH's web
    // host hit-tests overlapping views in the order they are written, so
    // without it the Header (R-048, written after the CloseTrigger in every
    // HeroUI fixture) swallows the press and the modal never closes
    // (measured: T-003 / T-006 fail on `--target web` without it, pass with
    // it). Nothing else inside the dialog sets a z-index, so the paint is
    // unchanged.
    closeTrigger: "absolute end-4 top-4 z-10",
    // R-017 `.modal__container` → `flex flex-col items-center`; R-018 →
    // `h-(--visual-viewport-height) w-full min-w-0 flex-1` (the height comes
    // from the hosting layer, there is no visual-viewport variable here);
    // R-019 → `p-4 sm:w-fit sm:p-10`; R-020 → `pointer-events-none`, so a
    // press beside the card falls through to the backdrop.
    // R-021's 250ms / ease-out-quad live here as the transition the entering
    // classes move; NSH has one property list per view, and the transform and
    // opacity are its members.
    container:
      `flex flex-col items-center w-full min-w-0 flex-1 p-4 sm:w-fit sm:p-10 pointer-events-none transition duration-[250ms] ${ease.outQuad} motion-reduce:transition-none`,
    // R-032 `.modal__dialog` → `relative` + `flex w-full flex-col`; R-033 →
    // `bg-overlay shadow-overlay outline-none` (the dark half comes from
    // `shadow.overlay` in `src/tokens/geometry.ts`); R-034 radius `min(32px,
    // --radius-3xl)` → `rounded-3xl` (24px in this theme); R-035 → `p-6
    // pointer-events-auto`.
    dialog:
      `relative flex w-full flex-col bg-overlay text-overlay-foreground ${shadow.overlay.both} outline-none rounded-3xl p-6 pointer-events-auto`,
    // R-056 `.modal__footer` → `flex flex-row items-center justify-end gap-2
    // mt-0`.
    footer: "flex flex-row items-center justify-end gap-2 mt-0",
    // R-048 `.modal__header` → `flex flex-col gap-3 mb-0`. R-049
    // (`.modal__header > .modal__icon`) is deleted: the icon has no bottom
    // margin to undo.
    header: "flex flex-col gap-3 mb-0",
    // R-050 `align-middle` is deleted (`vertical-align` needs an inline box).
    // R-051 `.modal__heading` → `text-base font-medium text-foreground`.
    heading: "text-base font-medium text-foreground",
    // R-052 `.modal__icon` → `flex items-center justify-center size-10
    // shrink-0 rounded-3xl select-none`.
    icon: "flex items-center justify-center size-10 shrink-0 rounded-3xl select-none",
    // R-001 `.modal__trigger` → `inline-block cursor-(--cursor-interactive)`,
    // that token being the pointer; `w-fit` restores the inline element's
    // shrink-to-content box (skill §4.2). R-002 its transition (the 250ms
    // `ease-out-quart` half; the property list is Trigger's inline
    // `transitionProperty`, and the two 150ms halves fold into it); R-005
    // disabled → `opacity-50 cursor-not-allowed pointer-events-none` under
    // `disabled:`; R-006 pressed → `scale-[0.97]` under `active:`.
    trigger:
      `inline-block w-fit cursor-pointer duration-[250ms] ${ease.outQuart} motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.97]`,
  },
  variants: {
    scroll: {
      // R-054: `inside` scrolls the Body (`modal-body.tsx` renders `Scroll`),
      // so the dialog clips its own box.
      inside: {
        dialog: "max-h-full min-h-0 overflow-clip",
      },
      // R-055 `.modal__body--scroll-outside` → `overflow-visible`; R-041
      // `.modal__dialog--scroll-outside` → `h-auto min-h-0 shrink-0`; R-028
      // `.modal__container--scroll-outside` → `h-auto min-h-(--visual-
      // viewport-height) overflow-y-visible` → `h-auto min-h-full` (the
      // overflow is the carrier `Scroll`, R-029).
      outside: {
        body: "overflow-visible",
        container: "h-auto min-h-full",
        dialog: "h-auto min-h-0 shrink-0",
      },
    },
    size: {
      // R-046 `.modal__dialog--cover` → `h-full min-h-full w-full`.
      cover: {
        dialog: "h-full min-h-full w-full",
      },
      // R-030 `.modal__container--full` → `p-0 sm:p-0`; R-047
      // `.modal__dialog--full` → `h-full min-h-full w-full rounded-none
      // shadow-none`.
      full: {
        container: "p-0 sm:p-0",
        dialog: "h-full min-h-full w-full rounded-none shadow-none",
      },
      // R-045 `.modal__dialog--lg` → `max-w-lg`.
      lg: {
        dialog: "max-w-lg",
      },
      // R-044 `.modal__dialog--md` → `max-w-md`.
      md: {
        dialog: "max-w-md",
      },
      // R-043 `.modal__dialog--sm` → `max-w-sm`.
      sm: {
        dialog: "max-w-sm",
      },
      // R-042 `.modal__dialog--xs` → `max-w-xs`.
      xs: {
        dialog: "max-w-xs",
      },
    },
    variant: {
      // R-015 (see the backdrop slot above).
      blur: {
        backdrop: "bg-backdrop backdrop-blur-md",
      },
      // R-014 (see the backdrop slot above).
      opaque: {
        backdrop: "bg-backdrop",
      },
      // R-013 (see the backdrop slot above).
      transparent: {
        backdrop: "bg-transparent",
      },
    },
  },
});

export type ModalVariants = VariantProps<typeof modalVariants>;

/** The slots `modalVariants` produces, as the parts call them. */
export type ModalSlots = ReturnType<typeof modalVariants>;

/** HeroUI's `ModalPlacement`, the Dialog's `data-placement`. */
export type ModalPlacement = "auto" | "top" | "center" | "bottom";

/**
 * The carrier view's classes: the flex box the container sits in.
 *
 * R-008 `.modal__backdrop` → `flex flex-row items-center justify-center`;
 * R-009 → `h-(--visual-viewport-height) w-full` → `flex-1 w-full` (the height
 * is the hosting layer's); R-029 `.modal__backdrop:has(...)` puts `items-start`
 * on it while the container scrolls outside.
 */
export function modalBackdropLayoutClasses(scroll: ModalVariants["scroll"]): string {
  const alignItems = scroll === "outside" ? "items-start" : "items-center";

  return ["flex flex-row", alignItems, "justify-center flex-1 w-full"].join(" ");
}

/**
 * The carrier's classes when it is the `Scroll` itself (`scroll="outside"`,
 * R-029): the scroll view's own sizing, and the classes of the view it lays its
 * content in.
 *
 * A `Scroll` stacks its content along the scroll axis, so the row semantics of
 * `modalBackdropLayoutClasses` do not carry over: `justify-center` on the
 * scroll view centers the content along the axis it scrolls, not across it.
 * Measured on the web target before this split: the 1422pt container sat at
 * y -327 in the 768pt viewport and `Row 01`…`Row 05` could not be reached.
 * `items-center justify-start` on the content view gives upstream's
 * `items-start`/`justify-center` result: the card starts at the top and is
 * centered across the viewport.
 */
export function modalBackdropScrollClasses(): { scroll: string; content: string } {
  return {
    scroll: "flex-1 w-full",
    content: "flex flex-col items-center justify-start w-full",
  };
}

/**
 * The Dialog's placement classes, HeroUI's `[data-placement=…]` rules:
 *
 * R-036 `auto` → `mt-auto sm:my-auto`; R-037 `center` → `my-auto`;
 * R-038 `bottom` → `mt-auto`; R-039 `top` → `mt-0`.
 */
export const modalPlacementClasses: Record<ModalPlacement, string> = {
  auto: "mt-auto sm:my-auto",
  bottom: "mt-auto",
  center: "my-auto",
  top: "mt-0",
};

/**
 * The container's first-frame classes, which turn into a transition once the
 * presence's entering phase ends.
 *
 * R-021 `[data-entering]` → `from { opacity: 0; scale: 1.05 }` → `opacity-0
 * scale-105`; R-022 `auto` → `translate-y-1`, dropped from `sm` up;
 * R-023 `top` → `-translate-y-1`; R-024 `center` → no translation;
 * R-025 `bottom` → `translate-y-1`; R-031 `full` swaps the 105 series for the
 * 100 one: the same offsets with no scale.
 */
export function modalEnteringClasses(placement: ModalPlacement, full = false): string {
  const offset =
    placement === "top"
      ? "-translate-y-1"
      : placement === "center"
        ? ""
        : placement === "bottom"
          ? "translate-y-1"
          : "translate-y-1 sm:translate-y-0";

  return [full ? "" : "opacity-0 scale-105", offset].filter((part) => part !== "").join(" ");
}

/**
 * R-058 `.modal__header + .modal__body` → `mt-2`. The sibling relation is
 * derived from the parts' registration order in the Dialog (port sheet §2).
 */
export const modalBodyAfterHeaderClasses = "mt-2";

/**
 * R-059 `.modal__header + .modal__footer` → `mt-5`, and R-060
 * `.modal__body + .modal__footer` → `mt-5`: the footer's gap depends on which
 * part registered before it.
 */
export const modalFooterAfterHeaderClasses = "mt-5";

/** R-060 (see above). */
export const modalFooterAfterBodyClasses = "mt-5";
