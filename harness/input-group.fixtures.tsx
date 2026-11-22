import { host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Button, EnvironmentScope, InputGroup, Label, TextField } from "@heroui/react";
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
 * Mobile-layer cases (adapt sheet §4):
 *   layout      Root / prefix / suffix report their `onLayout` bounds — the
 *               touch `min-h-11` hit face vs the pointer `min-h-9` row
 *   hover       `isHovered` render-prop text ("hovered"/"idle") plus
 *               `onHoverStart`/`onHoverEnd`/`onHoverChange` probes on the root
 *   submit      a standalone group (no TextField): `onSubmit` probe on the
 *               input, focus probes on both edges
 *   kbd         the keyboard-attribute matrix: `keyboardType`/`inputMode`/
 *               `type`/`returnKeyType`/`enterKeyHint`/`autoComplete`/
 *               `autoCorrect`/`autoCapitalize`/`maxLength`
 *
 * `host.params.scope` picks the environment wrapper — "" is the host's default
 * (pointer, the desktop-parity half), "touch" is
 * `EnvironmentScope input="touch"`, the same convention the switch and
 * toggle-button fixtures use (adapt sheet A-011).
 *
 * The input records focus into Storage: `nsh/test` cannot query focus, and the
 * upstream `toHaveFocus()` is the one fact T-016 / T-017 read.
 */

/* -------------------------------------------------------------------------------------------------
 * Environment injection (A-011)
 * -----------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  return String(host.params.scope ?? "") === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

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

/* -------------------------------------------------------------------------------------------------
 * Mobile-layer cases (A-011)
 * -----------------------------------------------------------------------------------------------*/

function LayoutCase() {
  return (
    <Stage>
      <TextField className="w-[280px]" name="amount">
        <Label>Amount</Label>
        <InputGroup onLayout={layoutProbe("root")} testID="ig-root">
          <InputGroup.Prefix onLayout={layoutProbe("prefix")} testID="ig-prefix">
            $
          </InputGroup.Prefix>
          <InputGroup.Input className="w-[200px]" testID="ig-input" />
          <InputGroup.Suffix onLayout={layoutProbe("suffix")} testID="ig-suffix">
            USD
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </Stage>
  );
}

function HoverCase() {
  return (
    <Stage>
      <TextField className="w-[280px]" name="amount">
        <Label>Amount</Label>
        <InputGroup
          onHoverChange={probe("onHoverChange")}
          onHoverEnd={probe("onHoverEnd")}
          onHoverStart={probe("onHoverStart")}
          testID="ig-root"
        >
          {(values) => (
            <>
              <InputGroup.Prefix testID="ig-prefix">$</InputGroup.Prefix>
              <InputGroup.Input
                className="w-[200px]"
                onBlur={() => probe("focus")({ part: "input", focused: false })}
                onFocus={() => probe("focus")({ part: "input", focused: true })}
                testID="ig-input"
              />
              <InputGroup.Suffix testID="ig-suffix">
                <Text>{values.isHovered() ? "hovered" : "idle"}</Text>
              </InputGroup.Suffix>
            </>
          )}
        </InputGroup>
      </TextField>
    </Stage>
  );
}

function SubmitCase() {
  return (
    <Stage>
      <View class="w-[280px]">
        <InputGroup testID="ig-root">
          <InputGroup.Prefix testID="ig-prefix">$</InputGroup.Prefix>
          <InputGroup.Input
            aria-label="Amount"
            className="w-[200px]"
            defaultValue="10"
            onBlur={() => probe("focus")({ part: "input", focused: false })}
            onFocus={() => probe("focus")({ part: "input", focused: true })}
            onSubmit={probe("onSubmit")}
            testID="ig-input"
          />
          <InputGroup.Suffix testID="ig-suffix">USD</InputGroup.Suffix>
        </InputGroup>
      </View>
    </Stage>
  );
}

function KbdCase() {
  return (
    <Stage>
      <View class="flex-col w-[320px]">
        <InputGroup testID="ig-root-keyboard">
          <InputGroup.Input
            aria-label="Keyboard"
            keyboardType="email-address"
            placeholder="keyboard"
            testID="kbd-keyboard"
          />
        </InputGroup>
        <InputGroup testID="ig-root-inputmode">
          <InputGroup.Input
            aria-label="InputMode"
            inputMode="numeric"
            placeholder="inputmode"
            testID="kbd-inputmode"
          />
        </InputGroup>
        <InputGroup testID="ig-root-type">
          <InputGroup.Input
            aria-label="Type"
            placeholder="type"
            testID="kbd-type"
            type="email"
          />
        </InputGroup>
        <InputGroup testID="ig-root-return">
          <InputGroup.Input
            aria-label="Return"
            placeholder="return"
            returnKeyType="search"
            testID="kbd-return"
          />
        </InputGroup>
        <InputGroup testID="ig-root-hints">
          {(["done", "go", "next", "previous", "search", "send"] as const).map(
            (hint) => (
              <InputGroup.Input
                aria-label={`Hint ${hint}`}
                className="w-[40px]"
                enterKeyHint={hint}
                placeholder={hint}
                testID={`kbd-hint-${hint}`}
              />
            ),
          )}
        </InputGroup>
        <InputGroup testID="ig-root-autofill">
          <InputGroup.Input
            aria-label="Autofill"
            autoCapitalize="words"
            autoComplete="username"
            autoCorrect="off"
            maxLength={12}
            placeholder="autofill"
            testID="kbd-autofill"
          />
        </InputGroup>
      </View>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "default");

  if (name === "disabled") return <Scoped><DisabledCase /></Scoped>;
  if (name === "textarea") return <Scoped><TextAreaCase /></Scoped>;
  if (name === "secondary") return <Scoped><SecondaryCase /></Scoped>;
  if (name === "full-width") return <Scoped><FullWidthCase /></Scoped>;
  if (name === "controlled") return <Scoped><ControlledCase /></Scoped>;
  if (name === "render-props") return <Scoped><RenderPropsCase /></Scoped>;
  if (name === "layout") return <Scoped><LayoutCase /></Scoped>;
  if (name === "hover") return <Scoped><HoverCase /></Scoped>;
  if (name === "submit") return <Scoped><SubmitCase /></Scoped>;
  if (name === "kbd") return <Scoped><KbdCase /></Scoped>;

  return <Scoped><DefaultCase /></Scoped>;
}

mount(Fixture);
