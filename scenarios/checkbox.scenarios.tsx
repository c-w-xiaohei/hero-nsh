import { signal, Text } from "nsh";
import { Button, Checkbox, CheckboxGroup, Description, FieldError, Label } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Scenarios for Checkbox and CheckboxGroup, merged from the stories files
 * (checkbox.stories.tsx, checkbox-group.stories.tsx) and the JSX of the
 * upstream unit tests (checkbox.test.tsx, checkbox-group.test.tsx). They use
 * HeroUI's API; the `.split` ones render an accessor instead of a boolean
 * (D17) and stand in for their own copy on the reference side.
 *
 * Deviations from the stories, all recorded in the port sheet 4b / final
 * answer:
 * - FullRounded drops the Root's
 *   `[&_[data-slot='checkbox-default-indicator--checkmark']]:size-2` and the
 *   `before:rounded-full` pseudo-element utility (no descendant selectors and
 *   no pseudo-elements in NSH); the Control keeps `size-3 rounded-full`.
 * - FeaturesAndAddOnsExample draws the `@iconify/react` icons as text glyphs.
 *   Its Content keeps `data-[selected=true]:bg-accent/10` on purpose: the
 *   reference side paints the tinted row, NSH resolves the class but has no
 *   `data-*` attribute to match, so the tint is a registered screenshot
 *   difference rather than a class quietly removed on both sides.
 * - The group Required story drops the Form wrapper and the Submit button
 *   (NSH has no form submission); the FieldError stays.
 */

/* -------------------------------------------------------------------------------------------------
 * Checkbox stories
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <Checkbox name="terms">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Accept terms and conditions
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <Checkbox name="primary" variant="primary">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Primary checkbox
        </Checkbox.Content>
        <Description>Standard styling with default background</Description>
      </Checkbox>
      <Checkbox name="secondary" variant="secondary">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Secondary checkbox
        </Checkbox.Content>
        <Description>Lower emphasis variant for use in surfaces</Description>
      </Checkbox>
    </Stage>
  );
}

function WithDescription() {
  return (
    <Stage>
      <Checkbox name="terms">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Accept terms and conditions
        </Checkbox.Content>
        <Description>I agree to the terms and privacy policy</Description>
      </Checkbox>
    </Stage>
  );
}

function WithCustomIndicatorSplit() {
  return (
    <Stage>
      <Checkbox defaultSelected id="heart">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator>
              {({ isSelected }) => (isSelected() ? <Text class="text-sm">♥</Text> : null)}
            </Checkbox.Indicator>
          </Checkbox.Control>
          Heart
        </Checkbox.Content>
      </Checkbox>
      <Checkbox defaultSelected id="plus">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator>
              {({ isSelected }) => (isSelected() ? <Text class="text-sm">＋</Text> : null)}
            </Checkbox.Indicator>
          </Checkbox.Control>
          Plus
        </Checkbox.Content>
      </Checkbox>
      <Checkbox isIndeterminate id="indeterminate">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator>
              {({ isIndeterminate }) => (isIndeterminate() ? <Text class="text-sm">−</Text> : null)}
            </Checkbox.Indicator>
          </Checkbox.Control>
          Indeterminate
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function Indeterminate() {
  return (
    <Stage>
      <Checkbox isIndeterminate id="select-all">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Select all
        </Checkbox.Content>
        <Description>Shows indeterminate state</Description>
      </Checkbox>
    </Stage>
  );
}

function ControlOnly() {
  return (
    <Stage>
      <Checkbox aria-label="Accept" name="control-only">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <Checkbox isDisabled id="feature">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Feature
        </Checkbox.Content>
        <Description>This feature is coming soon</Description>
      </Checkbox>
    </Stage>
  );
}

function Controlled() {
  const selected = signal(true);

  return (
    <Stage>
      <Checkbox
        id="notifications"
        isSelected={selected()}
        onChange={(isSelected) => selected.set(isSelected)}
      >
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Email notifications
        </Checkbox.Content>
      </Checkbox>
      <Button testID="toggle" onPress={() => selected.set(!selected())}>
        Toggle
      </Button>
      <Text>{`Status: ${selected() ? "Enabled" : "Disabled"}`}</Text>
    </Stage>
  );
}

function RenderPropsSplit() {
  return (
    <Stage>
      <Checkbox id="terms">
        {({ isSelected }) => (
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Text>{isSelected() ? "Terms accepted" : "Accept terms"}</Text>
          </Checkbox.Content>
        )}
      </Checkbox>
    </Stage>
  );
}

function Invalid() {
  return (
    <Stage>
      <Checkbox isInvalid isRequired name="agreement">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          I agree to the terms
        </Checkbox.Content>
        <FieldError>You must accept the terms to continue</FieldError>
      </Checkbox>
    </Stage>
  );
}

function Validation() {
  return (
    <Stage>
      <Checkbox
        isRequired
        name="newsletter"
        validate={(isSelected) => (isSelected ? true : "Please subscribe to continue")}
      >
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Subscribe to newsletter
        </Checkbox.Content>
        <FieldError />
      </Checkbox>
    </Stage>
  );
}

function FullRounded() {
  return (
    <Stage>
      <Checkbox id="small-rounded">
        <Checkbox.Content>
          <Checkbox.Control className="size-3 rounded-full">
            <Checkbox.Indicator />
          </Checkbox.Control>
          Small size
        </Checkbox.Content>
      </Checkbox>
      <Checkbox id="default-rounded">
        <Checkbox.Content>
          <Checkbox.Control className="size-4 rounded-full">
            <Checkbox.Indicator />
          </Checkbox.Control>
          Default size
        </Checkbox.Content>
      </Checkbox>
      <Checkbox id="large-rounded">
        <Checkbox.Content>
          <Checkbox.Control className="size-5 rounded-full">
            <Checkbox.Indicator />
          </Checkbox.Control>
          Large size
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

const ADD_ONS = [
  {
    title: "Email Notifications",
    value: "email",
    description: "Receive updates via email",
    glyph: "✉",
  },
  {
    title: "SMS Alerts",
    value: "sms",
    description: "Get instant SMS alerts",
    glyph: "💬",
  },
  {
    title: "Push Notifications",
    value: "push",
    description: "Browser and mobile push alerts",
    glyph: "🔔",
  },
];

function FeaturesAndAddOns() {
  return (
    <Stage>
      <CheckboxGroup name="notification-preferences">
        <Label>Notification preferences</Label>
        <Description>Choose how you want to receive updates</Description>
        {ADD_ONS.map((addOn) => (
          <Checkbox id={addOn.value} value={addOn.value}>
            <Checkbox.Content className="group relative flex w-full flex-row items-start justify-start gap-4 rounded-3xl bg-surface-tertiary px-5 py-4 transition data-[selected=true]:bg-accent/10">
              <Text class="text-sm">{addOn.glyph}</Text>
              <Checkbox.Control className="absolute end-4 top-3 size-5 rounded-full">
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Text class="font-medium">{addOn.title}</Text>
              <Description>{addOn.description}</Description>
            </Checkbox.Content>
          </Checkbox>
        ))}
      </CheckboxGroup>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * CheckboxGroup stories
 * -----------------------------------------------------------------------------------------------*/

function GroupDefault() {
  return (
    <Stage>
      <CheckboxGroup name="interests">
        <Label>Select your interests</Label>
        <Description>Choose all that apply</Description>
        <Checkbox value="coding">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Coding
          </Checkbox.Content>
          <Description>Love building software</Description>
        </Checkbox>
        <Checkbox value="design">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Design
          </Checkbox.Content>
          <Description>Enjoy creating beautiful interfaces</Description>
        </Checkbox>
        <Checkbox value="writing">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Writing
          </Checkbox.Content>
          <Description>Passionate about content creation</Description>
        </Checkbox>
      </CheckboxGroup>
    </Stage>
  );
}

/*
 * T-014 (HeroUI checkbox-group.test.tsx:70) needs each item's nested `<Label>`
 * to register into its own item root, so the names cannot come from the group
 * label. The unit test's JSX, as a scenario.
 */
function GroupLabels() {
  return (
    <Stage>
      <CheckboxGroup name="interests">
        <Label>Select your interests</Label>
        <Checkbox value="coding">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>Coding</Label>
          </Checkbox.Content>
        </Checkbox>
        <Checkbox value="design">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>Design</Label>
          </Checkbox.Content>
        </Checkbox>
      </CheckboxGroup>
    </Stage>
  );
}

function GroupCustomIndicatorSplit() {
  return (
    <Stage>
      <CheckboxGroup name="features">
        <Label>Features</Label>
        <Description>Select the features you want</Description>
        <Checkbox value="notifications">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator>
                {({ isSelected }) => (isSelected() ? <Text class="text-sm">✕</Text> : null)}
              </Checkbox.Indicator>
            </Checkbox.Control>
            Email notifications
          </Checkbox.Content>
          <Description>Receive updates via email</Description>
        </Checkbox>
        <Checkbox value="newsletter">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator>
                {({ isSelected }) => (isSelected() ? <Text class="text-sm">✕</Text> : null)}
              </Checkbox.Indicator>
            </Checkbox.Control>
            Newsletter
          </Checkbox.Content>
          <Description>Get weekly newsletters</Description>
        </Checkbox>
      </CheckboxGroup>
    </Stage>
  );
}

const ALL_OPTIONS = ["coding", "design", "writing"];

function GroupIndeterminate() {
  const selected = signal<string[]>(["coding"]);

  return (
    <Stage>
      <Checkbox
        isIndeterminate={selected().length > 0 && selected().length < ALL_OPTIONS.length}
        isSelected={selected().length === ALL_OPTIONS.length}
        name="select-all"
        onChange={(isSelected) => selected.set(isSelected ? ALL_OPTIONS : [])}
      >
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Select all
        </Checkbox.Content>
      </Checkbox>
      <CheckboxGroup value={selected()} onChange={(value) => selected.set(value)}>
        <Checkbox value="coding">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Coding
          </Checkbox.Content>
        </Checkbox>
        <Checkbox value="design">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Design
          </Checkbox.Content>
        </Checkbox>
        <Checkbox value="writing">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Writing
          </Checkbox.Content>
        </Checkbox>
      </CheckboxGroup>
    </Stage>
  );
}

function GroupRequired() {
  return (
    <Stage>
      <CheckboxGroup isRequired name="preferences">
        <Label>Preferences</Label>
        <Description>Select at least one preference</Description>
        <Checkbox value="email">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Email notifications
          </Checkbox.Content>
        </Checkbox>
        <Checkbox value="sms">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            SMS notifications
          </Checkbox.Content>
        </Checkbox>
        <Checkbox value="push">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Push notifications
          </Checkbox.Content>
        </Checkbox>
        <FieldError>Please select at least one notification method.</FieldError>
      </CheckboxGroup>
    </Stage>
  );
}

function GroupControlled() {
  const selected = signal<string[]>(["coding", "design"]);

  return (
    <Stage>
      <CheckboxGroup name="skills" value={selected()} onChange={(value) => selected.set(value)}>
        <Label>Your skills</Label>
        <Checkbox value="coding">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Coding
          </Checkbox.Content>
        </Checkbox>
        <Checkbox value="design">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Design
          </Checkbox.Content>
        </Checkbox>
        <Checkbox value="writing">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Writing
          </Checkbox.Content>
        </Checkbox>
      </CheckboxGroup>
      <Button testID="clear" onPress={() => selected.set([])}>
        Clear
      </Button>
      <Text>{`Selected: ${selected().join(", ") || "None"}`}</Text>
    </Stage>
  );
}

export const checkboxScenarios: Record<string, Component> = {
  "checkbox/default": Default,
  "checkbox/variants": Variants,
  "checkbox/with-description": WithDescription,
  "checkbox/with-custom-indicator.split": WithCustomIndicatorSplit,
  "checkbox/indeterminate": Indeterminate,
  "checkbox/control-only": ControlOnly,
  "checkbox/disabled": Disabled,
  "checkbox/controlled": Controlled,
  "checkbox/render-props.split": RenderPropsSplit,
  "checkbox/invalid": Invalid,
  "checkbox/validation": Validation,
  "checkbox/full-rounded": FullRounded,
  "checkbox/features-and-add-ons": FeaturesAndAddOns,
  "checkbox/group-default": GroupDefault,
  "checkbox/group-labels": GroupLabels,
  "checkbox/group-custom-indicator.split": GroupCustomIndicatorSplit,
  "checkbox/group-indeterminate": GroupIndeterminate,
  "checkbox/group-required": GroupRequired,
  "checkbox/group-controlled": GroupControlled,
};
