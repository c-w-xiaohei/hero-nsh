import { host, mount, signal, Text, View } from "nsh";
import { ErrorMessage } from "@heroui/react";
import { probe } from "@scenario/probe";
import { FieldErrorContext } from "../src/components/field-error/context";

/*
 * NSH-only fixture for the ErrorMessage unit (port sheet 4b), not a shared
 * scenario: upstream's two container cases render inside TagGroup, which is not
 * ported yet, and the field slot gate they exercise has no NSH counterpart.
 * TagGroup's only contribution here is the `FieldErrorContext` it provides
 * (`partClass` for `.tag-group [slot="errorMessage"]`, and the error text
 * registration the control reads), so this fixture plays that part directly.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json: the `@heroui/react` alias does not resolve and the build drops the
 * class tokens. A file here keeps the alias (the public entry is what is
 * tested) and the theme.
 *
 * host.params.case picks the shape:
 *   in-container  ErrorMessage inside the container context (the default)
 *   gated         the same, but an application signal decides whether it is
 *                 mounted; `clear` flips that signal, as TagGroup's selection
 *                 state does upstream
 */

function Fixture() {
  const name = String(host.params.case ?? "in-container");
  const registered = probe("error-message.registered");
  const shown = signal(true);
  const state = {
    // The container's style decision for the error message (TagGroup: p-1).
    partClass: () => "p-1",
    registerErrorMessage: (text: () => string | undefined) => {
      const value = text();

      if (value !== undefined) registered(value);

      return () => {};
    },
  };

  return (
    <View class="flex-col gap-2 p-4">
      <FieldErrorContext.Provider value={state}>
        {name === "gated" ? (
          <View class="flex-col gap-2">
            {shown() ? <ErrorMessage>Please select at least one category</ErrorMessage> : null}
            <View testID="clear" role="button" class="p-2" onPress={() => shown.set(false)}>
              <Text>clear</Text>
            </View>
          </View>
        ) : (
          <ErrorMessage>Please select at least one category</ErrorMessage>
        )}
      </FieldErrorContext.Provider>
    </View>
  );
}

mount(Fixture);
