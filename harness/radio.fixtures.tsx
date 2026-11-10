import { host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Description, FieldError, Label, Radio, RadioGroup } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only Radio / RadioGroup fixtures (port sheet 4b), not shared scenarios.
 *
 * Every case is built from HeroUI's public API and records callbacks through
 * `probe`, so the test reads them back from Storage. Each item renders a marker
 * carrying its own name ("Dogs:selected" / "Dogs:unselected"): aria-checked has
 * no NSH query, so the marker is the selected state made readable, and
 * `harness/tests/testers/radio.ts` reads it back as the selected radio's name.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case picks the case:
 *   log             Plan (Basic a / Premium b), `default` (default "a"),
 *                   `disabled`, `disabledValue`; onChange, per-item
 *                   onFocus / onBlur and the "Selected: …" text from the
 *                   group's `state` accessor
 *   pets            Favorite Pet (Dogs / Cats / Dragons); params: `label`,
 *                   `ariaLabel`, `description`, `default`, `disabled`
 *                   (true / false), `readonly`, `required`, `invalid`,
 *                   `error`, `disabledValue`, `controlTestID`
 *   controlled      Pets bound to a signal that starts at cats; onChange only
 *                   records, a `force` view sets it to dogs
 *   controlled-state  the same controlled group, printing selectedValue and
 *                   defaultSelectedValue through the group's `state` accessor
 *   set-value       Pets starting at cats, with `clear` (setSelectedValue(null))
 *                   and `pick` (setSelectedValue("dragons")) views; params:
 *                   `disabled`, `readonly`
 *   null-default    Pets with defaultValue={null}
 *   layout          Plan with two items whose roots report onLayout; params:
 *                   `orientation`
 *   without-content-label  one item named by aria-label, Content holds no text
 *   item-description       Dogs with a Description beside its Content
 *   indicator       one Cats radio whose Indicator paints a mark when selected
 *   state           the group's render prop prints selectedValue,
 *                   defaultSelectedValue, lastFocusedValue and the four state
 *                   bits
 *   control-children       Radio.Control given a bare string and a bare number
 *   validate-array  a group whose validate() returns two messages (X-005)
 */

type Option = { value: string; label: string };

const PLAN: Option[] = [
  { value: "a", label: "Basic" },
  { value: "b", label: "Premium" },
];

const PETS: Option[] = [
  { value: "dogs", label: "Dogs" },
  { value: "cats", label: "Cats" },
  { value: "dragons", label: "Dragons" },
];

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function textParam(name: string): string | undefined {
  const value = host.params[name];

  return typeof value === "string" ? value : undefined;
}

function boolParam(name: string): boolean | undefined {
  const value = host.params[name];

  return typeof value === "boolean" ? value : undefined;
}

function layoutProbe(value: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      value,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/* -------------------------------------------------------------------------------------------------
 * Item and group building blocks
 * -----------------------------------------------------------------------------------------------*/

function Item(props: {
  option: Option;
  disabled?: boolean;
  description?: string;
  controlTestID?: string;
  layout?: boolean;
}) {
  return (
    <Radio
      aria-label={props.option.label}
      isDisabled={props.disabled}
      onBlur={() => probe("onBlur")(props.option.value)}
      onFocus={() => probe("onFocus")(props.option.value)}
      onLayout={props.layout ? layoutProbe(props.option.value) : undefined}
      value={props.option.value}
    >
      <Radio.Content>
        {({ isSelected }) => (
          <View class="flex-row items-center gap-3">
            <Radio.Control testID={props.controlTestID}>
              <Radio.Indicator />
            </Radio.Control>
            <Text>{props.option.label}</Text>
            <Text>{`${props.option.label}:${isSelected() ? "selected" : "unselected"}`}</Text>
          </View>
        )}
      </Radio.Content>
      {props.description ? <Description>{props.description}</Description> : null}
    </Radio>
  );
}

type GroupProps = {
  options: Option[];
  label?: string;
  ariaLabel?: string;
  description?: string;
  defaultValue?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  invalid?: boolean;
  error?: string;
  variant?: "primary" | "secondary";
  orientation?: "horizontal" | "vertical";
  disabledValue?: string;
  controlTestID?: string;
  layout?: boolean;
};

function groupBody(props: GroupProps) {
  const nodes: JSX.Element[] = [];

  if (props.label) nodes.push(<Label>{props.label}</Label>);
  if (props.description) nodes.push(<Description>{props.description}</Description>);

  for (const option of props.options) {
    nodes.push(
      <Item
        controlTestID={option.value === "dragons" ? props.controlTestID : undefined}
        disabled={option.value === props.disabledValue}
        layout={props.layout}
        option={option}
      />,
    );
  }

  if (props.error) nodes.push(<FieldError>{props.error}</FieldError>);

  return nodes;
}

function groupAttrs(props: GroupProps) {
  return {
    "aria-label": props.ariaLabel,
    defaultValue: props.defaultValue,
    isDisabled: props.disabled,
    isInvalid: props.invalid,
    isReadOnly: props.readonly,
    isRequired: props.required,
    onChange: probe("onChange"),
    orientation: props.orientation,
    variant: props.variant,
  };
}

function Group(props: GroupProps) {
  return <RadioGroup {...groupAttrs(props)}>{groupBody(props)}</RadioGroup>;
}

function StateGroup(props: GroupProps & { showSelected?: boolean; showState?: boolean }) {
  return (
    <RadioGroup {...groupAttrs(props)}>
      {({ state }) => (
        <View class="flex flex-col gap-2">
          {props.showSelected ? (
            <Text>{`Selected: ${state.selectedValue() ?? "none"}`}</Text>
          ) : null}
          {props.showState ? (
            <View class="flex flex-col gap-1">
              <Text>{`selected:${state.selectedValue() ?? "none"}`}</Text>
              <Text>{`default:${state.defaultSelectedValue() ?? "none"}`}</Text>
              <Text>{`last:${state.lastFocusedValue() ?? "none"}`}</Text>
              <Text>{`disabled:${state.isDisabled() ? "yes" : "no"}`}</Text>
              <Text>{`readonly:${state.isReadOnly() ? "yes" : "no"}`}</Text>
              <Text>{`required:${state.isRequired() ? "yes" : "no"}`}</Text>
              <Text>{`invalid:${state.isInvalid() ? "yes" : "no"}`}</Text>
            </View>
          ) : null}
          {groupBody(props)}
        </View>
      )}
    </RadioGroup>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Behavior cases
 * -----------------------------------------------------------------------------------------------*/

function LogCase() {
  return (
    <Stage>
      <StateGroup
        defaultValue={textParam("default") ?? "a"}
        disabled={boolParam("disabled")}
        disabledValue={textParam("disabledValue")}
        label="Plan"
        options={PLAN}
        showSelected
      />
      <View testID="away" class="size-8 bg-default" />
    </Stage>
  );
}

function PetsCase() {
  return (
    <Stage>
      <Group
        ariaLabel={textParam("ariaLabel")}
        defaultValue={textParam("default")}
        description={textParam("description")}
        disabled={boolParam("disabled")}
        disabledValue={textParam("disabledValue")}
        error={textParam("error")}
        invalid={boolParam("invalid")}
        label={textParam("label") ?? "Favorite Pet"}
        options={PETS}
        readonly={boolParam("readonly")}
        required={boolParam("required")}
        controlTestID={textParam("controlTestID")}
      />
      <View testID="away" class="size-8 bg-default" />
    </Stage>
  );
}

function ControlledCase() {
  const value = signal("cats");

  return (
    <Stage>
      <RadioGroup aria-label="Favorite Pet" onChange={probe("onChange")} value={value()}>
        {PETS.map((option) => (
          <Item option={option} />
        ))}
      </RadioGroup>
      <View
        class="px-3 py-1 bg-default"
        onPress={() => value.set("dogs")}
        role="button"
        testID="force"
      >
        <Text>force</Text>
      </View>
    </Stage>
  );
}

function LayoutCase() {
  return (
    <Stage>
      <Group
        label="Plan"
        layout
        options={PLAN}
        orientation={textParam("orientation") === "horizontal" ? "horizontal" : "vertical"}
      />
    </Stage>
  );
}

function ControlledStateCase() {
  const value = signal<string | null>("cats");

  return (
    <Stage>
      <RadioGroup aria-label="Favorite Pet" onChange={probe("onChange")} value={value()}>
        {({ state }) => (
          <View class="flex flex-col gap-2">
            <Text>{`selected:${state.selectedValue() ?? "none"}`}</Text>
            <Text>{`default:${state.defaultSelectedValue() ?? "none"}`}</Text>
            {groupBody({ options: PETS })}
          </View>
        )}
      </RadioGroup>
      <View
        class="px-3 py-1 bg-default"
        onPress={() => value.set("dogs")}
        role="button"
        testID="force"
      >
        <Text>force</Text>
      </View>
    </Stage>
  );
}

function SetValueCase() {
  return (
    <Stage>
      <RadioGroup
        aria-label="Favorite Pet"
        defaultValue="cats"
        isDisabled={boolParam("disabled")}
        isReadOnly={boolParam("readonly")}
      >
        {({ state }) => (
          <View class="flex flex-col gap-2">
            <Text>{`selected:${state.selectedValue() ?? "none"}`}</Text>
            <View class="flex-row gap-2">
              <View
                class="px-3 py-1 bg-default"
                onPress={() => state.setSelectedValue(null)}
                role="button"
                testID="clear"
              >
                <Text>clear</Text>
              </View>
              <View
                class="px-3 py-1 bg-default"
                onPress={() => state.setSelectedValue("dragons")}
                role="button"
                testID="pick"
              >
                <Text>pick</Text>
              </View>
            </View>
            {groupBody({ options: PETS })}
          </View>
        )}
      </RadioGroup>
    </Stage>
  );
}

function NullDefaultCase() {
  return (
    <Stage>
      <RadioGroup aria-label="Favorite Pet" defaultValue={null}>
        {groupBody({ options: PETS })}
      </RadioGroup>
    </Stage>
  );
}

function ValidateArrayCase() {
  return (
    <Stage>
      <RadioGroup
        defaultValue="dogs"
        name="plan"
        validate={() => ["Pick a plan", "Confirm the plan"]}
        validationBehavior="aria"
      >
        <Label>Favorite Pet</Label>
        {groupBody({ options: PETS })}
        <FieldError />
      </RadioGroup>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Field cases
 * -----------------------------------------------------------------------------------------------*/

function WithoutContentLabelCase() {
  return (
    <Stage>
      <RadioGroup aria-label="Favorite Pet">
        <Radio aria-label="Label" value="dogs">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
          </Radio.Content>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

function ItemDescriptionCase() {
  return (
    <Stage>
      <RadioGroup aria-label="Favorite Pet">
        <Item description="Description" option={{ value: "dogs", label: "Dogs" }} />
      </RadioGroup>
    </Stage>
  );
}

function IndicatorCase() {
  return (
    <Stage>
      <RadioGroup aria-label="Favorite Pet" onChange={probe("onChange")}>
        <Radio aria-label="Cats" value="cats">
          <Radio.Content>
            {({ isSelected }) => (
              <View class="flex-row items-center gap-3">
                <Radio.Control>
                  <Radio.Indicator>
                    {({ isSelected }) => (isSelected() ? <Text>mark</Text> : null)}
                  </Radio.Indicator>
                </Radio.Control>
                <Text>Cats</Text>
                <Text>{`Cats:${isSelected() ? "selected" : "unselected"}`}</Text>
              </View>
            )}
          </Radio.Content>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Render prop and part-shape cases
 * -----------------------------------------------------------------------------------------------*/

function StateCase() {
  return (
    <Stage>
      <StateGroup defaultValue="cats" label="Favorite Pet" options={PETS} showState />
    </Stage>
  );
}

function ControlChildrenCase() {
  return (
    <Stage>
      <RadioGroup aria-label="Plan" defaultValue="a">
        <Radio aria-label="Basic" value="a">
          <Radio.Content>
            <View class="flex-row items-center gap-3">
              <Radio.Control>custom</Radio.Control>
              <Text>Basic</Text>
            </View>
          </Radio.Content>
        </Radio>
        <Radio aria-label="Premium" value="b">
          <Radio.Content>
            <View class="flex-row items-center gap-3">
              <Radio.Control>{7}</Radio.Control>
              <Text>Premium</Text>
            </View>
          </Radio.Content>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "log");

  if (name === "pets") return <PetsCase />;
  if (name === "controlled") return <ControlledCase />;
  if (name === "layout") return <LayoutCase />;
  if (name === "controlled-state") return <ControlledStateCase />;
  if (name === "set-value") return <SetValueCase />;
  if (name === "null-default") return <NullDefaultCase />;
  if (name === "validate-array") return <ValidateArrayCase />;
  if (name === "without-content-label") return <WithoutContentLabelCase />;
  if (name === "item-description") return <ItemDescriptionCase />;
  if (name === "indicator") return <IndicatorCase />;
  if (name === "state") return <StateCase />;
  if (name === "control-children") return <ControlChildrenCase />;

  return <LogCase />;
}

mount(Fixture);
