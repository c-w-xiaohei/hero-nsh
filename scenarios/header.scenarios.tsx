import { Header } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * Shared Header scenarios. They use only the HeroUI API so the reference app
 * (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * Upstream Header has no stories of its own: its real usage is the section
 * title inside ListBox.Section / Menu.Section, and those containers belong to
 * their own units. HeroUI requires that ancestor because RAC's Header is a
 * collection leaf; NSH has no collection, so every scenario renders the
 * Header alone. `custom` exercises className being appended after the base
 * classes, which lets the caller override `text-muted`.
 */

function Basic() {
  return (
    <Stage>
      <Header>Actions</Header>
    </Stage>
  );
}

function Custom() {
  return (
    <Stage>
      <Header className="text-foreground">Actions</Header>
    </Stage>
  );
}

export const headerScenarios = {
  "header/basic": Basic,
  "header/custom": Custom,
};
