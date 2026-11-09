import { Text } from "nsh";
import { Kbd } from "@heroui/react";
import type { KbdKey } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * Shared Kbd scenarios, written with HeroUI's API only.
 *
 * Kbd is a pure display component. `basic` and `title` back the two ported
 * upstream cases; `variants` is the pair the light-variant screenshot compares;
 * `keys` lays out every KbdKey so the glyph and label tables mount in full.
 * `inline` is the docs InlineUsage paragraph, kept to show how the inline
 * difference (R-001 / port sheet 8) reads in the column Stage.
 */

const keys: KbdKey[] = [
  "command",
  "shift",
  "ctrl",
  "option",
  "enter",
  "delete",
  "escape",
  "tab",
  "capslock",
  "up",
  "right",
  "down",
  "left",
  "pageup",
  "pagedown",
  "home",
  "end",
  "help",
  "space",
  "fn",
  "win",
  "alt",
];

function Basic() {
  return (
    <Stage>
      <Kbd>
        <Kbd.Abbr keyValue="command" />
        <Kbd.Content>K</Kbd.Content>
      </Kbd>
    </Stage>
  );
}

function Title() {
  return (
    <Stage>
      <Kbd>
        <Kbd.Abbr keyValue="command" />
      </Kbd>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <Kbd>
        <Kbd.Abbr keyValue="command" />
        <Kbd.Content>K</Kbd.Content>
      </Kbd>
      <Kbd variant="light">
        <Kbd.Abbr keyValue="command" />
        <Kbd.Content>K</Kbd.Content>
      </Kbd>
    </Stage>
  );
}

function Keys() {
  return (
    <Stage>
      {keys.map((key) => (
        <Kbd>
          <Kbd.Abbr keyValue={key} />
        </Kbd>
      ))}
    </Stage>
  );
}

function Inline() {
  return (
    <Stage>
      <Text class="text-sm">
        Press <Kbd><Kbd.Content>Esc</Kbd.Content></Kbd> to close the dialog.
      </Text>
      <Text class="text-sm">
        Use <Kbd><Kbd.Abbr keyValue="command" /><Kbd.Content>K</Kbd.Content></Kbd>{" "}
        to open the command palette.
      </Text>
      <Text class="text-sm">
        Navigate with <Kbd><Kbd.Abbr keyValue="up" /></Kbd> and{" "}
        <Kbd><Kbd.Abbr keyValue="down" /></Kbd> arrow keys.
      </Text>
    </Stage>
  );
}

export const kbdScenarios = {
  "kbd/basic": Basic,
  "kbd/title": Title,
  "kbd/variants": Variants,
  "kbd/keys": Keys,
  "kbd/inline": Inline,
};
