import { host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import { EnvironmentScope, FieldError } from "@heroui/react";
import { probe } from "@scenario/probe";
import { FieldErrorContext } from "../src/components/field-error/context";

/*
 * NSH-only fixture for the FieldError unit (port sheet 4b), not a shared
 * scenario: FieldError renders nothing without a field root, the same as React
 * Aria Components, and every field root (TextField, Checkbox, Switch, Radio ...)
 * belongs to another unit. The context below plays the field root's part, so
 * this unit can be observed on its own.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json: the `@heroui/react` alias does not resolve and the build drops the
 * class tokens. A file here keeps the alias (the public entry is what is
 * tested) and the theme.
 *
 * host.params.case picks the field state:
 *   invalid      invalid, error text as children (the default)
 *   valid        valid, error text as children
 *   empty        invalid, no children and no validationErrors (second null gate)
 *   render-props invalid, a render prop as children
 *   toggle       invalid, a toggle field (Checkbox / Switch / Radio)
 *   required     invalid and required
 *   disabled     invalid and disabled
 *   readonly     invalid and readOnly
 *   with-id      invalid with id="foo"
 *   custom-id    invalid with a custom id
 *   transition   invalid with no children; a press sets validationErrors to
 *                ["late error"], the next press clears them (the error text
 *                comes from the RAC fallback, `validationErrors.join(" ")`)
 *
 * host.params.message overrides the error text, so the Kobalte cases that say
 * "ErrorMessage" keep their upstream wording.
 *
 * Mobile unit (adapt-sheets/field-error.md A-007): `ScopedMobile` feeds
 * `host.params.input` / `host.params.density` to `EnvironmentScope`; an absent
 * param keeps the host-derived environment, the desktop-parity baseline.
 * `host.params.partClass` fills the field context's `partClass`, the
 * container-descendant class channel a real field root owns (a switch indents
 * its error under the track). The error Text's `onLayout` probes into
 * `layout` as `{name: "field-error"}`: the `px` padding cell shows there as
 * the box's extra width, which is the observable half of the density axis.
 * Each case builds its own `<FieldError>` element — a JSX element is a
 * ViewRef, so one shared element cannot mount in two branches.
 */

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

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline.
 */
function ScopedMobile(props: { children?: JSX.Element }) {
  const input = String(host.params.input ?? "");
  const density = String(host.params.density ?? "");

  return (
    <EnvironmentScope
      input={input === "touch" || input === "pointer" ? input : undefined}
      density={density === "compact" || density === "default" ? density : undefined}
    >
      {props.children}
    </EnvironmentScope>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "invalid");
  const message = String(host.params.message ?? "Enter a valid email");
  const partClass = String(host.params.partClass ?? "");
  const invalid = name !== "valid";
  const transition = name === "transition";
  const lateErrors = signal<readonly string[]>([]);
  const registered = probe("field-error.registered");
  const id = name === "with-id" ? "foo" : name === "custom-id" ? "custom-form-control-id" : undefined;
  const state = {
    isInvalid: () => invalid,
    validationErrors: () => {
      if (transition) return lateErrors();

      return invalid && name !== "empty" ? [message] : [];
    },
    isToggleField: () => name === "toggle",
    partClass: () => (partClass.length > 0 ? partClass : undefined),
    registerErrorMessage: (text: () => string | undefined) => {
      const value = text();

      if (value !== undefined) registered(value);

      return () => {};
    },
  };

  return (
    <View class="flex-col items-start gap-2 p-4">
      <ScopedMobile>
        <FieldErrorContext.Provider value={state}>
          {transition ? (
            <View class="flex-col gap-2">
              <FieldError
                id={id}
                testID="field-error"
                onLayout={layoutProbe("field-error")}
              />
              <View
                testID="set-late-error"
                role="button"
                class="p-2"
                onPress={() => lateErrors.set(lateErrors().length === 0 ? ["late error"] : [])}
              >
                <Text>toggle late error</Text>
              </View>
            </View>
          ) : name === "empty" ? (
            <FieldError
              id={id}
              testID="field-error"
              onLayout={layoutProbe("field-error")}
            />
          ) : (
            <FieldError
              id={id}
              testID="field-error"
              onLayout={layoutProbe("field-error")}
            >
              {name === "render-props"
                ? ({ isInvalid }: { isInvalid: () => boolean }) =>
                    isInvalid() ? <Text>Rendered via props</Text> : null
                : message}
            </FieldError>
          )}
        </FieldErrorContext.Provider>
      </ScopedMobile>
    </View>
  );
}

mount(Fixture);
