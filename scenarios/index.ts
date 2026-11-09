import type { Component } from "./types";
import { primitivesScenarios } from "./primitives.scenarios";
import { smokeScenarios } from "./smoke.scenarios";
import { labelScenarios } from "./label.scenarios";
import { descriptionScenarios } from "./description.scenarios";
import { buttonScenarios } from "./button.scenarios";
import { popoverScenarios } from "./popover.scenarios";
import { switchScenarios } from "./switch.scenarios";
import { separatorScenarios } from "./separator.scenarios";
import { surfaceScenarios } from "./surface.scenarios";
import { kbdScenarios } from "./kbd.scenarios";
import { spinnerScenarios } from "./spinner.scenarios";
import { skeletonScenarios } from "./skeleton.scenarios";
import { headerScenarios } from "./header.scenarios";
import { badgeScenarios } from "./badge.scenarios";

export const scenarios: Record<string, Component> = {
  ...smokeScenarios,
  ...primitivesScenarios,
  ...labelScenarios,
  ...descriptionScenarios,
  ...buttonScenarios,
  ...popoverScenarios,
  ...switchScenarios,
  ...separatorScenarios,
  ...surfaceScenarios,
  ...kbdScenarios,
  ...spinnerScenarios,
  ...skeletonScenarios,
  ...headerScenarios,
  ...badgeScenarios,
};
