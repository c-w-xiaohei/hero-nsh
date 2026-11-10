import { Text, View } from "nsh";
import { Button, Card, Form, Input, Label, Link, TextField } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared Card scenarios, written with HeroUI's API only (plus `View` / `Text`
 * for the two stories whose markup is a raw `div` / `img`), so the reference
 * app (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * `composition` is the upstream T-001 JSX plus one bare string in the header
 * (T-001's fifth assertion: Header wraps strings in a Text too, R-014).
 * `basic` is `<Card>Body</Card>`, the root's bare-string path. `variants` puts
 * all four variants on one stage: the only automatic check is that no class is
 * unknown, and the four backgrounds are the screenshot / eyeball baseline
 * (T-003 has no queryable equivalent).
 * `story-default`, `story-horizontal` and `story-form` keep the three stories
 * whose structure is worth rendering: arbitrary children plus Footer, caller
 * classes beating the slot classes, and Card as a container around a Form.
 * The icon, image and avatar are replaced by plain Views: only the layout is
 * under test here.
 */

function Composition() {
  return (
    <Stage>
      <Card className="w-[320px]">
        <Card.Header>
          Header note
          <Card.Title>Title</Card.Title>
          <Card.Description>Description</Card.Description>
        </Card.Header>
        <Card.Content>Content</Card.Content>
        <Card.Footer>Footer</Card.Footer>
      </Card>
    </Stage>
  );
}

function Basic() {
  return (
    <Stage>
      <Card className="w-[320px]">Body</Card>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <Card className="w-64" variant="default">
        <Card.Header>
          <Card.Title>Default card</Card.Title>
          <Card.Description>Standard card appearance.</Card.Description>
        </Card.Header>
        <Card.Content>The default variant for most use cases.</Card.Content>
        <Card.Footer>Default footer</Card.Footer>
      </Card>
      <Card className="w-64" variant="secondary">
        <Card.Header>
          <Card.Title>Secondary card</Card.Title>
          <Card.Description>Medium prominence.</Card.Description>
        </Card.Header>
        <Card.Content>Use to draw moderate attention.</Card.Content>
        <Card.Footer>Secondary footer</Card.Footer>
      </Card>
      <Card className="w-64" variant="tertiary">
        <Card.Header>
          <Card.Title>Tertiary card</Card.Title>
          <Card.Description>Higher prominence.</Card.Description>
        </Card.Header>
        <Card.Content>Use for primary or featured content.</Card.Content>
        <Card.Footer>Tertiary footer</Card.Footer>
      </Card>
      <Card className="w-64" variant="transparent">
        <Card.Header>
          <Card.Title>Transparent card</Card.Title>
          <Card.Description>Minimal prominence.</Card.Description>
        </Card.Header>
        <Card.Content>Use for less important or nested content.</Card.Content>
        <Card.Footer>Transparent footer</Card.Footer>
      </Card>
    </Stage>
  );
}

function StoryDefault() {
  return (
    <Stage>
      <Card className="w-[400px]">
        <View class="size-6 rounded-full bg-accent" />
        <Card.Header>
          <Card.Title>Become an Acme Creator!</Card.Title>
          <Card.Description>
            Visit the Acme Creator Hub to sign up today and start earning credits from your fans
            and followers.
          </Card.Description>
        </Card.Header>
        <Card.Footer>
          <Link href="https://heroui.com">Creator Hub</Link>
        </Card.Footer>
      </Card>
    </Stage>
  );
}

function StoryHorizontal() {
  return (
    <Stage>
      <Card className="w-full items-stretch md:flex-row">
        <View class="aspect-square w-full rounded-3xl bg-surface-tertiary md:max-w-[136px]" />
        <View class="flex flex-1 flex-col gap-3">
          <Card.Header className="gap-1">
            <Card.Title>Get the new Porsche 911 golden edition</Card.Title>
            <Card.Description>
              Experience unmatched luxury and performance with the Porsche 911 Golden Edition.
            </Card.Description>
          </Card.Header>
          <Card.Footer className="mt-auto flex w-full flex-row items-center justify-between">
            <View class="flex flex-col">
              <Text class="text-sm font-medium text-foreground">$36,799</Text>
              <Text class="text-xs text-muted">11 available</Text>
            </View>
            <Button>Buy Now</Button>
          </Card.Footer>
        </View>
      </Card>
    </Stage>
  );
}

function StoryForm() {
  return (
    <Stage>
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Login</Card.Title>
          <Card.Description>Enter your credentials to access your account</Card.Description>
        </Card.Header>
        <Form aria-label="Login" onSubmit={(event) => event.preventDefault()}>
          <Card.Content>
            <View class="flex flex-col gap-4">
              <TextField name="email" type="email">
                <Label>Email</Label>
                <Input placeholder="email@example.com" variant="secondary" />
              </TextField>
              <TextField name="password" type="password">
                <Label>Password</Label>
                <Input placeholder="••••••••" variant="secondary" />
              </TextField>
            </View>
          </Card.Content>
          <Card.Footer className="mt-4 flex flex-col gap-2">
            <Button className="w-full" type="submit">
              Sign In
            </Button>
            <Link className="text-center text-sm" href="#">
              Forgot password?
            </Link>
          </Card.Footer>
        </Form>
      </Card>
    </Stage>
  );
}

export const cardScenarios: Record<string, Component> = {
  "card/composition": Composition,
  "card/basic": Basic,
  "card/variants": Variants,
  "card/story-default": StoryDefault,
  "card/story-horizontal": StoryHorizontal,
  "card/story-form": StoryForm,
};
