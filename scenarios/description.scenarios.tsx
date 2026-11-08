import { Description } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * Shared Description scenarios. They use only the HeroUI API so the reference
 * app (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * HeroUI's docs pair every description with a field (TextField, Checkbox,
 * Switch ...); those fields belong to their own units, so each scenario here
 * renders the Description alone. `custom` exercises className being appended
 * after the base classes, and `long-token` keeps the wrap-break-word difference
 * (R-003) visible for the screenshot comparison.
 */

function Basic() {
  return (
    <Stage>
      <Description>Visible to other users</Description>
    </Stage>
  );
}

function Standalone() {
  return (
    <Stage>
      <Description>Standalone</Description>
    </Stage>
  );
}

function Custom() {
  return (
    <Stage>
      <Description className="font-semibold tracking-wide text-accent">
        Only you can see this
      </Description>
    </Stage>
  );
}

function LongToken() {
  return (
    <Stage>
      <Description>
        https://example.com/docs/reference/components/description#overflow-wrap-behavior
      </Description>
      <Description>
        /home/c_w_xiaohei/coding/project/heroui-nsh/tmp/heroui-nsh-port-research.md
      </Description>
    </Stage>
  );
}

export const descriptionScenarios = {
  "description/basic": Basic,
  "description/standalone": Standalone,
  "description/custom": Custom,
  "description/long-token": LongToken,
};
