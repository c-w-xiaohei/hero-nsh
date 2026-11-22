import { host, mount, View } from "nsh";
import type { JSX } from "nsh";
import { Input } from "nsh/base";
import { Button, EnvironmentScope, FieldError, Form } from "@heroui/react";
import { probe } from "@scenario/probe";
import { FormContext } from "../src/components/form/context";
import { FieldErrorContext } from "../src/components/field-error/context";

/*
 * NSH-only fixture for the Form unit (port sheet 4b), not a shared scenario:
 * upstream's field cases render TextField + Label + Input, and TextField is a
 * parallel unit this one cannot see. This fixture plays the missing parts with
 * the least that works: `nsh/base`'s Input stands in for the textbox, and a
 * small consumer reads the FormContext the way a field root would (port sheet
 * §5.3), handing the entry to FieldErrorContext so FieldError can show it.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json: the `@heroui/react` alias does not resolve and the build drops the
 * class tokens. A file here keeps the alias (the public entry is what is
 * tested) and the theme.
 *
 * host.params.case picks the shape:
 *   basic    Form aria-label="Profile" + Input accessibilityLabel="Your name" (T-001)
 *   submit   Form onSubmit writes probe + Button type="submit" (T-002) plus
 *            the mobile layer's additions: a bridged Input ("Your name",
 *            submitBehavior="submit", its onSubmit → FormContext.submit)
 *            and an `away` pressable for the blank-area assertion
 *   errors   Form validationErrors + the field consumer rendering FieldError (T-003)
 *
 * Mobile-layer param (adapt sheet A-008):
 *   scope    "" = the host's default environment (pointer — the desktop-parity
 *            side); "touch" wraps the case in EnvironmentScope(input="touch"),
 *            the injected environment the assertions drive.
 */

function Scoped(props: { children?: JSX.Element }) {
  return String(host.params.scope ?? "") === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

/*
 * The mobile layer's keyboard-submit consumer (adapt sheet A-005/A-008): a
 * single-line `nsh/base` Input whose Return is bridged into
 * `FormContext.submit()` the way a field root will do it once the field
 * units land — the minimal equivalent consumer, reading the context by the
 * same path FieldProbe does. It must mount inside the Form to see the
 * provider.
 */
function SubmitField() {
  const form = FormContext();

  return (
    <Input
      accessibilityLabel="Your name"
      submitBehavior="submit"
      onSubmit={() => form?.submit()}
    />
  );
}

function FieldProbe() {
  const form = FormContext();

  const errors = (): readonly string[] => {
    const raw = form?.validationErrors()["name"];

    return raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  };

  return (
    <FieldErrorContext.Provider value={{ isInvalid: () => errors().length > 0, validationErrors: errors }}>
      <FieldError />
    </FieldErrorContext.Provider>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "basic");
  const submitted = probe("form.submit");

  return (
    <View class="flex-col gap-2 p-4">
      <Scoped>
      {name === "basic" ? (
        <Form aria-label="Profile">
          <Input accessibilityLabel="Your name" />
        </Form>
      ) : name === "submit" ? (
        <>
          <Form
            aria-label="Profile"
            onSubmit={(event) => {
              event.preventDefault();
              submitted(event);
            }}
          >
            <SubmitField />
            <Button type="submit">Save</Button>
          </Form>
          {/* A pressable sibling outside the Form: M-003 presses it to prove
              a pointer near the container adds no submit path. */}
          <View testID="away" role="button" class="p-2" onPress={probe("away")} />
        </>
      ) : (
        <Form aria-label="Profile" validationErrors={{ name: "Name is required" }}>
          <FieldProbe />
        </Form>
      )}
      </Scoped>
    </View>
  );
}

mount(Fixture);
