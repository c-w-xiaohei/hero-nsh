import type { Component } from "./types";
import { primitivesScenarios } from "./primitives.scenarios";
import { smokeScenarios } from "./smoke.scenarios";
import { descriptionScenarios } from "./description.scenarios";

export const scenarios: Record<string, Component> = {
  ...smokeScenarios,
  ...primitivesScenarios,
  ...descriptionScenarios,
};
