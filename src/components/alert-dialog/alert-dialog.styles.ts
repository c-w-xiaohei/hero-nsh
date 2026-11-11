import { tv } from "tailwind-variants";

import { ease, shadow } from "../../tokens/geometry";

/**
 * AlertDialog's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/alert-dialog/alert-dialog.styles.ts` plus
 * every declaration of `packages/styles/components/alert-dialog.css`.
 *
 * Upstream's table only emits BEM names; NSH has no BEM CSS (D18), so each
 * block of that stylesheet is expanded here into the declarations it applied.
 * The ten slots are the same ten HeroUI declares, so the parts read one table
 * and no dimension is copied.
 *
 * Every rule id of port sheet section 4 appears once, in full, at the place it
 * is realized. The rules that are a structural rewrite rather than a class
 * (R-007, R-010, R-011, R-016, R-021, R-026) are commented next to the slot they
 * replace and are carried out by the parts named there.
 */
export const alertDialogVariants = tv({
  defaultVariants: {
    size: "md",
    status: "danger",
    variant: "opaque",
  },
  slots: {
    // R-013 `.alert-dialog__backdrop--transparent` → `bg-transparent`;
    // R-014 `.alert-dialog__backdrop--opaque` → `bg-backdrop`;
    // R-015 `.alert-dialog__backdrop--blur` → `bg-backdrop backdrop-blur-md`.
    // The slot is the paint layer only: R-008 / R-009 (the centering flex box
    // and its full-window box) sit on the carrier around the parts, see
    // `alertDialogBackdropCarrierClasses`. R-007 (fixed inset-0 z-index) is not
    // written: nsh/base `Dialog` is already a layer over the whole window at
    // the top of the stack. R-010 / R-011 (the entering / exiting fade) are the
    // Dialog's native `animation="fade"`; R-016 (the `(hover: none) and
    // (pointer: coarse)` blur fallback) has no NSH condition channel and is a
    // registered difference (port sheet §8).
    backdrop: "",
    // R-057 `.alert-dialog__body` → `min-h-0 flex-1 text-sm`. `flex-auto`
    // instead of `flex-1`: the dialog's height is content driven, and NSH's
    // zero *length* basis makes the body contribute 0 to the dialog's size, so
    // the header and footer would be the whole card (style skill §2).
    // R-058 → `text-sm leading-[1.43] text-muted`; R-059 → `-m-[3px] my-0
    // p-[3px]` (the focus gutter); R-060 (`overflow-y-auto overscroll-contain
    // -webkit-overflow-scrolling: touch`) is not a class channel: the
    // `overflow-y-auto` / `scrollbar` pair and the momentum belong to the
    // `Scroll` element the Body renders (`alert-dialog-body.tsx`).
    body: "min-h-0 flex-auto text-sm leading-[1.43] text-muted -m-[3px] my-0 overflow-visible p-[3px]",
    // R-063 `.alert-dialog__close-trigger` → `absolute end-4 top-4`. `z-10`
    // is not in R-063: it carries the stacking the browser gives an absolutely
    // positioned button over the in-flow siblings written after it. NSH's web
    // host hit-tests overlapping views in the order they are written, so
    // without it the Header (R-044, written after the CloseTrigger in every
    // HeroUI fixture) swallows the press and the dialog never closes. Nothing
    // else inside the dialog sets a z-index, so the paint is unchanged.
    closeTrigger: "absolute end-4 top-4 z-10",
    // R-017 `.alert-dialog__container` → `flex flex-col items-center`;
    // R-018 → `h-(--visual-viewport-height) w-full min-w-0 flex-1` (the height
    // comes from the hosting layer, there is no visual-viewport variable here);
    // R-019 → `p-4 sm:w-fit sm:p-10`; R-020 → `pointer-events-none`, so a press
    // beside the card falls through to the paint layer.
    // R-021's 250ms / ease-out-quad live here as the transition the entering
    // classes move; NSH has one property list per view, and the transform and
    // opacity are its members (R-027 clears it under reduced motion).
    container:
      `flex flex-col items-center h-full w-full min-w-0 flex-1 p-4 sm:w-fit sm:p-10 pointer-events-none transition duration-[250ms] ${ease.outQuad} motion-reduce:transition-none`,
    // R-028 `.alert-dialog__dialog` → `relative`;
    // R-029 → `flex min-h-0 w-full flex-col max-h-full`;
    // R-030 → `bg-overlay shadow-overlay outline-none` (the dark half of the
    // shadow pair, per the theme notes); R-031 radius `min(32px,
    // --radius-3xl)` → `rounded-3xl` (24 in this theme); R-032 → `p-6`;
    // R-033 → `overflow-hidden`; R-034 → `pointer-events-auto`.
    dialog:
      `relative flex min-h-0 w-full flex-col max-h-full bg-overlay text-overlay-foreground ${shadow.overlay.both} outline-none rounded-3xl p-6 overflow-hidden pointer-events-auto`,
    // R-061 `.alert-dialog__footer` → `flex flex-row items-center justify-end
    // gap-2`; R-062 → `mt-0`. R-065 / R-066 (the margin a preceding part adds)
    // are read from the Dialog's part order, see `alert-dialog-footer.tsx`.
    footer: "flex flex-row items-center justify-end gap-2 mt-0",
    // R-044 `.alert-dialog__header` → `flex flex-col gap-3 mb-0`. R-045
    // (`.alert-dialog__header > .modal__icon`) is not a class here: NSH has no
    // descendant selector, and the icon carries no bottom margin to undo, so
    // the header's `gap-3` is the whole spacing (see `alert-dialog-icon.tsx`).
    header: "flex flex-col gap-3 mb-0",
    // R-046 `align-middle` is deleted (`vertical-align` needs an inline box).
    // R-047 `.alert-dialog__heading` → `text-base font-medium text-foreground`.
    heading: "text-base font-medium text-foreground",
    // R-048 `.alert-dialog__icon` → `flex items-center justify-center`;
    // R-049 → `size-10 shrink-0`; R-050 → `rounded-3xl select-none`.
    // R-051 (the default glyph's `box-content size-5`) lands on the glyph, see
    // `alert-dialog-icon.tsx`.
    icon: "flex items-center justify-center size-10 shrink-0 rounded-3xl select-none",
    // R-001 `.alert-dialog__trigger` → `inline-block`, and `w-fit` restores the
    // inline element's shrink-to-content box (NSH's `View` is a block, style
    // skill rule 5); R-002 → `cursor-pointer` (the `--cursor-interactive`
    // token); R-003 its three transition durations fold into one pair — the
    // 150ms / `ease-smooth` half is the one the sheet keeps, and the property
    // list is the Trigger's inline `transitionProperty`; R-004 the focus ring
    // is the Trigger's `classList` (keyboard modality only);
    // R-005 disabled → `opacity-50 cursor-not-allowed pointer-events-none`
    // under `disabled:`; R-006 pressed → `scale-[0.97]` under `active:`.
    trigger:
      `inline-block w-fit cursor-pointer duration-150 ${ease.smooth} motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.97]`,
  },
  variants: {
    size: {
      // R-043 `.alert-dialog__dialog--cover` → `h-full min-h-full w-full`.
      cover: {
        dialog: "h-full min-h-full w-full",
      },
      // R-042 `.alert-dialog__dialog--lg` → `max-w-lg`.
      lg: {
        dialog: "max-w-lg",
      },
      // R-041 `.alert-dialog__dialog--md` → `max-w-md`.
      md: {
        dialog: "max-w-md",
      },
      // R-040 `.alert-dialog__dialog--sm` → `max-w-sm`.
      sm: {
        dialog: "max-w-sm",
      },
      // R-039 `.alert-dialog__dialog--xs` → `max-w-xs`.
      xs: {
        dialog: "max-w-xs",
      },
    },
    status: {
      // R-053 `icon--accent` → `bg-accent-soft text-accent-soft-foreground`.
      accent: {
        icon: "bg-accent-soft text-accent-soft-foreground",
      },
      // R-056 `icon--danger` → `bg-danger-soft text-danger-soft-foreground`.
      danger: {
        icon: "bg-danger-soft text-danger-soft-foreground",
      },
      // R-052 `icon--default` → `bg-default text-foreground`.
      default: {
        icon: "bg-default text-foreground",
      },
      // R-054 `icon--success` → `bg-success-soft text-success-soft-foreground`.
      success: {
        icon: "bg-success-soft text-success-soft-foreground",
      },
      // R-055 `icon--warning` → `bg-warning-soft text-warning-soft-foreground`.
      warning: {
        icon: "bg-warning-soft text-warning-soft-foreground",
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

/** The slots `alertDialogVariants` produces, as the parts call them. */
export type AlertDialogSlots = ReturnType<typeof alertDialogVariants>;

/** HeroUI's `AlertDialogVariants["variant"]`: the Backdrop's paint. */
export type AlertDialogVariant = "transparent" | "opaque" | "blur";

/** HeroUI's `AlertDialogVariants["size"]`: the Dialog's maximum width. */
export type AlertDialogSize = "xs" | "sm" | "md" | "lg" | "cover";

/** HeroUI's `AlertDialogPlacement`, the Dialog's `data-placement`. */
export type AlertDialogPlacement = "auto" | "top" | "center" | "bottom";

/** HeroUI's `AlertDialogStatus`, the Icon's semantic status. */
export type AlertDialogStatus = "default" | "accent" | "success" | "warning" | "danger";

/**
 * The carrier view's classes: the flex box the container sits in.
 *
 * R-008 `.alert-dialog__backdrop` → `flex flex-row items-center
 * justify-center`; R-009 → `h-(--visual-viewport-height) w-full` →
 * `flex-1 w-full` (the height is the hosting layer's). `pointer-events-none`
 * keeps the empty area falling through to the paint layer, while the Dialog's
 * `pointer-events-auto` (R-034) keeps the card itself a target.
 */
export const alertDialogBackdropCarrierClasses =
  "flex flex-row items-center justify-center flex-1 w-full pointer-events-none";

/**
 * The Dialog's placement classes, HeroUI's `[data-placement=…]` rules:
 *
 * R-035 `auto` → `mt-auto sm:my-auto`; R-036 `center` → `my-auto`;
 * R-037 `bottom` → `mt-auto`; R-038 `top` → `mt-0`.
 */
export const alertDialogPlacementClasses: Record<AlertDialogPlacement, string> = {
  auto: "mt-auto sm:my-auto",
  bottom: "mt-auto",
  center: "my-auto",
  top: "mt-0",
};

/**
 * The container's first-frame classes, which turn into a transition once the
 * presence's entering phase ends.
 *
 * R-021 `[data-entering]` → `from { opacity: 0; scale: 1.05 }` →
 * `opacity-0 scale-105`; R-022 `auto` → `translate-y-1`, dropped from `sm` up;
 * R-023 `top` → `-translate-y-1`; R-024 `center` → no translation;
 * R-025 `bottom` → `translate-y-1`. R-026 (the exit keyframe) is the Dialog's
 * native fade; R-027 (`motion-reduce:animate-none`) is the container slot's
 * `motion-reduce:transition-none` plus the Dialog's `animation="none"`.
 */
export function alertDialogEnteringClasses(placement: AlertDialogPlacement): string {
  const offset =
    placement === "top"
      ? "-translate-y-1"
      : placement === "center"
        ? ""
        : placement === "bottom"
          ? "translate-y-1"
          : "translate-y-1 sm:translate-y-0";

  return ["opacity-0 scale-105", offset].filter((part) => part !== "").join(" ");
}

/**
 * R-064 `.alert-dialog__header + .alert-dialog__body` → `mt-2`. The sibling
 * relation is derived from the parts' registration order in the Dialog
 * (port sheet §2).
 */
export const alertDialogBodyAfterHeaderClasses = "mt-2";

/**
 * R-065 `.alert-dialog__header + .alert-dialog__footer` → `mt-5`, and
 * R-066 `.alert-dialog__body + .alert-dialog__footer` → `mt-5`: the footer's
 * gap depends on which part registered before it.
 */
export const alertDialogFooterAfterHeaderClasses = "mt-5";

/** R-066 (see above). */
export const alertDialogFooterAfterBodyClasses = "mt-5";
