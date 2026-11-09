import { Text } from "nsh";
import { Description, FieldError, Label, Switch } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared scenarios for Switch, written with HeroUI's API only.
 *
 * Split scenarios (SOP 3.3.3, port sheet 4b): the reference package passes plain
 * booleans to a render prop, this library passes accessors (D17), so the
 * scenarios that use one are written twice and carry the `.split` suffix.
 * `switch/rtl` needs `Stage`'s `direction` prop; the layout cases read geometry
 * through `onLayout` in the NSH-only fixture instead.
 */

/* -------------------------------------------------------------------------------------------------
 * Field examples
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <Switch>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Enable notifications
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

function Basic() {
  return (
    <Stage>
      <Switch>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label>Enable notifications</Label>
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

function Selected() {
  return (
    <Stage>
      <Switch defaultSelected>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Enable notifications
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <Switch isDisabled>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Enable notifications
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

function DisabledSelected() {
  return (
    <Stage>
      <Switch aria-label="Enable notifications" defaultSelected isDisabled>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

function Sizes() {
  return (
    <Stage>
      <Switch size="sm">
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Small
        </Switch.Content>
      </Switch>
      <Switch size="md">
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Medium
        </Switch.Content>
      </Switch>
      <Switch size="lg">
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Large
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

function LabelBefore() {
  return (
    <Stage>
      <Switch>
        <Switch.Content>
          Enable notifications
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

function WithDescription() {
  return (
    <Stage>
      <Switch>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Public profile
        </Switch.Content>
        <Description>Allow others to see your profile information</Description>
      </Switch>
    </Stage>
  );
}

function Invalid() {
  return (
    <Stage>
      <Switch isInvalid isRequired name="notifications">
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Enable notifications
        </Switch.Content>
        <FieldError>You must enable notifications to continue</FieldError>
      </Switch>
    </Stage>
  );
}

function Validation() {
  return (
    <Stage>
      <Switch
        isRequired
        name="terms-switch"
        validate={(isSelected) => (isSelected ? true : "You must accept to continue")}
      >
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Accept terms
        </Switch.Content>
        <FieldError />
      </Switch>
    </Stage>
  );
}

function WithoutLabel() {
  return (
    <Stage>
      <Switch aria-label="Enable notifications">
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

function TestId() {
  return (
    <Stage>
      <Switch testID="notifications">
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Enable notifications
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Render props (D17: accessors instead of plain booleans)
 * -----------------------------------------------------------------------------------------------*/

function RenderPropsSplit() {
  return (
    <Stage>
      <Switch>
        {({ isSelected }) => (
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Text>{isSelected() ? "Enabled" : "Disabled"}</Text>
          </Switch.Content>
        )}
      </Switch>
    </Stage>
  );
}

function CustomStylesSplit() {
  return (
    <Stage>
      <Switch aria-label="Power">
        {({ isSelected }) => (
          <Switch.Content>
            <Switch.Control
              className={`h-[31px] w-[51px] bg-blue-500 ${
                isSelected() ? "bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]" : ""
              }`}
            >
              <Switch.Thumb
                className={`size-[27px] bg-white shadow-sm ${isSelected() ? "ms-[22px] shadow-lg" : ""}`}
              >
                <Switch.Icon>
                  <Text class={`text-sm ${isSelected() ? "text-cyan-600" : "text-blue-600"}`}>
                    {isSelected() ? "✓" : "⏻"}
                  </Text>
                </Switch.Icon>
              </Switch.Thumb>
            </Switch.Control>
          </Switch.Content>
        )}
      </Switch>
    </Stage>
  );
}

const ICONS = [
  { key: "check", off: "○", on: "✓", controlClass: "bg-green-500", iconClass: "text-green-600" },
  { key: "dark-mode", off: "☾", on: "☀", controlClass: "", iconClass: "" },
  { key: "notification", off: "–", on: "●", controlClass: "bg-purple-500", iconClass: "text-purple-600" },
];

function IconsSplit() {
  return (
    <Stage>
      {ICONS.map((icon) => (
        <Switch aria-label={icon.key} defaultSelected size="lg">
          {({ isSelected }) => (
            <Switch.Content>
              <Switch.Control className={isSelected() ? icon.controlClass : ""}>
                <Switch.Thumb>
                  <Switch.Icon>
                    <Text class={`text-xs ${isSelected() ? `opacity-100 ${icon.iconClass}` : "opacity-70"}`}>
                      {isSelected() ? icon.on : icon.off}
                    </Text>
                  </Switch.Icon>
                </Switch.Thumb>
              </Switch.Control>
            </Switch.Content>
          )}
        </Switch>
      ))}
    </Stage>
  );
}

/*
 * T-008 reads the thumb's `text-accent` through the one nested Text: the color
 * of the mark is the selected state made visible, since data-selected has no
 * NSH channel. Root's render prop puts On / Off beside it.
 */
function ThumbMarkSplit() {
  return (
    <Stage>
      <Switch aria-label="Enable notifications">
        {({ isSelected }) => (
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb>
                <Text testID="thumb-mark">•</Text>
              </Switch.Thumb>
            </Switch.Control>
            <Text>{isSelected() ? "On" : "Off"}</Text>
          </Switch.Content>
        )}
      </Switch>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Direction
 * -----------------------------------------------------------------------------------------------*/

function Rtl() {
  return (
    <Stage direction="rtl">
      <Switch defaultSelected>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Selected
        </Switch.Content>
      </Switch>
      <Switch>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Unselected
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

export const switchScenarios: Record<string, Component> = {
  "switch/default": Default,
  "switch/basic": Basic,
  "switch/selected": Selected,
  "switch/disabled": Disabled,
  "switch/disabled-selected": DisabledSelected,
  "switch/sizes": Sizes,
  "switch/label-before": LabelBefore,
  "switch/description": WithDescription,
  "switch/invalid": Invalid,
  "switch/validation": Validation,
  "switch/without-label": WithoutLabel,
  "switch/test-id": TestId,
  "switch/render-props.split": RenderPropsSplit,
  "switch/custom-styles.split": CustomStylesSplit,
  "switch/icons.split": IconsSplit,
  "switch/thumb-mark.split": ThumbMarkSplit,
  "switch/rtl": Rtl,
};
