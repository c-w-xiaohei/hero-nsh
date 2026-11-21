import { effect, host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import { EnvironmentScope, FieldError, Label, Switch } from "@heroui/react";
import { FALLBACK_SWITCH_CONTEXT, SwitchContext } from "../src/components/switch/switch-context";
import type { SwitchContextValue } from "../src/components/switch/switch-context";
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
 *   controlled-validation  the same in controlled form: the parent ignores the
 *                      change, so the commit validates the value still in effect
 *   readonly-validate  read-only and selected, validate would fail while selected;
 *                      presses must not commit it
 *   press              Root press callbacks, with a Label to press and an
 *                      isPressed marker; an `events` probe records the press
 *                      sequence (down → up → press → change → click, adapt
 *                      sheet M-008)
 *   render-count       a Root render prop that counts each call through probe
 *   layout             Control and Thumb report onLayout; hosts.params gives
 *                      size (sm / md / lg), dir (ltr / rtl) and wide (4rem);
 *                      `selected` starts it on and `resize` widens the track.
 *                      Content bounds report as `name:"content"` (M-003)
 *
 * Mobile-layer params (adapt sheet §4):
 *   scope    "" = the host's default environment (pointer — the desktop-parity
 *            side); "touch" wraps the case in EnvironmentScope(input="touch"),
 *            the injected environment the assertions drive.
 *   probe    "1" mounts the seam surface: a `CtxProbe` inside the field root
 *            (reads SwitchContext — reachable only inside the provider, so
 *            the fixture imports the context file directly the way
 *            list-box.fixtures does) plus a `ctx-sample` sibling button that
 *            reads the AnimatedValue channels on demand. Reports: `ctx-env`
 *            (mount-time gate/flags), `ctx-pressed` ({seam, active} edges),
 *            `ctx-state`/`ctx-channels` (pressed/scale/hitSlop/origin/bounds).
 *            Off by default so the desktop-port tests' text surface is
 *            unchanged.
 */

const NAME = "Enable notifications";

/* -------------------------------------------------------------------------------------------------
 * Environment injection + seam probe (the mobile layer's observation surface)
 * -----------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  return String(host.params.scope ?? "") === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

function probeOn() {
  return String(host.params.probe ?? "") === "1";
}

// The live context the `ctx-sample` sibling reads on demand — presses that
// never raise the seam's `isPressed` edge (the default pointer environment)
// still leave observable channel values.
let fieldCtx: SwitchContextValue | null = null;

function CtxProbe() {
  const ctx = SwitchContext() ?? FALLBACK_SWITCH_CONTEXT;
  const reportPressed = probe("ctx-pressed");
  const reportState = probe("ctx-state");
  const reportEnv = probe("ctx-env");

  effect(() => {
    fieldCtx = ctx;
  });

  // Mount-time environment of the seam: the effective gate, the computed
  // hitSlop and the field's flags.
  effect(() => {
    reportEnv({
      enabled: ctx.feedback.enabled(),
      hitSlop: ctx.feedback.hitSlop() ?? null,
      selected: ctx.isSelected(),
      disabled: ctx.isDisabled(),
      readonly: ctx.isReadOnly(),
    });
  });

  const sample = () => {
    void ctx.feedback.pressed.getValue().then((pressed) => {
      void ctx.feedback.scale.getValue().then((scale) => {
        reportState({
          pressed,
          scale,
          seamPressed: ctx.feedback.isPressed(),
          active: ctx.isActive(),
          hitSlop: ctx.feedback.hitSlop() ?? null,
          origin: ctx.feedback.pressOrigin(),
          bounds: ctx.feedback.bounds(),
          enabled: ctx.feedback.enabled(),
          selected: ctx.isSelected(),
        });
      });
    });
  };

  // Both press flags on every edge plus deferred samples, so a held press
  // catches mid-run and settled values (the control-field fixture's cadence).
  effect(() => {
    const seam = ctx.feedback.isPressed();
    const active = ctx.isActive();
    reportPressed({ seam, active });
    setTimeout(sample, 600);
    setTimeout(sample, 1500);
  });

  // Polling sampler: on `--target web` the edge effect above only ever sees
  // the settled flag — `pressDown`/`pressUp` land inside one press tick and
  // the batched signal update surfaces a single edge — so a `seamPressed:
  // true` mid-press sample must come from reading the flag on a clock. The
  // interval runs the same `sample` as the edge timeouts; its reports are
  // indistinguishable from theirs, which is the point (M-002's held half).
  effect(() => {
    const timer = setInterval(() => {
      if (ctx.feedback.isPressed()) {
        sample();
      }
    }, 200);

    return () => clearInterval(timer);
  });

  return <Text>{ctx.feedback.isPressed() ? "seam-pressed" : "seam-idle"}</Text>;
}

/** Mounts `CtxProbe` inside the field root only when `probe=1` asks for it. */
function SeamProbe() {
  return probeOn() ? <CtxProbe /> : null;
}

function SampleButton() {
  const reportChannels = probe("ctx-channels");

  const sampleChannels = () => {
    const c = fieldCtx;
    if (c === null) {
      return;
    }
    void c.feedback.pressed.getValue().then((pressed) => {
      void c.feedback.scale.getValue().then((scale) => {
        reportChannels({
          pressed,
          scale,
          seamPressed: c.feedback.isPressed(),
          active: c.isActive(),
          origin: c.feedback.pressOrigin(),
          hitSlop: c.feedback.hitSlop() ?? null,
          enabled: c.feedback.enabled(),
          selected: c.isSelected(),
        });
      });
    });
  };

  return probeOn() ? (
    <View testID="ctx-sample" role="button" class="p-2" onPress={sampleChannels}>
      <Text>ctx-sample</Text>
    </View>
  ) : null;
}

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: "track" | "thumb" | "content") {
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
        <SeamProbe />
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
      <SampleButton />
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
        <SeamProbe />
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
        <SeamProbe />
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
        <SeamProbe />
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
        <SeamProbe />
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
      <SampleButton />
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
        <SeamProbe />
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

function ControlledValidationCase() {
  const value = signal(false);

  return (
    <Stage>
      <Switch
        aria-label={NAME}
        isSelected={value()}
        onChange={probe("onChange")}
        validate={(isSelected) => {
          probe("validate")(isSelected);

          return isSelected ? "Selected is not allowed" : true;
        }}
      >
        <SeamProbe />
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

function ReadonlyValidateCase() {
  return (
    <Stage>
      <Switch
        aria-label={NAME}
        isReadOnly
        isSelected={true}
        onChange={probe("onChange")}
        onClick={probe("onClick")}
        onPress={probe("onPress")}
        onPressChange={probe("onPressChange")}
        onPressEnd={probe("onPressEnd")}
        onPressStart={probe("onPressStart")}
        onPressUp={probe("onPressUp")}
        validate={(isSelected) => (isSelected ? "Selected is not allowed" : true)}
      >
        <SeamProbe />
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label>{NAME}</Label>
        </Switch.Content>
        <FieldError />
      </Switch>
      <SampleButton />
    </Stage>
  );
}

function PressCase() {
  // M-008's sequence probe: down → up → press → change → click, from the
  // root's own callbacks (both the Content and the Label press paths report
  // into them).
  const reportEvent = probe("events");

  return (
    <Stage>
      <Switch
        aria-label={NAME}
        onPressChange={probe("onPressChange")}
        onPressEnd={probe("onPressEnd")}
        // M-008's sequence probe rides the root's own callbacks — the one
        // state machine both the Content and the Label press paths report
        // into: down (onPressStart) → up (onPressUp) → press → change →
        // click. Each still records its named probe too.
        onPressStart={(e) => {
          probe("onPressStart")(e);
          reportEvent("down");
        }}
        onPressUp={(e) => {
          probe("onPressUp")(e);
          reportEvent("up");
        }}
        onPress={(e) => {
          probe("onPress")(e);
          reportEvent("press");
        }}
        onClick={(e) => {
          probe("onClick")(e);
          reportEvent("click");
        }}
        onChange={(isSelected) => {
          probe("onChange")(isSelected);
          reportEvent("change");
        }}
      >
        <SeamProbe />
        {/* 2500 ms: CtxProbe samples the channels 600 ms into the hold; the
            hold must stay wider than the sample delay plus timer drift. */}
        <Switch.Content delayLongPress={2500}>
          {({ isPressed }) => (
            <View class="flex-row items-center gap-3">
              {/* `id:sw-track` is the seam's press point: on web `app.press`
                  hit-tests, and `role:switch`'s center lands on the pressable
                  Label (the `focusField` path, which never runs
                  `handlePressDown`). The track itself hears no press, so the
                  press resolves to the Content's own handlers. */}
              <Switch.Control testID="sw-track">
                <Switch.Thumb />
              </Switch.Control>
              <Label>{NAME}</Label>
              <Text>{isPressed() ? "Pressed" : "NotPressed"}</Text>
            </View>
          )}
        </Switch.Content>
      </Switch>
      <SampleButton />
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
        <SeamProbe />
        <Switch.Content onLayout={layoutProbe("content")}>
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
      <SampleButton />
      <View testID="resize" role="button" class="px-3 py-1 bg-default" onPress={() => wide.set(true)}>
        <Text>resize</Text>
      </View>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "log");

  if (name === "layout") return <Scoped><LayoutCase /></Scoped>;
  if (name === "invalid") return <Scoped><InvalidCase /></Scoped>;
  if (name === "valid-error") return <Scoped><ValidErrorCase /></Scoped>;
  if (name === "required") return <Scoped><RequiredCase /></Scoped>;
  if (name === "without-label") return <Scoped><WithoutLabelCase /></Scoped>;
  if (name === "validation") return <Scoped><ValidationCase /></Scoped>;
  if (name === "controlled-validation") return <Scoped><ControlledValidationCase /></Scoped>;
  if (name === "readonly-validate") return <Scoped><ReadonlyValidateCase /></Scoped>;
  if (name === "press") return <Scoped><PressCase /></Scoped>;
  if (name === "render-count") return <Scoped><RenderCountCase /></Scoped>;

  return <Scoped><Behavior /></Scoped>;
}

mount(Fixture);
