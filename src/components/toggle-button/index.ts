import {
  ToggleButtonRoot,
  type ToggleButtonRenderProps,
  type ToggleButtonRootProps,
  type ToggleButtonState,
} from "./toggle-button-root";
import {
  ToggleButtonGroupRoot,
  type ToggleButtonGroupRenderProps,
  type ToggleButtonGroupRootProps,
} from "./toggle-button-group-root";
import {
  ToggleButtonGroupSeparator,
  type ToggleButtonGroupSeparatorProps,
} from "./toggle-button-group-separator";

// A-007: the harness-side 接轴 spot of adapt sheet toggle-button.md is
// realized outside this directory — `harness/toggle-button.fixtures.tsx`
// (`Scoped` feeds `EnvironmentScope input="touch"` around the standalone,
// sizes, icon-only and group cases; probes record the `events` sequence,
// `isHovered`/`isSelected` markers, the `PressableFeedbackContext` channels
// `isPressed`/`scale.getValue()`/`hitSlop()` via CtxProbe/`ctx-sample`,
// `viewStyle().backgroundColor` and `onLayout` bounds), asserted by
// `toggle-button.mobile.web.test.tsx` / `toggle-button.mobile.headless.test.tsx`.
// The gate's marker scan only sees `src/components/toggle-button/`, so the
// record lives here — same pattern as the surface unit's index.ts.

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
export const ToggleButton = Object.assign(ToggleButtonRoot, {
  Root: ToggleButtonRoot,
});

export type ToggleButton = {
  Props: ToggleButtonRootProps;
  RootProps: ToggleButtonRootProps;
};

export const ToggleButtonGroup = Object.assign(ToggleButtonGroupRoot, {
  Root: ToggleButtonGroupRoot,
  Separator: ToggleButtonGroupSeparator,
});

export type ToggleButtonGroup = {
  Props: ToggleButtonGroupRootProps;
  RootProps: ToggleButtonGroupRootProps;
  SeparatorProps: ToggleButtonGroupSeparatorProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { ToggleButtonRoot, ToggleButtonGroupRoot, ToggleButtonGroupSeparator };

export type {
  ToggleButtonRenderProps,
  ToggleButtonRootProps,
  ToggleButtonRootProps as ToggleButtonProps,
  ToggleButtonState,
  ToggleButtonGroupRenderProps,
  ToggleButtonGroupRootProps,
  ToggleButtonGroupRootProps as ToggleButtonGroupProps,
  ToggleButtonGroupSeparatorProps,
};

export type {
  ToggleButtonGroupKey,
  ToggleButtonGroupState,
  ToggleButtonGroupStateOptions,
} from "./toggle-button-group-state";

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/
export {
  ToggleButtonGroupContext,
  TOGGLE_BUTTON_GROUP_CHILD,
  type ToggleButtonGroupContextValue,
  type ToggleButtonGroupItem,
  type ToggleButtonGroupSelectionMode,
} from "./toggle-button-group-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export {
  toggleButtonVariants,
  type ToggleButtonSize,
  type ToggleButtonVariant,
} from "./toggle-button.styles";

export type { ToggleButtonVariants } from "./toggle-button.styles";

export {
  toggleButtonGroupVariants,
  type ToggleButtonGroupOrientation,
} from "./toggle-button-group.styles";

export type { ToggleButtonGroupVariants } from "./toggle-button-group.styles";
