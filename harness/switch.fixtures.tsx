import { host, mount, signal, Text, View } from "nsh";
import { FieldError, Label, Switch } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only Switch fixtures (port sheet 4b), not shared scenarios.
 *
 * Every case is built from HeroUI's public API and records callbacks through
 * `probe`, so the test reads them back from Storage. The state markers are the
 * visible half of the render props: On / Off, Hovered / Idle and
 * FocusRing / NoRing. Each of them differs from the default state, so an
 * assertion on one can fail when the wiring behind it breaks.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case picks the field state:
 *   log                uncontrolled; every callback plus the three markers, and
 *                      an `away` view to move the pointer off (the default)
 *   selected           defaultSelected, same markers
 *   controlled         isSelected bound to a signal, onChange records only;
 *                      a `force` button sets the signal true
 *   controlled-selected as controlled, starting true
 *   readonly           isReadOnly, uncontrolled, starting off
 *   readonly-selected  isReadOnly with isSelected true, the controlled form
 *                      Kobalte's read-only case uses
 *   disabled           isDisabled, same markers
 *   invalid            isInvalid with a Label and a FieldError message
 *   valid-error        a FieldError message on a valid field
 *   required           isRequired with a Label
 *   without-label      aria-label only, no visible label
 *   validation         validate fails while selected, with a fallback FieldError
 *   press              press callbacks on the Content, with a Label to press too
 *   render-count       a Root render prop that counts each call through probe
 *   layout             Control and Thumb report onLayout; hosts.params gives
 *                      size (sm / md / lg), dir (ltr / rtl) and wide (4rem);
 *                      `selected` starts it on and `resize` widens the track
 */

const NAME = "Enable notifications";

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: "track" | "thumb") {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function stateMarks(props: {
  isSelected: () => boolean;
  isHovered: () => boolean;
  isFocusVisible: () => boolean;
  isPressed: () => boolean;
}) {
  return (
    <View class="flex-row gap-2">
      <Text>{props.isSelected() ? "On" : "Off"}</Text>
      <Text>{props.isHovered() ? "Hovered" : "Idle"}</Text>
      <Text>{props.isFocusVisible() ? "FocusRing" : "NoRing"}</Text>
      <Text>{props.isPressed() ? "Pressed" : "NotPressed"}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Behavior cases
 * -----------------------------------------------------------------------------------------------*/

function Behavior() {
  const name = String(host.params.case ?? "log");
  const controlled =
    name === "controlled" || name === "controlled-selected" || name === "readonly-selected";
  const value = signal(name === "controlled-selected" || name === "readonly-selected");

  return (
    <Stage>
      <Switch
        aria-label={NAME}
        defaultSelected={name === "selected"}
        isDisabled={name === "disabled"}
        isReadOnly={name === "readonly" || name === "readonly-selected"}
        isSelected={controlled ? value() : undefined}
        onChange={probe("onChange")}
      >
        <Switch.Content
          onBlur={probe("onBlur")}
          onFocus={probe("onFocus")}
          onHoverEnd={probe("onHoverEnd")}
          onHoverStart={probe("onHoverStart")}
        >
          {({ isSelected, isHovered, isFocusVisible, isPressed }) => (
            <View class="flex-row items-center gap-3">
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              {stateMarks({ isSelected, isHovered, isFocusVisible, isPressed })}
            </View>
          )}
        </Switch.Content>
      </Switch>
      <View testID="away" class="size-8 bg-default" />
      {name === "controlled" ? (
        <View testID="force" role="button" class="px-3 py-1 bg-default" onPress={() => value.set(true)}>
          <Text>force</Text>
        </View>
      ) : null}
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Field cases
 * -----------------------------------------------------------------------------------------------*/

function InvalidCase() {
  return (
    <Stage>
      <Switch isInvalid>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label>{NAME}</Label>
        </Switch.Content>
        <FieldError>ErrorMessage</FieldError>
      </Switch>
    </Stage>
  );
}

function ValidErrorCase() {
  return (
    <Stage>
      <Switch>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Enable notifications
        </Switch.Content>
        <FieldError>ErrorMessage</FieldError>
      </Switch>
    </Stage>
  );
}

function RequiredCase() {
  return (
    <Stage>
      <Switch isRequired>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label>{NAME}</Label>
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

function WithoutLabelCase() {
  return (
    <Stage>
      <Switch aria-label="My Label">
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * X cases
 * -----------------------------------------------------------------------------------------------*/

function ValidationCase() {
  return (
    <Stage>
      <Switch
        aria-label={NAME}
        validate={(isSelected) => (isSelected ? "Selected is not allowed" : true)}
      >
        <Switch.Content>
          {({ isSelected }) => (
            <View class="flex-row items-center gap-3">
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Text>{isSelected() ? "On" : "Off"}</Text>
            </View>
          )}
        </Switch.Content>
        <FieldError />
      </Switch>
    </Stage>
  );
}

function PressCase() {
  return (
    <Stage>
      <Switch aria-label={NAME}>
        <Switch.Content
          onPress={probe("onPress")}
          onPressChange={probe("onPressChange")}
          onPressEnd={probe("onPressEnd")}
          onPressStart={probe("onPressStart")}
        >
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label>{NAME}</Label>
        </Switch.Content>
      </Switch>
    </Stage>
  );
}

function RenderCountCase() {
  const evaluate = probe("render");

  return (
    <Stage>
      <Switch aria-label={NAME}>
        {({ isSelected }) => {
          evaluate();

          return (
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Text>{isSelected() ? "On" : "Off"}</Text>
            </Switch.Content>
          );
        }}
      </Switch>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Layout case (T-013 … T-015)
 * -----------------------------------------------------------------------------------------------*/

function LayoutCase() {
  const sizeParam = String(host.params.size ?? "md");
  const size = sizeParam === "sm" || sizeParam === "lg" ? sizeParam : "md";
  const dir = host.params.dir === "rtl" ? "rtl" : "ltr";
  const wide = signal(host.params.wide === true);

  return (
    <Stage direction={dir}>
      <Switch
        aria-label={NAME}
        defaultSelected={host.params.selected === true}
        onChange={probe("onChange")}
        size={size}
      >
        <Switch.Content>
          {({ isSelected }) => (
            <View class="flex-row items-center gap-3">
              <Switch.Control style={{ width: wide() ? 64 : undefined }} onLayout={layoutProbe("track")}>
                <Switch.Thumb testID="thumb" onLayout={layoutProbe("thumb")} />
              </Switch.Control>
              <Text>{isSelected() ? "On" : "Off"}</Text>
            </View>
          )}
        </Switch.Content>
      </Switch>
      <View testID="resize" role="button" class="px-3 py-1 bg-default" onPress={() => wide.set(true)}>
        <Text>resize</Text>
      </View>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "log");

  if (name === "invalid") return <InvalidCase />;
  if (name === "valid-error") return <ValidErrorCase />;
  if (name === "required") return <RequiredCase />;
  if (name === "without-label") return <WithoutLabelCase />;
  if (name === "validation") return <ValidationCase />;
  if (name === "press") return <PressCase />;
  if (name === "render-count") return <RenderCountCase />;
  if (name === "layout") return <LayoutCase />;

  return <Behavior />;
}

mount(Fixture);
