import { Text } from "nsh";
import {
  Button,
  Description,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  TextArea,
  TextField,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * Shared Fieldset scenarios. They use only the HeroUI API so the reference app
 * (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * `composed` is the upstream regression fixture (fieldset.test.tsx:6), with the
 * test's `<span>` replaced by `<Text>`: NSH has no HTML elements and a bare
 * string inside a View does not render. `disabled` is the same structure under
 * `<Fieldset disabled>` and carries a probe on the action button, which is what
 * the ported `data-disabled` case observes.
 *
 * `form` merges the story `Default` (fieldset.stories.tsx): HeroUI's docs form
 * with Legend, Description, three TextFields and the two action buttons. The
 * story's `alert(...)` and the iconify icons are dropped (no dialogs, no svg on
 * this side); the rest is the same JSX. It serves the screenshot comparison and
 * no 4b assertion.
 */

function Composed() {
  return (
    <Stage>
      <Fieldset className="w-96">
        <Fieldset.Legend>Profile</Fieldset.Legend>
        <Fieldset.Group>
          <Text>Name field</Text>
        </Fieldset.Group>
        <Fieldset.Actions>
          <Button>Save</Button>
        </Fieldset.Actions>
      </Fieldset>
    </Stage>
  );
}

function Disabled() {
  const pressed = probe("fieldset.save");

  return (
    <Stage>
      <Fieldset className="w-96" disabled>
        <Fieldset.Legend>Profile</Fieldset.Legend>
        <Fieldset.Group>
          <Text>Name field</Text>
        </Fieldset.Group>
        <Fieldset.Actions>
          <Button onPress={pressed}>Save</Button>
        </Fieldset.Actions>
      </Fieldset>
    </Stage>
  );
}

function FormExample() {
  return (
    <Stage>
      <Form onSubmit={(event) => event.preventDefault()}>
        <Fieldset className="w-96">
          <Fieldset.Legend>Profile Settings</Fieldset.Legend>
          <Description>Update your profile information.</Description>
          <Fieldset.Group>
            <TextField
              isRequired
              name="name"
              validate={(value) => (value.length < 3 ? "Name must be at least 3 characters" : null)}
            >
              <Label>Name</Label>
              <Input placeholder="John Doe" />
              <FieldError />
            </TextField>
            <TextField isRequired name="email" type="email">
              <Label>Email</Label>
              <Input placeholder="john@example.com" />
              <FieldError />
            </TextField>
            <TextField
              isRequired
              name="bio"
              validate={(value) =>
                value.length < 10 ? "Bio must be at least 10 characters" : null
              }
            >
              <Label>Bio</Label>
              <TextArea placeholder="Tell us about yourself..." />
              <Description>Minimum 10 characters</Description>
              <FieldError />
            </TextField>
          </Fieldset.Group>
          <Fieldset.Actions>
            <Button type="submit">Save changes</Button>
            <Button type="reset" variant="tertiary">
              Cancel
            </Button>
          </Fieldset.Actions>
        </Fieldset>
      </Form>
    </Stage>
  );
}

export const fieldsetScenarios = {
  "fieldset/composed": Composed,
  "fieldset/disabled": Disabled,
  "fieldset/form": FormExample,
};
