import type { Component } from "./types";
import { smokeScenarios } from "./smoke.scenarios";

export const scenarios: Record<string, Component> = {
  ...smokeScenarios,
};
