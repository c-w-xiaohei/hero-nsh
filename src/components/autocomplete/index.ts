import {
  AutocompleteClearButton,
  type AutocompleteClearButtonProps,
} from "./autocomplete-clear-button";
import { AutocompleteFilter, type AutocompleteFilterProps } from "./autocomplete-filter";
import {
  AutocompleteIndicator,
  type AutocompleteIndicatorProps,
} from "./autocomplete-indicator";
import {
  AutocompletePopover,
  type AutocompletePopoverProps,
} from "./autocomplete-popover";
import {
  AutocompleteRoot,
  type AutocompleteRenderProps,
  type AutocompleteRootProps,
  type AutocompleteSelection,
} from "./autocomplete-root";
import {
  AutocompleteTrigger,
  type AutocompleteTriggerProps,
  type AutocompleteTriggerRenderProps,
} from "./autocomplete-trigger";
import {
  AutocompleteValue,
  type AutocompleteValueProps,
  type AutocompleteValueRenderProps,
} from "./autocomplete-value";

// A-013 / A-014: the two harness-side 接轴 spots of adapt sheet
// autocomplete.md §2 are realized outside this directory —
// `harness/autocomplete.fixtures.tsx` (`Scoped` always mounting
// `EnvironmentScope` plus the `m-*` cases and `ctx-*`/`layout`/`hover`
// probes) and `harness/tests/components/autocomplete/autocomplete.mobile.test.tsx`
// + `.mobile.headless.test.tsx` (the desktop-pinned, dual-environment
// M-assertions). The gate's marker scan only sees
// `src/components/autocomplete/`, so the record lives here (typography /
// e-parts same convention). What they probe — every part this file
// exports — stays environment-invariant at the contract surface.

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -------------------------------------------------------------------------------------------------*/
/**
 * `Autocomplete` is HeroUI's compound: the root plus the six parts, each
 * reachable as `Autocomplete.Part` and also exported by name.
 */
export const Autocomplete = Object.assign(AutocompleteRoot, {
  Root: AutocompleteRoot,
  Trigger: AutocompleteTrigger,
  Value: AutocompleteValue,
  Indicator: AutocompleteIndicator,
  Popover: AutocompletePopover,
  Filter: AutocompleteFilter,
  ClearButton: AutocompleteClearButton,
});

export type Autocomplete<T = unknown> = {
  Props: AutocompleteRootProps<T>;
  RootProps: AutocompleteRootProps<T>;
  TriggerProps: AutocompleteTriggerProps;
  ValueProps: AutocompleteValueProps;
  IndicatorProps: AutocompleteIndicatorProps;
  PopoverProps: AutocompletePopoverProps;
  FilterProps: AutocompleteFilterProps;
  ClearButtonProps: AutocompleteClearButtonProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -------------------------------------------------------------------------------------------------*/
export {
  AutocompleteClearButton,
  AutocompleteFilter,
  AutocompleteIndicator,
  AutocompletePopover,
  AutocompleteRoot,
  AutocompleteTrigger,
  AutocompleteValue,
};

export type {
  AutocompleteClearButtonProps,
  AutocompleteFilterProps,
  AutocompleteIndicatorProps,
  AutocompletePopoverProps,
  AutocompleteRenderProps,
  AutocompleteRootProps,
  AutocompleteRootProps as AutocompleteProps,
  AutocompleteSelection,
  AutocompleteTriggerProps,
  AutocompleteValueProps,
};

export type { AutocompletePopoverRenderProps } from "./autocomplete-popover";
export type { AutocompleteTriggerRenderProps } from "./autocomplete-trigger";
export type { AutocompleteValueRenderProps } from "./autocomplete-value";
export type {
  AutocompleteFilterFn,
  AutocompleteSelectedItem,
  AutocompleteStateFacade,
} from "./autocomplete-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -------------------------------------------------------------------------------------------------*/
export { autocompleteVariants } from "./autocomplete.styles";

export type { AutocompleteVariants } from "./autocomplete.styles";
