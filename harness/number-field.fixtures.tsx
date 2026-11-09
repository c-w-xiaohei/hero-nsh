import { host, mount, signal, Text, View } from "nsh";
import { Description, FieldError, Label, NumberField } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only NumberField fixture (port sheet 4b.3). The shared scenarios cover
 * the stories, which carry no callbacks and no test ids; every regression case
 * that reads a callback back, counts a text or targets one part by `testID`
 * opens this file instead.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape:
 *   parts              five parts, each with a testID: Label "Width", both
 *                      buttons, defaultValue 10, minValue 0 (T-001, T-002)
 *   label              Label "Favorite Number" and nothing else (T-014)
 *   aria-label         no Label; the root's aria-label names the input (T-017)
 *   composition        params hasDecrement / hasIncrement pick which buttons
 *                      render, defaultValue 11 (T-003)
 *   log                Label + Input + both buttons; onChange / onFocus /
 *                      onBlur probes. Optional params defaultValue, minValue,
 *                      maxValue, step (T-006, T-011, T-033, T-038…T-049)
 *   controlled         params initial (default 10) lives in a signal; onChange
 *                      records and never writes back, two external buttons set
 *                      0 and 2048 (T-012)
 *   invalid            isInvalid, defaultValue 9, maxValue 10, minValue 0,
 *                      FieldError "Max is 10" (T-008, T-028, T-032)
 *   disabled           isDisabled, Label "Width", onChange probe (T-009,
 *                      T-030, T-035)
 *   readonly           isReadOnly, defaultValue 10 (T-031, T-036)
 *   required           isRequired, Label "Width" (T-029, T-034)
 *   description        Label + Input + Description "Description" (T-019)
 *   description-error  isInvalid + Label + Input + Description "Description" +
 *                      FieldError "ErrorMessage" (T-022)
 *   valid-error        FieldError "ErrorMessage" on a valid field (T-023)
 *   focus              Input and Group className functions record their
 *                      accessors, Input onFocus probe (T-001, T-010)
 *   format             defaultValue 1000, onChange probe (T-044…T-046)
 *   step               step 4, params defaultValue, onChange probe (T-038…T-041,
 *                      T-047, T-048)
 *   bounds             minValue -100, maxValue 100, defaultValue 0 (T-042,
 *                      T-043)
 *   decimal            defaultValue 1.1, or `value` when params controlled is
 *                      true; locale comes from `open` (T-050…T-053)
 *   cleared            no default value, onChange probe: the clearing contract
 *                      of port sheet §2 / §5
 */

type FieldProps = {
  label?: string;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  buttons?: boolean;
  onChange?: (value: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

/* Label + group + input (+ both buttons). `testID` names the parts the port
 * sheet's cases target: nf-group, nf-input, nf-inc, nf-dec. */
function Field(props: FieldProps) {
  return (
    <NumberField
      defaultValue={props.defaultValue}
      isDisabled={props.isDisabled}
      isInvalid={props.isInvalid}
      isReadOnly={props.isReadOnly}
      isRequired={props.isRequired}
      maxValue={props.maxValue}
      minValue={props.minValue}
      step={props.step}
      onChange={props.onChange}
    >
      {props.label ? <Label>{props.label}</Label> : null}
      <NumberField.Group testID="nf-group">
        {props.buttons === false ? null : <NumberField.DecrementButton testID="nf-dec" />}
        <NumberField.Input testID="nf-input" onBlur={props.onBlur} onFocus={props.onFocus} />
        {props.buttons === false ? null : <NumberField.IncrementButton testID="nf-inc" />}
      </NumberField.Group>
    </NumberField>
  );
}

function numberParam(name: string): number | undefined {
  const raw = host.params[name];

  if (raw === undefined) return undefined;

  return typeof raw === "number" ? raw : Number(raw);
}

function PartsCase() {
  return (
    <Stage>
      <NumberField defaultValue={10} minValue={0} name="width">
        <Label>Width</Label>
        <NumberField.Group testID="nf-group">
          <NumberField.DecrementButton testID="nf-dec" />
          <NumberField.Input testID="nf-input" />
          <NumberField.IncrementButton testID="nf-inc" />
        </NumberField.Group>
      </NumberField>
    </Stage>
  );
}

function LabelCase() {
  return (
    <Stage>
      <NumberField name="favorite-number">
        <Label>Favorite Number</Label>
        <NumberField.Group testID="nf-group">
          <NumberField.Input testID="nf-input" />
        </NumberField.Group>
      </NumberField>
    </Stage>
  );
}

function AriaLabelCase() {
  return (
    <Stage>
      <NumberField aria-label="My Favorite Number" name="favorite-number">
        <NumberField.Group testID="nf-group">
          <NumberField.Input testID="nf-input" />
        </NumberField.Group>
      </NumberField>
    </Stage>
  );
}

function CompositionCase() {
  const hasDecrement = host.params.hasDecrement === true;
  const hasIncrement = host.params.hasIncrement === true;

  return (
    <Stage>
      <NumberField defaultValue={11} name="customer-number">
        <Label>Customer number</Label>
        <NumberField.Group testID="nf-group">
          {hasDecrement ? <NumberField.DecrementButton testID="nf-dec" /> : null}
          <NumberField.Input testID="nf-input" />
          {hasIncrement ? <NumberField.IncrementButton testID="nf-inc" /> : null}
        </NumberField.Group>
      </NumberField>
    </Stage>
  );
}

function LogCase() {
  return (
    <Stage>
      <Field
        defaultValue={numberParam("defaultValue")}
        label="Width"
        maxValue={numberParam("maxValue")}
        minValue={numberParam("minValue")}
        onBlur={probe("onBlur")}
        onChange={probe("onChange")}
        onFocus={probe("onFocus")}
        step={numberParam("step")}
      />
    </Stage>
  );
}

function ControlledCase() {
  const value = signal(numberParam("initial") ?? 10);

  return (
    <Stage>
      <NumberField minValue={0} name="width" onChange={probe("onChange")} value={value()}>
        <Label>Width</Label>
        <NumberField.Group testID="nf-group">
          <NumberField.DecrementButton testID="nf-dec" />
          <NumberField.Input testID="nf-input" />
          <NumberField.IncrementButton testID="nf-inc" />
        </NumberField.Group>
      </NumberField>
      <View class="flex-row gap-2">
        <View testID="set-zero" role="button" class="bg-default px-3 py-1" onPress={() => value.set(0)}>
          <Text>Reset to 0</Text>
        </View>
        <View
          testID="set-max"
          role="button"
          class="bg-default px-3 py-1"
          onPress={() => value.set(2048)}
        >
          <Text>Set to 2048</Text>
        </View>
      </View>
    </Stage>
  );
}

function InvalidCase() {
  return (
    <Stage>
      <NumberField
        isInvalid
        defaultValue={9}
        maxValue={10}
        minValue={0}
        name="width"
        onChange={probe("onChange")}
      >
        <Label>Width</Label>
        <NumberField.Group testID="nf-group">
          <NumberField.DecrementButton testID="nf-dec" />
          <NumberField.Input testID="nf-input" />
          <NumberField.IncrementButton testID="nf-inc" />
        </NumberField.Group>
        <FieldError>Max is 10</FieldError>
      </NumberField>
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <Field defaultValue={10} isDisabled label="Width" onChange={probe("onChange")} />
    </Stage>
  );
}

function ReadonlyCase() {
  return (
    <Stage>
      <Field defaultValue={10} isReadOnly label="Width" onChange={probe("onChange")} />
    </Stage>
  );
}

function RequiredCase() {
  return (
    <Stage>
      <Field isRequired label="Width" />
    </Stage>
  );
}

function DescriptionCase() {
  return (
    <Stage>
      <NumberField name="width">
        <Label>Width</Label>
        <NumberField.Group testID="nf-group">
          <NumberField.Input testID="nf-input" />
        </NumberField.Group>
        <Description>Description</Description>
      </NumberField>
    </Stage>
  );
}

function DescriptionErrorCase() {
  return (
    <Stage>
      <NumberField isInvalid name="width">
        <Label>Width</Label>
        <NumberField.Group testID="nf-group">
          <NumberField.Input testID="nf-input" />
        </NumberField.Group>
        <Description>Description</Description>
        <FieldError>ErrorMessage</FieldError>
      </NumberField>
    </Stage>
  );
}

function ValidErrorCase() {
  return (
    <Stage>
      <NumberField name="width">
        <Label>Width</Label>
        <NumberField.Group testID="nf-group">
          <NumberField.Input testID="nf-input" />
        </NumberField.Group>
        <FieldError>ErrorMessage</FieldError>
      </NumberField>
    </Stage>
  );
}

function FocusCase() {
  const recordGroup = probe("group-class");
  const recordInput = probe("input-class");

  return (
    <Stage>
      <NumberField defaultValue={10} minValue={0} name="width">
        <Label>Width</Label>
        <NumberField.Group
          testID="nf-group"
          className={({ isFocusWithin, isFocusVisible }) => {
            recordGroup({
              isFocusWithin: isFocusWithin(),
              isFocusVisible: isFocusVisible(),
            });

            return "";
          }}
        >
          <NumberField.Input
            testID="nf-input"
            onFocus={probe("onFocus")}
            className={({ isFocused, isFocusVisible }) => {
              recordInput({
                isFocused: isFocused(),
                isFocusVisible: isFocusVisible(),
              });

              return "";
            }}
          />
        </NumberField.Group>
      </NumberField>
    </Stage>
  );
}

function FormatCase() {
  return (
    <Stage>
      <Field defaultValue={1000} label="Width" onChange={probe("onChange")} />
    </Stage>
  );
}

function StepCase() {
  return (
    <Stage>
      <Field
        defaultValue={numberParam("defaultValue") ?? 0}
        label="Width"
        onChange={probe("onChange")}
        step={4}
      />
    </Stage>
  );
}

function BoundsCase() {
  return (
    <Stage>
      <Field defaultValue={0} label="Width" maxValue={100} minValue={-100} />
    </Stage>
  );
}

function DecimalCase() {
  const controlled = host.params.controlled === true;

  if (controlled) {
    return (
      <Stage>
        <NumberField minValue={0} name="width" value={1.1}>
          <Label>Width</Label>
          <NumberField.Group testID="nf-group">
            <NumberField.DecrementButton testID="nf-dec" />
            <NumberField.Input testID="nf-input" />
            <NumberField.IncrementButton testID="nf-inc" />
          </NumberField.Group>
        </NumberField>
      </Stage>
    );
  }

  return (
    <Stage>
      <Field defaultValue={1.1} label="Width" minValue={0} />
    </Stage>
  );
}

function ClearedCase() {
  return (
    <Stage>
      <Field label="Width" onChange={probe("onChange")} />
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "parts");

  if (name === "label") return <LabelCase />;
  if (name === "aria-label") return <AriaLabelCase />;
  if (name === "composition") return <CompositionCase />;
  if (name === "log") return <LogCase />;
  if (name === "controlled") return <ControlledCase />;
  if (name === "invalid") return <InvalidCase />;
  if (name === "disabled") return <DisabledCase />;
  if (name === "readonly") return <ReadonlyCase />;
  if (name === "required") return <RequiredCase />;
  if (name === "description") return <DescriptionCase />;
  if (name === "description-error") return <DescriptionErrorCase />;
  if (name === "valid-error") return <ValidErrorCase />;
  if (name === "focus") return <FocusCase />;
  if (name === "format") return <FormatCase />;
  if (name === "step") return <StepCase />;
  if (name === "bounds") return <BoundsCase />;
  if (name === "decimal") return <DecimalCase />;
  if (name === "cleared") return <ClearedCase />;

  return <PartsCase />;
}

mount(Fixture);
