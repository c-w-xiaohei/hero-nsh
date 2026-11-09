import { Disclosure, DisclosureGroup, IconChevronUp } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared Disclosure and DisclosureGroup scenarios, per port sheet 4b. They use
 * only the HeroUI API so the reference package and this library render the same
 * JSX; the story parts that cannot be shared stay out (port sheet §5, §8):
 *
 * - the stories' `Controlled` templates hold React state (an NSH side needs a
 *   signal), and their behaviour is covered by the NSH-only fixture;
 * - `Showcase1` uses CDN images, `data-[expanded=true]:` variants and
 *   `backdrop-blur-[20px]`, none of which is part of the API contract;
 * - the stories trigger through `Button slot="trigger"`; the scenarios use the
 *   documented `Disclosure.Trigger` so both sides exercise the same part.
 */

function Panel(props: { id: string; title: string; content: string }) {
  return (
    <Disclosure id={props.id}>
      <Disclosure.Heading>
        <Disclosure.Trigger>
          {props.title}
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body>{props.content}</Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Disclosure
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <Disclosure>
        <Disclosure.Heading>
          <Disclosure.Trigger>
            Toggle content
            <Disclosure.Indicator />
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body>Hidden content revealed on expand.</Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    </Stage>
  );
}

function Expanded() {
  return (
    <Stage>
      <Disclosure defaultExpanded>
        <Disclosure.Heading>
          <Disclosure.Trigger>
            Toggle content
            <Disclosure.Indicator />
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body>Hidden content revealed on expand.</Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <Disclosure isDisabled>
        <Disclosure.Heading>
          <Disclosure.Trigger>
            Toggle content
            <Disclosure.Indicator />
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body>Hidden content revealed on expand.</Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    </Stage>
  );
}

function CustomIcon() {
  return (
    <Stage>
      <Disclosure>
        <Disclosure.Heading>
          <Disclosure.Trigger>
            Toggle content
            <Disclosure.Indicator>
              <IconChevronUp />
            </Disclosure.Indicator>
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body>Hidden content revealed on expand.</Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * DisclosureGroup
 * -----------------------------------------------------------------------------------------------*/

function Group() {
  return (
    <Stage>
      <DisclosureGroup expandedKeys={new Set(["preview"])}>
        <Panel id="preview" title="Preview" content="Preview content" />
        <Panel id="download" title="Download" content="Download content" />
      </DisclosureGroup>
    </Stage>
  );
}

function GroupMultiple() {
  return (
    <Stage>
      <DisclosureGroup
        allowsMultipleExpanded
        defaultExpandedKeys={new Set(["preview", "download"])}
      >
        <Panel id="preview" title="Preview" content="Preview content" />
        <Panel id="download" title="Download" content="Download content" />
      </DisclosureGroup>
    </Stage>
  );
}

export const disclosureScenarios: Record<string, Component> = {
  "disclosure/default": Default,
  "disclosure/expanded": Expanded,
  "disclosure/disabled": Disabled,
  "disclosure/icon": CustomIcon,
  "disclosure/group": Group,
  "disclosure/group-multiple": GroupMultiple,
};
