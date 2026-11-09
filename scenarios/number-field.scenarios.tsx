import { signal, Text, View } from "nsh";
import {
  Button,
  Description,
  FieldError,
  Form,
  Label,
  NumberField,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared NumberField scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app and this library render the same JSX. The story file is
 * number-field.stories.tsx; every entry below is one story except the two
 * splits and the render-children case (port sheet 4b, "需要的共享场景").
 *
 *   number-field/default        story Default: Label, both buttons, 120pt input
 *   number-field/variants       story Variants: primary and secondary
 *   number-field/full-width     story FullWidth: 400pt column, fullWidth field
 *   number-field/description    story WithDescription: plain and percent
 *   number-field/required       story Required: bare and bounded
 *   number-field/invalid        story Invalid: negative quantity, out-of-range
 *                               percentage
 *   number-field/disabled       story Disabled: plain and percent
 *   number-field/controlled     story Controlled: signal(1024) plus two Buttons
 *                               that set 0 / 2048
 *   number-field/validation     story WithValidation: FieldError while invalid,
 *                               Description otherwise
 *   number-field/step           story WithStep: step 1 / 5 / 10
 *   number-field/format-options story WithFormatOptions: EUR accounting, USD,
 *                               percent, decimal(2), kilogram
 *   number-field/form           story FormExample without the 1500 ms timer and
 *                               the console.log: Form, isInvalid branch, submit
 *   number-field/custom-icons.split
 *                               story CustomIcons. NSH draws no svg and has no
 *                               descendant selector, so the default icons are
 *                               spelled as a View stand-in here (R-030); the
 *                               reference side keeps the story's svg.
 *   number-field/with-chevrons.split
 *                               story WithChevrons. Same reason: the story's
 *                               `div` becomes a View, its two svg glyphs become
 *                               View stand-ins, the className overrides stay.
 *   number-field/render-children.split
 *                               the function form of `children`; HeroUI passes
 *                               values and this side passes accessors (D17).
 *
 * The stories' `name` props are kept: HeroUI accepts them, and this library
 * accepts them with no effect (port sheet §1.2 / §8).
 */

/* A View stand-in for an svg glyph: NSH has no svg element (port sheet §3,
 * "结构改写" R-030). The reference side draws the story's paths. */
function Glyph(props: { class?: string }) {
  return <View class={props.class ?? "size-4 rounded-sm bg-field-foreground"} />;
}

function Default() {
  return (
    <Stage>
      <NumberField defaultValue={1024} minValue={0} name="width">
        <Label>Width</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="w-[120px]" />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <NumberField defaultValue={100} minValue={0} name="primary-width" variant="primary">
          <Label>Primary variant</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
        <NumberField defaultValue={100} minValue={0} name="secondary-width" variant="secondary">
          <Label>Secondary variant</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
      </View>
    </Stage>
  );
}

function FullWidth() {
  return (
    <Stage>
      <View class="w-[400px] flex-col gap-4">
        <NumberField fullWidth defaultValue={1024} minValue={0} name="width">
          <Label>Width</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
      </View>
    </Stage>
  );
}

function WithDescription() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <NumberField defaultValue={1024} minValue={0} name="width">
          <Label>Width</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Enter the width in pixels</Description>
        </NumberField>
        <NumberField
          defaultValue={0.5}
          formatOptions={{ style: "percent" }}
          maxValue={1}
          minValue={0}
          name="percentage"
          step={0.1}
        >
          <Label>Percentage</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Value must be between 0 and 100</Description>
        </NumberField>
      </View>
    </Stage>
  );
}

function Required() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <NumberField isRequired minValue={0} name="quantity">
          <Label>Quantity</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
        <NumberField isRequired defaultValue={1} maxValue={10} minValue={1} name="rating">
          <Label>Rating</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Rate from 1 to 10</Description>
        </NumberField>
      </View>
    </Stage>
  );
}

function Invalid() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <NumberField isInvalid isRequired minValue={0} name="quantity" value={-5}>
          <Label>Quantity</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <FieldError>Quantity must be greater than or equal to 0</FieldError>
        </NumberField>
        <NumberField
          isInvalid
          formatOptions={{ style: "percent" }}
          maxValue={1}
          minValue={0}
          name="percentage"
          step={0.1}
          value={1.5}
        >
          <Label>Percentage</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <FieldError>Percentage must be between 0 and 100</FieldError>
        </NumberField>
      </View>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <NumberField isDisabled defaultValue={1024} minValue={0} name="width">
          <Label>Width</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Enter the width in pixels</Description>
        </NumberField>
        <NumberField
          isDisabled
          defaultValue={0.5}
          formatOptions={{ style: "percent" }}
          maxValue={1}
          minValue={0}
          name="percentage"
          step={0.1}
        >
          <Label>Percentage</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Value must be between 0 and 100</Description>
        </NumberField>
      </View>
    </Stage>
  );
}

function Controlled() {
  const value = signal<number>(1024);

  return (
    <Stage>
      <View class="flex-col gap-4">
        <NumberField minValue={0} name="width" value={value()} onChange={(next) => value.set(next)}>
          <Label>Width</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Current value: {value()}</Description>
        </NumberField>
        <View class="flex-row gap-2">
          <Button variant="tertiary" onPress={() => value.set(0)}>
            Reset to 0
          </Button>
          <Button variant="tertiary" onPress={() => value.set(2048)}>
            Set to 2048
          </Button>
        </View>
      </View>
    </Stage>
  );
}

function WithValidation() {
  const value = signal<number | undefined>(undefined);
  const isInvalid = () => value() !== undefined && (value()! < 0 || value()! > 100);

  return (
    <Stage>
      <View class="flex-col gap-4">
        <NumberField
          isRequired
          formatOptions={{ style: "percent" }}
          isInvalid={isInvalid()}
          maxValue={1}
          minValue={0}
          name="percentage"
          step={0.1}
          value={value()}
          onChange={(next) => value.set(next)}
        >
          <Label>Percentage</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          {isInvalid() ? (
            <FieldError>Percentage must be between 0 and 100</FieldError>
          ) : (
            <Description>Enter a value between 0 and 100</Description>
          )}
        </NumberField>
      </View>
    </Stage>
  );
}

function WithStep() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <NumberField defaultValue={0} maxValue={100} minValue={0} name="step1" step={1}>
          <Label>Step: 1</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Increments by 1</Description>
        </NumberField>
        <NumberField defaultValue={0} maxValue={100} minValue={0} name="step5" step={5}>
          <Label>Step: 5</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Increments by 5</Description>
        </NumberField>
        <NumberField defaultValue={0} maxValue={100} minValue={0} name="step10" step={10}>
          <Label>Step: 10</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Increments by 10</Description>
        </NumberField>
      </View>
    </Stage>
  );
}

function WithFormatOptions() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <NumberField
          defaultValue={99}
          minValue={0}
          name="currency-eur"
          formatOptions={{ style: "currency", currency: "EUR", currencySign: "accounting" }}
        >
          <Label>Currency (EUR - Accounting)</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Accounting format with EUR currency</Description>
        </NumberField>
        <NumberField
          defaultValue={99.99}
          minValue={0}
          name="currency-usd"
          formatOptions={{ style: "currency", currency: "USD" }}
        >
          <Label>Currency (USD)</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Standard USD currency format</Description>
        </NumberField>
        <NumberField
          defaultValue={0.5}
          formatOptions={{ style: "percent" }}
          maxValue={1}
          minValue={0}
          name="percentage"
          step={0.01}
        >
          <Label>Percentage</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Percentage format (0-1, where 0.5 = 50%)</Description>
        </NumberField>
        <NumberField
          defaultValue={1234.56}
          minValue={0}
          name="decimal"
          formatOptions={{ style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
        >
          <Label>Decimal (2 decimal places)</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Decimal format with 2 decimal places</Description>
        </NumberField>
        <NumberField
          defaultValue={1000}
          minValue={0}
          name="unit"
          formatOptions={{ style: "unit", unit: "kilogram", unitDisplay: "short" }}
        >
          <Label>Unit (Kilograms)</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>Unit format with kilograms</Description>
        </NumberField>
      </View>
    </Stage>
  );
}

/* NSH side of the split: the story's two svg glyphs are Views here (R-030). */
function CustomIconsSplit() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <NumberField defaultValue={1024} minValue={0} name="width">
          <Label>Width (Custom Icons)</Label>
          <NumberField.Group>
            <NumberField.DecrementButton>
              <Glyph />
            </NumberField.DecrementButton>
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton>
              <Glyph />
            </NumberField.IncrementButton>
          </NumberField.Group>
          <Description>Custom icon children</Description>
        </NumberField>
      </View>
    </Stage>
  );
}

/* NSH side of the split: the story's `div` is a View and its chevrons are
 * Glyphs; the two buttons' className overrides are kept as the story has them. */
function WithChevronsSplit() {
  return (
    <Stage>
      <NumberField
        defaultValue={99}
        minValue={0}
        name="amount"
        formatOptions={{ style: "currency", currency: "EUR", currencySign: "accounting" }}
      >
        <Label>Number field with chevrons</Label>
        <NumberField.Group className="flex">
          <NumberField.Input className="flex-1" />
          <View class="flex h-full flex-col border-s border-field-placeholder/15">
            <NumberField.IncrementButton className="flex h-1/2 w-6 items-center justify-center rounded-none border-0 pt-0.5 text-sm">
              <Glyph class="size-[11px] rounded-sm bg-field-foreground" />
            </NumberField.IncrementButton>
            <NumberField.DecrementButton className="flex h-1/2 w-6 items-center justify-center rounded-none border-0 pb-0.5 text-sm">
              <Glyph class="size-[11px] rounded-sm bg-field-foreground" />
            </NumberField.DecrementButton>
          </View>
        </NumberField.Group>
      </NumberField>
    </Stage>
  );
}

/* The story's 1500 ms `setTimeout`, its pending state and its console.log are
 * dropped: the scenario only needs the Form + isInvalid branch + submit button
 * (port sheet 4b). A visible counter stands in for the removed side effect. */
function FormExample() {
  const value = signal<number | undefined>(undefined);
  const submitted = signal(0);
  const STOCK_AVAILABLE = 3;
  const isOutOfStock = () => value() !== undefined && value()! > STOCK_AVAILABLE;

  return (
    <Stage>
      <Form
        className="flex w-[280px] flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();

          const current = value();

          if (current === undefined || current === null || current < 1 || current > STOCK_AVAILABLE) {
            return;
          }

          submitted.set(submitted() + 1);
          value.set(undefined);
        }}
      >
        <NumberField
          isRequired
          isInvalid={isOutOfStock()}
          maxValue={5}
          minValue={1}
          name="quantity"
          value={value()}
          onChange={(next) => value.set(next)}
        >
          <Label>Order quantity</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-[120px]" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          {isOutOfStock() ? (
            <FieldError>Only {STOCK_AVAILABLE} items left in stock</FieldError>
          ) : (
            <Description>Only {STOCK_AVAILABLE} items available</Description>
          )}
        </NumberField>
        <Button
          className="w-full"
          isDisabled={value() === undefined || value()! < 1 || value()! > STOCK_AVAILABLE}
          type="submit"
          variant="primary"
        >
          Place Order
        </Button>
      </Form>
      <Text>Submitted: {submitted()} times</Text>
    </Stage>
  );
}

/* D17 split: HeroUI's `children` function receives values, this side receives
 * accessors, so the two sides are written separately (SOP 3.3.3). */
function RenderChildrenSplit() {
  return (
    <Stage>
      <NumberField defaultValue={10} minValue={0} name="width" isDisabled>
        {({ isDisabled }) => (
          <View class="flex-col gap-2">
            <Label>Width</Label>
            <NumberField.Group>
              <NumberField.Input className="w-[120px]" />
            </NumberField.Group>
            <Text>{isDisabled() ? "Field is disabled" : "Field is enabled"}</Text>
          </View>
        )}
      </NumberField>
    </Stage>
  );
}

export const numberFieldScenarios: Record<string, Component> = {
  "number-field/default": Default,
  "number-field/variants": Variants,
  "number-field/full-width": FullWidth,
  "number-field/description": WithDescription,
  "number-field/required": Required,
  "number-field/invalid": Invalid,
  "number-field/disabled": Disabled,
  "number-field/controlled": Controlled,
  "number-field/validation": WithValidation,
  "number-field/step": WithStep,
  "number-field/format-options": WithFormatOptions,
  "number-field/custom-icons.split": CustomIconsSplit,
  "number-field/with-chevrons.split": WithChevronsSplit,
  "number-field/form": FormExample,
  "number-field/render-children.split": RenderChildrenSplit,
};
