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
import { typographyScenarios } from "./typography.scenarios";
import { badgeScenarios } from "./badge.scenarios";
import { chipScenarios } from "./chip.scenarios";
import { emptyStateScenarios } from "./empty-state.scenarios";
import { closeButtonScenarios } from "./close-button.scenarios";
import { linkScenarios } from "./link.scenarios";
import { progressBarScenarios } from "./progress-bar.scenarios";
import { avatarScenarios } from "./avatar.scenarios";
import { errorMessageScenarios } from "./error-message.scenarios";
import { toggleButtonScenarios } from "./toggle-button.scenarios";

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
  ...typographyScenarios,
  ...badgeScenarios,
  ...chipScenarios,
  ...emptyStateScenarios,
  ...closeButtonScenarios,
  ...linkScenarios,
  ...progressBarScenarios,
  ...avatarScenarios,
  ...errorMessageScenarios,
  ...toggleButtonScenarios,
};
