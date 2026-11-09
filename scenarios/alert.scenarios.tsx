import { Alert, Button, CloseButton } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared Alert scenarios, written with HeroUI's API only, so the reference app
 * (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * `basic` is the danger case with an empty indicator: its default icon and its
 * title are the only texts, so T-004 can read the icon's identity. `statuses`
 * carries one Alert per status for the title-color assertions (T-002, T-003).
 * `custom-indicator` puts a bare string in the indicator (T-005).
 * `no-description` mirrors the story's success case without a description.
 * `with-actions` and `long-text` keep the story's action slot and its long
 * warning copy for the screenshot comparison.
 */

function Basic() {
  return (
    <Stage>
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Unable to connect</Alert.Title>
        </Alert.Content>
      </Alert>
    </Stage>
  );
}

function Statuses() {
  return (
    <Stage>
      <Alert>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Default</Alert.Title>
          <Alert.Description>General information.</Alert.Description>
        </Alert.Content>
      </Alert>
      <Alert status="accent">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Accent</Alert.Title>
          <Alert.Description>Priority notice.</Alert.Description>
        </Alert.Content>
      </Alert>
      <Alert status="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Success</Alert.Title>
          <Alert.Description>Saved to your profile.</Alert.Description>
        </Alert.Content>
      </Alert>
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Warning</Alert.Title>
          <Alert.Description>Almost out of space.</Alert.Description>
        </Alert.Content>
      </Alert>
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Danger</Alert.Title>
          <Alert.Description>Could not reach the server.</Alert.Description>
        </Alert.Content>
      </Alert>
    </Stage>
  );
}

function CustomIndicator() {
  return (
    <Stage>
      <Alert status="accent">
        <Alert.Indicator>Loading…</Alert.Indicator>
        <Alert.Content>
          <Alert.Title>Processing</Alert.Title>
        </Alert.Content>
      </Alert>
    </Stage>
  );
}

function NoDescription() {
  return (
    <Stage>
      <Alert status="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Profile updated successfully</Alert.Title>
        </Alert.Content>
      </Alert>
    </Stage>
  );
}

function WithActions() {
  return (
    <Stage>
      <Alert status="accent">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Update available</Alert.Title>
          <Alert.Description>
            A new version of the application is available. Please refresh to get the latest
            features and bug fixes.
          </Alert.Description>
          <Button className="mt-2" size="sm" variant="primary">
            Refresh
          </Button>
        </Alert.Content>
        <CloseButton />
      </Alert>
    </Stage>
  );
}

function LongText() {
  return (
    <Stage>
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Storage almost full</Alert.Title>
          <Alert.Description>
            You're using 90% of your storage quota. Consider upgrading your plan or removing
            unused files to avoid service interruption.
          </Alert.Description>
        </Alert.Content>
      </Alert>
    </Stage>
  );
}

export const alertScenarios: Record<string, Component> = {
  "alert/basic": Basic,
  "alert/statuses": Statuses,
  "alert/custom-indicator": CustomIndicator,
  "alert/no-description": NoDescription,
  "alert/with-actions": WithActions,
  "alert/long-text": LongText,
};
