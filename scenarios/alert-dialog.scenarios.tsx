import { Text } from "nsh";
import { AlertDialog, Button } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared scenarios for AlertDialog, written with HeroUI's API only.
 *
 * `alert-dialog/basic`, `alert-dialog/default-open` and
 * `alert-dialog/keyboard-dismiss` are the upstream fixture
 * (heroui/packages/react/tests/components/alert-dialog/fixtures.tsx): a bare
 * `<Button>Delete Project</Button>` inside the Root (React Aria's PressResponder
 * channel, port sheet 5.2), Backdrop → Container → Dialog with CloseTrigger, a
 * danger Icon, Heading "Delete project permanently?", Body and two close-slot
 * buttons in the Footer. The fixture's four props are split across entries
 * because a scenario cannot take props from the test: NSH selects one entry by
 * name (host.params.scenario).
 *
 * The upstream unit suite opens the dialog with `defaultOpen` or with the
 * trigger; both are covered. `basic` stays closed so the trigger press is
 * observable; `default-open` is the blocked-Escape case; `keyboard-dismiss`
 * turns `isKeyboardDismissDisabled` off. Every entry records `onOpenChange`
 * through `probe("openChange")`.
 *
 * `alert-dialog/labelled` carries the Kobalte dialog suite's texts (title /
 * description, kobalte/packages/core/src/alert-dialog/alert-dialog.test.tsx):
 * NSH has no aria-labelledby / aria-describedby id relation channel, so only
 * the visible text matters (port sheet §8).
 */

/* -------------------------------------------------------------------------------------------------
 * Upstream fixture
 * -----------------------------------------------------------------------------------------------*/

function AlertDialogFixture(props: {
  defaultOpen?: boolean;
  isDismissable?: boolean;
  isKeyboardDismissDisabled?: boolean;
}) {
  return (
    <AlertDialog defaultOpen={props.defaultOpen} onOpenChange={probe("openChange")}>
      <Button>Delete Project</Button>
      <AlertDialog.Backdrop
        isDismissable={props.isDismissable}
        isKeyboardDismissDisabled={props.isKeyboardDismissDisabled}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete project permanently?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Text>This action cannot be undone.</Text>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                Cancel
              </Button>
              <Button slot="close" variant="danger">
                Delete Project
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

function Basic() {
  return (
    <Stage>
      <AlertDialogFixture />
    </Stage>
  );
}

function DefaultOpen() {
  return (
    <Stage>
      <AlertDialogFixture defaultOpen />
    </Stage>
  );
}

function KeyboardDismiss() {
  return (
    <Stage>
      <AlertDialogFixture defaultOpen isKeyboardDismissDisabled={false} />
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Kobalte texts
 * -----------------------------------------------------------------------------------------------*/

function Labelled() {
  return (
    <Stage>
      <AlertDialog defaultOpen>
        <Button>Open alert dialog</Button>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>title</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <Text>description</Text>
              </AlertDialog.Body>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </Stage>
  );
}

export const alertDialogScenarios: Record<string, Component> = {
  "alert-dialog/basic": Basic,
  "alert-dialog/default-open": DefaultOpen,
  "alert-dialog/keyboard-dismiss": KeyboardDismiss,
  "alert-dialog/labelled": Labelled,
};
