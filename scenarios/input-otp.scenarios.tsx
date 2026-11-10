import { FieldError, InputOTP, REGEXP_ONLY_CHARS } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared InputOTP scenarios, written with HeroUI 3.2.7's API only (SOP 3.3), so
 * the reference app and this library render the same JSX.
 *
 * Sources:
 *   input-otp/basic       the `renderOtp` fixture of
 *                         heroui/.../input-otp.test.tsx:8 (T-001 … T-007)
 *   input-otp/typing      the same fixture with the onChange probe (T-003)
 *   input-otp/complete    `maxLength={4}` from T-004, with the onComplete probe
 *   input-otp/disabled    `isDisabled` (T-005)
 *   input-otp/invalid     `isInvalid` + `validationErrors` + FieldError (T-006)
 *   input-otp/paste       the typing fixture with the onChange probe (T-007)
 *   input-otp/pattern     `pattern={REGEXP_ONLY_CHARS}` (port sheet §1.2)
 *   input-otp/controlled  a controlled value the fixture records but never writes back
 *   input-otp/secondary   `variant="secondary"`
 *   input-otp/filled      `defaultValue="123"`, unfocused
 *   input-otp/readonly    `readOnly` with a default value and the onChange probe
 *
 * What is not here: `data-slot`, `data-active`, `data-filled`, `data-invalid`
 * and `data-disabled` are D18 differences (port sheet T-001 / T-002 / T-005 /
 * T-006), so no scenario reproduces them.
 */

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

function Basic() {
  return (
    <Stage>
      <InputOTP maxLength={6}>
        <Slots />
      </InputOTP>
    </Stage>
  );
}

function Typing() {
  return (
    <Stage>
      <InputOTP maxLength={6} onChange={probe("onChange")}>
        <Slots />
      </InputOTP>
    </Stage>
  );
}

function Complete() {
  return (
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
  );
}

function Disabled() {
  return (
    <Stage>
      <InputOTP maxLength={6} isDisabled onChange={probe("onChange")}>
        <Slots />
      </InputOTP>
    </Stage>
  );
}

function Invalid() {
  return (
    <Stage>
      <InputOTP maxLength={6} isInvalid validationErrors={["Invalid code"]}>
        <InputOTP.Group>
          <InputOTP.Slot index={0} />
          <InputOTP.Slot index={1} />
          <InputOTP.Slot index={2} />
        </InputOTP.Group>
        <FieldError>Invalid code</FieldError>
      </InputOTP>
    </Stage>
  );
}

function Paste() {
  return (
    <Stage>
      <InputOTP maxLength={6} onChange={probe("onChange")}>
        <Slots />
      </InputOTP>
    </Stage>
  );
}

function Pattern() {
  return (
    <Stage>
      <InputOTP maxLength={6} pattern={REGEXP_ONLY_CHARS} onChange={probe("onChange")}>
        <Slots />
      </InputOTP>
    </Stage>
  );
}

/* A controlled value with no write-back: typing must not move it. */
function Controlled() {
  return (
    <Stage>
      <InputOTP maxLength={6} value="12" onChange={probe("onChange")}>
        <Slots />
      </InputOTP>
    </Stage>
  );
}

function Secondary() {
  return (
    <Stage>
      <InputOTP maxLength={6} variant="secondary">
        <Slots />
      </InputOTP>
    </Stage>
  );
}

function Filled() {
  return (
    <Stage>
      <InputOTP maxLength={6} defaultValue="123" onChange={probe("onChange")}>
        <Slots />
      </InputOTP>
    </Stage>
  );
}

/* `readOnly` blocks edits at the host input; the slots and callbacks must agree. */
function Readonly() {
  return (
    <Stage>
      <InputOTP maxLength={6} readOnly defaultValue="123" onChange={probe("onChange")}>
        <Slots />
      </InputOTP>
    </Stage>
  );
}

export const inputOtpScenarios = {
  "input-otp/basic": Basic,
  "input-otp/typing": Typing,
  "input-otp/complete": Complete,
  "input-otp/disabled": Disabled,
  "input-otp/invalid": Invalid,
  "input-otp/paste": Paste,
  "input-otp/pattern": Pattern,
  "input-otp/controlled": Controlled,
  "input-otp/secondary": Secondary,
  "input-otp/filled": Filled,
  "input-otp/readonly": Readonly,
} satisfies Record<string, Component>;
