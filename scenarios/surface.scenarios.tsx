import { Text } from "nsh";
import { Surface } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared Surface scenarios. They use only the HeroUI API so the reference app
 * (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * Surface is a single-part container: `Surface` and `Surface.Root` are the same
 * component. `basic` keeps a bare string child, `variants` puts all four
 * variants on one stage for the screenshot comparison and for reading the base
 * text color through the transparent variant, and `custom` is the docs
 * CustomStyles example with Text children instead of h3 / p (a View does not
 * render bare strings).
 */

function Basic() {
  return (
    <Stage>
      <Surface>Panel content</Surface>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <Surface className="w-64 rounded-xl p-4" variant="default">
        Default surface
      </Surface>
      <Surface className="w-64 rounded-xl p-4" variant="secondary">
        Secondary surface
      </Surface>
      <Surface className="w-64 rounded-xl p-4" variant="tertiary">
        Tertiary surface
      </Surface>
      <Surface className="w-64 rounded-xl border border-border p-4" variant="transparent">
        Transparent surface
      </Surface>
    </Stage>
  );
}

function Custom() {
  return (
    <Stage>
      <Surface
        className="w-full rounded-xl border border-accent/15 bg-linear-to-br from-accent/8 via-surface to-surface-secondary p-4"
        variant="default"
      >
        <Text class="text-sm font-semibold text-foreground">Billing overview</Text>
        <Text class="text-sm text-muted">View invoices and payment methods in one place.</Text>
      </Surface>
    </Stage>
  );
}

export const surfaceScenarios: Record<string, Component> = {
  "surface/basic": Basic,
  "surface/variants": Variants,
  "surface/custom": Custom,
};
