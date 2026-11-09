import { signal, Text } from "nsh";
import { Button, Popover } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared scenarios for Popover, written with HeroUI's API only.
 *
 * The upstream fixture (heroui/packages/react/tests/components/popover/fixtures.tsx)
 * is the source of `popover/basic`: trigger Button, Dialog, Heading, one line of
 * content and the `Inside action` Button that X-001 watches.
 *
 * `popover/arrow` and `popover/arrow-custom` split the upstream "Arrow" describe
 * block into two entries: both are default-open popovers, and two modal popovers
 * open at once would stack their underlays, leaving only the top one visible to
 * selectors. Each case asserts one of the two states.
 *
 * `popover/controlled` is the isOpen channel from the upstream stories.
 */

function Content() {
  return (
    <Popover.Content>
      <Popover.Dialog onFocus={probe("dialogFocus")}>
        <Popover.Heading>Popover heading</Popover.Heading>
        <Text>This is the popover content</Text>
        <Button onPress={probe("insideAction")}>Inside action</Button>
      </Popover.Dialog>
    </Popover.Content>
  );
}

function Basic() {
  return (
    <Stage>
      <Popover onOpenChange={probe("openChange")}>
        <Button onFocus={probe("triggerFocus")}>Open popover</Button>
        <Content />
      </Popover>
    </Stage>
  );
}

function DefaultOpen() {
  return (
    <Stage>
      <Popover defaultOpen onOpenChange={probe("openChange")}>
        <Button onFocus={probe("triggerFocus")}>Open popover</Button>
        <Content />
      </Popover>
    </Stage>
  );
}

function Trigger() {
  return (
    <Stage>
      <Popover onOpenChange={probe("openChange")}>
        <Popover.Trigger onFocus={probe("triggerFocus")}>Open</Popover.Trigger>
        <Popover.Content>
          <Popover.Dialog onFocus={probe("dialogFocus")}>
            <Text>Trigger content</Text>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </Stage>
  );
}

function Arrow() {
  return (
    <Stage>
      <Popover defaultOpen>
        <Button>Open popover</Button>
        <Popover.Content>
          <Popover.Arrow testID="arrow" />
          <Popover.Dialog>
            <Text>Content</Text>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </Stage>
  );
}

function ArrowCustom() {
  return (
    <Stage>
      <Popover defaultOpen>
        <Button>Open popover</Button>
        <Popover.Content>
          <Popover.Arrow testID="arrow">
            <Text>▲</Text>
          </Popover.Arrow>
          <Popover.Dialog>
            <Text>Content</Text>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </Stage>
  );
}

function Controlled() {
  const open = signal(true);
  return (
    <Stage>
      <Popover
        isOpen={open()}
        onOpenChange={(isOpen: boolean) => {
          probe("openChange")(isOpen);
          open.set(isOpen);
        }}
      >
        <Button>Open popover</Button>
        <Popover.Content>
          <Popover.Dialog>
            <Popover.Heading>Popover heading</Popover.Heading>
            <Text>This is the popover content</Text>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </Stage>
  );
}

export const popoverScenarios: Record<string, Component> = {
  "popover/basic": Basic,
  "popover/default-open": DefaultOpen,
  "popover/trigger": Trigger,
  "popover/arrow": Arrow,
  "popover/arrow-custom": ArrowCustom,
  "popover/controlled": Controlled,
};
