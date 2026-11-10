import { host, mount, signal, Text, View } from "nsh";
import { Description, FieldError, Input, Label, TextArea, TextField, TextFieldContext } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only TextField / Input / TextArea fixture (port sheet 4b.3). The shared
 * scenarios cover the stories, which carry no callbacks and no test ids; every
 * regression case that reads a callback back, counts a text or targets one part
 * by `testID` opens this file instead.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape:
 *   log                uncontrolled Label + Input, onChange / onFocus / onBlur
 *                      probes, a `force` button that focuses the input
 *                      (T-004, T-024, T-046)
 *   default-value      `defaultValue="cat"`, onChange probe (T-024)
 *   controlled         `value` in a signal, onChange records and never writes
 *                      back, `set-value` sets "Ada!" (T-005, T-025)
 *   disabled           `isDisabled` + Label + Input (T-006, T-018, T-043, T-048)
 *   readonly           `isReadOnly` with an initial value (T-044, T-049)
 *   invalid            `isInvalid` + Label + Input + FieldError (T-007, T-035,
 *                      T-041, T-045)
 *   valid-error        FieldError on a valid field (T-008, T-036)
 *   description        Label + Input + Description (T-009, T-032)
 *   textarea           Label + TextArea, onChange probe (T-010, T-022)
 *   textarea-invalid   `isInvalid` + Label + TextArea + FieldError (T-041)
 *   standalone-input   `<Input aria-label="Name">` with an onChange probe
 *                      (T-014, T-017)
 *   aria-label         `<Input aria-label="My Favorite Pet">` and nothing else
 *                      (T-030)
 *   standalone-input-disabled  `<Input aria-label="Name" disabled>` (T-018)
 *   standalone-textarea        `<TextArea aria-label="Bio">` with an onChange
 *                              probe (T-019, T-022)
 *   standalone-textarea-disabled  `<TextArea aria-label="Bio" disabled>` (T-023)
 *   required           `isRequired` + Label + Input (T-042, T-047)
 *   composition        root `onCompositionChange` probe and a `compose` button
 *                      that calls the field context's composition handler
 *                      (X-001)
 *   focus              Input className / onFocus / onBlur probes (T-012)
 *   render-children.split  the children function reading `isRequired()`
 *                      (T-013)
 *   multiline          a TextArea for T-019's line break
 */

/* Label + input; the shapes the rows above share. */
function Field(props: {
  label: string;
  caseName?: string;
  defaultValue?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  error?: string;
  description?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  return (
    <TextField
      defaultValue={props.defaultValue}
      isDisabled={props.isDisabled}
      isInvalid={props.isInvalid}
      isReadOnly={props.isReadOnly}
      isRequired={props.isRequired}
      name={props.caseName ?? "name"}
      onChange={props.onChange}
    >
      <Label>{props.label}</Label>
      <Input testID="name" onBlur={props.onBlur} onFocus={props.onFocus} />
      {props.description ? <Description>{props.description}</Description> : null}
      {props.error ? <FieldError>{props.error}</FieldError> : null}
    </TextField>
  );
}

function LogCase() {
  const input = { current: undefined as { focus: () => void } | undefined };

  return (
    <Stage>
      <TextField name="name" onChange={probe("onChange")}>
        <Label>Your name</Label>
        <Input
          testID="name"
          ref={(node) => {
            input.current = node;
          }}
          onBlur={probe("onBlur")}
          onFocus={probe("onFocus")}
        />
      </TextField>
      <View
        testID="force"
        role="button"
        class="bg-default px-3 py-1"
        onPress={() => input.current?.focus()}
      >
        <Text>Focus the input</Text>
      </View>
    </Stage>
  );
}

function DefaultValueCase() {
  return (
    <Stage>
      <Field caseName="favorite-pet" defaultValue="cat" label="Favorite Pet" onChange={probe("onChange")} />
    </Stage>
  );
}

function ControlledCase() {
  const value = signal(String(host.params.initial ?? "Ada"));

  return (
    <Stage>
      <TextField name="name" value={value()} onChange={probe("onChange")}>
        <Label>Your name</Label>
        <Input testID="name" />
      </TextField>
      <View
        testID="set-value"
        role="button"
        class="bg-default px-3 py-1"
        onPress={() => value.set("Ada!")}
      >
        <Text>Set the value</Text>
      </View>
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <Field
        caseName="name"
        isDisabled
        label="Your name"
        onChange={probe("onChange")}
      />
    </Stage>
  );
}

function ReadonlyCase() {
  return (
    <Stage>
      <Field
        caseName="name"
        defaultValue="cat"
        isReadOnly
        label="Favorite Pet"
        onChange={probe("onChange")}
      />
    </Stage>
  );
}

function InvalidCase() {
  return (
    <Stage>
      <Field
        caseName="password"
        error="Password must be longer than 8 characters"
        isInvalid
        label="Password"
      />
    </Stage>
  );
}

function ValidErrorCase() {
  return (
    <Stage>
      <Field
        caseName="password"
        error="Password must be longer than 8 characters"
        label="Password"
      />
    </Stage>
  );
}

function DescriptionCase() {
  return (
    <Stage>
      <Field caseName="name" description="Visible to other users" label="Your name" />
    </Stage>
  );
}

function TextAreaCase() {
  return (
    <Stage>
      <TextField name="bio" onChange={probe("onChange")}>
        <Label>Bio</Label>
        <TextArea testID="bio" />
      </TextField>
    </Stage>
  );
}

function TextAreaInvalidCase() {
  return (
    <Stage>
      <TextField isInvalid name="bio">
        <Label>Bio</Label>
        <TextArea testID="bio" />
        <FieldError>Bio is required</FieldError>
      </TextField>
    </Stage>
  );
}

function StandaloneInputCase() {
  return (
    <Stage>
      <Input aria-label="Name" placeholder="John" testID="name" onChange={probe("onChange")} />
    </Stage>
  );
}

function AriaLabelCase() {
  return (
    <Stage>
      <Input aria-label="My Favorite Pet" testID="pet" />
    </Stage>
  );
}

function StandaloneInputDisabledCase() {
  return (
    <Stage>
      <Input aria-label="Name" disabled placeholder="John" testID="name" />
    </Stage>
  );
}

function StandaloneTextAreaCase() {
  return (
    <Stage>
      <TextArea
        aria-label="Bio"
        placeholder="Tell us about yourself"
        testID="bio"
        onChange={probe("onChange")}
      />
    </Stage>
  );
}

function StandaloneTextAreaDisabledCase() {
  return (
    <Stage>
      <TextArea aria-label="Bio" disabled placeholder="Tell us about yourself" testID="bio" />
    </Stage>
  );
}

function CompositionTrigger() {
  const field = TextFieldContext();

  return (
    <View
      testID="compose"
      role="button"
      class="bg-default px-3 py-1"
      onPress={() => {
        field?.onCompositionChange?.({ composing: true, text: "n" });
        field?.onCompositionChange?.({ composing: true, text: "ni" });
        field?.onCompositionChange?.({ composing: false, text: "" });
      }}
    >
      <Text>Compose</Text>
    </View>
  );
}

function CompositionCase() {
  return (
    <Stage>
      <TextField name="name" onCompositionChange={probe("onCompositionChange")}>
        <Label>Your name</Label>
        <Input testID="name" />
        <CompositionTrigger />
      </TextField>
    </Stage>
  );
}

function RequiredCase() {
  return (
    <Stage>
      <Field caseName="favorite-pet" isRequired label="Favorite Pet" />
    </Stage>
  );
}

function FocusCase() {
  const recordInput = probe("input-class");

  return (
    <Stage>
      <TextField name="name">
        <Label>Your name</Label>
        <Input
          testID="name"
          onBlur={probe("onBlur")}
          onFocus={probe("onFocus")}
          className={({ isFocused, isFocusVisible }) => {
            recordInput({
              isFocused: isFocused(),
              isFocusVisible: isFocusVisible(),
            });

            return "";
          }}
        />
      </TextField>
    </Stage>
  );
}

/* SOP 3.3.3: upstream's children function receives booleans, ours accessors
 * (D17), so this case is written for this side and the test is named `.split`
 * in the sheet. */
function RenderChildrenCase() {
  return (
    <Stage>
      <TextField isRequired name="name">
        {(values: { isRequired: () => boolean }) => (
          <>
            <Label>Your name</Label>
            <Input testID="name" />
            <Description>{values.isRequired() ? "Required" : "Optional"}</Description>
          </>
        )}
      </TextField>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "log");

  if (name === "default-value") return <DefaultValueCase />;
  if (name === "controlled") return <ControlledCase />;
  if (name === "disabled") return <DisabledCase />;
  if (name === "readonly") return <ReadonlyCase />;
  if (name === "invalid") return <InvalidCase />;
  if (name === "valid-error") return <ValidErrorCase />;
  if (name === "description") return <DescriptionCase />;
  if (name === "textarea") return <TextAreaCase />;
  if (name === "textarea-invalid") return <TextAreaInvalidCase />;
  if (name === "standalone-input") return <StandaloneInputCase />;
  if (name === "aria-label") return <AriaLabelCase />;
  if (name === "standalone-input-disabled") return <StandaloneInputDisabledCase />;
  if (name === "standalone-textarea") return <StandaloneTextAreaCase />;
  if (name === "standalone-textarea-disabled") return <StandaloneTextAreaDisabledCase />;
  if (name === "required") return <RequiredCase />;
  if (name === "composition") return <CompositionCase />;
  if (name === "focus") return <FocusCase />;
  if (name === "render-children") return <RenderChildrenCase />;
  if (name === "multiline") return <TextAreaCase />;

  return <LogCase />;
}

mount(Fixture);
