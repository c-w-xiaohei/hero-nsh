import { Text, View } from "nsh";
import {
  Autocomplete,
  Button,
  ButtonGroup,
  Checkbox,
  CheckboxGroup,
  ColorArea,
  ColorField,
  ColorInputGroup,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  ComboBox,
  DateField,
  Description,
  ErrorMessage,
  FieldError,
  Fieldset,
  Form,
  Input,
  InputGroup,
  InputOTP,
  Kbd,
  Label,
  Link,
  ListBox,
  NumberField,
  Radio,
  RadioGroup,
  SearchField,
  Select,
  Slider,
  Switch,
  SwitchGroup,
  TextArea,
  TextField,
  TimeField,
  ToggleButton,
  ToggleButtonGroup,
} from "hero-nsh";
import { Section } from "./ui";

const ANIMALS = [
  { id: "cat", name: "Cat" },
  { id: "dog", name: "Dog" },
  { id: "panda", name: "Panda" },
];

const PRESETS = ["#0485F7", "#17C964", "#F5A524", "#F31260"];

/** What `Autocomplete.Filter` asks of each row while the user types. */
function contains(textValue: string, inputValue: string) {
  return textValue.toLowerCase().includes(inputValue.toLowerCase());
}

export function FormsSection() {
  return (
    <View class="gap-6">
      <Section title="Button">
        <View class="flex-row flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
          <Button variant="danger-soft">Leave team</Button>
          <Button isDisabled>Disabled</Button>
        </View>
      </Section>

      <Section title="ButtonGroup">
        <View class="flex-row flex-wrap items-center gap-3">
          <ButtonGroup>
            <Button>Day</Button>
            <Button>Week</Button>
            <Button>Month</Button>
          </ButtonGroup>
          <ButtonGroup variant="secondary" size="sm">
            <Button>Copy</Button>
            <Button>Paste</Button>
          </ButtonGroup>
        </View>
      </Section>

      <Section title="ToggleButton">
        <View class="flex-row flex-wrap items-center gap-3">
          <ToggleButton>Grid</ToggleButton>
          <ToggleButton defaultSelected>Bold</ToggleButton>
          <ToggleButton defaultSelected variant="ghost">
            Italic
          </ToggleButton>
          <ToggleButton isDisabled>Disabled</ToggleButton>
        </View>
      </Section>

      <Section title="ToggleButtonGroup">
        <View class="flex-row flex-wrap items-center gap-3">
          <ToggleButtonGroup selectionMode="multiple" defaultSelectedKeys={["bold"]}>
            <ToggleButton id="bold">Bold</ToggleButton>
            <ToggleButton id="italic">Italic</ToggleButton>
            <ToggleButton id="underline">Underline</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup defaultSelectedKeys={["list"]}>
            <ToggleButton id="list">List</ToggleButton>
            <ToggleButton id="grid">Grid</ToggleButton>
          </ToggleButtonGroup>
        </View>
      </Section>

      <Section title="Link">
        <View class="flex-row flex-wrap items-center gap-3">
          <Link href="https://example.com/docs">Documentation</Link>
          <Link href="https://example.com/docs">
            Open the docs
            <Link.Icon />
          </Link>
          <Link href="https://example.com/docs" isDisabled>
            Disabled
          </Link>
        </View>
      </Section>

      <Section title="Kbd">
        <View class="flex-row flex-wrap items-center gap-3">
          <Kbd>
            <Kbd.Abbr keyValue="command" />
            <Kbd.Content>K</Kbd.Content>
          </Kbd>
          <Kbd variant="light">
            <Kbd.Abbr keyValue="shift" />
            <Kbd.Content>Enter</Kbd.Content>
          </Kbd>
          <Kbd>Esc</Kbd>
        </View>
      </Section>

      <Section title="TextField">
        <View class="flex-row flex-wrap items-start gap-3">
          <TextField className="w-[220px]" defaultValue="ada@acme.com" name="email" type="email">
            <Label>Email</Label>
            <Input />
            <Description>Only visible to workspace admins.</Description>
          </TextField>
          <TextField className="w-[220px]" defaultValue="ada@acme.com" isDisabled name="disabled">
            <Label>Email (disabled)</Label>
            <Input />
          </TextField>
          <TextField className="w-[220px]" defaultValue="ada@" isInvalid name="invalid">
            <Label>Email (invalid)</Label>
            <Input />
            <FieldError>Enter a valid email address.</FieldError>
          </TextField>
          <TextField className="w-[220px]" name="note">
            <Label>Message</Label>
            <TextArea placeholder="Write a short note..." />
          </TextField>
        </View>
      </Section>

      <Section title="InputGroup">
        <View class="flex-row flex-wrap items-start gap-3">
          <TextField className="w-[240px]" name="site">
            <Label>Website</Label>
            <InputGroup>
              <InputGroup.Prefix>https://</InputGroup.Prefix>
              <InputGroup.Input placeholder="acme.com" />
            </InputGroup>
          </TextField>
          <TextField className="w-[240px]" name="price">
            <Label>Amount</Label>
            <InputGroup>
              <InputGroup.Input placeholder="0.00" />
              <InputGroup.Suffix>USD</InputGroup.Suffix>
            </InputGroup>
          </TextField>
        </View>
      </Section>

      <Section title="SearchField">
        <View class="flex-row flex-wrap items-start gap-3">
          <SearchField className="w-[220px]" name="search">
            <Label>Search</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search orders..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <SearchField className="w-[220px]" defaultValue="hero" isDisabled name="search-disabled">
            <Label>Search (disabled)</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input />
            </SearchField.Group>
          </SearchField>
        </View>
      </Section>

      <Section title="NumberField">
        <View class="flex-row flex-wrap items-start gap-3">
          <NumberField className="w-[200px]" defaultValue={4} maxValue={10} minValue={1} name="seats">
            <Label>Seats</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>
          <NumberField className="w-[200px]" defaultValue={0} isInvalid minValue={1} name="bad-seats">
            <Label>Seats (invalid)</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input />
              <NumberField.IncrementButton />
            </NumberField.Group>
            <FieldError>At least one seat is required.</FieldError>
          </NumberField>
        </View>
      </Section>

      <Section title="DateField">
        <View class="flex-row flex-wrap items-start gap-3">
          <DateField className="w-[220px]" name="start">
            <Label>Start date</Label>
            <DateField.Group>
              <DateField.Input>
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
            </DateField.Group>
          </DateField>
          <DateField className="w-[220px]" isDisabled name="start-disabled">
            <Label>Start date (disabled)</Label>
            <DateField.Group>
              <DateField.Input>
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
            </DateField.Group>
          </DateField>
        </View>
      </Section>

      <Section title="TimeField">
        <View class="flex-row flex-wrap items-start gap-3">
          <TimeField className="w-[200px]" name="from">
            <Label>Quiet hours from</Label>
            <TimeField.Group>
              <TimeField.Input>
                {(segment) => <TimeField.Segment segment={segment} />}
              </TimeField.Input>
            </TimeField.Group>
          </TimeField>
          <TimeField className="w-[200px]" isDisabled name="to">
            <Label>to</Label>
            <TimeField.Group>
              <TimeField.Input>
                {(segment) => <TimeField.Segment segment={segment} />}
              </TimeField.Input>
            </TimeField.Group>
          </TimeField>
        </View>
      </Section>

      <Section title="InputOTP">
        <View class="flex-row flex-wrap items-center gap-3">
          <InputOTP defaultValue="123456" maxLength={6}>
            <InputOTP.Group>
              <InputOTP.Slot index={0} />
              <InputOTP.Slot index={1} />
              <InputOTP.Slot index={2} />
            </InputOTP.Group>
            <InputOTP.Separator />
            <InputOTP.Group>
              <InputOTP.Slot index={3} />
              <InputOTP.Slot index={4} />
              <InputOTP.Slot index={5} />
            </InputOTP.Group>
          </InputOTP>
        </View>
      </Section>

      <Section title="Select">
        <View class="flex-row flex-wrap items-start gap-3">
          <Select className="w-[200px]" defaultSelectedKey="dog">
            <Label>Animal</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {ANIMALS.map((animal) => (
                  <ListBox.Item id={animal.id} textValue={animal.name}>
                    {animal.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <Select className="w-[200px]" isInvalid>
            <Label>Animal (invalid)</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {ANIMALS.map((animal) => (
                  <ListBox.Item id={animal.id} textValue={animal.name}>
                    {animal.name}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
            <FieldError>Pick an animal.</FieldError>
          </Select>
        </View>
      </Section>

      <Section title="ComboBox">
        <View class="flex-row flex-wrap items-start gap-3">
          <ComboBox className="w-[220px]" defaultValue="cat">
            <Label>Favorite animal</Label>
            <ComboBox.InputGroup>
              <Input placeholder="Search animals..." />
              <ComboBox.Trigger />
            </ComboBox.InputGroup>
            <ComboBox.Popover>
              <ListBox>
                {ANIMALS.map((animal) => (
                  <ListBox.Item id={animal.id} textValue={animal.name}>
                    {animal.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </ComboBox.Popover>
          </ComboBox>
        </View>
      </Section>

      <Section title="Autocomplete">
        <View class="flex-row flex-wrap items-start gap-3">
          <Autocomplete className="w-[220px]" placeholder="Select an animal">
            <Label>Animal</Label>
            <Autocomplete.Trigger>
              <Autocomplete.Value />
              <Autocomplete.Indicator />
            </Autocomplete.Trigger>
            <Autocomplete.Popover>
              <Autocomplete.Filter filter={contains}>
                <SearchField aria-label="Search animals" autoFocus variant="secondary">
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Search..." />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
                <ListBox>
                  {ANIMALS.map((animal) => (
                    <ListBox.Item id={animal.id} textValue={animal.name}>
                      {animal.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Autocomplete.Filter>
            </Autocomplete.Popover>
          </Autocomplete>
        </View>
      </Section>

      <Section title="Checkbox">
        <View class="flex-row flex-wrap items-center gap-4">
          <Checkbox name="terms">
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              Accept terms
            </Checkbox.Content>
          </Checkbox>
          <Checkbox defaultSelected name="news">
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              Product news
            </Checkbox.Content>
          </Checkbox>
          <Checkbox isDisabled name="locked">
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              Managed by admin
            </Checkbox.Content>
          </Checkbox>
        </View>
      </Section>

      <Section title="CheckboxGroup">
        <View class="w-[240px]">
          <CheckboxGroup defaultValue={["email"]} name="channels">
            <Label>Notifications</Label>
            <Description>Choose at least one channel.</Description>
            <Checkbox value="email">
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Email
              </Checkbox.Content>
            </Checkbox>
            <Checkbox value="push">
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Push
              </Checkbox.Content>
            </Checkbox>
            <Checkbox value="sms">
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                SMS
              </Checkbox.Content>
            </Checkbox>
          </CheckboxGroup>
        </View>
      </Section>

      <Section title="Radio">
        <View class="flex-row flex-wrap items-center gap-3">
          <RadioGroup defaultValue="email" name="radio-demo" orientation="horizontal">
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
            <Radio isDisabled value="sms">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                SMS
              </Radio.Content>
            </Radio>
          </RadioGroup>
        </View>
      </Section>

      <Section title="RadioGroup">
        <View class="w-[260px]">
          <RadioGroup defaultValue="team" name="plan">
            <Label>Plan</Label>
            <Description>Change any time.</Description>
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
      </Section>

      <Section title="Switch">
        <View class="flex-row flex-wrap items-center gap-4">
          <Switch name="notifications">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Notifications
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
          <Switch isDisabled name="locked-switch">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Managed by admin
            </Switch.Content>
          </Switch>
        </View>
      </Section>

      <Section title="SwitchGroup">
        <View class="w-[240px]">
          <SwitchGroup orientation="horizontal">
            <Switch defaultSelected name="email">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Email
              </Switch.Content>
            </Switch>
            <Switch name="push">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Push
              </Switch.Content>
            </Switch>
            <Switch defaultSelected name="sms">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                SMS
              </Switch.Content>
            </Switch>
          </SwitchGroup>
        </View>
      </Section>

      <Section title="Slider">
        <View class="flex-row flex-wrap items-start gap-6">
          <View class="w-[240px]">
            <Slider defaultValue={40}>
              <Label>Volume</Label>
              <Slider.Output />
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
          </View>
          <View class="w-[240px]">
            <Slider defaultValue={70} isDisabled>
              <Label>Storage (disabled)</Label>
              <Slider.Output />
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
          </View>
        </View>
      </Section>

      <Section title="Form">
        <View class="w-full max-w-[320px]">
          <Form aria-label="Subscribe" className="gap-3">
            <TextField isRequired name="email" type="email">
              <Label>Email</Label>
              <Input placeholder="you@acme.com" />
              <FieldError />
            </TextField>
            <ErrorMessage>We could not save your changes.</ErrorMessage>
            <Button type="submit">Subscribe</Button>
          </Form>
        </View>
      </Section>

      <Section title="Fieldset">
        <View class="w-full max-w-[320px]">
          <Fieldset>
            <Fieldset.Legend>Profile</Fieldset.Legend>
            <Description>How your teammates see you.</Description>
            <Fieldset.Group>
              <TextField defaultValue="Ada Lovelace" name="name">
                <Label>Name</Label>
                <Input />
              </TextField>
              <TextField defaultValue="ada@acme.com" name="email" type="email">
                <Label>Email</Label>
                <Input />
              </TextField>
            </Fieldset.Group>
            <Fieldset.Actions>
              <Button>Save</Button>
              <Button variant="tertiary">Cancel</Button>
            </Fieldset.Actions>
          </Fieldset>
        </View>
      </Section>

      <Section title="Label">
        <View class="flex-row flex-wrap items-center gap-4">
          <Label>Your name</Label>
          <Label isRequired>Email</Label>
          <Label isDisabled>Username</Label>
          <Label isInvalid>Amount</Label>
        </View>
      </Section>

      <Section title="Description">
        <View class="flex-col gap-1">
          <Description>Visible to other members of the workspace.</Description>
          <Description className="text-xs">Shown under a field.</Description>
        </View>
      </Section>

      <Section title="FieldError">
        <View class="w-[240px]">
          <TextField defaultValue="ada@" isInvalid name="field-error-demo">
            <Label>Email</Label>
            <Input />
            <FieldError>Enter a valid email address.</FieldError>
          </TextField>
        </View>
      </Section>

      <Section title="ErrorMessage">
        <View class="flex-col gap-2">
          <ErrorMessage>That email and password do not match.</ErrorMessage>
          <ErrorMessage className="text-sm font-semibold">Something went wrong.</ErrorMessage>
        </View>
      </Section>

      <Section title="ColorField">
        <View class="flex-row flex-wrap items-start gap-3">
          <ColorField className="w-[200px]" defaultValue="#0485F7" name="accent">
            <Label>Accent</Label>
            <ColorField.Group>
              <ColorField.Prefix>
                <ColorSwatch color="#0485F7" size="xs" />
              </ColorField.Prefix>
              <ColorField.Input />
            </ColorField.Group>
          </ColorField>
          <ColorField className="w-[200px]" isDisabled name="accent-disabled">
            <Label>Accent (disabled)</Label>
            <ColorField.Group variant="secondary">
              <ColorField.Input />
            </ColorField.Group>
          </ColorField>
        </View>
      </Section>

      <Section title="ColorArea">
        <View class="flex-row flex-wrap items-start gap-3">
          <View class="w-[220px]">
            <ColorArea aria-label="Accent color" defaultValue="hsl(213, 90%, 55%)">
              <ColorArea.Thumb />
            </ColorArea>
          </View>
        </View>
      </Section>

      <Section title="ColorSlider">
        <View class="flex-row flex-wrap items-start gap-6">
          <View class="w-[220px]">
            <ColorSlider channel="hue" colorSpace="hsl" defaultValue="hsl(213, 90%, 55%)">
              <Label>Hue</Label>
              <ColorSlider.Output />
              <ColorSlider.Track>
                <ColorSlider.Thumb />
              </ColorSlider.Track>
            </ColorSlider>
          </View>
          <View class="w-[220px]">
            <ColorSlider channel="alpha" colorSpace="hsl" defaultValue="hsla(213, 90%, 55%, 0.5)">
              <Label>Alpha</Label>
              <ColorSlider.Output />
              <ColorSlider.Track>
                <ColorSlider.Thumb />
              </ColorSlider.Track>
            </ColorSlider>
          </View>
        </View>
      </Section>

      <Section title="ColorSwatch">
        <View class="flex-row flex-wrap items-center gap-4">
          <View class="flex-row items-center gap-2">
            <ColorSwatch color="#0485F7" />
            <Text class="text-xs text-muted">Blue</Text>
          </View>
          <View class="flex-row items-center gap-2">
            <ColorSwatch color="#17C964" />
            <Text class="text-xs text-muted">Green</Text>
          </View>
          <View class="flex-row items-center gap-2">
            <ColorSwatch color="#F5A524" />
            <Text class="text-xs text-muted">Amber</Text>
          </View>
          <View class="flex-row items-center gap-2">
            <ColorSwatch color="#F31260" shape="square" />
            <Text class="text-xs text-muted">Rose</Text>
          </View>
        </View>
      </Section>

      <Section title="ColorSwatchPicker">
        <View class="flex-row flex-wrap items-start gap-4">
          <ColorSwatchPicker aria-label="Accent presets" defaultValue="#0485F7">
            {PRESETS.map((color) => (
              <ColorSwatchPicker.Item color={color}>
                <ColorSwatchPicker.Swatch />
                <ColorSwatchPicker.Indicator />
              </ColorSwatchPicker.Item>
            ))}
          </ColorSwatchPicker>
        </View>
      </Section>

      <Section title="ColorPicker">
        <View class="flex-row flex-wrap items-start gap-3">
          <ColorPicker defaultValue="#0485F7">
            <ColorPicker.Trigger>
              <ColorSwatch size="lg" />
              <Label>Brand color</Label>
            </ColorPicker.Trigger>
            <ColorPicker.Popover>
              <View class="w-[220px] gap-3">
                <ColorArea aria-label="Brand color" colorSpace="hsb" xChannel="saturation" yChannel="brightness">
                  <ColorArea.Thumb />
                </ColorArea>
                <ColorSlider channel="hue" colorSpace="hsb">
                  <Label>Hue</Label>
                  <ColorSlider.Output />
                  <ColorSlider.Track>
                    <ColorSlider.Thumb />
                  </ColorSlider.Track>
                </ColorSlider>
              </View>
            </ColorPicker.Popover>
          </ColorPicker>
        </View>
      </Section>

      <Section title="ColorInputGroup">
        <View class="flex-row flex-wrap items-start gap-3">
          <ColorInputGroup className="w-[180px]">
            <ColorInputGroup.Prefix>
              <ColorSwatch color="#0485F7" size="xs" />
            </ColorInputGroup.Prefix>
            <ColorInputGroup.Input defaultValue="#0485F7" />
          </ColorInputGroup>
          <ColorInputGroup className="w-[180px]" variant="secondary">
            <ColorInputGroup.Input defaultValue="#F31260" />
          </ColorInputGroup>
        </View>
      </Section>
    </View>
  );
}
