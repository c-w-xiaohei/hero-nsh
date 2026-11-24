import { host, mount } from "nsh";
import type { JSX } from "nsh";
import { EnvironmentScope, InputOTP } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only InputOTP fixtures for the adapt unit (adapt sheet A-010): the
 * shared scenarios in `scenarios/input-otp.scenarios.tsx` stay untouched, so
 * the cases the mobile assertions need are selected here with
 * `host.params.case`:
 *
 *   basic          uncontrolled `maxLength={6}`; probes record onChange
 *                  (whole code), onFocus, onBlur, onSubmit and onPaste, and a
 *                  `layout` probe reports each slot's onLayout bounds (the
 *                  A-001 hit-surface measurement)
 *   complete       `maxLength={4}` with the onComplete probe (M-003)
 *   readonly       `readOnly` with `defaultValue="123"` and onChange (M-006)
 *   disabled       `isDisabled` with onChange (M-006)
 *   autocomplete   `autoComplete="sms-otp"` — the explicit Android SMS-fill
 *                  opt-in path the sheet's §8 difference registers (M-004)
 *   keyboard-type  `inputMode="tel"` + `keyboardType="default"` — explicit
 *                  keyboardType winning over the inputMode tier (M-004)
 *   return-key     `maxLength={4}` + `returnKeyType="done"` with onComplete,
 *                  onSubmit and onBlur probes (M-003's enter half; a silent
 *                  onBlur is the kept-focus half)
 *
 * `host.params.scope` picks the environment: "" leaves the host's default
 * (pointer on headless/web — the desktop-parity half); "touch" wraps the
 * case in `EnvironmentScope input="touch"` (the switch convention), the
 * injected environment the assertions drive. The test-only params
 * `testInput` ("pointer"/"touch") inject an outer EnvironmentScope input.
 */

function Scoped(props: { children?: JSX.Element }) {
  // Test-harness environment params (only the mobile tests set them —
  // absent keeps the host-derived default): `scope="touch"` is the inner
  // override, `testInput` ("pointer"/"touch") injects the scope so the
  // pointer baseline is host-independent (the inner `scope` still wins).
  // One provider only: `props.children` is placed inside it directly —
  // pre-building a fragment first would mount the children under this
  // component's own creation scope instead of the provider.
  const input =
    String(host.params.scope ?? "") === "touch"
      ? "touch"
      : ((v) => (v === "pointer" || v === "touch" ? v : undefined))(
          String(host.params.testInput ?? ""),
        );

  return input !== undefined ? (
    <EnvironmentScope input={input}>{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}
/* The upstream `renderOtp` fixture: two groups of three slots around a separator. */
function Slots() {
  return (
    <>
      <InputOTP.Group>
        <InputOTP.Slot index={0} />
        <InputOTP.Slot index={1} />
        <InputOTP.Slot index={2} />
      </InputOTP.Group>
      <InputOTP.Separator />
      <InputOTP.Group>
        <InputOTP.Slot index={3} />
        <InputOTP.Slot index={4} />
        <InputOTP.Slot index={5} />
      </InputOTP.Group>
    </>
  );
}

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A slot's onLayout, flattened for the probe's storage. */
function slotLayout(index: number) {
  return (event: LayoutEvent) =>
    probe("layout")({
      index,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/** Slots that report their bounds; the `layout` case reads them from storage. */
function MeasuredSlots() {
  return (
    <InputOTP.Group>
      <InputOTP.Slot index={0} onLayout={slotLayout(0)} />
      <InputOTP.Slot index={1} onLayout={slotLayout(1)} />
      <InputOTP.Slot index={2} onLayout={slotLayout(2)} />
    </InputOTP.Group>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "basic");

  if (name === "complete") {
    return (
      <Scoped>
        <Stage>
          <InputOTP maxLength={4} onComplete={probe("onComplete")} onChange={probe("onChange")}>
            <InputOTP.Group>
              <InputOTP.Slot index={0} />
              <InputOTP.Slot index={1} />
              <InputOTP.Slot index={2} />
              <InputOTP.Slot index={3} />
            </InputOTP.Group>
          </InputOTP>
        </Stage>
      </Scoped>
    );
  }

  if (name === "readonly") {
    return (
      <Scoped>
        <Stage>
          <InputOTP maxLength={6} readOnly defaultValue="123" onChange={probe("onChange")}>
            <Slots />
          </InputOTP>
        </Stage>
      </Scoped>
    );
  }

  if (name === "disabled") {
    return (
      <Scoped>
        <Stage>
          <InputOTP maxLength={6} isDisabled onChange={probe("onChange")}>
            <Slots />
          </InputOTP>
        </Stage>
      </Scoped>
    );
  }

  if (name === "autocomplete") {
    return (
      <Scoped>
        <Stage>
          <InputOTP maxLength={6} autoComplete="sms-otp" onChange={probe("onChange")}>
            <Slots />
          </InputOTP>
        </Stage>
      </Scoped>
    );
  }

  if (name === "keyboard-type") {
    return (
      <Scoped>
        <Stage>
          <InputOTP
            maxLength={6}
            inputMode="tel"
            keyboardType="default"
            onChange={probe("onChange")}
          >
            <Slots />
          </InputOTP>
        </Stage>
      </Scoped>
    );
  }

  if (name === "return-key") {
    return (
      <Scoped>
        <Stage>
          <InputOTP
            maxLength={4}
            returnKeyType="done"
            onSubmit={probe("onSubmit")}
            onComplete={probe("onComplete")}
            onChange={probe("onChange")}
            onBlur={probe("onBlur")}
          >
            <InputOTP.Group>
              <InputOTP.Slot index={0} />
              <InputOTP.Slot index={1} />
              <InputOTP.Slot index={2} />
              <InputOTP.Slot index={3} />
            </InputOTP.Group>
          </InputOTP>
        </Stage>
      </Scoped>
    );
  }

  return (
    <Scoped>
      <Stage>
        <InputOTP
          maxLength={6}
          onChange={probe("onChange")}
          onFocus={probe("onFocus")}
          onBlur={probe("onBlur")}
          onSubmit={probe("onSubmit")}
          onPaste={probe("onPaste")}
        >
          <MeasuredSlots />
          <InputOTP.Separator />
          <InputOTP.Group>
            <InputOTP.Slot index={3} />
            <InputOTP.Slot index={4} />
            <InputOTP.Slot index={5} />
          </InputOTP.Group>
        </InputOTP>
      </Stage>
    </Scoped>
  );
}

mount(Fixture);
