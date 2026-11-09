import { Text, View } from "nsh";
import { Spinner } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * Shared Spinner scenarios, written with HeroUI's API only.
 *
 * `basic` and `label` are the JSX of the two unit cases that render a bare
 * Spinner. `colors` and `sizes` merge the two stories of the same names
 * (spinner.stories.tsx, Colors / Sizes): the five color variants and the four
 * sizes side by side, each under the caption the story gives it. The captions
 * come from Text instead of the story's `<span>`, because a bare string inside
 * a View does not render in this library.
 */

function Basic() {
  return (
    <Stage>
      <Spinner />
    </Stage>
  );
}

function Label() {
  return (
    <Stage>
      <Spinner aria-label="Saving changes" />
    </Stage>
  );
}

function Colors() {
  return (
    <Stage>
      <View class="flex-row items-start gap-8">
        <View class="flex-col items-center gap-2">
          <Spinner color="accent" />
          <Text class="text-xs text-muted">Accent</Text>
        </View>
        <View class="flex-col items-center gap-2">
          <Spinner color="current" />
          <Text class="text-xs text-muted">Current</Text>
        </View>
        <View class="flex-col items-center gap-2">
          <Spinner color="success" />
          <Text class="text-xs text-muted">Success</Text>
        </View>
        <View class="flex-col items-center gap-2">
          <Spinner color="warning" />
          <Text class="text-xs text-muted">Warning</Text>
        </View>
        <View class="flex-col items-center gap-2">
          <Spinner color="danger" />
          <Text class="text-xs text-muted">Danger</Text>
        </View>
      </View>
    </Stage>
  );
}

function Sizes() {
  return (
    <Stage>
      <View class="flex-row items-start gap-8">
        <View class="flex-col items-center gap-2">
          <Spinner size="sm" />
          <Text class="text-xs text-muted">Small</Text>
        </View>
        <View class="flex-col items-center gap-2">
          <Spinner size="md" />
          <Text class="text-xs text-muted">Medium</Text>
        </View>
        <View class="flex-col items-center gap-2">
          <Spinner size="lg" />
          <Text class="text-xs text-muted">Large</Text>
        </View>
        <View class="flex-col items-center gap-2">
          <Spinner size="xl" />
          <Text class="text-xs text-muted">Extra Large</Text>
        </View>
      </View>
    </Stage>
  );
}

export const spinnerScenarios = {
  "spinner/basic": Basic,
  "spinner/label": Label,
  "spinner/colors": Colors,
  "spinner/sizes": Sizes,
};
