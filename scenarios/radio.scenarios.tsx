import { Text, View } from "nsh";
import { Description, FieldError, Label, Radio, RadioGroup } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared scenarios for Radio and RadioGroup, merged from radio-group.stories.tsx
 * and the JSX of radio.test.tsx / radio-group.test.tsx. They use HeroUI's API;
 * the `.split` ones render accessors instead of plain booleans (D17) and stand
 * in for their own copy on the reference side.
 *
 * Deviations from the stories, recorded in the port sheet 4b and the final
 * answer:
 * - DeliveryAndPaymentExample draws the `@iconify/react` icons as text glyphs
 *   (an icon font is not part of this unit). Its Content expresses the
 *   selected / focus-visible tints with the `checked:` / `focus-visible:`
 *   variants in place of upstream's `data-[selected=true]` /
 *   `data-[focus-visible=true]` attributes, which NSH does not expose.
 * - The Validation story drops the Form wrapper and the Submit button (NSH has
 *   no form submission); the FieldError stays.
 */

/* -------------------------------------------------------------------------------------------------
 * RadioGroup stories
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <RadioGroup defaultValue="premium" name="plan">
        <Label>Plan selection</Label>
        <Description>Choose the plan that suits you best</Description>
        <Radio value="basic">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Basic Plan
          </Radio.Content>
          <Description>Includes 100 messages per month</Description>
        </Radio>
        <Radio value="premium">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Premium Plan
          </Radio.Content>
          <Description>Includes 200 messages per month</Description>
        </Radio>
        <Radio value="business">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Business Plan
          </Radio.Content>
          <Description>Unlimited messages</Description>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <Text class="text-sm font-medium text-muted">Primary variant</Text>
      <RadioGroup defaultValue="option1" name="primary-plan" variant="primary">
        <Radio value="option1">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Option 1
          </Radio.Content>
          <Description>Standard styling with default background</Description>
        </Radio>
        <Radio value="option2">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Option 2
          </Radio.Content>
          <Description>Another option with primary styling</Description>
        </Radio>
      </RadioGroup>
      <Text class="text-sm font-medium text-muted">Secondary variant</Text>
      <RadioGroup defaultValue="option1" name="secondary-plan" variant="secondary">
        <Radio value="option1">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Option 1
          </Radio.Content>
          <Description>Lower emphasis variant for use in surfaces</Description>
        </Radio>
        <Radio value="option2">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Option 2
          </Radio.Content>
          <Description>Another option with secondary styling</Description>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

function PerRadioInvalid() {
  return (
    <Stage>
      <RadioGroup defaultValue="premium" name="plan-invalid">
        <Label>Plan selection</Label>
        <Radio isInvalid isRequired value="basic">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Basic Plan
          </Radio.Content>
          <FieldError>This plan is not available for your account</FieldError>
        </Radio>
        <Radio value="premium">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Premium Plan
          </Radio.Content>
          <Description>Includes 200 messages per month</Description>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

function Orientation() {
  return (
    <Stage>
      <Label>Subscription plan</Label>
      <RadioGroup defaultValue="pro" name="plan-orientation" orientation="horizontal">
        <Radio value="starter">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Starter
          </Radio.Content>
          <Description>For side projects and small teams</Description>
        </Radio>
        <Radio value="pro">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Pro
          </Radio.Content>
          <Description>Advanced reporting and analytics</Description>
        </Radio>
        <Radio value="teams">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Teams
          </Radio.Content>
          <Description>Share access with up to 10 teammates</Description>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

function Validation() {
  return (
    <Stage>
      <RadioGroup isRequired name="plan-validation">
        <Label>Subscription plan</Label>
        <Radio value="starter">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Starter
          </Radio.Content>
          <Description>For side projects and small teams</Description>
        </Radio>
        <Radio value="pro">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Pro
          </Radio.Content>
          <Description>Advanced reporting and analytics</Description>
        </Radio>
        <Radio value="teams">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Teams
          </Radio.Content>
          <Description>Share access with up to 10 teammates</Description>
        </Radio>
        <FieldError>Choose a subscription before continuing.</FieldError>
      </RadioGroup>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <RadioGroup isDisabled defaultValue="pro" name="plan-disabled">
        <Label>Subscription plan</Label>
        <Description>Plan changes are temporarily paused while we roll out updates.</Description>
        <Radio value="starter">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Starter
          </Radio.Content>
          <Description>For side projects and small teams</Description>
        </Radio>
        <Radio value="pro">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Pro
          </Radio.Content>
          <Description>Advanced reporting and analytics</Description>
        </Radio>
        <Radio value="teams">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Teams
          </Radio.Content>
          <Description>Share access with up to 10 teammates</Description>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

const DELIVERY = [
  { value: "standard", title: "Standard", description: "4-10 business days", price: "$5.00" },
  { value: "express", title: "Express", description: "2-5 business days", price: "$16.00" },
  { value: "super-fast", title: "Super Fast", description: "1 business day", price: "$25.00" },
];

const PAYMENT = [
  { value: "mastercard", title: "**** 8304", description: "Exp. on 01/2026", glyph: "MC" },
  { value: "visa", title: "**** 0123", description: "Exp. on 01/2026", glyph: "VISA" },
  { value: "paypal", title: "PayPal", description: "Pay with PayPal", glyph: "PP" },
];

function DeliveryAndPayment() {
  return (
    <Stage>
      <RadioGroup defaultValue="express" name="delivery">
        <Label>Delivery method</Label>
        {DELIVERY.map((option) => (
          <Radio value={option.value}>
            <Radio.Content className="group relative flex w-full flex-col gap-6 rounded-xl bg-surface-tertiary px-5 py-4 transition-all checked:border-accent checked:bg-accent/10 focus-visible:bg-accent/10">
              <Radio.Control className="absolute end-4 top-3 size-5">
                <Radio.Indicator />
              </Radio.Control>
              <View class="flex flex-col gap-1">
                <Text>{option.title}</Text>
                <Description>{option.description}</Description>
              </View>
              <Text class="text-sm font-semibold">{option.price}</Text>
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      <RadioGroup defaultValue="visa" name="payment">
        <Label>Payment method</Label>
        {PAYMENT.map((option) => (
          <Radio value={option.value}>
            <Radio.Content className="group relative flex w-full flex-row items-start justify-start gap-4 rounded-xl bg-surface-tertiary px-5 py-4 transition-all checked:bg-accent/10">
              <Radio.Control className="absolute end-4 top-3 size-5">
                <Radio.Indicator />
              </Radio.Control>
              <Text class="size-6 text-accent">{option.glyph}</Text>
              <View class="flex flex-col gap-1">
                <Text>{option.title}</Text>
                <Description>{option.description}</Description>
              </View>
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Radio examples
 * -----------------------------------------------------------------------------------------------*/

function CustomIndicator() {
  return (
    <Stage>
      <RadioGroup defaultValue="premium" name="plan-custom-indicator">
        <Label>Plan selection</Label>
        <Description>Choose the plan that suits you best</Description>
        <Radio value="basic">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator>
                {({ isSelected }) =>
                  isSelected() ? <Text class="text-xs leading-none text-background">✓</Text> : null
                }
              </Radio.Indicator>
            </Radio.Control>
            Basic Plan
          </Radio.Content>
          <Description>Includes 100 messages per month</Description>
        </Radio>
        <Radio value="premium">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator>
                {({ isSelected }) =>
                  isSelected() ? <Text class="text-xs leading-none text-background">✓</Text> : null
                }
              </Radio.Indicator>
            </Radio.Control>
            Premium Plan
          </Radio.Content>
          <Description>Includes 200 messages per month</Description>
        </Radio>
        <Radio value="business">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator>
                {({ isSelected }) =>
                  isSelected() ? <Text class="text-xs leading-none text-background">✓</Text> : null
                }
              </Radio.Indicator>
            </Radio.Control>
            Business Plan
          </Radio.Content>
          <Description>Unlimited messages</Description>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

/* The JSX of radio-group.test.tsx's renderPlan helper (T-019 … T-052). */
function BareText() {
  return (
    <Stage>
      <RadioGroup name="plan">
        <Label>Favorite Pet</Label>
        <Radio value="dogs">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Dogs
          </Radio.Content>
        </Radio>
        <Radio value="cats">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Cats
          </Radio.Content>
        </Radio>
        <Radio value="dragons">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Dragons
          </Radio.Content>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

/* radio-group.test.tsx:77 — item Labels as the item's name (T-009). */
function ItemLabel() {
  return (
    <Stage>
      <RadioGroup name="plan">
        <Label>Plan</Label>
        <Radio value="a">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Label>Basic</Label>
          </Radio.Content>
        </Radio>
        <Radio value="b">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Label>Premium</Label>
          </Radio.Content>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

/* Kobalte radio-group.test.tsx:1280 — the name comes from the item root (T-052). */
function WithoutContentLabel() {
  return (
    <Stage>
      <RadioGroup aria-label="Favorite Pet">
        <Radio aria-label="Label" value="dogs">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
          </Radio.Content>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

/* Kobalte radio-group.test.tsx:491 — Description inside the item (T-025). */
function ItemDescription() {
  return (
    <Stage>
      <RadioGroup aria-label="Favorite Pet">
        <Radio value="dogs">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Dogs
          </Radio.Content>
          <Description>Description</Description>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

/* D17: Root, Content and Indicator render props, written with accessors. */
function RenderProps() {
  return (
    <Stage>
      <RadioGroup defaultValue="a" name="plan">
        <Label>Plan</Label>
        <Radio value="a">
          {({ isSelected, isDisabled, isReadOnly, isInvalid, isRequired }) => (
            <Radio.Content>
              {({ isHovered, isPressed, isFocused, isFocusVisible }) => (
                <View class="flex-row items-center gap-3">
                  <Radio.Control>
                    <Radio.Indicator>
                      {({ isSelected }) => (isSelected() ? <Text>✓</Text> : null)}
                    </Radio.Indicator>
                  </Radio.Control>
                  <Text>{`Basic ${isSelected() ? "on" : "off"}`}</Text>
                  <Text>
                    {`flags ${isDisabled() ? "d" : "-"} ${isReadOnly() ? "r" : "-"} ${
                      isInvalid() ? "i" : "-"
                    } ${isRequired() ? "q" : "-"}`}
                  </Text>
                  <Text>
                    {`live ${isHovered() ? "h" : "-"} ${isPressed() ? "p" : "-"} ${
                      isFocused() ? "f" : "-"
                    } ${isFocusVisible() ? "v" : "-"}`}
                  </Text>
                </View>
              )}
            </Radio.Content>
          )}
        </Radio>
        <Radio value="b">
          {({ isSelected }) => (
            <Radio.Content>
              {({ isHovered }) => (
                <View class="flex-row items-center gap-3">
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Text>{`Premium ${isSelected() ? "on" : "off"} ${isHovered() ? "h" : "-"}`}</Text>
                </View>
              )}
            </Radio.Content>
          )}
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

/* T-016: the Control carries the testID, the item root carries its own. */
function TestId() {
  return (
    <Stage>
      <RadioGroup aria-label="Favorite Pet">
        <Radio value="dogs" testID="dogs-root">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Dogs
          </Radio.Content>
        </Radio>
        <Radio value="cats">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Cats
          </Radio.Content>
        </Radio>
        <Radio value="dragons">
          <Radio.Content>
            <Radio.Control testID="dragons-control">
              <Radio.Indicator />
            </Radio.Control>
            Dragons
          </Radio.Content>
        </Radio>
      </RadioGroup>
    </Stage>
  );
}

export const radioScenarios: Record<string, Component> = {
  "radio-group/default": Default,
  "radio-group/variants": Variants,
  "radio-group/per-radio-invalid": PerRadioInvalid,
  "radio-group/orientation": Orientation,
  "radio-group/validation": Validation,
  "radio-group/disabled": Disabled,
  "radio-group/delivery-and-payment": DeliveryAndPayment,
  "radio/custom-indicator.split": CustomIndicator,
  "radio/bare-text": BareText,
  "radio/item-label": ItemLabel,
  "radio/without-content-label": WithoutContentLabel,
  "radio/description": ItemDescription,
  "radio/render-props.split": RenderProps,
  "radio/test-id": TestId,
};
