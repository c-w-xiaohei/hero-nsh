import { signal, Text } from "nsh";
import { Button, Form } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * Shared Form scenarios (port sheet 4b), written with HeroUI's API only so the
 * reference app (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * `form/submit` is the only shared case: Form draws nothing, so the visible
 * content is the submit button and the counter beside it. The field cases
 * (T-001, T-003) need TextField / Input, which belong to a parallel unit, and
 * live in the NSH-only fixture at harness/form.fixtures.tsx.
 *
 * The callback goes through `probe`, the shared way the tests read callbacks
 * back; the counter gives the scenario its own visible evidence of the submit.
 */
function Submit() {
  const submitted = probe("form.submit");
  const count = signal(0);

  return (
    <Stage>
      <Form
        aria-label="Profile"
        onSubmit={(event) => {
          event.preventDefault();
          count.set(count() + 1);
          submitted(event);
        }}
      >
        <Button type="submit">Save</Button>
      </Form>
      <Text>Submitted: {count()} times</Text>
    </Stage>
  );
}

export const formScenarios = {
  "form/submit": Submit,
};
