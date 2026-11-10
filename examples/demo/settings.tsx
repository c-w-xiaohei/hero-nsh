import { mount, Text, View } from "nsh";
import {
  Alert,
  Button,
  Card,
  ColorArea,
  ColorField,
  ColorInputGroup,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  DateField,
  Description,
  Disclosure,
  DisclosureGroup,
  Fieldset,
  Form,
  Input,
  Label,
  ListBox,
  Meter,
  Modal,
  ProgressCircle,
  Radio,
  RadioGroup,
  Select,
  Separator,
  Slider,
  Switch,
  SwitchGroup,
  TextField,
  TimeField,
} from "hero-nsh";
import { Page, Section } from "./ui";

const ZONES = [
  { id: "utc", name: "UTC" },
  { id: "shanghai", name: "Asia/Shanghai" },
  { id: "berlin", name: "Europe/Berlin" },
  { id: "new-york", name: "America/New_York" },
];

function Profile() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Profile</Card.Title>
        <Card.Description>How your teammates see you.</Card.Description>
      </Card.Header>
      <Card.Content className="gap-4">
        <Form aria-label="Profile" onSubmit={(event) => event.preventDefault()}>
          <Fieldset>
            <Fieldset.Group>
              <TextField isRequired defaultValue="Ada Lovelace" name="name">
                <Label>Name</Label>
                <Input />
              </TextField>
              <TextField defaultValue="ada@acme.com" name="email" type="email">
                <Label>Email</Label>
                <Input />
                <Description>Only visible to workspace admins.</Description>
              </TextField>
              <DateField name="birthday">
                <Label>Birthday</Label>
                <DateField.Group>
                  <DateField.Input>
                    {(segment) => <DateField.Segment segment={segment} />}
                  </DateField.Input>
                </DateField.Group>
                <Description>Used for the birthday note on your profile.</Description>
              </DateField>
              <Select className="w-[260px]" defaultSelectedKey="shanghai">
                <Label>Time zone</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {ZONES.map((zone) => (
                      <ListBox.Item id={zone.id} textValue={zone.name}>
                        {zone.name}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <View class="flex-row flex-wrap items-end gap-3">
                <TimeField className="w-full sm:w-[180px]" name="quiet-from">
                  <Label>Quiet hours from</Label>
                  <TimeField.Group>
                    <TimeField.Input>
                      {(segment) => <TimeField.Segment segment={segment} />}
                    </TimeField.Input>
                  </TimeField.Group>
                </TimeField>
                <TimeField className="w-full sm:w-[180px]" name="quiet-to">
                  <Label>to</Label>
                  <TimeField.Group>
                    <TimeField.Input>
                      {(segment) => <TimeField.Segment segment={segment} />}
                    </TimeField.Input>
                  </TimeField.Group>
                </TimeField>
              </View>
            </Fieldset.Group>
          </Fieldset>
        </Form>
      </Card.Content>
    </Card>
  );
}

function Notifications() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Notifications</Card.Title>
        <Card.Description>Pick what reaches you, and how often.</Card.Description>
      </Card.Header>
      <Card.Content className="gap-5">
        <SwitchGroup>
          <Switch defaultSelected name="mentions">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Mentions and replies
            </Switch.Content>
          </Switch>
          <Switch defaultSelected name="deploys">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Deploy failures
            </Switch.Content>
          </Switch>
          <Switch name="digest">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Weekly digest
            </Switch.Content>
          </Switch>
        </SwitchGroup>
        <Separator />
        <RadioGroup defaultValue="email" name="channel" orientation="horizontal">
          <Label>Delivery</Label>
          <Radio value="email">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              Email
            </Radio.Content>
          </Radio>
          <Radio value="push">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              Push
            </Radio.Content>
          </Radio>
          <Radio value="both">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              Both
            </Radio.Content>
          </Radio>
        </RadioGroup>
        <View class="w-full sm:w-[420px]">
          <Slider defaultValue={20}>
            <Label>Digest days</Label>
            <Slider.Output />
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
        </View>
      </Card.Content>
    </Card>
  );
}

function Appearance() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Appearance</Card.Title>
        <Card.Description>The accent used across this workspace.</Card.Description>
      </Card.Header>
      <Card.Content className="gap-5">
        <View class="flex-row flex-wrap items-start gap-6">
          <ColorArea aria-label="Accent color" defaultValue="hsl(213, 90%, 55%)">
            <ColorArea.Thumb />
          </ColorArea>
          <View class="flex-1 min-w-[240px]">
            <ColorSlider channel="hue" colorSpace="hsl" defaultValue="hsl(213, 90%, 55%)">
              <Label>Hue</Label>
              <ColorSlider.Output />
              <ColorSlider.Track>
                <ColorSlider.Thumb />
              </ColorSlider.Track>
            </ColorSlider>
          </View>
        </View>
        <View class="flex-row flex-wrap items-end gap-4">
          <ColorField className="flex-1 min-w-[220px]" defaultValue="#0485F7" name="accent">
            <Label>Accent</Label>
            <ColorField.Group>
              <ColorField.Prefix>
                <ColorSwatch color="#0485F7" size="xs" />
              </ColorField.Prefix>
              <ColorField.Input />
            </ColorField.Group>
          </ColorField>
          <View class="flex-1 min-w-[220px]">
            <Label>Hex value</Label>
            <ColorInputGroup>
              <ColorInputGroup.Input defaultValue="#000000" />
            </ColorInputGroup>
            <Description>Paste a color from your brand guide.</Description>
          </View>
        </View>
        <View class="flex-row items-center gap-3">
          <ColorSwatch color="#0485F7" size="xs" colorName="Brand blue" />
          <ColorSwatch color="#17C964" colorName="Success" />
          <ColorSwatch color="#F5A524" colorName="Warning" />
          <ColorSwatch color="#F31260" colorName="Danger" />
        </View>
        <View class="gap-2">
          <Label>Presets</Label>
          <ColorSwatchPicker aria-label="Accent presets" defaultValue="#0485F7">
            {["#0485F7", "#17C964", "#F5A524", "#F31260"].map((color) => (
              <ColorSwatchPicker.Item color={color}>
                <ColorSwatchPicker.Swatch />
                <ColorSwatchPicker.Indicator />
              </ColorSwatchPicker.Item>
            ))}
          </ColorSwatchPicker>
        </View>
      </Card.Content>
    </Card>
  );
}

function Usage() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Usage</Card.Title>
        <Card.Description>This workspace is on the Team plan.</Card.Description>
      </Card.Header>
      <Card.Content className="gap-4">
        <View class="w-full sm:w-[420px]">
          <Meter value={68}>
            <Label>Storage</Label>
            <Meter.Output />
            <Meter.Track>
              <Meter.Fill />
            </Meter.Track>
          </Meter>
        </View>
        <View class="flex-row items-center gap-4">
          <ProgressCircle aria-label="Seats used" value={12} maxValue={20}>
            <ProgressCircle.Track>
              <ProgressCircle.TrackCircle />
              <ProgressCircle.FillCircle />
            </ProgressCircle.Track>
          </ProgressCircle>
          <Text class="text-sm text-foreground">12 of 20 seats</Text>
        </View>
      </Card.Content>
    </Card>
  );
}

function Advanced() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Advanced</Card.Title>
        <Card.Description>Settings most people never open.</Card.Description>
      </Card.Header>
      <Card.Content className="gap-4">
        <DisclosureGroup>
          <Disclosure id="sessions">
            <Disclosure.Heading>
              <Disclosure.Trigger>
                Active sessions
                <Disclosure.Indicator />
              </Disclosure.Trigger>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body>Two browsers and one phone are signed in.</Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
          <Disclosure id="export">
            <Disclosure.Heading>
              <Disclosure.Trigger>
                Export data
                <Disclosure.Indicator />
              </Disclosure.Trigger>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body>Download everything this workspace holds as JSON.</Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
        </DisclosureGroup>
        <Modal>
          <Button variant="danger-soft">Leave workspace</Button>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Leave workspace?</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <Text class="text-sm text-foreground">
                    You will lose access to every order, member and setting in Acme. An admin can
                    invite you back later.
                  </Text>
                </Modal.Body>
                <Modal.Footer>
                  <Button slot="close" variant="secondary">Cancel</Button>
                  <Button slot="close" variant="danger">Leave workspace</Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </Card.Content>
    </Card>
  );
}

function App() {
  return (
    <Page
      maxWidth="max-w-[640px]"
      title="Settings"
      note="Workspace preferences for this account."
      actions={
        <View class="flex-row gap-2">
          <Button variant="tertiary">Reset</Button>
          <Button>Save changes</Button>
        </View>
      }
    >
      <View class="w-full gap-6">
        <Profile />
        <Notifications />
        <Appearance />
        <Usage />
        <Section title="Advanced">
          <Advanced />
        </Section>
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Appearance changes apply to everyone in this workspace.</Alert.Title>
          </Alert.Content>
        </Alert>
      </View>
    </Page>
  );
}

mount(App);
