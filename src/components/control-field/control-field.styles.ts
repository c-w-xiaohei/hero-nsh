import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * ControlField's variant table: upstream's `control-field.css`
 * (`.control-field__root { flex-direction: row; align-items: center; gap:
 * calc(var(--spacing) * 3) }`, `.control-field__indicator` empty) plus the
 * `input` axis of the encapsulation model — the interaction-usability channel
 * every adapted component's tv() table may grow (common rules: `input` owns
 * the minimum hit size; there is no `density` axis here because the row's
 * spacing is content-driven, not a density preset's).
 *
 * `touch` adds `min-h-11` (sheet A-004): the visible row is the press target
 * (the `hitSlop` half of the hit-area path lives in `createPressFeedback`,
 * which can only expand a target the layout already gave a size — a one-line
 * row would otherwise sit under the 44 pt minimum).
 */
export const controlFieldVariants = tv({
  slots: {
    root: "flex flex-row items-center gap-3",
    indicator: "",
  },
  variants: {
    input: {
      pointer: {},
      touch: {
        root: "min-h-11",
      },
    },
  },
});

export type ControlFieldVariants = VariantProps<typeof controlFieldVariants>;
