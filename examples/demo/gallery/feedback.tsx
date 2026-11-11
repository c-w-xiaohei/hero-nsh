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
import { shadow } from "../../../src/tokens/geometry";
import { Section } from "../ui";

function Row(props: { children?: JSX.Element }) {
  return <View class="flex-row flex-wrap items-center gap-2">{props.children}</View>;
}

/** A titled block inside a section: the state's name, then the one example. */
function State(props: { label: string; children?: JSX.Element }) {
  return (
    <View class="gap-1">
      <Text class="text-xs text-muted">{props.label}</Text>
      {props.children}
    </View>
  );
}

const RELEASE_NOTES = [
  "Popovers now keep their anchor when the window resizes.",
  "The command palette opens on Cmd+K from anywhere in the app.",
  "Drawer focus trapping no longer leaks to the page behind it.",
  "Toasts pause their countdown while the pointer rests on the stack.",
  "Tables remember the column width you drag for the session.",
  "The colour picker accepts hex values without a leading hash.",
  "Date fields format themselves with the workspace locale.",
  "Alert dialogs return focus to the trigger that opened them.",
];

function Alerts() {
  return (
    <Section title="Alert">
      <View class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <State label="default · title and description">
          <Alert status="default">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>New version available</Alert.Title>
              <Alert.Description>Restart the app to pick up the latest changes.</Alert.Description>
            </Alert.Content>
          </Alert>
        </State>
        <State label="default · title only">
          <Alert status="default">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Sync is up to date</Alert.Title>
            </Alert.Content>
          </Alert>
        </State>

        <State label="accent · title and description">
          <Alert status="accent">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Comment mentioned you</Alert.Title>
              <Alert.Description>Ava left a note on the pricing draft.</Alert.Description>
            </Alert.Content>
          </Alert>
        </State>
        <State label="accent · title only">
          <Alert status="accent">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Two new comments</Alert.Title>
            </Alert.Content>
          </Alert>
        </State>

        <State label="success · title and description">
          <Alert status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Workspace published</Alert.Title>
              <Alert.Description>Everyone with the link can open it now.</Alert.Description>
            </Alert.Content>
          </Alert>
        </State>
        <State label="success · title only">
          <Alert status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Backup finished</Alert.Title>
            </Alert.Content>
          </Alert>
        </State>

        <State label="warning · title and description">
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Storage is almost full</Alert.Title>
              <Alert.Description>Free up space or raise the plan before Friday.</Alert.Description>
            </Alert.Content>
          </Alert>
        </State>
        <State label="warning · title only">
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Three sessions expire tonight</Alert.Title>
            </Alert.Content>
          </Alert>
        </State>

        <State label="danger · title and description">
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Payment failed</Alert.Title>
              <Alert.Description>The card ending 4242 was declined. Retry to keep the plan.</Alert.Description>
            </Alert.Content>
          </Alert>
        </State>
        <State label="danger · title only">
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Webhook endpoint is down</Alert.Title>
            </Alert.Content>
          </Alert>
        </State>
      </View>
      <Text class="text-xs text-muted">
        Every status renders with and without a description; the indicator inherits the status colour. The
        component has no close prop, so a dismissible alert is a CloseButton placed beside the content.
      </Text>
    </Section>
  );
}

function AlertDialogs() {
  return (
    <Section title="AlertDialog">
      <View class="gap-3">
        <State label="danger · icon · cancel button · default size · opaque backdrop">
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
          </Row>
        </State>

        <State label="warning · icon · cancel button · small size · blurred backdrop">
          <Row>
            <AlertDialog>
              <Button variant="secondary">Open discard confirmation</Button>
              <AlertDialog.Backdrop variant="blur">
                <AlertDialog.Container size="sm">
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
        </State>

        <State label="success · icon · cancel button · large size · transparent backdrop">
          <Row>
            <AlertDialog>
              <Button variant="tertiary">Open publish confirmation</Button>
              <AlertDialog.Backdrop variant="transparent">
                <AlertDialog.Container size="lg">
                  <AlertDialog.Dialog>
                    <AlertDialog.CloseTrigger />
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="success" />
                      <AlertDialog.Heading>Publish the workspace?</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <Text class="text-sm text-foreground">
                        Viewers can open the workspace as soon as it is published. Drafts stay private.
                      </Text>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button slot="close" variant="tertiary">Cancel</Button>
                      <Button slot="close">Publish</Button>
                    </AlertDialog.Footer>
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
          </Row>
        </State>

        <State label="default · icon · cancel button · extra-small size">
          <Row>
            <AlertDialog>
              <Button variant="outline">Open archive confirmation</Button>
              <AlertDialog.Backdrop>
                <AlertDialog.Container size="xs">
                  <AlertDialog.Dialog>
                    <AlertDialog.CloseTrigger />
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="default" />
                      <AlertDialog.Heading>Archive this board?</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <Text class="text-sm text-foreground">
                        Archived boards stay searchable but leave the sidebar.
                      </Text>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button slot="close" variant="tertiary">Cancel</Button>
                      <Button slot="close" variant="secondary">Archive</Button>
                    </AlertDialog.Footer>
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
          </Row>
        </State>

        <State label="accent · icon · cancel button · cover size · blurred backdrop">
          <Row>
            <AlertDialog>
              <Button variant="secondary">Open onboarding dialog</Button>
              <AlertDialog.Backdrop variant="blur">
                <AlertDialog.Container size="cover">
                  <AlertDialog.Dialog>
                    <AlertDialog.CloseTrigger />
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="accent" />
                      <AlertDialog.Heading>Welcome to Acme</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <Text class="text-sm text-foreground">
                        A three-step tour shows where orders, members and settings live.
                      </Text>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button slot="close" variant="tertiary">Skip</Button>
                      <Button slot="close">Start the tour</Button>
                    </AlertDialog.Footer>
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
          </Row>
        </State>
      </View>
      <Text class="text-xs text-muted">
        All five statuses and all five sizes are shown, with the opaque, blurred and transparent backdrops.
      </Text>
    </Section>
  );
}

function Modals() {
  return (
    <Section title="Modal">
      <View class="gap-3">
        <State label="default size (md) · opaque backdrop · body scrolls inside">
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
          </Row>
        </State>

        <State label="small size (sm) · blurred backdrop">
          <Row>
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
        </State>

        <State label="scroll outside · transparent backdrop · placed at the top">
          <Row>
            <Modal>
              <Button variant="tertiary">Open scrolling modal</Button>
              <Modal.Backdrop variant="transparent">
                <Modal.Container scroll="outside" placement="top">
                  <Modal.Dialog>
                    <Modal.CloseTrigger />
                    <Modal.Header>
                      <Modal.Heading>Release notes</Modal.Heading>
                    </Modal.Header>
                    <Modal.Body>
                      <View class="gap-2">
                        {RELEASE_NOTES.map((note) => (
                          <Text class="text-sm text-foreground">{note}</Text>
                        ))}
                      </View>
                    </Modal.Body>
                    <Modal.Footer>
                      <Button slot="close">Close</Button>
                    </Modal.Footer>
                  </Modal.Dialog>
                </Modal.Container>
              </Modal.Backdrop>
            </Modal>
          </Row>
        </State>
      </View>
      <Text class="text-xs text-muted">
        The outside variant scrolls the page behind the dialog, so the header leaves the viewport. Extra-small,
        large, cover and full sizes only change the card box.
      </Text>
    </Section>
  );
}

function Drawers() {
  return (
    <Section title="Drawer">
      <View class="gap-3">
        <State label="bottom · opaque backdrop · handle">
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
          </Row>
        </State>

        <State label="top · transparent backdrop · handle">
          <Row>
            <Drawer placement="top">
              <Button variant="tertiary">Open top drawer</Button>
              <Drawer.Backdrop variant="transparent">
                <Drawer.Content>
                  <Drawer.Dialog>
                    <Drawer.Handle />
                    <Drawer.CloseTrigger />
                    <Drawer.Header>
                      <Drawer.Heading>Notifications</Drawer.Heading>
                    </Drawer.Header>
                    <Drawer.Body>
                      <Text class="text-sm text-foreground">
                        Three comments and one invite arrived while you were away.
                      </Text>
                    </Drawer.Body>
                    <Drawer.Footer>
                      <Button slot="close">Mark all read</Button>
                    </Drawer.Footer>
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer>
          </Row>
        </State>

        <State label="left · blurred backdrop">
          <Row>
            <Drawer placement="left">
              <Button variant="secondary">Open left drawer</Button>
              <Drawer.Backdrop variant="blur">
                <Drawer.Content>
                  <Drawer.Dialog>
                    <Drawer.CloseTrigger />
                    <Drawer.Header>
                      <Drawer.Heading>Workspace</Drawer.Heading>
                    </Drawer.Header>
                    <Drawer.Body>
                      <Text class="text-sm text-foreground">
                        Switch between Acme, Northwind and the personal sandbox.
                      </Text>
                    </Drawer.Body>
                    <Drawer.Footer>
                      <Button slot="close" variant="tertiary">Cancel</Button>
                      <Button slot="close">Switch</Button>
                    </Drawer.Footer>
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer>
          </Row>
        </State>

        <State label="right · opaque backdrop">
          <Row>
            <Drawer placement="right">
              <Button variant="tertiary">Open right drawer</Button>
              <Drawer.Backdrop>
                <Drawer.Content>
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
        </State>
      </View>
    </Section>
  );
}

function Popovers() {
  return (
    <Section title="Popover">
      <View class="gap-3">
        <State label="default · bottom placement · no arrow">
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
          </Row>
        </State>

        <State label="top placement · arrow">
          <Row>
            <Popover>
              <Button variant="tertiary">Open top popover</Button>
              <Popover.Content placement="top">
                <Popover.Arrow />
                <Popover.Dialog>
                  <Popover.Heading>What's new</Popover.Heading>
                  <Text class="text-sm text-muted">Three fixes shipped this week.</Text>
                  <Link href="https://example.com/changelog">Read the changelog</Link>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
          </Row>
        </State>

        <State label="right placement · arrow">
          <Row>
            <Popover>
              <Button variant="secondary">Open right popover</Button>
              <Popover.Content placement="right">
                <Popover.Arrow />
                <Popover.Dialog>
                  <Popover.Heading>Row details</Popover.Heading>
                  <Text class="text-sm text-muted">Placed 12 minutes ago by the billing bot.</Text>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
          </Row>
        </State>

        <State label="left placement · no arrow">
          <Row>
            <Popover>
              <Button variant="tertiary">Open left popover</Button>
              <Popover.Content placement="left">
                <Popover.Dialog>
                  <Popover.Heading>Keyboard shortcuts</Popover.Heading>
                  <Text class="text-sm text-muted">Press Cmd+K to search every workspace.</Text>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
          </Row>
        </State>
      </View>
    </Section>
  );
}

function Tooltips() {
  return (
    <Section title="Tooltip">
      <View class="gap-3">
        <State label="default · 1500 ms hover delay · no arrow">
          <Row>
            <Tooltip>
              <Button variant="secondary">Hover for a tooltip</Button>
              <Tooltip.Content>Saved to this device</Tooltip.Content>
            </Tooltip>
          </Row>
        </State>

        <State label="bottom placement · arrow">
          <Row>
            <Tooltip delay={0}>
              <Button variant="tertiary">Hover for a tooltip with an arrow</Button>
              <Tooltip.Content placement="bottom" showArrow>
                <Tooltip.Arrow />
                Drafts autosave every 30 seconds
              </Tooltip.Content>
            </Tooltip>
          </Row>
        </State>

        <State label="instant open (delay 0) · focus also opens it">
          <Row>
            <Tooltip delay={0} trigger="focus">
              <Button variant="outline">Focus for an instant tooltip</Button>
              <Tooltip.Content placement="right">Right side, no wait</Tooltip.Content>
            </Tooltip>
          </Row>
        </State>
      </View>
    </Section>
  );
}

function Dropdowns() {
  return (
    <Section title="Dropdown">
      <View class="gap-3">
        <State label="groups · shortcut · disabled item · danger item">
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
                    <Dropdown.Item id="archive" textValue="Archive" isDisabled>
                      <Label>Archive (owner only)</Label>
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
          </Row>
        </State>

        <State label="single selection (radio semantics) · dot indicator">
          <Row>
            <Dropdown>
              <Button variant="tertiary">Open sort menu</Button>
              <Dropdown.Popover>
                <Dropdown.Menu aria-label="Sort orders" defaultSelectedKeys={["newest"]} selectionMode="single">
                  <Dropdown.Item id="newest" textValue="Newest first">
                    <Dropdown.ItemIndicator type="dot" />
                    <Label>Newest first</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="oldest" textValue="Oldest first">
                    <Dropdown.ItemIndicator type="dot" />
                    <Label>Oldest first</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="amount" textValue="Largest amount">
                    <Dropdown.ItemIndicator type="dot" />
                    <Label>Largest amount</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </Row>
        </State>

        <State label="multiple selection (checkbox semantics) · check indicator">
          <Row>
            <Dropdown>
              <Button variant="outline">Open view-options menu</Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label="Visible columns"
                  defaultSelectedKeys={["comments"]}
                  selectionMode="multiple"
                >
                  <Dropdown.Item id="author" textValue="Author">
                    <Dropdown.ItemIndicator />
                    <Label>Author</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="comments" textValue="Comments">
                    <Dropdown.ItemIndicator />
                    <Label>Comments</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="labels" textValue="Labels">
                    <Dropdown.ItemIndicator />
                    <Label>Labels</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="replies" textValue="Replies" isDisabled>
                    <Dropdown.ItemIndicator />
                    <Label>Replies (locked)</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </Row>
        </State>

        <State label="submenu">
          <Row>
            <Dropdown>
              <Button variant="tertiary">Open share menu</Button>
              <Dropdown.Popover>
                <Dropdown.Menu aria-label="Share options">
                  <Dropdown.Item id="copy-invite" textValue="Copy invite link">
                    <Label>Copy invite link</Label>
                  </Dropdown.Item>
                  <Dropdown.SubmenuTrigger>
                    <Dropdown.Item id="share-to" textValue="Share to">
                      <Label>Share to</Label>
                      <Dropdown.SubmenuIndicator />
                    </Dropdown.Item>
                    <Dropdown.Popover>
                      <Dropdown.Menu aria-label="Share destinations">
                        <Dropdown.Item id="whatsapp" textValue="WhatsApp">
                          <Label>WhatsApp</Label>
                        </Dropdown.Item>
                        <Dropdown.Item id="email" textValue="Email">
                          <Label>Email</Label>
                        </Dropdown.Item>
                        <Dropdown.Item id="slack" textValue="Slack">
                          <Label>Slack</Label>
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown.SubmenuTrigger>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </Row>
        </State>
      </View>
    </Section>
  );
}

function Menus() {
  return (
    <Section title="Menu">
      <State label="groups · shortcuts · disabled item · danger item">
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
              <Menu.Item id="publish" textValue="Publish" isDisabled>
                <Label>Publish (needs review)</Label>
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
      </State>
    </Section>
  );
}

function Toasts() {
  return (
    <Section title="Toast">
      <State label="variants: default, accent, success, warning, danger">
        <View class="gap-3">
          <Row>
            <Button
              variant="tertiary"
              onPress={() => {
                toast("Draft synced");
              }}
            >
              Show default toast
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                toast.info("New comment", { description: "Ava replied on the pricing draft." });
              }}
            >
              Show accent toast
            </Button>
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

          <Row>
            <Button
              variant="secondary"
              onPress={() => {
                toast.success("Invite sent", {
                  description: "ada@example.com can join as a viewer.",
                  actionProps: { children: "Undo", size: "sm", variant: "tertiary" },
                });
              }}
            >
              Show toast with an action
            </Button>
            <Button
              variant="tertiary"
              onPress={() => {
                toast("Staying open for a while", {
                  description: "This toast has no icon and a longer timeout.",
                  indicator: null,
                  timeout: 8000,
                });
              }}
            >
              Show toast without an indicator
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                toast.promise(() => Promise.resolve("report.csv"), {
                  loading: "Preparing the export…",
                  success: (name) => `Exported ${name}`,
                  error: () => "Export failed",
                });
              }}
            >
              Show loading-to-success toast
            </Button>
          </Row>
        </View>
      </State>
      <Text class="text-xs text-muted">
        Toasts stack in the bottom-center region and dismiss on their own. Placement is a provider setting, so the
        six corners are not shown here.
      </Text>
    </Section>
  );
}

function CloseButtons() {
  return (
    <Section title="CloseButton">
      <View class="gap-3">
        <State label="standalone · inside a pill">
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
        </State>

        <State label="disabled">
          <Row>
            <View class="flex-row items-center gap-2 rounded-full bg-default px-3 py-1.5">
              <Text class="text-xs text-default-foreground">Locked notice</Text>
              <CloseButton isDisabled aria-label="This notice cannot be dismissed" />
            </View>
            <CloseButton isDisabled aria-label="Close panel" />
          </Row>
        </State>
      </View>
      <Text class="text-xs text-muted">
        There is no size axis: every CloseButton is 24 × 24 points, and a smaller box is a className override.
      </Text>
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
