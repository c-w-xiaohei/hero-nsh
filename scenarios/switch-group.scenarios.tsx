import { Label, Switch, SwitchGroup } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared SwitchGroup scenarios, merged from the stories file
 * (switch-group.stories.tsx) and the upstream unit test's `GroupedSwitch`.
 * They use only the HeroUI API so the reference package and this library render
 * the same JSX.
 *
 * The Horizontal story's root `className="overflow-x-auto"` is dropped: NSH has
 * no overflow classes (scrolling belongs to a scroll element, see nsh_twref),
 * so the host around the scenario owns the overflow (port sheet 4b, §8).
 *
 * The Form story keeps its switches' name / value / defaultSelected and drops
 * the <form> wrapper and Submit button: NSH has no form submission. name and
 * value are accepted by Switch but have no effect (a Switch unit difference).
 */

function GroupedSwitch(props: { label: string }) {
  return (
    <Switch>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Label>{props.label}</Label>
      </Switch.Content>
    </Switch>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Stories
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <SwitchGroup>
        <Switch name="notifications">
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Allow Notifications
          </Switch.Content>
        </Switch>
        <Switch name="marketing">
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Marketing emails
          </Switch.Content>
        </Switch>
        <Switch name="social">
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Social media updates
          </Switch.Content>
        </Switch>
      </SwitchGroup>
    </Stage>
  );
}

function Horizontal() {
  return (
    <Stage>
      <SwitchGroup orientation="horizontal">
        <Switch name="notifications">
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Notifications
          </Switch.Content>
        </Switch>
        <Switch name="marketing">
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Marketing
          </Switch.Content>
        </Switch>
        <Switch name="social">
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Social
          </Switch.Content>
        </Switch>
      </SwitchGroup>
    </Stage>
  );
}

function Form() {
  return (
    <Stage>
      <SwitchGroup>
        <Switch name="notifications" value="on">
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Enable notifications
          </Switch.Content>
        </Switch>
        <Switch defaultSelected name="newsletter" value="on">
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Subscribe to newsletter
          </Switch.Content>
        </Switch>
        <Switch name="marketing" value="on">
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Receive marketing updates
          </Switch.Content>
        </Switch>
      </SwitchGroup>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Unit test fixture (GroupedSwitch)
 * -----------------------------------------------------------------------------------------------*/

function WithLabel() {
  return (
    <Stage>
      <SwitchGroup>
        <GroupedSwitch label="Wifi" />
        <GroupedSwitch label="Bluetooth" />
      </SwitchGroup>
    </Stage>
  );
}

export const switchGroupScenarios: Record<string, Component> = {
  "switch-group/default": Default,
  "switch-group/horizontal": Horizontal,
  "switch-group/form": Form,
  "switch-group/with-label": WithLabel,
};
