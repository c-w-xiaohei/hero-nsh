import type { Component } from "./types";
import { primitivesScenarios } from "./primitives.scenarios";
import { smokeScenarios } from "./smoke.scenarios";
import { labelScenarios } from "./label.scenarios";
import { descriptionScenarios } from "./description.scenarios";
import { buttonScenarios } from "./button.scenarios";
import { switchScenarios } from "./switch.scenarios";

export const scenarios: Record<string, Component> = {
  ...smokeScenarios,
  ...primitivesScenarios,
  ...labelScenarios,
  ...descriptionScenarios,
  ...buttonScenarios,
  ...switchScenarios,
};
