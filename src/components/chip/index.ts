import { ChipLabel } from "./chip-label";
import type { ChipLabelProps } from "./chip-label";
import { ChipRoot } from "./chip-root";
import type { ChipRootProps } from "./chip-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Chip` is a single-root, two-part compound as in HeroUI 3.2.7: the root is
 * the whole component and also reachable as `Chip.Root`; `Chip.Label` is a
 * real part that resolves its slot from the root's context and is also what
 * the root wraps a bare string child in (R-027).
 */
export const Chip = Object.assign(ChipRoot, {
  Root: ChipRoot,
  Label: ChipLabel,
});

export type Chip = {
  Props: ChipRootProps;
  RootProps: ChipRootProps;
  LabelProps: ChipLabelProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { ChipRoot, ChipLabel };

export type { ChipRootProps, ChipRootProps as ChipProps } from "./chip-root";
export type { ChipLabelProps } from "./chip-label";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { chipVariants } from "./chip.styles";

export type { ChipVariants } from "./chip.styles";
