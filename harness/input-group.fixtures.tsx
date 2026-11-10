import { host, mount, Text, View } from "nsh";
import { Button, InputGroup, Label, TextField } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only InputGroup fixture (port sheet 4b.3). The shared scenarios cover the
 * stories, which carry no callbacks and no test ids; every regression case that
 * reads a callback back or targets one part by `testID` opens this file
 * instead.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape:
 *   default     TextField + Label "Amount" + group + Prefix "$"
 *               (ig-prefix) + Input (ig-input, onFocus / onBlur probe) +
 *               Suffix "USD" (ig-suffix) (T-013, T-015, T-016, T-017)
 *   disabled    the same field inside `<TextField isDisabled>`, defaultValue
 *               "10" (T-019)
 *   textarea    Prefix "#" + TextArea rows={3} (T-020)
 *   secondary   the same field inside `<TextField variant="secondary">`: T-018
 *               has no assertion (port sheet 4b row T-018, deleted)
 *   full-width  a 400pt parent around a `fullWidth` group: T-014's visible half
 *               (row T-014, deleted)
 *   controlled  the value owned by the fixture, for the controlled hand check
 *   render-props
 *               the function form of the group's `children` receiving the
 *               group state (D17: accessors), for the render-prop hand check
 *
 * The input records focus into Storage: `nsh/test` cannot query focus, and the
 * upstream `toHaveFocus()` is the one fact T-016 / T-017 read.
 */

function amountField(disabled = false) {
  return (
    <TextField
      className="w-[280px]"
      defaultValue="10"
      isDisabled={disabled}
      name="amount"
    >
      <Label>Amount</Label>
      <InputGroup testID="ig-root">
        <InputGroup.Prefix testID="ig-prefix">$</InputGroup.Prefix>
        <InputGroup.Input
          className="w-[200px]"
          onBlur={() => probe("focus")({ part: "input", focused: false })}
          onFocus={() => probe("focus")({ part: "input", focused: true })}
          testID="ig-input"
        />
        <InputGroup.Suffix testID="ig-suffix">USD</InputGroup.Suffix>
      </InputGroup>
    </TextField>
  );
}

function DefaultCase() {
  return <Stage>{amountField()}</Stage>;
}

function DisabledCase() {
  return <Stage>{amountField(true)}</Stage>;
}

function TextAreaCase() {
  return (
    <Stage>
      <TextField className="w-[280px]" name="notes">
        <Label>Notes</Label>
        <InputGroup testID="ig-root">
          <InputGroup.Prefix testID="ig-prefix">#</InputGroup.Prefix>
          <InputGroup.TextArea
            className="w-[220px]"
            rows={3}
            testID="ig-textarea"
          />
          <InputGroup.Suffix testID="ig-suffix">!</InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </Stage>
  );
}

function SecondaryCase() {
  return (
    <Stage>
      <TextField className="w-[280px]" name="amount" variant="secondary">
        <Label>Amount</Label>
        <InputGroup testID="ig-root">
          <InputGroup.Prefix testID="ig-prefix">$</InputGroup.Prefix>
          <InputGroup.Input className="w-[200px]" testID="ig-input" />
          <InputGroup.Suffix testID="ig-suffix">USD</InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </Stage>
  );
}

function FullWidthCase() {
  return (
    <Stage>
      <View class="w-[400px]" testID="ig-frame">
        <TextField fullWidth name="amount">
          <Label>Amount</Label>
          <InputGroup fullWidth testID="ig-root">
            <InputGroup.Prefix testID="ig-prefix">$</InputGroup.Prefix>
            <InputGroup.Input testID="ig-input" />
            <InputGroup.Suffix testID="ig-suffix">USD</InputGroup.Suffix>
          </InputGroup>
        </TextField>
      </View>
    </Stage>
  );
}

function ControlledCase() {
  return (
    <Stage>
      <TextField className="w-[280px]" name="amount">
        <Label>Amount</Label>
        <InputGroup testID="ig-root">
          <InputGroup.Prefix testID="ig-prefix">$</InputGroup.Prefix>
          <InputGroup.Input
            className="w-[200px]"
            defaultValue="10"
            onChange={probe("onChange")}
            testID="ig-input"
          />
          <InputGroup.Suffix testID="ig-suffix">USD</InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </Stage>
  );
}

function RenderPropsCase() {
  return (
    <Stage>
      <TextField className="w-[280px]" name="amount">
        <Label>Amount</Label>
        <InputGroup testID="ig-root">
          {(values) => (
            <>
              <InputGroup.Prefix testID="ig-prefix">$</InputGroup.Prefix>
              <InputGroup.Input className="w-[200px]" testID="ig-input" />
              <InputGroup.Suffix testID="ig-suffix">
                <Text>{values.isFocusWithin() ? "focused" : "USD"}</Text>
              </InputGroup.Suffix>
            </>
          )}
        </InputGroup>
      </TextField>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "default");

  if (name === "disabled") return <DisabledCase />;
  if (name === "textarea") return <TextAreaCase />;
  if (name === "secondary") return <SecondaryCase />;
  if (name === "full-width") return <FullWidthCase />;
  if (name === "controlled") return <ControlledCase />;
  if (name === "render-props") return <RenderPropsCase />;

  return <DefaultCase />;
}

mount(Fixture);
