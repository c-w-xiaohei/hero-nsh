import type { JSX } from "nsh";
import { Text, View } from "nsh";
import {
  Alert,
  AlertDialog,
  Button,
  CloseButton,
  Description,
  Drawer,
  Dropdown,
  Header,
  Kbd,
  Label,
  Link,
  Menu,
  Modal,
  Popover,
  Separator,
  Toast,
  Tooltip,
  toast,
} from "hero-nsh";
import { shadow } from "../../src/tokens/geometry";
import { Section } from "./ui";

function Row(props: { children?: JSX.Element }) {
  return <View class="flex-row flex-wrap items-center gap-2">{props.children}</View>;
}

function Alerts() {
  return (
    <Section title="Alert">
      <View class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Alert status="accent">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>New version available</Alert.Title>
            <Alert.Description>Restart the app to pick up the latest changes.</Alert.Description>
          </Alert.Content>
        </Alert>
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Workspace published</Alert.Title>
            <Alert.Description>Everyone with the link can open it now.</Alert.Description>
          </Alert.Content>
        </Alert>
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Storage is almost full</Alert.Title>
            <Alert.Description>Free up space or raise the plan before Friday.</Alert.Description>
          </Alert.Content>
        </Alert>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Payment failed</Alert.Title>
            <Alert.Description>The card ending 4242 was declined. Retry to keep the plan.</Alert.Description>
          </Alert.Content>
        </Alert>
      </View>
    </Section>
  );
}

function AlertDialogs() {
  return (
    <Section title="AlertDialog">
      <Row>
        <AlertDialog>
          <Button variant="danger-soft">Open delete confirmation</Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog>
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>Delete project permanently?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <Text class="text-sm text-foreground">
                    Every order, member and setting in Acme goes away. This cannot be undone.
                  </Text>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">Cancel</Button>
                  <Button slot="close" variant="danger">Delete project</Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>

        <AlertDialog>
          <Button variant="secondary">Open discard confirmation</Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog>
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="warning" />
                  <AlertDialog.Heading>Discard this draft?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <Text class="text-sm text-foreground">
                    The draft has unsaved changes from the last ten minutes.
                  </Text>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">Keep editing</Button>
                  <Button slot="close" variant="secondary">Discard</Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </Row>
    </Section>
  );
}

function Modals() {
  return (
    <Section title="Modal">
      <Row>
        <Modal>
          <Button>Open modal</Button>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Invite teammates</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <View class="flex-col gap-3">
                  <Text class="text-sm">
                    Anyone with this link joins Acme as a viewer. You can change their role later.
                  </Text>
                  <View class="flex-row items-center justify-between gap-3 rounded-2xl bg-default px-3 py-2">
                    <Text class="text-sm text-default-foreground">acme.app/join/4F2K</Text>
                    <Button size="sm" variant="tertiary">Copy link</Button>
                  </View>
                  </View>
                </Modal.Body>
                <Modal.Footer>
                  <Button slot="close" variant="secondary">Done</Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        <Modal>
          <Button variant="secondary">Open compact modal</Button>
          <Modal.Backdrop variant="blur">
            <Modal.Container size="sm">
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Session expired</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <Text class="text-sm text-foreground">Sign in again to keep working.</Text>
                </Modal.Body>
                <Modal.Footer>
                  <Button slot="close">Sign in</Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </Row>
    </Section>
  );
}

function Drawers() {
  return (
    <Section title="Drawer">
      <Row>
        <Drawer>
          <Button>Open bottom drawer</Button>
          <Drawer.Backdrop>
            <Drawer.Content>
              <Drawer.Dialog>
                <Drawer.Handle />
                <Drawer.CloseTrigger />
                <Drawer.Header>
                  <Drawer.Heading>Filters</Drawer.Heading>
                </Drawer.Header>
                <Drawer.Body>
                  <Text class="text-sm text-foreground">
                    Narrow the list to open orders from this week.
                  </Text>
                </Drawer.Body>
                <Drawer.Footer>
                  <Button slot="close" variant="secondary">Reset</Button>
                  <Button slot="close">Apply filters</Button>
                </Drawer.Footer>
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        </Drawer>

        <Drawer>
          <Button variant="secondary">Open side drawer</Button>
          <Drawer.Backdrop>
            <Drawer.Content placement="right">
              <Drawer.Dialog>
                <Drawer.CloseTrigger />
                <Drawer.Header>
                  <Drawer.Heading>Order #1042</Drawer.Heading>
                </Drawer.Header>
                <Drawer.Body>
                  <Text class="text-sm text-foreground">
                    Ada Lovelace · two items · placed today at 09:14.
                  </Text>
                </Drawer.Body>
                <Drawer.Footer>
                  <Button slot="close">Close</Button>
                </Drawer.Footer>
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        </Drawer>
      </Row>
    </Section>
  );
}

function Popovers() {
  return (
    <Section title="Popover">
      <Row>
        <Popover>
          <Button variant="secondary">Open popover</Button>
          <Popover.Content>
            <Popover.Dialog>
              <Popover.Heading>Workspace access</Popover.Heading>
              <Text class="text-sm text-muted">Editors can publish and invite viewers.</Text>
              <Link href="https://example.com/access">Manage access</Link>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>

        <Popover>
          <Button variant="tertiary">Open top popover</Button>
          <Popover.Content placement="top">
            <Popover.Dialog>
              <Popover.Heading>What's new</Popover.Heading>
              <Text class="text-sm text-muted">Three fixes shipped this week.</Text>
              <Link href="https://example.com/changelog">Read the changelog</Link>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      </Row>
    </Section>
  );
}

function Tooltips() {
  return (
    <Section title="Tooltip">
      <Row>
        <Tooltip delay={0}>
          <Button variant="secondary">Hover for a tooltip</Button>
          <Tooltip.Content>Saved to this device</Tooltip.Content>
        </Tooltip>

        <Tooltip delay={0}>
          <Button variant="tertiary">Hover for a tooltip with an arrow</Button>
          <Tooltip.Content placement="bottom" showArrow>
            <Tooltip.Arrow />
            Drafts autosave every 30 seconds
          </Tooltip.Content>
        </Tooltip>
      </Row>
    </Section>
  );
}

function Dropdowns() {
  return (
    <Section title="Dropdown">
      <Row>
        <Dropdown>
          <Button variant="secondary">Open actions menu</Button>
          <Dropdown.Popover>
            <Dropdown.Menu aria-label="Document actions">
              <Dropdown.Section>
                <Header>Document</Header>
                <Dropdown.Item id="rename" textValue="Rename">
                  <Label>Rename</Label>
                  <Kbd className="ms-auto" variant="light">
                    <Kbd.Abbr keyValue="command" />
                    <Kbd.Content>R</Kbd.Content>
                  </Kbd>
                </Dropdown.Item>
                <Dropdown.Item id="duplicate" textValue="Duplicate">
                  <Label>Duplicate</Label>
                </Dropdown.Item>
                <Dropdown.Item id="copy-link" textValue="Copy link">
                  <Label>Copy link</Label>
                </Dropdown.Item>
              </Dropdown.Section>
              <Separator />
              <Dropdown.Section>
                <Dropdown.Item id="delete" textValue="Delete" variant="danger">
                  <Label>Delete</Label>
                </Dropdown.Item>
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>

        <Dropdown>
          <Button variant="tertiary">Open sort menu</Button>
          <Dropdown.Popover>
            <Dropdown.Menu aria-label="Sort orders" defaultSelectedKeys={["newest"]} selectionMode="single">
              <Dropdown.Item id="newest" textValue="Newest first">
                <Dropdown.ItemIndicator />
                <Label>Newest first</Label>
              </Dropdown.Item>
              <Dropdown.Item id="oldest" textValue="Oldest first">
                <Dropdown.ItemIndicator />
                <Label>Oldest first</Label>
              </Dropdown.Item>
              <Dropdown.Item id="amount" textValue="Largest amount">
                <Dropdown.ItemIndicator />
                <Label>Largest amount</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </Row>
    </Section>
  );
}

function Menus() {
  return (
    <Section title="Menu">
      <View class={`w-72 overflow-hidden rounded-3xl bg-overlay ${shadow.overlay.both}`}>
        <Menu aria-label="File actions" className="w-full">
          <Menu.Section>
            <Header>Actions</Header>
            <Menu.Item id="new-file" textValue="New file">
              <Label>New file</Label>
              <Kbd className="ms-auto" variant="light">
                <Kbd.Abbr keyValue="command" />
                <Kbd.Content>N</Kbd.Content>
              </Kbd>
            </Menu.Item>
            <Menu.Item id="open-file" textValue="Open file">
              <Label>Open file</Label>
              <Kbd className="ms-auto" variant="light">
                <Kbd.Abbr keyValue="command" />
                <Kbd.Content>O</Kbd.Content>
              </Kbd>
            </Menu.Item>
            <Menu.Item id="duplicate" textValue="Duplicate">
              <Label>Duplicate</Label>
            </Menu.Item>
          </Menu.Section>
          <Separator />
          <Menu.Section>
            <Header>Danger zone</Header>
            <Menu.Item id="delete-file" textValue="Delete file" variant="danger">
              <Label>Delete file</Label>
              <Description>Move to the trash</Description>
            </Menu.Item>
          </Menu.Section>
        </Menu>
      </View>
    </Section>
  );
}

function Toasts() {
  return (
    <Section title="Toast">
      <View class="gap-2">
        <Row>
          <Button
            onPress={() => {
              toast.success("Changes saved", { description: "Your workspace is up to date." });
            }}
          >
            Show success toast
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              toast.warning("Storage almost full", { description: "Free up space or raise the plan." });
            }}
          >
            Show warning toast
          </Button>
          <Button
            variant="danger-soft"
            onPress={() => {
              toast.danger("Upload failed", { description: "The file was larger than 25 MB." });
            }}
          >
            Show danger toast
          </Button>
        </Row>
        <Text class="text-xs text-muted">
          Toasts stack in the bottom-center region and dismiss on their own.
        </Text>
      </View>
    </Section>
  );
}

function CloseButtons() {
  return (
    <Section title="CloseButton">
      <Row>
        <View class="flex-row items-center gap-2 rounded-full bg-default px-3 py-1.5">
          <Text class="text-xs text-default-foreground">Draft saved</Text>
          <CloseButton aria-label="Dismiss the saved notice" />
        </View>
        <View class="flex-row items-center gap-2 rounded-full bg-default px-3 py-1.5">
          <Text class="text-xs text-default-foreground">Filters: open only</Text>
          <CloseButton aria-label="Clear the status filter" />
        </View>
        <CloseButton aria-label="Close panel" />
      </Row>
    </Section>
  );
}

export function FeedbackSection() {
  return (
    <View class="w-full gap-8">
      <Toast.Provider />
      <Alerts />
      <AlertDialogs />
      <Modals />
      <Drawers />
      <Popovers />
      <Tooltips />
      <Dropdowns />
      <Menus />
      <Toasts />
      <CloseButtons />
    </View>
  );
}
