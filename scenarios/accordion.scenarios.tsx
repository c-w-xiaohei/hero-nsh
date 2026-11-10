import { Text, View } from "nsh";
import { Accordion } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared scenarios for Accordion, written with HeroUI's API only.
 *
 * The upstream stories are the source of `default` (Default), `surface`
 * (SurfaceVariant), `custom` (Custom) and `without-separator`
 * (WithoutSeparator). The story's decorative leading icon is omitted: it comes
 * from `@iconify/react`, which has no counterpart here, so the trigger keeps the
 * title and the default indicator chevron.
 *
 * Every item follows the story and leaves `id` out, so the root generates the
 * key. The panels start closed, which is what the story renders too.
 */

const ITEMS = [
  {
    title: "How do I place an order?",
    content:
      "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
  },
  {
    title: "Can I modify or cancel my order?",
    content:
      "Yes, you can modify or cancel your order before it's shipped. Once your order is processed, you can't make changes.",
  },
  {
    title: "What payment methods do you accept?",
    content: "We accept all major credit cards, including Visa, Mastercard, and American Express.",
  },
  {
    title: "How much does shipping cost?",
    content:
      "Shipping costs vary based on your location and the size of your order. We offer free shipping for orders over $50.",
  },
  {
    title: "Do you ship internationally?",
    content:
      "Yes, we ship to most countries. Please check our shipping rates and policies for more information.",
  },
  {
    title: "How do I request a refund?",
    content:
      "If you're not satisfied with your purchase, you can request a refund within 30 days of purchase. Please contact our customer support team for assistance.",
  },
];

const CATEGORIES = [
  {
    title: "General",
    items: [
      {
        title: "How do I place an order?",
        content:
          "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
      },
      {
        title: "Can I modify or cancel my order?",
        content:
          "Yes, you can modify or cancel your order before it's shipped. Once your order is processed, you can't make changes.",
      },
    ],
  },
  {
    title: "Licensing",
    items: [
      {
        title: "How do I purchase a license?",
        content:
          "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
      },
      {
        title: "What is the difference between a standard and a pro license?",
        content:
          "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
      },
    ],
  },
  {
    title: "Usage",
    items: [
      {
        title: "How do I use the HeroUI icon set?",
        content:
          "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
      },
      {
        title: "Can I use it with Tailwind CSS?",
        content:
          "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
      },
    ],
  },
];

function Items(props: { items: { title: string; content: string }[] }) {
  return props.items.map((item) => (
    <Accordion.Item>
      <Accordion.Heading>
        <Accordion.Trigger>
          {item.title}
          <Accordion.Indicator />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body>{item.content}</Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  ));
}

/* -------------------------------------------------------------------------------------------------
 * Default (story Default)
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <View class="w-full max-w-md">
        <Accordion allowsMultipleExpanded>
          <Items items={ITEMS} />
        </Accordion>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * SurfaceVariant (story SurfaceVariant)
 * -----------------------------------------------------------------------------------------------*/

function SurfaceVariant() {
  return (
    <Stage>
      <View class="w-full max-w-md">
        <Accordion variant="surface" allowsMultipleExpanded>
          <Items items={ITEMS} />
        </Accordion>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Custom (story Custom): a page heading and one surface accordion per category
 * -----------------------------------------------------------------------------------------------*/

function Custom() {
  return (
    <Stage>
      <View class="w-full max-w-2xl">
        <View class="flex flex-col gap-1">
          <Text class="text-2xl font-bold">Frequently Asked Questions</Text>
          <Text class="mb-4 text-lg font-medium text-muted">
            Everything you need to know about licensing and usage.
          </Text>
        </View>
        <View class="mt-2 flex flex-col gap-6">
          {CATEGORIES.map((category) => (
            <View>
              <Text class="text-base mb-2 font-medium text-muted">{category.title}</Text>
              <Accordion className="w-full" variant="surface" allowsMultipleExpanded>
                <Items items={category.items} />
              </Accordion>
            </View>
          ))}
        </View>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithoutSeparator (story WithoutSeparator)
 * -----------------------------------------------------------------------------------------------*/

function WithoutSeparator() {
  return (
    <Stage>
      <View class="w-full max-w-md">
        <Accordion hideSeparator allowsMultipleExpanded>
          <Items items={ITEMS} />
        </Accordion>
      </View>
    </Stage>
  );
}

export const accordionScenarios: Record<string, Component> = {
  "accordion/default": Default,
  "accordion/surface": SurfaceVariant,
  "accordion/custom": Custom,
  "accordion/without-separator": WithoutSeparator,
};
