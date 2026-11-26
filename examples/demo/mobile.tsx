import { mount, signal, Scroll, Text, View } from "nsh";
import type { JSX } from "nsh";
import "./fonts";
import {
  AlertDialog,
  Avatar,
  Badge,
  Button,
  Checkbox,
  Chip,
  CloseButton,
  DateField,
  Description,
  Drawer,
  EnvironmentScope,
  Input,
  InputOTP,
  Label,
  ListBox,
  Meter,
  Radio,
  RadioGroup,
  Select,
  Separator,
  Sheet,
  Slider,
  Switch,
  SwitchGroup,
  Tag,
  TagGroup,
  TextField,
  Toast,
  ToggleButton,
  ToggleButtonGroup,
  toast,
} from "hero-nsh";
import { shadow } from "../../src/tokens/geometry";

/*
 * The mobile demo: a phone-first app inside `EnvironmentScope input="touch"
 * width="compact"` so the touch branches run in a desktop browser too — a
 * window dragged narrow reports `width: compact` but never `input: touch`,
 * so the scope is the only way to exercise the real touch paths on a desktop
 * (the hit targets, the press feedback and the compact overlay shapes).
 *
 * It is a product screen, not a shrunken catalogue: a home feed with a
 * snapping bottom sheet and a swipe-to-dismiss drawer, a new-order form with
 * pickers, and a controls page that shows the touch variants side by side.
 * On a desktop the app is one 390-point column centered in the window; on a
 * phone it fills the width — the width is `max-w-[390px]`, never a `md:`
 * breakpoint, because the desktop window is wider than md and the phone
 * layout must hold there.
 */

/* -------------------------------------------------------------------------------------------------
 * Data
 * -----------------------------------------------------------------------------------------------*/

const ORDERS = [
  { id: "1042", name: "Ada Lovelace", detail: "Today · 2 items", state: "Open", amount: "$240.00" },
  { id: "1041", name: "Grace Hopper", detail: "Yesterday · 1 item", state: "Open", amount: "$96.00" },
  { id: "1040", name: "Alan Turing", detail: "Monday · 8 items", state: "Shipped", amount: "$1,280.00" },
  { id: "1039", name: "Katherine Johnson", detail: "Last week · 1 item", state: "Shipped", amount: "$48.00" },
];

const SHIPPING = [
  { id: "standard", name: "Standard · free" },
  { id: "express", name: "Express · $12" },
  { id: "pickup", name: "Store pickup" },
];

/* -------------------------------------------------------------------------------------------------
 * Small layout helpers
 * -----------------------------------------------------------------------------------------------*/

/** One surface card. */
function Frame(props: { children?: JSX.Element; class?: string }) {
  return (
    <View class={`rounded-3xl bg-surface p-4 gap-3 ${shadow.surface.both} ${props.class ?? ""}`}>
      {props.children}
    </View>
  );
}

/** A section caption over content. */
function SectionTitle(props: { children?: JSX.Element }) {
  return <Text class="text-xs text-muted">{props.children}</Text>;
}

/* -------------------------------------------------------------------------------------------------
 * Home
 * -----------------------------------------------------------------------------------------------*/

function HomeScreen() {
  const filtersOpen = signal(false);
  const notificationsOpen = signal(false);

  return (
    <View class="gap-5">
      <View class="flex-row items-center gap-3">
        <Avatar size="lg">
          <Avatar.Fallback>A</Avatar.Fallback>
        </Avatar>
        <View class="flex-auto gap-0.5">
          <Text class="text-lg font-semibold text-foreground">Good morning, Ada</Text>
          <Text class="text-xs text-muted">Friday · Acme store</Text>
        </View>
        <Badge.Anchor>
          <View class="h-11 w-11 items-center justify-center rounded-full bg-default">
            <Text class="text-sm text-default-foreground">@</Text>
          </View>
          <Badge>3</Badge>
        </Badge.Anchor>
      </View>

      <Frame>
        <View class="flex-row items-baseline justify-between">
          <Text class="text-sm font-medium text-surface-foreground">Daily goal</Text>
          <Text class="text-xs text-muted">2 of 5 orders packed</Text>
        </View>
        <Meter value={40}>
          <Label>Packing progress</Label>
          <Meter.Output />
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
        <View class="flex-row gap-3">
          <View class="flex-auto gap-0.5">
            <Text class="text-xs text-muted">Revenue</Text>
            <Text class="text-base font-semibold text-foreground">$1,664</Text>
          </View>
          <View class="flex-auto gap-0.5">
            <Text class="text-xs text-muted">Open</Text>
            <Text class="text-base font-semibold text-foreground">2</Text>
          </View>
        </View>
      </Frame>

      <View class="flex-row gap-2">
        <View class="flex-auto">
          <Button fullWidth variant="secondary" onPress={() => filtersOpen.set(true)}>
            Filters
          </Button>
        </View>
        <View class="flex-auto">
          <Button fullWidth variant="secondary" onPress={() => notificationsOpen.set(true)}>
            Notifications
          </Button>
        </View>
        <View class="flex-auto">
          <Button
            fullWidth
            onPress={() => {
              toast.success("Order #1042 packed", { description: "Ready for the courier." });
            }}
          >
            Show toast
          </Button>
        </View>
      </View>

      <View class="gap-2">
        <SectionTitle>Recent orders — press a row to select it</SectionTitle>
        <View class={`rounded-3xl bg-surface ${shadow.surface.both}`}>
          <View class="p-2">
            <ListBox aria-label="Recent orders" className="w-full" selectionMode="single">
              {ORDERS.map((order) => (
                <ListBox.Item id={order.id} textValue={`#${order.id} ${order.name}`}>
                  <Avatar size="sm">
                    <Avatar.Fallback>{order.name.charAt(0)}</Avatar.Fallback>
                  </Avatar>
                  <View class="flex-auto min-w-[80px] flex-col gap-1">
                    <View class="flex-row flex-wrap items-center gap-2">
                      <Label>{order.name}</Label>
                      <Chip color={order.state === "Open" ? "accent" : "default"} size="sm">
                        {order.state}
                      </Chip>
                    </View>
                    <Description>{`#${order.id} · ${order.detail}`}</Description>
                  </View>
                  <Text class="text-sm text-foreground">{order.amount}</Text>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </View>
          <Separator />
          <View class="flex-row items-center justify-between px-4 py-3">
            <Text class="text-xs text-muted">4 orders this month</Text>
            <Text class="text-xs text-muted">Updated 09:14</Text>
          </View>
        </View>
      </View>

      {/* Bottom sheet, resting at the 180-point snap. Under touch the handle
          and the content pan are real: drag it up to expand, down to close. */}
      <Sheet
        isOpen={filtersOpen()}
        snapPoints={[340]}
        onClose={() => filtersOpen.set(false)}
        onOpenChange={(open) => filtersOpen.set(open)}
      >
        <Sheet.Backdrop>
          <Sheet.Content>
            <Sheet.Dialog aria-label="Order filters">
              <Sheet.Handle />
              <Sheet.Header>
                <Sheet.Heading>Filters</Sheet.Heading>
              </Sheet.Header>
              <Sheet.Body className="gap-4">
                <Checkbox defaultSelected name="f-open">
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    Open only
                  </Checkbox.Content>
                </Checkbox>
                <Checkbox name="f-urgent">
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    Urgent first
                  </Checkbox.Content>
                </Checkbox>
                <Slider defaultValue={300} maxValue={1000} step={50}>
                  <Label>Maximum amount</Label>
                  <Slider.Output />
                  <Slider.Track>
                    <Slider.Fill />
                    <Slider.Thumb />
                  </Slider.Track>
                </Slider>
              </Sheet.Body>
              <Sheet.Footer>
                <Sheet.Close>
                  <Button variant="tertiary">Reset</Button>
                </Sheet.Close>
                <Sheet.Close>
                  <Button
                    onPress={() => {
                      toast.success("Filters applied", { description: "Showing 2 of 4 orders." });
                    }}
                  >
                    Apply filters
                  </Button>
                </Sheet.Close>
              </Sheet.Footer>
            </Sheet.Dialog>
          </Sheet.Content>
        </Sheet.Backdrop>
      </Sheet>

      {/* Bottom drawer: swipe it down or press outside to dismiss. */}
      <Drawer
        placement="bottom"
        isOpen={notificationsOpen()}
        onOpenChange={(open) => notificationsOpen.set(open)}
      >
        <Drawer.Backdrop>
          <Drawer.Content>
            <Drawer.Dialog>
              <Drawer.Handle />
              <Drawer.CloseTrigger />
              <Drawer.Header>
                <Drawer.Heading>Notifications</Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body>
                <View class="gap-3">
                  <View class="flex-row items-start gap-3">
                    <Badge.Anchor>
                      <Avatar size="sm">
                        <Avatar.Fallback>G</Avatar.Fallback>
                      </Avatar>
                    </Badge.Anchor>
                    <View class="flex-auto gap-0.5">
                      <Text class="text-sm font-medium text-foreground">Grace left a comment</Text>
                      <Text class="text-xs text-muted">"Can we pack #1041 before noon?"</Text>
                    </View>
                  </View>
                  <View class="flex-row items-start gap-3">
                    <Avatar size="sm">
                      <Avatar.Fallback>K</Avatar.Fallback>
                    </Avatar>
                    <View class="flex-auto gap-0.5">
                      <Text class="text-sm font-medium text-foreground">Courier booked</Text>
                      <Text class="text-xs text-muted">Pickup for #1040 at 16:00.</Text>
                    </View>
                  </View>
                  <View class="flex-row items-start gap-3">
                    <Avatar size="sm">
                      <Avatar.Fallback>A</Avatar.Fallback>
                    </Avatar>
                    <View class="flex-auto gap-0.5">
                      <Text class="text-sm font-medium text-foreground">Invite accepted</Text>
                      <Text class="text-xs text-muted">Alan joined as a packer.</Text>
                    </View>
                  </View>
                </View>
              </Drawer.Body>
              <Drawer.Footer>
                <Button
                  onPress={() => {
                    notificationsOpen.set(false);
                    toast("Notifications cleared");
                  }}
                >
                  Mark all read
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * New order
 * -----------------------------------------------------------------------------------------------*/

function NewScreen() {
  return (
    <View class="gap-5">
      <View class="gap-1">
        <Text class="text-lg font-semibold text-foreground">New order</Text>
        <Text class="text-xs text-muted">
          Pickers open as compact overlays; every field is a 44 pt touch target.
        </Text>
      </View>

      <Frame class="gap-4">
        <TextField isRequired name="customer">
          <Label>Customer name</Label>
          <Input placeholder="Ada Lovelace" />
          <Description>Printed on the packing slip.</Description>
        </TextField>

        <Select className="w-full" defaultSelectedKey="standard" name="shipping">
          <Label>Shipping</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {SHIPPING.map((option) => (
                <ListBox.Item id={option.id} textValue={option.name}>
                  {option.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <DateField name="delivery-date">
          <Label>Delivery date</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
        </DateField>

        <Slider defaultValue={2} maxValue={12} minValue={1}>
          <Label>Items</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>

        <Switch defaultSelected name="gift-wrap">
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Gift wrap
          </Switch.Content>
        </Switch>

        <View class="gap-1">
          <Label>Courier code</Label>
          <InputOTP maxLength={4}>
            <InputOTP.Group>
              <InputOTP.Slot index={0} />
              <InputOTP.Slot index={1} />
              <InputOTP.Slot index={2} />
              <InputOTP.Slot index={3} />
            </InputOTP.Group>
          </InputOTP>
        </View>

        <Button
          fullWidth
          onPress={() => {
            toast.success("Order placed", { description: "#1043 · standard shipping · 2 items." });
          }}
        >
          Place order
        </Button>
      </Frame>

      <Text class="text-xs text-muted">
        The shipping select and the date field open popovers anchored to their trigger; under the
        compact environment the popovers are the phone-sized variants, not the desktop menus.
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Controls
 * -----------------------------------------------------------------------------------------------*/

function ControlRow(props: { label: string; children?: JSX.Element }) {
  return (
    <View class="gap-2">
      <Text class="text-xs text-muted">{props.label}</Text>
      <View class="flex-row flex-wrap items-center gap-3">{props.children}</View>
    </View>
  );
}

function ControlsScreen() {
  const deleteOpen = signal(false);

  return (
    <View class="gap-5">
      <View class="gap-1">
        <Text class="text-lg font-semibold text-foreground">Touch controls</Text>
        <Text class="text-xs text-muted">
          Touch environment: 44pt targets, press feedback, compact overlays.
        </Text>
      </View>

      <Frame class="gap-4">
        <ControlRow label="Buttons">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger-soft">Delete</Button>
        </ControlRow>

        <ControlRow label="CloseButton">
          <View class="flex-row items-center gap-2 rounded-full bg-default px-3 py-1.5">
            <Text class="text-xs text-default-foreground">Open only</Text>
            <CloseButton aria-label="Clear the status filter" />
          </View>
          <CloseButton aria-label="Close panel" />
        </ControlRow>

        <ControlRow label="Checkbox">
          <Checkbox defaultSelected name="c-one">
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              On
            </Checkbox.Content>
          </Checkbox>
          <Checkbox name="c-two">
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              Off
            </Checkbox.Content>
          </Checkbox>
          <Checkbox isDisabled name="c-three">
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              Disabled
            </Checkbox.Content>
          </Checkbox>
        </ControlRow>

        <View class="gap-2">
          <Text class="text-xs text-muted">RadioGroup</Text>
          <RadioGroup defaultValue="solo" name="demo-plan" orientation="horizontal">
            <Radio value="solo">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                Solo
              </Radio.Content>
            </Radio>
            <Radio value="team">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                Team
              </Radio.Content>
            </Radio>
            <Radio value="company">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                Company
              </Radio.Content>
            </Radio>
          </RadioGroup>
        </View>

        <View class="gap-2">
          <Text class="text-xs text-muted">SwitchGroup</Text>
          <SwitchGroup orientation="horizontal">
            <Switch defaultSelected name="s-email">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Email
              </Switch.Content>
            </Switch>
            <Switch name="s-push">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Push
              </Switch.Content>
            </Switch>
            <Switch defaultSelected name="s-sms">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                SMS
              </Switch.Content>
            </Switch>
          </SwitchGroup>
        </View>

        <View class="gap-2">
          <Text class="text-xs text-muted">Slider</Text>
          <Slider defaultValue={55}>
            <Label>Volume</Label>
            <Slider.Output />
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
        </View>

        <View class="gap-2">
          <Text class="text-xs text-muted">TagGroup</Text>
          <TagGroup aria-label="Order tags" defaultSelectedKeys={["packing"]} selectionMode="multiple">
            <TagGroup.List>
              <Tag id="packing">Packing</Tag>
              <Tag id="priority">Priority</Tag>
              <Tag id="fragile">Fragile</Tag>
              <Tag id="returns" isDisabled>
                Returns
              </Tag>
            </TagGroup.List>
          </TagGroup>
        </View>

        <ControlRow label="ToggleButton and group">
          <ToggleButton defaultSelected>Bold</ToggleButton>
          <ToggleButtonGroup defaultSelectedKeys={["list"]} selectionMode="multiple">
            <ToggleButton id="list">List</ToggleButton>
            <ToggleButton id="grid">Grid</ToggleButton>
          </ToggleButtonGroup>
        </ControlRow>
      </Frame>

      <Frame class="gap-3">
        <Text class="text-sm font-medium text-surface-foreground">Compact overlays</Text>
        <Text class="text-xs text-muted">
          In the compact width the modal slides in as a bottom sheet over the whole window; the
          alert dialog stays a centered card.
        </Text>
        <AlertDialog isOpen={deleteOpen()} onOpenChange={(open) => deleteOpen.set(open)}>
          <Button variant="danger-soft" onPress={() => deleteOpen.set(true)}>
            Delete workspace…
          </Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog>
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>Delete Acme permanently?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <Text class="text-sm text-foreground">
                    Every order, member and setting goes away. This cannot be undone.
                  </Text>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button variant="tertiary" onPress={() => deleteOpen.set(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onPress={() => {
                      deleteOpen.set(false);
                      toast.danger("Workspace deleted", { description: "This is only a demo." });
                    }}
                  >
                    Delete
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </Frame>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Shell
 * -----------------------------------------------------------------------------------------------*/

type TabId = "home" | "new" | "controls";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "home", label: "Home" },
  { id: "new", label: "New" },
  { id: "controls", label: "Controls" },
];

function Shell() {
  const tab = signal<TabId>("home");

  return (
    <View class="flex-1 bg-background">
      {/* The 390-point phone column, centered on a desktop window. The width
          is max-width, not a breakpoint: on a phone the window is narrower
          and the column fills it, on a desktop the column holds its size. */}
      <View class="flex-1 w-full max-w-[390px] mx-auto border-l border-r border-border flex-col">
        {/* App header */}
        <View class="flex-row items-center justify-between border-b border-separator px-4 py-3">
          <Text class="text-base font-semibold text-foreground">Acme Orders</Text>
          <View class="flex-row items-center gap-2">
            <View class="h-2 w-2 rounded-full bg-accent" />
            <Text class="text-xs text-muted">Store open</Text>
          </View>
        </View>

        {/* The one scrollable region: flex-1 inside a fixed-height column, so
            the tab bar never scrolls away and there is no second scrollbar. */}
        <Scroll class="flex-1">
          <View class="gap-5 p-4 pb-8">
            {tab() === "home" ? <HomeScreen /> : null}
            {tab() === "new" ? <NewScreen /> : null}
            {tab() === "controls" ? <ControlsScreen /> : null}
          </View>
        </Scroll>

        {/* Bottom tab bar */}
        <View class="flex-row border-t border-separator px-3 py-2 gap-2">
          {TABS.map((item) => (
            <View class="flex-auto">
              <Button
                fullWidth
                variant={tab() === item.id ? "primary" : "ghost"}
                onPress={() => tab.set(item.id)}
              >
                {item.label}
              </Button>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function App() {
  return (
    <EnvironmentScope input="touch" width="compact">
      <Shell />
      {/* Bottom-center toasts would cover the tab bar, so the phone stacks
          them at the top, under the app header. */}
      <Toast.Provider placement="top" />
    </EnvironmentScope>
  );
}

mount(() => <App />);
