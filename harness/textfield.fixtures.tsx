import { host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Description, EnvironmentScope, FieldError, Input, Label, TextArea, TextField, TextFieldContext } from "@heroui/react";
import type { InputProps, TextFieldEnterKeyHint, TextFieldInputMode } from "@heroui/react";
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
 *
 * A-008's mobile cases (sheet §2):
 *   submit         TextField + Label + Input; root `onSubmit` and input
 *                  `onSubmit` / `onBlur` / `onChange` probes, `submitBehavior`
 *                  / `enterKeyHint` / `returnKeyType` from host.params
 *   submit-standalone  a bare Input with the same submit probes
 *   submit-textarea  a TextArea with `onSubmit` / `onChange` probes and the
 *                  `submitBehavior` param ("" = the "newline" default)
 *   hover          Input `isHovered` render-prop record plus `onHover*` /
 *                  `onMouseEnter` / `onMouseLeave` probes
 *   layout         Input and TextArea `onLayout` bounds (M-001, one run per
 *                  scope)
 *   keyboard       Input with `keyboardType` / `inputMode` / `enterKeyHint`
 *                  / `autoComplete` / `autoCorrect` / `autoCapitalize` /
 *                  `maxLength` params and an `onChange` probe
 *   baseline       the M-007 default-environment contract in one mount:
 *                  `onFocusChange`, controlled write-back refusal,
 *                  `masked` / `type="password"`, Label / Description /
 *                  FieldError texts, invalid render, TextArea rows height
 *
 * `host.params.scope` wraps the mobile cases: "" = the host's default
 * environment (pointer — the desktop-parity side), "touch" =
 * `EnvironmentScope input="touch"`, the same convention toggle-button uses.
 * The test-only params `testInput` ("pointer"/"touch") inject an outer
 * EnvironmentScope input.
 */

type Scope = "" | "touch";

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;
  // Test-harness environment param (only the mobile tests set it —
  // absent keeps the host-derived default): `testInput` injects an outer
  // EnvironmentScope input so the pointer baseline is host-independent
  // (inner `scope` overrides still win).
  const testInput = String(host.params.testInput ?? "");

  const body =
    scope === "touch" ? (
      <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
    ) : (
      <>{props.children}</>
    );

  return testInput === "pointer" || testInput === "touch" ? (
    <EnvironmentScope input={testInput}>{body}</EnvironmentScope>
  ) : (
    body
  );
}

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

/* A-008: the field submit chain — Return reports the root's `onSubmit`
 * first, then the input's (M-003). `submitBehavior` stays unset unless the
 * param asks for "blurAndSubmit"; `enterKeyHint` / `returnKeyType` feed the
 * return-key mapping. */
function SubmitCase() {
  const submitBehavior = String(host.params.submitBehavior ?? "");
  const enterKeyHint = String(host.params.enterKeyHint ?? "");
  const returnKeyType = String(host.params.returnKeyType ?? "");

  return (
    <Stage>
      <TextField name="name" onSubmit={probe("field-submit")}>
        <Label>Your name</Label>
        <Input
          testID="name"
          submitBehavior={
            submitBehavior === ""
              ? undefined
              : (submitBehavior as "submit" | "blurAndSubmit" | "newline")
          }
          enterKeyHint={enterKeyHint === "" ? undefined : (enterKeyHint as TextFieldEnterKeyHint)}
          returnKeyType={
            returnKeyType === "" ? undefined : (returnKeyType as InputProps["returnKeyType"])
          }
          onSubmit={probe("onSubmit")}
          onChange={probe("onChange")}
          onBlur={probe("onBlur")}
          onFocus={probe("onFocus")}
        />
      </TextField>
    </Stage>
  );
}

/* A-008: the standalone half — a bare Input, no field, so only the local
 * `onSubmit` can fire. */
function SubmitStandaloneCase() {
  const submitBehavior = String(host.params.submitBehavior ?? "");

  return (
    <Stage>
      <Input
        aria-label="Name"
        testID="name"
        submitBehavior={
          submitBehavior === ""
            ? undefined
            : (submitBehavior as "submit" | "blurAndSubmit" | "newline")
        }
        onSubmit={probe("onSubmit")}
        onChange={probe("onChange")}
        onBlur={probe("onBlur")}
        onFocus={probe("onFocus")}
      />
    </Stage>
  );
}

/* A-008: the TextArea's two submit modes (M-004) — the "newline" default
 * inserts a line break and never fires `onSubmit`; an explicit "submit" /
 * "blurAndSubmit" opens the channel. */
function SubmitTextAreaCase() {
  const submitBehavior = String(host.params.submitBehavior ?? "");

  return (
    <Stage>
      <TextArea
        aria-label="Bio"
        testID="bio"
        submitBehavior={
          submitBehavior === ""
            ? undefined
            : (submitBehavior as "submit" | "blurAndSubmit" | "newline")
        }
        onSubmit={probe("onSubmit")}
        onChange={probe("onChange")}
        onBlur={probe("onBlur")}
      />
    </Stage>
  );
}

/* A-008: the hover face (M-002) — the `isHovered` render-prop record plus
 * the `onHover*` and `onMouseEnter` / `onMouseLeave` probes, in both
 * environments. `hover-away` is the leave target: `app.hover` only reports
 * `onMouseLeave` / `onHoverEnd` once the pointer rests somewhere else. */
function HoverCase() {
  const reportInput = probe("input-class");

  return (
    <Stage>
      <Input
        aria-label="Name"
        testID="name"
        className={({ isHovered }) => {
          reportInput({ isHovered: isHovered() });
          return "";
        }}
        onHoverStart={probe("onHoverStart")}
        onHoverEnd={probe("onHoverEnd")}
        onHoverChange={probe("onHoverChange")}
        onMouseEnter={probe("onMouseEnter")}
        onMouseLeave={probe("onMouseLeave")}
      />
      <Text testID="hover-away">away</Text>
    </Stage>
  );
}

/* A-008: `onLayout` bounds on both controls (M-001) — the Input's height
 * proves the `input` axis's `min-h-11` under touch and the 40 pt pointer
 * baseline; the TextArea's rows height stays put in both. */
function LayoutCase() {
  return (
    <Stage>
      <View class="flex-col gap-2 w-64">
        <Input
          aria-label="Name"
          testID="name"
          onLayout={(e) =>
            probe("input-layout")({ width: e.bounds.size.width, height: e.bounds.size.height })
          }
        />
        <TextArea
          aria-label="Bio"
          testID="bio"
          onLayout={(e) =>
            probe("textarea-layout")({ width: e.bounds.size.width, height: e.bounds.size.height })
          }
        />
      </View>
    </Stage>
  );
}

/* A-008: the keyboard-props channel mounts (M-005) — each param reaches the
 * host or stays unset; what the soft keyboard shows for them is a
 * real-device acceptance item (sheet §6). */
function KeyboardCase() {
  const keyboardType = String(host.params.keyboardType ?? "");
  const inputMode = String(host.params.inputMode ?? "");
  const enterKeyHint = String(host.params.enterKeyHint ?? "");
  const autoComplete = String(host.params.autoComplete ?? "");
  const autoCorrect = String(host.params.autoCorrect ?? "");
  const autoCapitalize = String(host.params.autoCapitalize ?? "");
  const maxLength = String(host.params.maxLength ?? "");

  return (
    <Stage>
      <Input
        aria-label="Name"
        testID="name"
        keyboardType={keyboardType === "" ? undefined : (keyboardType as InputProps["keyboardType"])}
        inputMode={inputMode === "" ? undefined : (inputMode as TextFieldInputMode)}
        enterKeyHint={enterKeyHint === "" ? undefined : (enterKeyHint as TextFieldEnterKeyHint)}
        autoComplete={autoComplete === "" ? undefined : autoComplete}
        autoCorrect={autoCorrect === "" ? undefined : autoCorrect}
        autoCapitalize={autoCapitalize === "" ? undefined : autoCapitalize}
        maxLength={maxLength === "" ? undefined : Number(maxLength)}
        onChange={probe("onChange")}
      />
    </Stage>
  );
}

/* M-007's baseline surface in ONE mount (the color-input-group `baseline`
 * precedent: sequential web hosts exhaust the target, so the default-
 * environment contract faces share a single app). Covers what the older
 * cases do not probe: `onFocusChange`, `masked` / `type="password"`, the
 * controlled write-back refusal, Label / Description / FieldError texts,
 * the invalid render and the TextArea's rows height + Enter line break.
 * The composition fan-out stays on the `composition` case (X-001). */
function BaselineCase() {
  const controlled = signal("Ada");

  return (
    <Stage>
      <TextField
        isInvalid
        name="baseline"
        onChange={probe("root-change")}
        onFocusChange={probe("onFocusChange")}
      >
        <Label>Baseline name</Label>
        <Input testID="baseline-name" />
        <FieldError>Baseline error</FieldError>
      </TextField>

      {/* Valid on purpose: an invalid field hides its Description
       * (upstream `.textfield[data-invalid] [data-slot=description]`). */}
      <TextField name="baseline-controlled" value={controlled()} onChange={probe("controlled-change")}>
        <Label>Controlled</Label>
        <Input testID="baseline-controlled-input" />
        <Description>Baseline hint</Description>
      </TextField>

      <Input
        aria-label="Password"
        testID="baseline-password"
        type="password"
        onChange={probe("onChange")}
      />
      <Input
        aria-label="Masked"
        masked
        testID="baseline-masked"
        onChange={probe("onChange")}
      />

      <TextField name="baseline-bio">
        <Label>Bio</Label>
        <TextArea
          testID="baseline-bio"
          rows={3}
          onChange={probe("onChange")}
          onLayout={(e) =>
            probe("baseline-textarea-layout")({
              width: e.bounds.size.width,
              height: e.bounds.size.height,
            })
          }
        />
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
  if (name === "submit") return <Scoped><SubmitCase /></Scoped>;
  if (name === "submit-standalone") return <Scoped><SubmitStandaloneCase /></Scoped>;
  if (name === "submit-textarea") return <Scoped><SubmitTextAreaCase /></Scoped>;
  if (name === "hover") return <Scoped><HoverCase /></Scoped>;
  if (name === "layout") return <Scoped><LayoutCase /></Scoped>;
  if (name === "keyboard") return <Scoped><KeyboardCase /></Scoped>;
  if (name === "baseline") return <Scoped><BaselineCase /></Scoped>;

  return <LogCase />;
}

mount(Fixture);
