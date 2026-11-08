import { Label } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * Shared Label scenarios. They use only the HeroUI API so the reference app
 * (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * HeroUI's docs pair every label with an Input; Input belongs to its own unit,
 * so each scenario here renders the Label alone. `custom` is the docs
 * CustomStyles example, kept to the Label line for the same reason.
 */

function Basic() {
  return (
    <Stage>
      <Label>Your name</Label>
    </Stage>
  );
}

function Required() {
  return (
    <Stage>
      <Label isRequired>Required</Label>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <Label isDisabled>Username</Label>
    </Stage>
  );
}

function Invalid() {
  return (
    <Stage>
      <Label isInvalid>Invalid</Label>
    </Stage>
  );
}

function Custom() {
  return (
    <Stage>
      <Label className="text-xs font-semibold tracking-wide text-accent uppercase">Repository</Label>
    </Stage>
  );
}

export const labelScenarios = {
  "label/basic": Basic,
  "label/required": Required,
  "label/disabled": Disabled,
  "label/invalid": Invalid,
  "label/custom": Custom,
};
