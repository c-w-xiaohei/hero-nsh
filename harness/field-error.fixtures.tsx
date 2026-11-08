import { host, mount, signal, Text, View } from "nsh";
import { FieldError } from "@heroui/react";
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
 */

function Fixture() {
  const name = String(host.params.case ?? "invalid");
  const message = String(host.params.message ?? "Enter a valid email");
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
    registerErrorMessage: (text: () => string | undefined) => {
      const value = text();

      if (value !== undefined) registered(value);

      return () => {};
    },
  };

  return (
    <View class="flex-col gap-2 p-4">
      <FieldErrorContext.Provider value={state}>
        {transition ? (
          <View class="flex-col gap-2">
            <FieldError id={id} />
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
          <FieldError id={id} />
        ) : (
          <FieldError id={id}>
            {name === "render-props"
              ? ({ isInvalid }: { isInvalid: () => boolean }) =>
                  isInvalid() ? <Text>Rendered via props</Text> : null
              : message}
          </FieldError>
        )}
      </FieldErrorContext.Provider>
    </View>
  );
}

mount(Fixture);
