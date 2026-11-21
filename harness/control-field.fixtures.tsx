import { effect, host, mount, Text, View } from "nsh";
import type { Component, JSX, PressEvent } from "nsh";
import {
  ControlField,
  ControlFieldContext,
  Description,
  EnvironmentScope,
  FieldError,
  Label,
} from "@heroui/react";
import type {
  ControlFieldContextValue,
  ControlFieldIndicatorVariant,
} from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the e-parts ControlField mechanism unit
 * (adapt-sheets/e-parts.md §2 A-001…A-005, §4 M-001…M-011, M-036).
 *
 * `host.params.case` picks the shape:
 *
 *   row   A `ControlField` wrapping `Label` + `Description` + `FieldError` +
 *         `ControlField.Indicator` (default `variant` piece) + `CtxProbe`,
 *         the assertion surface for every row-level M row. Probes:
 *         `events` ({down,up,press,change} — M-007's sequence), `change`
 *         (the onSelectedChange calls, bare), `focus` (the row's onFocus —
 *         the M-006 `<label for>` half), `layout` (row bounds — M-008),
 *         `ctx-pressed`/`ctx-state`/`ctx-env`/`ctx-channels` (the seam's
 *         mirror vs gated flag and the channels, M-001/M-002/M-003/M-036).
 *         `ctx-sample` is a plain button NEXT TO the row: it reads the
 *         context's AnimatedValue channels through `getValue()` on demand,
 *         the only read available for presses that never raise the seam's
 *         `isPressed` edge (the default pointer environment).
 *   fn    `ControlField`'s own function child plus `ControlField.Indicator`'s
 *         function child — M-004's render-prop contract.
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper ("" = host
 * default, "touch" = `input="touch"`), same convention as
 * `pressable.fixtures.tsx`. Other params: `variant` (switch/checkbox/radio),
 * `selected`="1", `disabled`="1", `required`="1", `invalid`="1",
 * `anim`="disable-all" (the row's `animation` prop), `box`="tiny" (24×24 row
 * for a non-empty hitSlop), `short`="1" (one-line label → row height under
 * 44 pt, M-008's short-content half).
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

type Scope = "" | "touch";

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  return scope === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

function Frame(props: { children?: JSX.Element }) {
  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      {props.children}
    </View>
  );
}

function Btn(props: { id: string; onPress: () => void }) {
  return (
    <View testID={props.id} role="button" onPress={props.onPress} class="p-2">
      <Text>{props.id}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * On-demand channel probe — the `ctx-sample` button reads what this value
 * holds; the probe is a sibling so pressing it never perturbs the press.
 * -----------------------------------------------------------------------------------------------*/
let rowCtx: ControlFieldContextValue | null = null;

/**
 * Reads `ControlFieldContext` inside the row and reports what a part sees.
 * `ctx-pressed` carries BOTH press flags — `mirror` is the row's unconditional
 * `isPressed` (upstream `SharedValue` semantics, fires in every environment)
 * and `seam` is the feedback factory's gated `isPressed` — because sheet §1
 * keeps them as separate channels: the negative assertions need the seam
 * staying down under pointer while the mirror still round-trips.
 *
 * `ctx-state` samples on every `ctx-pressed` edge, at +600 ms and +1500 ms,
 * so a longPress holds mid-run samples the settled pressed-end values the
 * same way `pressable.fixtures.tsx`'s probe does.
 */
function CtxProbe() {
  const ctx = ControlFieldContext();
  const reportPressed = probe("ctx-pressed");
  const reportState = probe("ctx-state");
  const reportEnv = probe("ctx-env");

  // Publish the live context for the sibling `ctx-sample` button.
  effect(() => {
    rowCtx = ctx;
  });

  // Mount-time environment of the seam: the effective gate, the cascade
  // flag, the computed hitSlop and the row's selection flags.
  effect(() => {
    reportEnv({
      enabled: ctx.feedback.enabled(),
      allDisabled: ctx.isAllAnimationsDisabled(),
      hitSlop: ctx.feedback.hitSlop() ?? null,
      selected: ctx.isSelected() ?? null,
      disabled: ctx.isDisabled(),
      invalid: ctx.isInvalid(),
      required: ctx.isRequired(),
    });
  });

  const sample = () => {
    void ctx.feedback.pressed.getValue().then((pressed) => {
      void ctx.feedback.scale.getValue().then((scale) => {
        reportState({
          pressed,
          scale,
          seamPressed: ctx.feedback.isPressed(),
          mirror: ctx.isPressed(),
          hitSlop: ctx.feedback.hitSlop() ?? null,
          origin: ctx.feedback.pressOrigin(),
          bounds: ctx.feedback.bounds(),
          enabled: ctx.feedback.enabled(),
          allDisabled: ctx.isAllAnimationsDisabled(),
          selected: ctx.isSelected() ?? null,
        });
      });
    });
  };

  effect(() => {
    const mirror = ctx.isPressed();
    const seam = ctx.feedback.isPressed();
    reportPressed({ mirror, seam });
    setTimeout(sample, 600);
    setTimeout(sample, 1500);
  });

  return <Text>{ctx.isPressed() ? "row-pressed" : "row-idle"}</Text>;
}

/* -------------------------------------------------------------------------------------------------
 * row case (M-001…M-011 minus fn; M-036)
 * -----------------------------------------------------------------------------------------------*/

function RowCase() {
  const reportEvent = probe("events");
  const reportChange = probe("change");
  const reportFocus = probe("focus");
  const reportLayout = probe("layout");
  const reportChannels = probe("ctx-channels");

  const variant = String(host.params.variant ?? "switch") as ControlFieldIndicatorVariant;
  const disabled = String(host.params.disabled ?? "") === "1";
  const required = String(host.params.required ?? "") === "1";
  const invalid = String(host.params.invalid ?? "") === "1";
  const selected = String(host.params.selected ?? "") === "1";
  const tiny = String(host.params.box ?? "") === "tiny";
  const short = String(host.params.short ?? "") === "1";
  const anim = String(host.params.anim ?? "");

  const onEvent =
    (kind: string) =>
    (e: PressEvent): void => {
      reportEvent({ kind, x: e.position.x, y: e.position.y });
    };

  const onChange = (isSelected: boolean) => {
    reportChange(isSelected);
    reportEvent({ kind: "change" });
  };

  // The post-press half of the negative assertions: reads the context's
  // AnimatedValue channels on demand (`ctx-state` only samples on
  // `ctx-pressed` edges — which DO fire in every environment through the
  // mirror, but a caller may want a fresh read too).
  const sampleChannels = () => {
    const c = rowCtx;
    if (c === null) {
      return;
    }
    void c.feedback.pressed.getValue().then((pressed) => {
      void c.feedback.scale.getValue().then((scale) => {
        reportChannels({
          pressed,
          scale,
          seamPressed: c.feedback.isPressed(),
          mirror: c.isPressed(),
          origin: c.feedback.pressOrigin(),
          hitSlop: c.feedback.hitSlop() ?? null,
          enabled: c.feedback.enabled(),
          allDisabled: c.isAllAnimationsDisabled(),
          selected: c.isSelected() ?? null,
        });
      });
    });
  };

  return (
    <>
      <ControlField
        testID="cf-row"
        isSelected={selected}
        onSelectedChange={onChange}
        isDisabled={disabled}
        isRequired={required}
        isInvalid={invalid}
        animation={anim === "disable-all" ? "disable-all" : undefined}
        style={tiny ? { width: 24, height: 24 } : { width: 288 }}
        // 2500 ms: the CtxProbe samples the channels 600 ms into the hold;
        // web runs several times slower than headless, so the hold must stay
        // comfortably wider than the sample delay plus timer drift.
        delayLongPress={2500}
        onPress={onEvent("press")}
        onPressDown={onEvent("down")}
        onPressUp={onEvent("up")}
        onFocus={() => reportFocus("focus")}
        onLayout={(e) =>
          reportLayout({
            name: "row",
            width: e.bounds.size.width,
            height: e.bounds.size.height,
          })
        }
      >
        <View class="flex-1 flex-col gap-0.5">
          <Label testID="cf-label">Notifications</Label>
          {short ? undefined : (
            <>
              <Description>Get notified about activity</Description>
              <FieldError>Something is wrong</FieldError>
            </>
          )}
        </View>
        <ControlField.Indicator variant={variant} />
        <CtxProbe />
      </ControlField>
      <Btn id="ctx-sample" onPress={sampleChannels} />
    </>
  );
}

/* -------------------------------------------------------------------------------------------------
 * fn case (M-004): function children on the row and on the Indicator
 * -----------------------------------------------------------------------------------------------*/

function FnCase() {
  const reportChange = probe("change");
  const selected = String(host.params.selected ?? "") === "1";
  const disabled = String(host.params.disabled ?? "") === "1";
  const invalid = String(host.params.invalid ?? "") === "1";

  return (
    <ControlField
      testID="cf-row"
      isSelected={selected}
      onSelectedChange={reportChange}
      isDisabled={disabled}
      isInvalid={invalid}
      style={{ width: 288 }}
    >
      {(values) => (
        <>
          <Text>
            {`fn:sel=${values.isSelected() === true ? "1" : "0"},dis=${values.isDisabled() ? "1" : "0"},inv=${values.isInvalid() ? "1" : "0"}`}
          </Text>
          <ControlField.Indicator>
            {(indicator) => (
              <Text testID="fn-indicator">
                {`ind:sel=${indicator.isSelected() === true ? "1" : "0"},dis=${indicator.isDisabled() ? "1" : "0"},inv=${indicator.isInvalid() ? "1" : "0"}`}
              </Text>
            )}
          </ControlField.Indicator>
        </>
      )}
    </ControlField>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  row: RowCase,
  fn: FnCase,
};

function Fixture() {
  const name = String(host.params.case ?? "row");
  const Case = cases[name] ?? RowCase;

  return (
    <Frame>
      <Scoped>
        <Case />
      </Scoped>
    </Frame>
  );
}

mount(Fixture);
