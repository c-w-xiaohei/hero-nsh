import { host, mount, signal, Text, View } from "nsh";
import { Dialog } from "nsh/base";
import { Button, Dropdown, Label } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Dropdown unit (port sheet 4b).
 *
 * The shared scenarios cover the stories. These cases cover what a shared
 * scenario cannot place: the trigger's focus events (T-009), the controlled
 * isOpen channel together with a modal-level overlay (T-006 / T-008), and the
 * handoff to that overlay (T-005 / T-007 / T-013).
 *
 * Modal, AlertDialog and Drawer are not in this batch (port sheet section 5),
 * so every modal-level host is the landed nsh/base `Dialog`. It stands in for
 * the layer, not for the component: the cases keep only the dropdown half of
 * the upstream assertions (the popover is gone, its row text is gone) and drop
 * the `dialog` / `alertdialog` role assertions the port sheet names.
 *
 * Cases (`host.params.case`):
 *
 *   default           DropdownFixture: three rows, action + trigger focus probes
 *   modal-handoff     select "Open modal" opens a Dialog in the same action
 *   dialog-handoff    controlled isOpen closed in onAction, Dialog opens (T-006/T-008)
 *   drawer-handoff    select "Open drawer" opens a Dialog in the same action
 *   inside-dialog     a Dropdown inside an open Dialog; its row still acts (T-013)
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

/* -------------------------------------------------------------------------------------------------
 * DropdownFixture
 * -----------------------------------------------------------------------------------------------*/

function DefaultCase() {
  return (
    <View class="items-start gap-2 p-4">
      <Dropdown>
        <Dropdown.Trigger
          aria-label="Menu"
          onFocus={probe("triggerFocus")}
          onBlur={probe("triggerBlur")}
        >
          Actions
        </Dropdown.Trigger>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={probe("onAction")}>
            <Dropdown.Item id="new-file" textValue="New file">
              <Label>New file</Label>
            </Dropdown.Item>
            <Dropdown.Item id="copy-link" textValue="Copy link">
              <Label>Copy link</Label>
            </Dropdown.Item>
            <Dropdown.Item id="delete-file" textValue="Delete file">
              <Label>Delete file</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Handoffs: an item opens a modal-level overlay in the same action
 * -----------------------------------------------------------------------------------------------*/

/** Uncontrolled dropdown whose item opens a Dialog in the same action (T-005 / T-007). */
function HandoffCase(props: { row: string; dialogText: string }) {
  const opened = signal(false);

  return (
    <View class="items-start gap-2 p-4">
      <Dropdown>
        <Dropdown.Trigger aria-label="Menu">Actions</Dropdown.Trigger>
        <Dropdown.Popover>
          <Dropdown.Menu
            onAction={() => {
              probe("onAction")();
              opened.set(true);
            }}
          >
            <Dropdown.Item id="open" textValue={props.row}>
              <Label>{props.row}</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <Dialog open={opened()}>
        <View class="items-start gap-2 p-4">
          <Text>{props.dialogText}</Text>
          <Button>Inside action</Button>
        </View>
      </Dialog>
    </View>
  );
}

/** Controlled dropdown closed inside `onAction`, with a Dialog opened in the same action (T-006 / T-008). */
function ControlledHandoffCase() {
  const menuOpen = signal(false);
  const dialogOpen = signal(false);

  return (
    <View class="items-start gap-2 p-4">
      <Dropdown isOpen={menuOpen()} onOpenChange={(isOpen: boolean) => menuOpen.set(isOpen)}>
        <Dropdown.Trigger aria-label="Menu">Actions</Dropdown.Trigger>
        <Dropdown.Popover>
          <Dropdown.Menu
            onAction={() => {
              probe("onAction")();
              menuOpen.set(false);
              dialogOpen.set(true);
            }}
          >
            <Dropdown.Item id="delete" textValue="Delete project">
              <Label>Delete project</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <Dialog open={dialogOpen()}>
        <View class="items-start gap-2 p-4">
          <Text>Confirm deletion</Text>
          <Text>This action cannot be undone.</Text>
        </View>
      </Dialog>
    </View>
  );
}

/** A Dropdown inside an open Dialog (T-013). */
function InsideDialogCase() {
  const dialogOpen = signal(false);

  return (
    <View class="items-start gap-2 p-4">
      <Button onPress={() => dialogOpen.set(true)}>Open modal</Button>

      <Dialog
        open={dialogOpen()}
        onOpenChange={(event: { open: boolean }) => {
          if (!event.open) {
            dialogOpen.set(false);
          }
        }}
      >
        <View class="items-start gap-2 p-4">
          <Text>Modal with dropdown</Text>
          <Dropdown>
            <Dropdown.Trigger aria-label="Menu">Actions</Dropdown.Trigger>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={probe("onAction")}>
                <Dropdown.Item id="rename" textValue="Rename">
                  <Label>Rename</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </View>
      </Dialog>
    </View>
  );
}

function Case() {
  const name = String(host.params.case ?? "default");

  if (name === "modal-handoff") {
    return <HandoffCase dialogText="Modal from dropdown" row="Open modal" />;
  }

  if (name === "drawer-handoff") {
    return <HandoffCase dialogText="Drawer from dropdown" row="Open drawer" />;
  }

  if (name === "dialog-handoff") {
    return <ControlledHandoffCase />;
  }

  if (name === "inside-dialog") {
    return <InsideDialogCase />;
  }

  return <DefaultCase />;
}

mount(Case);
