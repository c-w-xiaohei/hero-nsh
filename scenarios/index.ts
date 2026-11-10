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
import { typographyScenarios } from "./typography.scenarios";
import { badgeScenarios } from "./badge.scenarios";
import { chipScenarios } from "./chip.scenarios";
import { emptyStateScenarios } from "./empty-state.scenarios";
import { progressCircleScenarios } from "./progress-circle.scenarios";
import { meterScenarios } from "./meter.scenarios";
import { closeButtonScenarios } from "./close-button.scenarios";
import { linkScenarios } from "./link.scenarios";
import { breadcrumbsScenarios } from "./breadcrumbs.scenarios";
import { progressBarScenarios } from "./progress-bar.scenarios";
import { avatarScenarios } from "./avatar.scenarios";
import { errorMessageScenarios } from "./error-message.scenarios";
import { toggleButtonScenarios } from "./toggle-button.scenarios";
import { selectScenarios } from "./select.scenarios";
import { iconsScenarios } from "./icons.scenarios";
import { formScenarios } from "./form.scenarios";
import { switchGroupScenarios } from "./switch-group.scenarios";
import { colorSwatchScenarios } from "./color-swatch.scenarios";
import { alertScenarios } from "./alert.scenarios";
import { paginationScenarios } from "./pagination.scenarios";
import { accordionScenarios } from "./accordion.scenarios";
import { searchFieldScenarios } from "./search-field.scenarios";
import { numberFieldScenarios } from "./number-field.scenarios";
import { disclosureScenarios } from "./disclosure.scenarios";
import { menuScenarios } from "./menu.scenarios";
import { checkboxScenarios } from "./checkbox.scenarios";
import { dropdownScenarios } from "./dropdown.scenarios";
import { radioScenarios } from "./radio.scenarios";
import { textFieldScenarios } from "./textfield.scenarios";
import { inputScenarios } from "./input.scenarios";
import { textAreaScenarios } from "./textarea.scenarios";
import { comboBoxScenarios } from "./combo-box.scenarios";

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
  ...typographyScenarios,
  ...badgeScenarios,
  ...chipScenarios,
  ...emptyStateScenarios,
  ...progressCircleScenarios,
  ...meterScenarios,
  ...closeButtonScenarios,
  ...linkScenarios,
  ...breadcrumbsScenarios,
  ...progressBarScenarios,
  ...avatarScenarios,
  ...errorMessageScenarios,
  ...toggleButtonScenarios,
  ...selectScenarios,
  ...iconsScenarios,
  ...formScenarios,
  ...switchGroupScenarios,
  ...colorSwatchScenarios,
  ...alertScenarios,
  ...paginationScenarios,
  ...accordionScenarios,
  ...searchFieldScenarios,
  ...numberFieldScenarios,
  ...disclosureScenarios,
  ...menuScenarios,
  ...checkboxScenarios,
  ...dropdownScenarios,
  ...radioScenarios,
  ...textFieldScenarios,
  ...inputScenarios,
  ...textAreaScenarios,
  ...comboBoxScenarios,
};
