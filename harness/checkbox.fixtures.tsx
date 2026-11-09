import { host, mount, signal, Text, View } from "nsh";
import { Checkbox, CheckboxGroup, Description, FieldError, Label } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only Checkbox / CheckboxGroup fixtures (port sheet 4b), not shared
 * scenarios. Every case is built from HeroUI's public API and records
 * callbacks through `probe`, so the test reads them back from Storage.
 *
 * The visible state markers replace what upstream reads from a DOM input or a
 * `data-*` attribute: `Checked` / `Unchecked` for `checked`,
 * `Mixed` / `NoMixed` for `indeterminate`, `FocusRing` / `NoRing` for
 * `data-focus-visible`, and the selected-item `✓` in the group cases for
 * `aria-checked`.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case picks the case:
 *   log                    uncontrolled, onChange + Content focus probes, both
 *                          markers (the default)
 *   controlled             isSelected bound to a signal; onChange records only.
 *                          host.params.start starts it selected; `force` sets it
 *   default-selected       defaultSelected
 *   indeterminate          isIndeterminate, uncontrolled
 *   indeterminate-toggle   isIndeterminate and isSelected on signals, with
 *                          `clear-indeterminate` and `select` buttons (T-009)
 *   disabled               isDisabled
 *   readonly               isReadOnly with isSelected true
 *   readonly-uncontrolled  isReadOnly starting off
 *   invalid                isInvalid with a Label and a FieldError message
 *   valid-error            a FieldError message on a valid field
 *   required               isRequired with a Label (the asterisk)
 *   aria-label             aria-label only, no visible label
 *   control-click          Control has testID="control" (pressing a child view)
 *   indicator              a custom Indicator draws a ✓ only when selected
 *   visible-label          a Label inside Content
 *   item-description       a Label inside Content and a Description beside it
 *   test-id                testID="terms" on the root (T-004)
 *   group-log              a group with two items, group and item onChange
 *                          probes, a `✓` marker beside each selected item
 *   group-disabled         a disabled group
 *   group-invalid          an invalid group with a FieldError
 */

const NAME = "Accept terms";

function marks(props: { isSelected: () => boolean; isIndeterminate?: () => boolean }) {
  return (
    <View class="flex-row items-center gap-2">
      <Text>{props.isSelected() ? "Checked" : "Unchecked"}</Text>
      {props.isIndeterminate ? (
        <Text>{props.isIndeterminate() ? "Mixed" : "NoMixed"}</Text>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Behavior cases
 * -----------------------------------------------------------------------------------------------*/

function LogCase() {
  return (
    <Stage>
      <Checkbox aria-label={NAME} onChange={probe("onChange")}>
        <Checkbox.Content onBlur={probe("onBlur")} onFocus={probe("onFocus")}>
          {({ isSelected, isFocusVisible }) => (
            <View class="flex-row items-center gap-3">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {marks({ isSelected })}
              <Text>{isFocusVisible() ? "FocusRing" : "NoRing"}</Text>
            </View>
          )}
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function ControlledCase() {
  const value = signal(host.params.start === true);

  return (
    <Stage>
      <Checkbox aria-label={NAME} isSelected={value()} onChange={probe("onChange")}>
        <Checkbox.Content>
          {({ isSelected }) => (
            <View class="flex-row items-center gap-3">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {marks({ isSelected })}
            </View>
          )}
        </Checkbox.Content>
      </Checkbox>
      <View testID="force" role="button" class="px-3 py-1 bg-default" onPress={() => value.set(true)}>
        <Text>force</Text>
      </View>
    </Stage>
  );
}

function DefaultSelectedCase() {
  return (
    <Stage>
      <Checkbox aria-label={NAME} defaultSelected onChange={probe("onChange")}>
        <Checkbox.Content>
          {({ isSelected }) => (
            <View class="flex-row items-center gap-3">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {marks({ isSelected })}
            </View>
          )}
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function IndeterminateCase() {
  return (
    <Stage>
      <Checkbox aria-label={NAME} isIndeterminate onChange={probe("onChange")}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator>
              {({ isSelected, isIndeterminate }) => (
                <View class="flex-row items-center gap-2">
                  {marks({ isSelected, isIndeterminate })}
                </View>
              )}
            </Checkbox.Indicator>
          </Checkbox.Control>
          Accept terms
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function IndeterminateToggleCase() {
  const indeterminate = signal(true);
  const selected = signal(false);

  return (
    <Stage>
      <Checkbox
        aria-label={NAME}
        isIndeterminate={indeterminate()}
        isSelected={selected()}
        onChange={(isSelected) => selected.set(isSelected)}
      >
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator>
              {({ isSelected, isIndeterminate }) => (
                <View class="flex-row items-center gap-2">
                  {marks({ isSelected, isIndeterminate })}
                </View>
              )}
            </Checkbox.Indicator>
          </Checkbox.Control>
          Accept terms
        </Checkbox.Content>
      </Checkbox>
      <View
        testID="clear-indeterminate"
        role="button"
        class="px-3 py-1 bg-default"
        onPress={() => indeterminate.set(false)}
      >
        <Text>clear</Text>
      </View>
      <View testID="select" role="button" class="px-3 py-1 bg-default" onPress={() => selected.set(true)}>
        <Text>select</Text>
      </View>
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <Checkbox aria-label={NAME} isDisabled onChange={probe("onChange")}>
        <Checkbox.Content>
          {({ isSelected }) => (
            <View class="flex-row items-center gap-3">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {marks({ isSelected })}
            </View>
          )}
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function ReadonlyCase() {
  return (
    <Stage>
      <Checkbox aria-label={NAME} isReadOnly isSelected onChange={probe("onChange")}>
        <Checkbox.Content>
          {({ isSelected }) => (
            <View class="flex-row items-center gap-3">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {marks({ isSelected })}
            </View>
          )}
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function ReadonlyUncontrolledCase() {
  return (
    <Stage>
      <Checkbox aria-label={NAME} isReadOnly onChange={probe("onChange")}>
        <Checkbox.Content>
          {({ isSelected }) => (
            <View class="flex-row items-center gap-3">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {marks({ isSelected })}
            </View>
          )}
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function ControlClickCase() {
  return (
    <Stage>
      <Checkbox aria-label={NAME} onChange={probe("onChange")}>
        <Checkbox.Content>
          {({ isSelected }) => (
            <View class="flex-row items-center gap-3">
              <Checkbox.Control testID="control">
                <Checkbox.Indicator />
              </Checkbox.Control>
              {marks({ isSelected })}
            </View>
          )}
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function IndicatorCase() {
  return (
    <Stage>
      <Checkbox aria-label={NAME} onChange={probe("onChange")}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator>
              {({ isSelected }) => (isSelected() ? <Text testID="mark">✓</Text> : null)}
            </Checkbox.Indicator>
          </Checkbox.Control>
          Accept terms
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Field cases
 * -----------------------------------------------------------------------------------------------*/

function InvalidCase() {
  return (
    <Stage>
      <Checkbox isInvalid>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Label>Label</Label>
        </Checkbox.Content>
        <FieldError>ErrorMessage</FieldError>
      </Checkbox>
    </Stage>
  );
}

function ValidErrorCase() {
  return (
    <Stage>
      <Checkbox>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Accept terms
        </Checkbox.Content>
        <FieldError>ErrorMessage</FieldError>
      </Checkbox>
    </Stage>
  );
}

function RequiredCase() {
  return (
    <Stage>
      <Checkbox isRequired>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Label>Label</Label>
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function AriaLabelCase() {
  return (
    <Stage>
      <Checkbox aria-label="Accept">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function VisibleLabelCase() {
  return (
    <Stage>
      <Checkbox>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Label>Label</Label>
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

function ItemDescriptionCase() {
  return (
    <Stage>
      <Checkbox>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Label>Label</Label>
        </Checkbox.Content>
        <Description>Description</Description>
      </Checkbox>
    </Stage>
  );
}

function TestIdCase() {
  return (
    <Stage>
      <Checkbox testID="terms">
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Accept terms
        </Checkbox.Content>
      </Checkbox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Group cases
 * -----------------------------------------------------------------------------------------------*/

function GroupLogCase() {
  return (
    <Stage>
      <CheckboxGroup name="interests" onChange={probe("groupChange")}>
        <Label>Select your interests</Label>
        <Checkbox value="coding" onChange={probe("itemChange")}>
          {({ isSelected }) => (
            <>
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Coding
              </Checkbox.Content>
              <Text>{isSelected() ? "✓" : "·"}</Text>
            </>
          )}
        </Checkbox>
        <Checkbox value="design" onChange={probe("itemChange")}>
          {({ isSelected }) => (
            <>
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Design
              </Checkbox.Content>
              <Text>{isSelected() ? "✓" : "·"}</Text>
            </>
          )}
        </Checkbox>
      </CheckboxGroup>
    </Stage>
  );
}

function GroupDisabledCase() {
  return (
    <Stage>
      <CheckboxGroup isDisabled name="interests" onChange={probe("groupChange")}>
        <Label>Select your interests</Label>
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
      </CheckboxGroup>
    </Stage>
  );
}

function GroupInvalidCase() {
  return (
    <Stage>
      <CheckboxGroup isInvalid name="interests">
        <Label>Select your interests</Label>
        <Description>Choose all that apply</Description>
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
        <FieldError>Pick at least one</FieldError>
      </CheckboxGroup>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "log");

  if (name === "controlled") return <ControlledCase />;
  if (name === "default-selected") return <DefaultSelectedCase />;
  if (name === "indeterminate") return <IndeterminateCase />;
  if (name === "indeterminate-toggle") return <IndeterminateToggleCase />;
  if (name === "disabled") return <DisabledCase />;
  if (name === "readonly") return <ReadonlyCase />;
  if (name === "readonly-uncontrolled") return <ReadonlyUncontrolledCase />;
  if (name === "invalid") return <InvalidCase />;
  if (name === "valid-error") return <ValidErrorCase />;
  if (name === "required") return <RequiredCase />;
  if (name === "aria-label") return <AriaLabelCase />;
  if (name === "control-click") return <ControlClickCase />;
  if (name === "indicator") return <IndicatorCase />;
  if (name === "visible-label") return <VisibleLabelCase />;
  if (name === "item-description") return <ItemDescriptionCase />;
  if (name === "test-id") return <TestIdCase />;
  if (name === "group-log") return <GroupLogCase />;
  if (name === "group-disabled") return <GroupDisabledCase />;
  if (name === "group-invalid") return <GroupInvalidCase />;

  return <LogCase />;
}

mount(Fixture);
