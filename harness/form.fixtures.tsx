import { host, mount, View } from "nsh";
import { Input } from "nsh/base";
import { Button, FieldError, Form } from "@heroui/react";
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
 *   submit   Form onSubmit writes probe + Button type="submit" (T-002)
 *   errors   Form validationErrors + the field consumer rendering FieldError (T-003)
 */

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
      {name === "basic" ? (
        <Form aria-label="Profile">
          <Input accessibilityLabel="Your name" />
        </Form>
      ) : name === "submit" ? (
        <Form
          aria-label="Profile"
          onSubmit={(event) => {
            event.preventDefault();
            submitted(event);
          }}
        >
          <Button type="submit">Save</Button>
        </Form>
      ) : (
        <Form aria-label="Profile" validationErrors={{ name: "Name is required" }}>
          <FieldProbe />
        </Form>
      )}
    </View>
  );
}

mount(Fixture);
