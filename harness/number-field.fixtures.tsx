import { effect, host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  Description,
  EnvironmentScope,
  FieldError,
  Label,
  NumberField,
  PressableFeedbackContext,
} from "@heroui/react";
import type {
  NumberFieldInputProps,
  PressableFeedbackContextValue,
} from "@heroui/react";
import { NumberFieldContext } from "../src/components/number-field/context";
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
 *   snap               controlled `value` (params controlled) or `defaultValue`,
 *                      with minValue / maxValue / step / percent /
 *                      commitBehavior params and an onChange probe: the
 *                      initial snap in render (X-002)
 *
 * Mobile-layer cases and params (adapt sheet §2 A-012, §4):
 *   scope    "" = the host's default environment (pointer — the desktop-parity
 *            side); "touch" wraps the case in EnvironmentScope(input="touch"),
 *            the injected environment the assertions drive. Every case,
 *            existing and new, mounts under it — an untouched param keeps the
 *            host default.
 *   probe    "1" mounts the seam surface: a `StepButtonProbe` inside each step
 *            button (reads `PressableFeedbackContext`, reachable only inside
 *            the provider the button mounts, so the fixture imports the context
 *            directly the way pagination's fixture does) plus a `FieldProbe`
 *            inside the field root (reads `NumberFieldContext` for the `input`
 *            axis and `groupCols` channel). Reports: `seam-env` (mount-time
 *            gate/slop), `seam-edge` (isPressed edges), `seam-hold` (+300 ms
 *            mid-hold / +1100 ms settled scale·slop), `seam-sample` (channels
 *            after each `press`), `field-env` (the axis through the root's
 *            single read channel). Off by default so the desktop-port cases' surface
 *            is unchanged.
 *   press    both buttons wired to the `events` sequence probe (down/up/
 *            changeT/changeF/press) plus `onPress`/`onChange` channels and the
 *            seam probes — the carrier for M-001/M-002/M-007's press round-trip.
 *   layout   Group + both buttons + Input report `onLayout` bounds — M-003's
 *            44 pt row / column read against the desktop baseline.
 *   hover    Group + both buttons + Input report `isHovered` through a
 *            className probe and the `onHover*` callbacks — M-004's
 *            touch-suppression / pointer-parity read.
 *   hold     `onChange` counts steps and `hold` samples the count at
 *            450/550/700/1100 ms after the first step — M-005's 400/600 ms
 *            first-repeat windows on the two axes.
 *   submit   `onSubmit`/`onBlur`/`onChange` probes plus an `events` sequence
 *            channel and `submitBehavior`/`enterKeyHint`/`returnKeyType`/
 *            `autoCapitalize` params — M-006's commit-before-submit read; an
 *            `away` press target checks the blur half.
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

/* Controlled value or defaultValue with the bounds, step and commitBehavior
 * that decide the initial snap. Probes onChange so the snap cannot sneak a
 * commit in (X-002). */
function SnapCase() {
  const controlled = host.params.controlled === true;
  const validate = host.params.commitBehavior === "validate";

  return (
    <Stage>
      <NumberField
        commitBehavior={validate ? "validate" : "snap"}
        defaultValue={controlled ? undefined : numberParam("defaultValue")}
        formatOptions={host.params.percent === true ? { style: "percent" } : undefined}
        maxValue={numberParam("maxValue")}
        minValue={numberParam("minValue")}
        name="width"
        onChange={probe("onChange")}
        step={numberParam("step")}
        value={controlled ? numberParam("value") : undefined}
      >
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

/* -------------------------------------------------------------------------------------------------
 * Mobile layer: environment injection + seam/axis probes (adapt sheet A-012)
 * -----------------------------------------------------------------------------------------------*/

/** `host.params.scope = "touch"` injects `input="touch"`; "" keeps the host. */
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

/** The live `PressableFeedbackContext` of each step button, by fixture name. */
const seamContexts = new Map<string, PressableFeedbackContextValue>();

/* Samples the seam channels while a press is still held and after it settles:
 * the +300 ms sample lands inside `app.longPress`'s hold with the scale
 * timing complete (the mid-press read); the +1100 ms sample lands after
 * release plus the return animation. Only a real `isPressed` edge schedules
 * them, so the pointer environment records nothing here. */
function sampleHold(name: string, midHold: boolean) {
  const ctx = seamContexts.get(name);
  if (!ctx) {
    return;
  }
  const report = probe("seam-hold");
  void ctx.scale.getValue().then((scale) => {
    report({
      name,
      midHold,
      seamPressed: ctx.isPressed(),
      scale,
      hitSlop: ctx.hitSlop() ?? null,
      enabled: ctx.enabled(),
    });
  });
}

/* Reads the seam channels after the press chain finished: under pointer the
 * press fires but `isPressed`/`scale`/`hitSlop` rest (M-001's negative half);
 * under touch the sample lands post-release. Called from the `press` event so
 * storage order is press → seam-sample. */
function sampleSeam(name: string) {
  const ctx = seamContexts.get(name);
  if (!ctx) {
    return;
  }
  const report = probe("seam-sample");
  void ctx.scale.getValue().then((scale) => {
    report({
      name,
      seamPressed: ctx.isPressed(),
      scale,
      hitSlop: ctx.hitSlop() ?? null,
      enabled: ctx.enabled(),
    });
  });
}

/* Sits inside a step button (the seam provider wraps its children), reads
 * `PressableFeedbackContext` and reports the gate/slop on mount plus every
 * `isPressed` edge. Under pointer the edge channel stays silent — that
 * silence is the negative assertion (pagination's carrier). */
function StepButtonProbe(props: { name: string }) {
  const ctx = PressableFeedbackContext();
  const reportEnv = probe("seam-env");
  const reportEdge = probe("seam-edge");

  effect(() => {
    seamContexts.set(props.name, ctx);
  });

  effect(() => {
    reportEnv({
      name: props.name,
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
    });
  });

  effect(() => {
    const seam = ctx.isPressed();
    reportEdge({ name: props.name, seam });
    if (seam) {
      setTimeout(() => sampleHold(props.name, true), 300);
      setTimeout(() => sampleHold(props.name, false), 1100);
    }
  });

  return null;
}

/* Sits inside the field root and reads `NumberFieldContext`: the `input` axis
 * the root resolved and the `groupCols` the group's template interpolates —
 * M-013's single-read-channel read. Reports on mount and on every change. */
function FieldProbe() {
  const field = NumberFieldContext();
  const report = probe("field-env");

  effect(() => {
    report({
      input: field?.input() ?? null,
      groupCols: field?.slots.groupCols() ?? null,
      hasDecrement: field?.hasDecrement() ?? null,
      hasIncrement: field?.hasIncrement() ?? null,
    });
  });

  return null;
}

/** Mounts both probe surfaces only when `probe=1` asks for them. */
function FieldProbeIf() {
  return probeOn() ? <FieldProbe /> : null;
}

function StepProbe(props: { name: string }) {
  return probeOn() ? <StepButtonProbe name={props.name} /> : null;
}

/* The `events` sequence + caller-side channels one step button needs:
 * down/changeT/up/changeF/end/press in firing order, `onPress` for the
 * caller half, `onLayout` for M-003, and the `onHover*` group for M-004. */
function stepButtonHandlers(name: string) {
  const events = probe("events");

  return {
    onPressDown: () => events(name, "down"),
    onPressStart: () => events(name, "start"),
    onPressChange: (pressed: boolean) => events(name, pressed ? "changeT" : "changeF"),
    onPressUp: () => events(name, "up"),
    onPressEnd: () => events(name, "end"),
    onPress: () => {
      events(name, "press");
      probe("onPress")(name);
      sampleSeam(name);
    },
    onLayout: layoutProbe(name),
    onHoverStart: () => probe("hover")(name, "start"),
    onHoverEnd: () => probe("hover")(name, "end"),
    onHoverChange: (h: boolean) => probe("hover")(name, "change", h),
  };
}

/* -------------------------------------------------------------------------------------------------
 * Mobile cases
 * -----------------------------------------------------------------------------------------------*/

/* Both step buttons fully probed (press chain, events, seam, layout, hover)
 * plus the field-axis probe: the carrier for M-001/M-002/M-007/M-013. */
function PressCase() {
  return (
    <Stage>
      <NumberField defaultValue={0} name="width" onChange={() => probe("events")("onChange")}>
        <Label>Width</Label>
        <FieldProbeIf />
        <NumberField.Group testID="nf-group" onLayout={layoutProbe("group")}>
          <NumberField.DecrementButton testID="nf-dec" {...stepButtonHandlers("dec")}>
            <StepProbe name="dec" />
          </NumberField.DecrementButton>
          <NumberField.Input testID="nf-input" />
          <NumberField.IncrementButton testID="nf-inc" {...stepButtonHandlers("inc")}>
            <StepProbe name="inc" />
          </NumberField.IncrementButton>
        </NumberField.Group>
      </NumberField>
    </Stage>
  );
}

/* `onLayout` bounds of the row, both step columns and the input — M-003's
 * 44 pt row/column assertion under touch against the desktop baseline. */
function LayoutCase() {
  return (
    <Stage>
      <NumberField defaultValue={0} name="width">
        <Label>Width</Label>
        <FieldProbeIf />
        <NumberField.Group testID="nf-group" onLayout={layoutProbe("group")}>
          <NumberField.DecrementButton testID="nf-dec" onLayout={layoutProbe("dec")} />
          <NumberField.Input testID="nf-input" onLayout={layoutProbe("input")} />
          <NumberField.IncrementButton testID="nf-inc" onLayout={layoutProbe("inc")} />
        </NumberField.Group>
      </NumberField>
    </Stage>
  );
}

/* `isHovered` through each part's className function plus the `onHover*`
 * callback group on every hoverable part — M-004 reads `hover-state` records
 * and the `hover` channel under both environments. */
function HoverCase() {
  const recordGroup = probe("hover-state");
  const recordDec = probe("hover-state");
  const recordInput = probe("hover-state");
  const recordInc = probe("hover-state");
  const hover = probe("hover");

  return (
    <Stage>
      <NumberField defaultValue={0} name="width">
        <Label>Width</Label>
        <NumberField.Group
          testID="nf-group"
          className={(v) => {
            recordGroup({ part: "group", isHovered: v.isHovered(), isFocusWithin: v.isFocusWithin() });

            return "";
          }}
          onHoverStart={() => hover("group", "start")}
          onHoverEnd={() => hover("group", "end")}
          onHoverChange={(h) => hover("group", "change", h)}
        >
          <NumberField.DecrementButton
            testID="nf-dec"
            className={(v) => {
              recordDec({ part: "dec", isHovered: v.isHovered(), isPressed: v.isPressed() });

              return "";
            }}
            onHoverStart={() => hover("dec", "start")}
            onHoverEnd={() => hover("dec", "end")}
            onHoverChange={(h) => hover("dec", "change", h)}
          />
          <NumberField.Input
            testID="nf-input"
            className={(v) => {
              recordInput({ part: "input", isHovered: v.isHovered(), isFocused: v.isFocused() });

              return "";
            }}
            onHoverStart={() => hover("input", "start")}
            onHoverEnd={() => hover("input", "end")}
            onHoverChange={(h) => hover("input", "change", h)}
          />
          <NumberField.IncrementButton
            testID="nf-inc"
            className={(v) => {
              recordInc({ part: "inc", isHovered: v.isHovered(), isPressed: v.isPressed() });

              return "";
            }}
            onHoverStart={() => hover("inc", "start")}
            onHoverEnd={() => hover("inc", "end")}
            onHoverChange={(h) => hover("inc", "change", h)}
          />
        </NumberField.Group>
      </NumberField>
    </Stage>
  );
}

/* The press-down step starts the count and schedules the `hold` samples; the
 * tests hold the button past each mark and compare the counts with the
 * axis's first-repeat window — pointer 400 ms, touch 600 ms, one 60 ms
 * cadence after that (M-005). */
function HoldCase() {
  let steps = 0;
  let armed = false;
  const report = probe("hold");

  const arm = () => {
    armed = true;
    for (const at of [450, 550, 700, 1100]) {
      setTimeout(() => report({ at, steps }), at);
    }
  };

  return (
    <Stage>
      <NumberField
        defaultValue={0}
        name="width"
        onChange={(value) => {
          steps += 1;
          probe("onChange")(value);
          if (!armed) {
            arm();
          }
        }}
      >
        <Label>Width</Label>
        {/* delayLongPress 1400: `app.longPress` holds only the view's
            delayLongPress (500 ms default), which ends before the touch
            axis's 600 ms first repeat — the +1100 ms sample needs the
            press still held (adapt sheet M-005). */}
        <NumberField.Group testID="nf-group">
          <NumberField.DecrementButton testID="nf-dec" delayLongPress={1400} />
          <NumberField.Input testID="nf-input" />
          <NumberField.IncrementButton testID="nf-inc" delayLongPress={1400} />
        </NumberField.Group>
      </NumberField>
    </Stage>
  );
}

function submitParam<K extends keyof NumberFieldInputProps>(
  name: K,
): NumberFieldInputProps[K] {
  const value = host.params[name as string];

  return (value === undefined ? undefined : value) as NumberFieldInputProps[K];
}

/* The edit → submit chain: `onSubmit`/`onBlur`/`onChange` channels plus an
 * `events` sequence (change lands inside `field.commit()`, which runs before
 * `onSubmit` reports) — M-006 reads the order and the `blur` channel's
 * silence under `submitBehavior="submit"`. The `away` view is the focus
 * target a press moves to. `enterKeyHint`/`returnKeyType`/`submitBehavior`/
 * `autoCapitalize` params drive the new prop mouths. */
function SubmitCase() {
  const events = probe("events");

  return (
    <Stage>
      <NumberField defaultValue={0} name="width" onChange={(v) => probe("onChange")(v)}>
        <Label>Width</Label>
        <NumberField.Group testID="nf-group">
          <NumberField.Input
            testID="nf-input"
            autoCapitalize={submitParam("autoCapitalize")}
            enterKeyHint={submitParam("enterKeyHint")}
            returnKeyType={submitParam("returnKeyType")}
            submitBehavior={submitParam("submitBehavior")}
            onBlur={() => {
              probe("blur")("blur");
              events("blur");
            }}
            onSubmit={(e) => {
              probe("onSubmit")(e);
              events("submit");
            }}
          />
        </NumberField.Group>
      </NumberField>
      <View testID="away" role="button" class="size-8 bg-default" />
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "parts");

  // A-012: every case mounts inside `Scoped` — `scope="touch"` injects the
  // mobile environment, an absent param keeps the host default, so the
  // existing cases' surface is unchanged.
  if (name === "label") return <Scoped><LabelCase /></Scoped>;
  if (name === "aria-label") return <Scoped><AriaLabelCase /></Scoped>;
  if (name === "composition") return <Scoped><CompositionCase /></Scoped>;
  if (name === "log") return <Scoped><LogCase /></Scoped>;
  if (name === "controlled") return <Scoped><ControlledCase /></Scoped>;
  if (name === "invalid") return <Scoped><InvalidCase /></Scoped>;
  if (name === "disabled") return <Scoped><DisabledCase /></Scoped>;
  if (name === "readonly") return <Scoped><ReadonlyCase /></Scoped>;
  if (name === "required") return <Scoped><RequiredCase /></Scoped>;
  if (name === "description") return <Scoped><DescriptionCase /></Scoped>;
  if (name === "description-error") return <Scoped><DescriptionErrorCase /></Scoped>;
  if (name === "valid-error") return <Scoped><ValidErrorCase /></Scoped>;
  if (name === "focus") return <Scoped><FocusCase /></Scoped>;
  if (name === "format") return <Scoped><FormatCase /></Scoped>;
  if (name === "step") return <Scoped><StepCase /></Scoped>;
  if (name === "bounds") return <Scoped><BoundsCase /></Scoped>;
  if (name === "decimal") return <Scoped><DecimalCase /></Scoped>;
  if (name === "cleared") return <Scoped><ClearedCase /></Scoped>;
  if (name === "snap") return <Scoped><SnapCase /></Scoped>;

  if (name === "press") return <Scoped><PressCase /></Scoped>;
  if (name === "layout") return <Scoped><LayoutCase /></Scoped>;
  if (name === "hover") return <Scoped><HoverCase /></Scoped>;
  if (name === "hold") return <Scoped><HoldCase /></Scoped>;
  if (name === "submit") return <Scoped><SubmitCase /></Scoped>;

  return <Scoped><PartsCase /></Scoped>;
}

mount(Fixture);
