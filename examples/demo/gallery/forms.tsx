import { parseDate, parseTime } from "@internationalized/date";
import { Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  Autocomplete,
  Button,
  ButtonGroup,
  Checkbox,
  CheckboxGroup,
  Chip,
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
  Tag,
  TagGroup,
  TextArea,
  TextField,
  TimeField,
  ToggleButton,
  ToggleButtonGroup,
} from "hero-nsh";
import { Section } from "../ui";

const ANIMALS = [
  { id: "cat", name: "Cat" },
  { id: "dog", name: "Dog" },
  { id: "panda", name: "Panda" },
];

const PRESETS = ["#0485F7", "#17C964", "#F5A524", "#F31260"];

const CHIP_COLORS = ["default", "accent", "success", "warning", "danger"] as const;
const CHIP_VARIANTS = ["primary", "secondary", "tertiary", "soft"] as const;
const CHIP_SIZES = ["sm", "md", "lg"] as const;
const TAG_VARIANTS = ["default", "surface"] as const;
const TAG_SIZES = ["sm", "md", "lg"] as const;

/** What `Autocomplete.Filter` asks of each row while the user types. */
function contains(textValue: string, inputValue: string) {
  return textValue.toLowerCase().includes(inputValue.toLowerCase());
}

/** One named state row: a caption over a wrapping flex line. */
function Row(props: { label: string; align?: "start" | "center"; children?: JSX.Element }) {
  return (
    <View class="flex-col gap-1">
      <Text class="text-xs text-muted">{props.label}</Text>
      <View
        class={`flex-row flex-wrap ${props.align === "start" ? "items-start" : "items-center"} gap-3`}
      >
        {props.children}
      </View>
    </View>
  );
}

/** A ColorSwatchPicker preset row with the same four colors. */
function PresetPicker(props: {
  label: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "circle" | "square";
  layout?: "grid" | "stack";
}) {
  return (
    <View class="flex-col gap-1">
      <Text class="text-xs text-muted">{props.label}</Text>
      <ColorSwatchPicker
        aria-label={props.label}
        defaultValue="#0485F7"
        layout={props.layout}
        size={props.size}
        variant={props.variant}
      >
        {PRESETS.map((color) => (
          <ColorSwatchPicker.Item color={color}>
            <ColorSwatchPicker.Swatch />
            <ColorSwatchPicker.Indicator />
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
    </View>
  );
}

export function FormsSection() {
  return (
    <View class="gap-6">
      <Section title="Button">
        <View class="gap-3">
          <Row label="variants">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Delete</Button>
            <Button variant="danger-soft">Leave team</Button>
          </Row>
          <Row label="sizes">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row label="states">
            <Button isDisabled>Disabled</Button>
            <Button isPending>Pending</Button>
            <Button isIconOnly aria-label="Add item">
              +
            </Button>
            <Button className="w-[180px]" fullWidth>
              Full width
            </Button>
          </Row>
        </View>
      </Section>

      <Section title="ButtonGroup">
        <View class="gap-3">
          <Row label="variants and sizes">
            <ButtonGroup>
              <Button>Day</Button>
              <Button>Week</Button>
              <Button>Month</Button>
            </ButtonGroup>
            <ButtonGroup variant="secondary" size="sm">
              <Button>Copy</Button>
              <Button>Paste</Button>
            </ButtonGroup>
            <ButtonGroup variant="ghost" size="lg">
              <Button>Cut</Button>
              <Button>Undo</Button>
            </ButtonGroup>
          </Row>
          <Row label="orientation">
            <ButtonGroup orientation="vertical">
              <Button>Top</Button>
              <Button>Middle</Button>
              <Button>Bottom</Button>
            </ButtonGroup>
          </Row>
        </View>
      </Section>

      <Section title="ToggleButton">
        <View class="gap-3">
          <Row label="variants">
            <ToggleButton>Grid</ToggleButton>
            <ToggleButton variant="ghost">Italic</ToggleButton>
          </Row>
          <Row label="sizes">
            <ToggleButton size="sm">Small</ToggleButton>
            <ToggleButton size="md">Medium</ToggleButton>
            <ToggleButton size="lg">Large</ToggleButton>
          </Row>
          <Row label="states">
            <ToggleButton>Unselected</ToggleButton>
            <ToggleButton defaultSelected>Selected</ToggleButton>
            <ToggleButton defaultSelected variant="ghost">
              Selected ghost
            </ToggleButton>
            <ToggleButton isDisabled>Disabled</ToggleButton>
            <ToggleButton isIconOnly aria-label="Bold">
              B
            </ToggleButton>
          </Row>
        </View>
      </Section>

      <Section title="ToggleButtonGroup">
        <View class="gap-3">
          <Row label="selection modes">
            <ToggleButtonGroup selectionMode="multiple" defaultSelectedKeys={["bold"]}>
              <ToggleButton id="bold">Bold</ToggleButton>
              <ToggleButton id="italic">Italic</ToggleButton>
              <ToggleButton id="underline">Underline</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup defaultSelectedKeys={["list"]}>
              <ToggleButton id="list">List</ToggleButton>
              <ToggleButton id="grid">Grid</ToggleButton>
            </ToggleButtonGroup>
          </Row>
          <Row label="sizes and orientation">
            <ToggleButtonGroup size="sm" defaultSelectedKeys={["left"]}>
              <ToggleButton id="left">Left</ToggleButton>
              <ToggleButton id="center">Center</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup size="lg" isDetached defaultSelectedKeys={["day"]}>
              <ToggleButton id="day">Day</ToggleButton>
              <ToggleButton id="week">Week</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup orientation="vertical" defaultSelectedKeys={["top"]}>
              <ToggleButton id="top">Top</ToggleButton>
              <ToggleButton id="bottom">Bottom</ToggleButton>
            </ToggleButtonGroup>
          </Row>
        </View>
      </Section>

      <Section title="Link">
        <View class="gap-3">
          <Row label="variants">
            <Link href="https://example.com/docs">Documentation</Link>
            <Link href="https://example.com/docs">
              Open the docs
              <Link.Icon />
            </Link>
          </Row>
          <Row label="states">
            <Link href="https://example.com/docs" isDisabled>
              Disabled
            </Link>
          </Row>
        </View>
      </Section>

      <Section title="Kbd">
        <View class="gap-3">
          <Row label="variants">
            <Kbd>
              <Kbd.Abbr keyValue="command" />
              <Kbd.Content>K</Kbd.Content>
            </Kbd>
            <Kbd variant="light">
              <Kbd.Abbr keyValue="shift" />
              <Kbd.Content>Enter</Kbd.Content>
            </Kbd>
            <Kbd>Esc</Kbd>
          </Row>
        </View>
      </Section>

      <Section title="Chip">
        <View class="gap-3">
          {CHIP_VARIANTS.map((variant) => (
            <Row label={`variant: ${variant}`}>
              {CHIP_COLORS.map((color) => (
                <Chip color={color} variant={variant}>
                  {color}
                </Chip>
              ))}
            </Row>
          ))}
          <Row label="sizes">
            {CHIP_SIZES.map((size) => (
              <Chip color="accent" size={size}>
                {size}
              </Chip>
            ))}
          </Row>
        </View>
      </Section>

      <Section title="Tag">
        <View class="gap-3">
          {TAG_VARIANTS.map((variant) =>
            TAG_SIZES.map((size) => (
              <Row label={`variant: ${variant}, size: ${size}`}>
                <TagGroup aria-label={`Tags ${variant} ${size}`} size={size} variant={variant}>
                  <TagGroup.List>
                    <Tag id="design">Design</Tag>
                    <Tag id="engineering">Engineering</Tag>
                    <Tag id="ops" isDisabled>
                      Ops
                    </Tag>
                  </TagGroup.List>
                </TagGroup>
              </Row>
            )),
          )}
        </View>
      </Section>

      <Section title="TextField">
        <View class="gap-3">
          <Row label="empty" align="start">
            <TextField className="w-[220px]" name="email-empty">
              <Label>Email</Label>
              <Input placeholder="you@acme.com" />
              <Description>Only visible to workspace admins.</Description>
            </TextField>
          </Row>
          <Row label="with value" align="start">
            <TextField
              className="w-[220px]"
              defaultValue="ada@acme.com"
              name="email"
              type="email"
            >
              <Label>Email</Label>
              <Input />
              <Description>Only visible to workspace admins.</Description>
            </TextField>
            <TextField
              className="w-[220px]"
              defaultValue="ada@acme.com"
              name="email-secondary"
              type="email"
              variant="secondary"
            >
              <Label>Email (secondary)</Label>
              <Input />
            </TextField>
          </Row>
          <Row label="states" align="start">
            <TextField className="w-[220px]" isDisabled name="email-disabled">
              <Label>Disabled</Label>
              <Input defaultValue="ada@acme.com" />
            </TextField>
            <TextField
              className="w-[220px]"
              defaultValue="ada@acme.com"
              isReadOnly
              name="email-readonly"
            >
              <Label>Read only</Label>
              <Input />
            </TextField>
            <TextField className="w-[220px]" isRequired name="email-required">
              <Label>Required</Label>
              <Input placeholder="An asterisk marks the label" />
            </TextField>
            <TextField className="w-[220px]" isInvalid name="email-invalid">
              <Label>Invalid</Label>
              <Input defaultValue="ada@" />
              <FieldError>Enter a valid email address.</FieldError>
            </TextField>
          </Row>
          <Row label="textarea" align="start">
            <TextField className="w-[220px]" name="note">
              <Label>Empty textarea</Label>
              <TextArea placeholder="Write a short note..." />
              <Description>Accepts multiple lines.</Description>
            </TextField>
            <TextField className="w-[220px]" defaultValue="Ships on Friday." name="note-filled">
              <Label>Textarea with value</Label>
              <TextArea />
            </TextField>
            <TextField className="w-[220px]" isInvalid name="note-invalid">
              <Label>Invalid textarea</Label>
              <TextArea placeholder="Write a short note..." />
              <FieldError>Please enter at least 10 characters.</FieldError>
            </TextField>
          </Row>
        </View>
      </Section>

      <Section title="InputGroup">
        <View class="gap-3">
          <Row label="variants" align="start">
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
            <TextField className="w-[240px]" defaultValue="120" name="price-secondary">
              <Label>Amount (secondary)</Label>
              <InputGroup variant="secondary">
                <InputGroup.Prefix>$</InputGroup.Prefix>
                <InputGroup.Input />
                <InputGroup.Suffix>USD</InputGroup.Suffix>
              </InputGroup>
            </TextField>
          </Row>
          <Row label="states" align="start">
            <TextField className="w-[240px]" isDisabled name="site-disabled">
              <Label>Disabled</Label>
              <InputGroup>
                <InputGroup.Prefix>https://</InputGroup.Prefix>
                <InputGroup.Input defaultValue="acme.com" />
              </InputGroup>
            </TextField>
            <TextField className="w-[240px]" isInvalid name="site-invalid">
              <Label>Invalid</Label>
              <InputGroup>
                <InputGroup.Prefix>https://</InputGroup.Prefix>
                <InputGroup.Input placeholder="acme.com" />
              </InputGroup>
              <FieldError>Enter a full domain name.</FieldError>
            </TextField>
          </Row>
        </View>
      </Section>

      <Section title="SearchField">
        <View class="gap-3">
          <Row label="empty" align="start">
            <SearchField className="w-[220px]" name="search">
              <Label>Search</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search orders..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </Row>
          <Row label="with value" align="start">
            <SearchField className="w-[220px]" defaultValue="hero" name="search-value">
              <Label>Search</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <SearchField
              className="w-[220px]"
              defaultValue="hero"
              name="search-secondary"
              variant="secondary"
            >
              <Label>Search (secondary)</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </Row>
          <Row label="states" align="start">
            <SearchField className="w-[220px]" isDisabled name="search-disabled">
              <Label>Disabled</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input defaultValue="hero" />
              </SearchField.Group>
            </SearchField>
            <SearchField className="w-[220px]" isInvalid name="search-invalid">
              <Label>Invalid</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search orders..." />
                <SearchField.ClearButton />
              </SearchField.Group>
              <FieldError>Search needs at least two characters.</FieldError>
            </SearchField>
            <SearchField className="w-[220px]" isRequired name="search-required">
              <Label>Required</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search orders..." />
              </SearchField.Group>
            </SearchField>
          </Row>
        </View>
      </Section>

      <Section title="NumberField">
        <View class="gap-3">
          <Row label="empty" align="start">
            <NumberField className="w-[200px]" maxValue={10} minValue={1} name="seats-empty">
              <Label>Seats</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
          </Row>
          <Row label="with value" align="start">
            <NumberField
              className="w-[200px]"
              defaultValue={4}
              maxValue={10}
              minValue={1}
              name="seats"
            >
              <Label>Seats</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
            <NumberField
              className="w-[200px]"
              defaultValue={4}
              maxValue={10}
              minValue={1}
              name="seats-secondary"
              variant="secondary"
            >
              <Label>Seats (secondary)</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
          </Row>
          <Row label="states" align="start">
            <NumberField className="w-[200px]" defaultValue={4} isDisabled name="seats-disabled">
              <Label>Disabled</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
            <NumberField
              className="w-[200px]"
              defaultValue={4}
              isReadOnly
              name="seats-readonly"
            >
              <Label>Read only</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
            <NumberField className="w-[200px]" defaultValue={0} isInvalid minValue={1} name="bad-seats">
              <Label>Invalid</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
              <FieldError>At least one seat is required.</FieldError>
            </NumberField>
            <NumberField className="w-[200px]" isRequired name="seats-required">
              <Label>Required</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input placeholder="1" />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
          </Row>
        </View>
      </Section>

      <Section title="DateField">
        <View class="gap-3">
          <Row label="empty" align="start">
            <DateField className="w-[220px]" name="start">
              <Label>Start date</Label>
              <DateField.Group>
                <DateField.Input>
                  {(segment) => <DateField.Segment segment={segment} />}
                </DateField.Input>
              </DateField.Group>
            </DateField>
          </Row>
          <Row label="with value" align="start">
            <DateField
              className="w-[220px]"
              defaultValue={parseDate("2026-08-15")}
              name="start-value"
            >
              <Label>Start date</Label>
              <DateField.Group>
                <DateField.Input>
                  {(segment) => <DateField.Segment segment={segment} />}
                </DateField.Input>
              </DateField.Group>
            </DateField>
          </Row>
          <Row label="states" align="start">
            <DateField
              className="w-[220px]"
              defaultValue={parseDate("2026-08-15")}
              isDisabled
              name="start-disabled"
            >
              <Label>Disabled</Label>
              <DateField.Group>
                <DateField.Input>
                  {(segment) => <DateField.Segment segment={segment} />}
                </DateField.Input>
              </DateField.Group>
            </DateField>
            <DateField
              className="w-[220px]"
              defaultValue={parseDate("2026-08-15")}
              isReadOnly
              name="start-readonly"
            >
              <Label>Read only</Label>
              <DateField.Group>
                <DateField.Input>
                  {(segment) => <DateField.Segment segment={segment} />}
                </DateField.Input>
              </DateField.Group>
            </DateField>
            <DateField className="w-[220px]" isInvalid name="start-invalid">
              <Label>Invalid</Label>
              <DateField.Group>
                <DateField.Input>
                  {(segment) => <DateField.Segment segment={segment} />}
                </DateField.Input>
              </DateField.Group>
              <FieldError>Pick a date in the future.</FieldError>
            </DateField>
            <DateField className="w-[220px]" isRequired name="start-required">
              <Label>Required</Label>
              <DateField.Group>
                <DateField.Input>
                  {(segment) => <DateField.Segment segment={segment} />}
                </DateField.Input>
              </DateField.Group>
            </DateField>
          </Row>
        </View>
      </Section>

      <Section title="TimeField">
        <View class="gap-3">
          <Row label="empty" align="start">
            <TimeField className="w-[200px]" name="from">
              <Label>Quiet hours from</Label>
              <TimeField.Group>
                <TimeField.Input>
                  {(segment) => <TimeField.Segment segment={segment} />}
                </TimeField.Input>
              </TimeField.Group>
            </TimeField>
          </Row>
          <Row label="with value" align="start">
            <TimeField
              className="w-[200px]"
              defaultValue={parseTime("22:30")}
              name="from-value"
            >
              <Label>Quiet hours from</Label>
              <TimeField.Group>
                <TimeField.Input>
                  {(segment) => <TimeField.Segment segment={segment} />}
                </TimeField.Input>
              </TimeField.Group>
            </TimeField>
          </Row>
          <Row label="states" align="start">
            <TimeField
              className="w-[200px]"
              defaultValue={parseTime("22:30")}
              isDisabled
              name="to"
            >
              <Label>to (disabled)</Label>
              <TimeField.Group>
                <TimeField.Input>
                  {(segment) => <TimeField.Segment segment={segment} />}
                </TimeField.Input>
              </TimeField.Group>
            </TimeField>
            <TimeField className="w-[200px]" isInvalid name="from-invalid">
              <Label>Invalid</Label>
              <TimeField.Group>
                <TimeField.Input>
                  {(segment) => <TimeField.Segment segment={segment} />}
                </TimeField.Input>
              </TimeField.Group>
              <FieldError>Quiet hours must start before midnight.</FieldError>
            </TimeField>
            <TimeField
              className="w-[200px]"
              defaultValue={parseTime("22:30")}
              isReadOnly
              name="from-readonly"
            >
              <Label>Read only</Label>
              <TimeField.Group>
                <TimeField.Input>
                  {(segment) => <TimeField.Segment segment={segment} />}
                </TimeField.Input>
              </TimeField.Group>
            </TimeField>
            <TimeField className="w-[200px]" isRequired name="from-required">
              <Label>Required</Label>
              <TimeField.Group>
                <TimeField.Input>
                  {(segment) => <TimeField.Segment segment={segment} />}
                </TimeField.Input>
              </TimeField.Group>
            </TimeField>
          </Row>
        </View>
      </Section>

      <Section title="InputOTP">
        <View class="gap-3">
          <Row label="empty">
            <InputOTP maxLength={6}>
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
          </Row>
          <Row label="with value">
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
            <InputOTP defaultValue="123456" maxLength={6} variant="secondary">
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
          </Row>
          <Row label="states">
            <InputOTP defaultValue="123456" isDisabled maxLength={6}>
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
            <InputOTP defaultValue="1234" isInvalid maxLength={6}>
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
          </Row>
        </View>
      </Section>

      <Section title="Select">
        <View class="gap-3">
          <Row label="empty" align="start">
            <Select className="w-[200px]">
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
          </Row>
          <Row label="with value" align="start">
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
            <Select className="w-[200px]" defaultSelectedKey="dog" variant="secondary">
              <Label>Animal (secondary)</Label>
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
          </Row>
          <Row label="open" align="start">
            <Select className="w-[200px]" defaultOpen defaultSelectedKey="cat">
              <Label>Animal (open)</Label>
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
          </Row>
          <Row label="states" align="start">
            <Select className="w-[200px]" defaultSelectedKey="dog" isDisabled>
              <Label>Disabled</Label>
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
            </Select>
            <Select className="w-[200px]" isInvalid>
              <Label>Invalid</Label>
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
          </Row>
        </View>
      </Section>

      <Section title="ComboBox">
        <View class="gap-3">
          <Row label="empty" align="start">
            <ComboBox className="w-[220px]">
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
          </Row>
          <Row label="with value" align="start">
            <ComboBox className="w-[220px]" defaultSelectedKey="cat">
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
            <ComboBox
              className="w-[220px]"
              defaultSelectedKey="cat"
              variant="secondary"
            >
              <Label>Favorite animal (secondary)</Label>
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
          </Row>
          <Row label="open" align="start">
            <ComboBox className="w-[220px]" defaultSelectedKey="cat">
              <Label>Favorite animal (open)</Label>
              <ComboBox.InputGroup>
                <Input placeholder="Search animals..." />
                <ComboBox.Trigger />
              </ComboBox.InputGroup>
              <ComboBox.Popover defaultOpen>
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
          </Row>
          <Row label="states" align="start">
            <ComboBox className="w-[220px]" defaultSelectedKey="cat" isDisabled>
              <Label>Disabled</Label>
              <ComboBox.InputGroup>
                <Input />
                <ComboBox.Trigger />
              </ComboBox.InputGroup>
              <ComboBox.Popover>
                <ListBox>
                  {ANIMALS.map((animal) => (
                    <ListBox.Item id={animal.id} textValue={animal.name}>
                      {animal.name}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </ComboBox.Popover>
            </ComboBox>
            <ComboBox className="w-[220px]" isInvalid>
              <Label>Invalid</Label>
              <ComboBox.InputGroup>
                <Input placeholder="Search animals..." />
                <ComboBox.Trigger />
              </ComboBox.InputGroup>
              <ComboBox.Popover>
                <ListBox>
                  {ANIMALS.map((animal) => (
                    <ListBox.Item id={animal.id} textValue={animal.name}>
                      {animal.name}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </ComboBox.Popover>
              <FieldError>Pick an animal from the list.</FieldError>
            </ComboBox>
          </Row>
        </View>
      </Section>

      <Section title="Autocomplete">
        <View class="gap-3">
          <Row label="empty" align="start">
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
          </Row>
          <Row label="with value" align="start">
            <Autocomplete
              className="w-[220px]"
              defaultValue="cat"
              placeholder="Select an animal"
            >
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
            <Autocomplete
              className="w-[220px]"
              defaultValue="cat"
              placeholder="Select an animal"
              variant="secondary"
            >
              <Label>Animal (secondary)</Label>
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
          </Row>
          <Row label="open" align="start">
            <Autocomplete
              className="w-[220px]"
              defaultOpen
              placeholder="Select an animal"
            >
              <Label>Animal (open)</Label>
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
          </Row>
          <Row label="states" align="start">
            <Autocomplete
              className="w-[220px]"
              defaultValue="cat"
              isDisabled
              placeholder="Select an animal"
            >
              <Label>Disabled</Label>
              <Autocomplete.Trigger>
                <Autocomplete.Value />
                <Autocomplete.Indicator />
              </Autocomplete.Trigger>
              <Autocomplete.Popover>
                <Autocomplete.Filter filter={contains}>
                  <ListBox>
                    {ANIMALS.map((animal) => (
                      <ListBox.Item id={animal.id} textValue={animal.name}>
                        {animal.name}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Autocomplete.Filter>
              </Autocomplete.Popover>
            </Autocomplete>
            <Autocomplete
              className="w-[220px]"
              isInvalid
              placeholder="Select an animal"
            >
              <Label>Invalid</Label>
              <Autocomplete.Trigger>
                <Autocomplete.Value />
                <Autocomplete.Indicator />
              </Autocomplete.Trigger>
              <Autocomplete.Popover>
                <Autocomplete.Filter filter={contains}>
                  <ListBox>
                    {ANIMALS.map((animal) => (
                      <ListBox.Item id={animal.id} textValue={animal.name}>
                        {animal.name}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Autocomplete.Filter>
              </Autocomplete.Popover>
              <FieldError>Pick an animal.</FieldError>
            </Autocomplete>
          </Row>
        </View>
      </Section>

      <Section title="Checkbox">
        <View class="gap-3">
          <Row label="variants" align="start">
            <Checkbox defaultSelected name="terms-primary">
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Primary
              </Checkbox.Content>
            </Checkbox>
            <Checkbox defaultSelected name="terms-secondary" variant="secondary">
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Secondary
              </Checkbox.Content>
            </Checkbox>
          </Row>
          <Row label="states" align="start">
            <Checkbox name="terms">
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Unselected
              </Checkbox.Content>
            </Checkbox>
            <Checkbox defaultSelected name="news">
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Selected
              </Checkbox.Content>
            </Checkbox>
            <Checkbox isDisabled name="locked">
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Disabled
              </Checkbox.Content>
            </Checkbox>
            <Checkbox isReadOnly name="readonly-check">
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Read only
              </Checkbox.Content>
            </Checkbox>
            <Checkbox isInvalid isRequired name="agreement">
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Invalid
              </Checkbox.Content>
              <FieldError>You must accept the terms to continue.</FieldError>
            </Checkbox>
          </Row>
        </View>
      </Section>

      <Section title="CheckboxGroup">
        <View class="gap-3">
          <Row label="variants and description" align="start">
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
            <View class="w-[240px]">
              <CheckboxGroup defaultValue={["email"]} name="channels-secondary" variant="secondary">
                <Label>Notifications (secondary)</Label>
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
              </CheckboxGroup>
            </View>
          </Row>
          <Row label="states" align="start">
            <View class="w-[240px]">
              <CheckboxGroup isDisabled defaultValue={["email"]} name="channels-disabled">
                <Label>Disabled</Label>
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
              </CheckboxGroup>
            </View>
            <View class="w-[240px]">
              <CheckboxGroup isInvalid isRequired name="channels-invalid">
                <Label>Invalid</Label>
                <Description>Pick at least one channel.</Description>
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
                <FieldError>Pick at least one channel.</FieldError>
              </CheckboxGroup>
            </View>
          </Row>
        </View>
      </Section>

      <Section title="Radio">
        <View class="gap-3">
          <Row label="states" align="start">
            <RadioGroup defaultValue="email" name="radio-demo" orientation="horizontal">
              <Radio value="email">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  Selected
                </Radio.Content>
              </Radio>
              <Radio value="push">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  Unselected
                </Radio.Content>
              </Radio>
              <Radio isDisabled value="sms">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  Disabled
                </Radio.Content>
              </Radio>
            </RadioGroup>
          </Row>
          <Row label="read only and invalid" align="start">
            <RadioGroup defaultValue="email" isReadOnly name="radio-readonly" orientation="horizontal">
              <Radio value="email">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  Read only
                </Radio.Content>
              </Radio>
              <Radio value="push">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  Read only
                </Radio.Content>
              </Radio>
            </RadioGroup>
            <RadioGroup defaultValue="premium" name="plan-invalid">
              <Radio isInvalid isRequired value="basic">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  Basic (invalid)
                </Radio.Content>
                <FieldError>This plan is not available.</FieldError>
              </Radio>
              <Radio value="premium">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  Premium
                </Radio.Content>
                <Description>Includes 200 messages per month.</Description>
              </Radio>
            </RadioGroup>
          </Row>
          <Row label="variants">
            <RadioGroup defaultValue="solo" name="radio-secondary" orientation="horizontal" variant="secondary">
              <Radio value="solo">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  Secondary
                </Radio.Content>
              </Radio>
              <Radio value="team">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  Secondary
                </Radio.Content>
              </Radio>
            </RadioGroup>
          </Row>
        </View>
      </Section>

      <Section title="RadioGroup">
        <View class="gap-3">
          <Row label="orientation and description" align="start">
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
            <View class="w-[320px]">
              <RadioGroup defaultValue="team" name="plan-horizontal" orientation="horizontal">
                <Label>Horizontal</Label>
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
              </RadioGroup>
            </View>
          </Row>
          <Row label="invalid" align="start">
            <View class="w-[260px]">
              <RadioGroup isInvalid isRequired name="plan-error">
                <Label>Billing plan</Label>
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
                <FieldError>Pick a plan to continue.</FieldError>
              </RadioGroup>
            </View>
          </Row>
        </View>
      </Section>

      <Section title="Switch">
        <View class="gap-3">
          <Row label="sizes">
            <Switch defaultSelected name="switch-sm" size="sm">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Small
              </Switch.Content>
            </Switch>
            <Switch defaultSelected name="switch-md" size="md">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Medium
              </Switch.Content>
            </Switch>
            <Switch defaultSelected name="switch-lg" size="lg">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Large
              </Switch.Content>
            </Switch>
          </Row>
          <Row label="states" align="start">
            <Switch name="notifications">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Off
              </Switch.Content>
            </Switch>
            <Switch defaultSelected name="deploys">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                On
              </Switch.Content>
            </Switch>
            <Switch isDisabled name="locked-switch">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Disabled
              </Switch.Content>
            </Switch>
            <Switch isReadOnly name="readonly-switch">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Read only
              </Switch.Content>
            </Switch>
            <Switch isInvalid isRequired name="terms-switch">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Invalid
              </Switch.Content>
              <FieldError>You must enable notifications to continue.</FieldError>
            </Switch>
          </Row>
        </View>
      </Section>

      <Section title="SwitchGroup">
        <View class="gap-3">
          <Row label="orientation" align="start">
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
            <View class="w-[240px]">
              <SwitchGroup orientation="vertical">
                <Switch defaultSelected name="email-vertical">
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    Email
                  </Switch.Content>
                </Switch>
                <Switch name="push-vertical">
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    Push
                  </Switch.Content>
                </Switch>
              </SwitchGroup>
            </View>
          </Row>
        </View>
      </Section>

      <Section title="Slider">
        <View class="gap-3">
          <Row label="with value" align="start">
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
              <Slider defaultValue={[100, 500]} maxValue={1000} minValue={0} step={50}>
                <Label>Price range</Label>
                <Slider.Output />
                <Slider.Track>
                  <Slider.Fill />
                  <Slider.Thumb index={0} />
                  <Slider.Thumb index={1} />
                </Slider.Track>
              </Slider>
            </View>
          </Row>
          <Row label="states" align="start">
            <View class="w-[240px]">
              <Slider defaultValue={70} isDisabled>
                <Label>Disabled</Label>
                <Slider.Output />
                <Slider.Track>
                  <Slider.Fill />
                  <Slider.Thumb />
                </Slider.Track>
              </Slider>
            </View>
          </Row>
        </View>
      </Section>

      <Section title="Form">
        <View class="gap-3">
          <Row label="field, error text and submit" align="start">
            <View class="w-full max-w-[320px]">
              <Form aria-label="Subscribe" className="gap-3">
                <TextField isRequired name="form-email" type="email">
                  <Label>Email</Label>
                  <Input placeholder="you@acme.com" />
                  <FieldError />
                </TextField>
                <TextField defaultValue="ada@" isInvalid name="form-backup-email" type="email">
                  <Label>Backup email</Label>
                  <Input />
                  <FieldError>Enter a valid email address.</FieldError>
                </TextField>
                <ErrorMessage>We could not save your changes.</ErrorMessage>
                <Button type="submit">Subscribe</Button>
                <Button isPending type="submit">
                  Saving...
                </Button>
              </Form>
            </View>
          </Row>
        </View>
      </Section>

      <Section title="Fieldset">
        <View class="gap-3">
          <Row label="default" align="start">
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
          </Row>
          <Row label="disabled" align="start">
            <View class="w-full max-w-[320px]">
              <Fieldset disabled>
                <Fieldset.Legend>Billing</Fieldset.Legend>
                <Description>Managed by your workspace owner.</Description>
                <Fieldset.Group>
                  <TextField defaultValue="Acme Inc." name="company">
                    <Label>Company</Label>
                    <Input />
                  </TextField>
                  <TextField defaultValue="4242 4242 4242 4242" name="card">
                    <Label>Card number</Label>
                    <Input />
                  </TextField>
                </Fieldset.Group>
                <Fieldset.Actions>
                  <Button isDisabled>Save</Button>
                </Fieldset.Actions>
              </Fieldset>
            </View>
          </Row>
          <Row label="invalid field with error text" align="start">
            <View class="w-full max-w-[320px]">
              <Fieldset>
                <Fieldset.Legend>Contact</Fieldset.Legend>
                <Fieldset.Group>
                  <TextField defaultValue="ada@" isInvalid name="contact-email" type="email">
                    <Label>Email</Label>
                    <Input />
                    <FieldError>Enter a valid email address.</FieldError>
                  </TextField>
                </Fieldset.Group>
              </Fieldset>
            </View>
          </Row>
        </View>
      </Section>

      <Section title="Label">
        <View class="gap-3">
          <Row label="states">
            <Label>Your name</Label>
            <Label isRequired>Email</Label>
            <Label isDisabled>Username</Label>
            <Label isInvalid>Amount</Label>
          </Row>
        </View>
      </Section>

      <Section title="Description">
        <View class="gap-3">
          <Row label="default and small" align="start">
            <View class="flex-col gap-1">
              <Description>Visible to other members of the workspace.</Description>
              <Description className="text-xs">Shown under a field.</Description>
            </View>
          </Row>
        </View>
      </Section>

      <Section title="FieldError">
        <View class="gap-3">
          <Row label="under an invalid field" align="start">
            <View class="w-[240px]">
              <TextField defaultValue="ada@" isInvalid name="field-error-demo">
                <Label>Email</Label>
                <Input />
                <FieldError>Enter a valid email address.</FieldError>
              </TextField>
            </View>
          </Row>
        </View>
      </Section>

      <Section title="ErrorMessage">
        <View class="gap-3">
          <Row label="sizes" align="start">
            <View class="flex-col gap-2">
              <ErrorMessage>That email and password do not match.</ErrorMessage>
              <ErrorMessage className="text-sm font-semibold">Something went wrong.</ErrorMessage>
            </View>
          </Row>
        </View>
      </Section>

      <Section title="ColorField">
        <View class="gap-3">
          <Row label="empty" align="start">
            <ColorField className="w-[200px]" name="accent-empty">
              <Label>Accent</Label>
              <ColorField.Group>
                <ColorField.Input placeholder="#0485F7" />
              </ColorField.Group>
            </ColorField>
          </Row>
          <Row label="with value" align="start">
            <ColorField className="w-[200px]" defaultValue="#0485F7" name="accent">
              <Label>Accent</Label>
              <ColorField.Group>
                <ColorField.Prefix>
                  <ColorSwatch color="#0485F7" size="xs" />
                </ColorField.Prefix>
                <ColorField.Input />
              </ColorField.Group>
              <Description>Six-digit hex value.</Description>
            </ColorField>
            <ColorField className="w-[200px]" defaultValue="#0485F7" name="accent-secondary">
              <Label>Accent (secondary)</Label>
              <ColorField.Group variant="secondary">
                <ColorField.Input />
              </ColorField.Group>
            </ColorField>
          </Row>
          <Row label="states" align="start">
            <ColorField className="w-[200px]" defaultValue="#0485F7" isDisabled name="accent-disabled">
              <Label>Disabled</Label>
              <ColorField.Group variant="secondary">
                <ColorField.Input />
              </ColorField.Group>
            </ColorField>
            <ColorField
              className="w-[200px]"
              defaultValue="#0485F7"
              isReadOnly
              name="accent-readonly"
            >
              <Label>Read only</Label>
              <ColorField.Group>
                <ColorField.Input />
              </ColorField.Group>
            </ColorField>
            <ColorField className="w-[200px]" isInvalid isRequired name="accent-invalid">
              <Label>Invalid</Label>
              <ColorField.Group>
                <ColorField.Input placeholder="#0485F7" />
              </ColorField.Group>
              <FieldError>Please enter a valid hex color.</FieldError>
            </ColorField>
          </Row>
        </View>
      </Section>

      <Section title="ColorArea">
        <View class="gap-3">
          <Row label="states" align="start">
            <View class="w-[220px]">
              <ColorArea aria-label="Accent color" defaultValue="hsl(213, 90%, 55%)">
                <ColorArea.Thumb />
              </ColorArea>
            </View>
            <View class="w-[220px]">
              <ColorArea aria-label="Accent color with dots" defaultValue="hsl(213, 90%, 55%)" showDots>
                <ColorArea.Thumb />
              </ColorArea>
            </View>
            <View class="w-[220px]">
              <ColorArea aria-label="Disabled color area" defaultValue="hsl(213, 90%, 55%)" isDisabled>
                <ColorArea.Thumb />
              </ColorArea>
            </View>
          </Row>
        </View>
      </Section>

      <Section title="ColorSlider">
        <View class="gap-3">
          <Row label="channels" align="start">
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
          </Row>
          <Row label="disabled" align="start">
            <View class="w-[220px]">
              <ColorSlider
                channel="saturation"
                colorSpace="hsl"
                defaultValue="hsl(213, 90%, 55%)"
                isDisabled
              >
                <Label>Saturation (disabled)</Label>
                <ColorSlider.Output />
                <ColorSlider.Track>
                  <ColorSlider.Thumb />
                </ColorSlider.Track>
              </ColorSlider>
            </View>
          </Row>
        </View>
      </Section>

      <Section title="ColorSwatch">
        <View class="gap-3">
          <Row label="sizes">
            <View class="flex-row items-center gap-2">
              <ColorSwatch color="#0485F7" size="xs" />
              <Text class="text-xs text-muted">xs</Text>
            </View>
            <View class="flex-row items-center gap-2">
              <ColorSwatch color="#0485F7" size="sm" />
              <Text class="text-xs text-muted">sm</Text>
            </View>
            <View class="flex-row items-center gap-2">
              <ColorSwatch color="#0485F7" size="md" />
              <Text class="text-xs text-muted">md</Text>
            </View>
            <View class="flex-row items-center gap-2">
              <ColorSwatch color="#0485F7" size="lg" />
              <Text class="text-xs text-muted">lg</Text>
            </View>
            <View class="flex-row items-center gap-2">
              <ColorSwatch color="#0485F7" size="xl" />
              <Text class="text-xs text-muted">xl</Text>
            </View>
          </Row>
          <Row label="shapes and colors">
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
              <Text class="text-xs text-muted">Rose, square</Text>
            </View>
          </Row>
        </View>
      </Section>

      <Section title="ColorSwatchPicker">
        <View class="gap-3">
          <Row label="sizes" align="start">
            <PresetPicker label="xs" size="xs" />
            <PresetPicker label="sm" size="sm" />
            <PresetPicker label="md" size="md" />
            <PresetPicker label="lg" size="lg" />
            <PresetPicker label="xl" size="xl" />
          </Row>
          <Row label="shapes and layout" align="start">
            <PresetPicker label="square" variant="square" />
            <PresetPicker label="stack" layout="stack" />
          </Row>
        </View>
      </Section>

      <Section title="ColorPicker">
        <View class="gap-3">
          <Row label="states" align="start">
            <ColorPicker defaultValue="#0485F7">
              <ColorPicker.Trigger>
                <ColorSwatch size="lg" />
                <Label>Brand color</Label>
              </ColorPicker.Trigger>
              <ColorPicker.Popover>
                <View class="w-[220px] gap-3">
                  <ColorArea
                    aria-label="Brand color"
                    colorSpace="hsb"
                    xChannel="saturation"
                    yChannel="brightness"
                  >
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
            <ColorPicker defaultValue="#0485F7">
              <ColorPicker.Trigger isDisabled>
                <ColorSwatch size="lg" />
                <Label>Disabled</Label>
              </ColorPicker.Trigger>
              <ColorPicker.Popover>
                <View class="w-[220px] gap-3">
                  <ColorArea aria-label="Disabled brand color">
                    <ColorArea.Thumb />
                  </ColorArea>
                </View>
              </ColorPicker.Popover>
            </ColorPicker>
          </Row>
        </View>
      </Section>

      <Section title="ColorInputGroup">
        <View class="gap-3">
          <Row label="variants" align="start">
            <ColorInputGroup className="w-[180px]">
              <ColorInputGroup.Prefix>
                <ColorSwatch color="#0485F7" size="xs" />
              </ColorInputGroup.Prefix>
              <ColorInputGroup.Input defaultValue="#0485F7" />
            </ColorInputGroup>
            <ColorInputGroup className="w-[180px]" variant="secondary">
              <ColorInputGroup.Input defaultValue="#F31260" />
            </ColorInputGroup>
            <View class="w-[240px]">
              <ColorInputGroup fullWidth>
                <ColorInputGroup.Input placeholder="#0485F7" />
              </ColorInputGroup>
            </View>
          </Row>
          <Row label="states" align="start">
            <ColorInputGroup className="w-[180px]" isDisabled>
              <ColorInputGroup.Input defaultValue="#0485F7" />
            </ColorInputGroup>
            <ColorInputGroup className="w-[180px]" isInvalid>
              <ColorInputGroup.Input placeholder="#0485F7" />
            </ColorInputGroup>
          </Row>
        </View>
      </Section>
    </View>
  );
}
