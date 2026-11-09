import { Text, View } from "nsh";
import { Chip } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * Shared Chip scenarios. They use only the HeroUI API plus the NSH `View` /
 * `Text` layout containers the port sheet allows, so the reference app
 * (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * `basic` exercises the upstream top-level string path (R-027): the root wraps
 * a bare string in Chip.Label, so the text exists at all on the NSH side.
 * `colors` puts the accent chip next to the default one for T-003, whose
 * `chip--accent` class assertion becomes the resolved foreground color.
 * `label-composed` is upstream's `Chip.Label` composition case (T-005).
 * `variants` spreads all 5 colors x 4 variants x 3 sizes (60 chips) for the
 * unknown-class check and the screenshot baseline.
 * `with-icon` is story `WithIcon`: arbitrary children on both sides of a label.
 * `inline` is the docs "tag after a sentence" layout, kept to show the
 * inline-level difference recorded in port sheet section 8.
 */

const COLORS = ["accent", "default", "success", "warning", "danger"] as const;
const VARIANTS = ["primary", "secondary", "tertiary", "soft"] as const;
const SIZES = ["sm", "md", "lg"] as const;

/* Stands in for the icon library the story uses: an empty rounded view. */
function Dot() {
  return <View class="size-1.5 shrink-0 rounded-full bg-accent-soft-foreground" />;
}

function Basic() {
  return (
    <Stage>
      <Chip>New</Chip>
    </Stage>
  );
}

function Colors() {
  return (
    <Stage>
      <View class="flex-row items-center gap-3">
        <Chip color="accent">Accent</Chip>
        <Chip color="default">Default</Chip>
      </View>
    </Stage>
  );
}

function LabelComposed() {
  return (
    <Stage>
      <Chip>
        <Chip.Label>Pro</Chip.Label>
      </Chip>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      {SIZES.map((size) => (
        <View class="flex-row flex-wrap items-center gap-3">
          {VARIANTS.map((variant) =>
            COLORS.map((color) => (
              <Chip color={color} size={size} variant={variant}>
                <Chip.Label>{`${size} ${variant} ${color}`}</Chip.Label>
              </Chip>
            )),
          )}
        </View>
      ))}
    </Stage>
  );
}

function WithIcon() {
  return (
    <Stage>
      <View class="flex-row items-center gap-3">
        <Chip color="accent">
          <Dot />
          <Chip.Label>Label</Chip.Label>
          <Dot />
        </Chip>
      </View>
    </Stage>
  );
}

function Inline() {
  return (
    <Stage>
      <View class="flex-row items-center gap-2">
        <Text class="text-sm">Deployment status:</Text>
        <Chip color="success">Live</Chip>
      </View>
    </Stage>
  );
}

export const chipScenarios = {
  "chip/basic": Basic,
  "chip/colors": Colors,
  "chip/label-composed": LabelComposed,
  "chip/variants": Variants,
  "chip/with-icon": WithIcon,
  "chip/inline": Inline,
};
