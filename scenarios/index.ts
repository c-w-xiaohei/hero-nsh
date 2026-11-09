import type { Component } from "./types";
import { primitivesScenarios } from "./primitives.scenarios";
import { smokeScenarios } from "./smoke.scenarios";
import { labelScenarios } from "./label.scenarios";
import { descriptionScenarios } from "./description.scenarios";
import { buttonScenarios } from "./button.scenarios";
import { popoverScenarios } from "./popover.scenarios";
import { listBoxScenarios } from "./list-box.scenarios";
import { switchScenarios } from "./switch.scenarios";
import { separatorScenarios } from "./separator.scenarios";
import { surfaceScenarios } from "./surface.scenarios";
import { kbdScenarios } from "./kbd.scenarios";
import { spinnerScenarios } from "./spinner.scenarios";
import { skeletonScenarios } from "./skeleton.scenarios";
import { headerScenarios } from "./header.scenarios";
import { scrollShadowScenarios } from "./scroll-shadow.scenarios";
import { badgeScenarios } from "./badge.scenarios";
import { chipScenarios } from "./chip.scenarios";
import { emptyStateScenarios } from "./empty-state.scenarios";

export const scenarios: Record<string, Component> = {
  ...smokeScenarios,
  ...primitivesScenarios,
  ...labelScenarios,
  ...descriptionScenarios,
  ...buttonScenarios,
  ...popoverScenarios,
  ...listBoxScenarios,
  ...switchScenarios,
  ...separatorScenarios,
  ...surfaceScenarios,
  ...kbdScenarios,
  ...spinnerScenarios,
  ...skeletonScenarios,
  ...headerScenarios,
  ...scrollShadowScenarios,
  ...badgeScenarios,
  ...chipScenarios,
  ...emptyStateScenarios,
};
