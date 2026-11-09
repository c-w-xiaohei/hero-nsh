import { Label, ProgressCircle } from "@heroui/react";
import { Text, View } from "nsh";
import { Stage } from "@scenario/stage";

/*
 * Shared ProgressCircle scenarios, written with HeroUI's API only (plus the
 * NSH layout Views a story uses for its flex row and the `testID` anchors the
 * port sheet allows) so the reference app renders the same JSX.
 *
 * `default` is the JSX of T-001/T-005; the three testIDs on Track, TrackCircle
 * and FillCircle give the composition case something to observe in place of
 * the dropped `data-slot` values. `sizes`, `colors`, `indeterminate` and
 * `label` are the stories of the same names; `values`, `nested-label`,
 * `indeterminate-value-text` and `disabled` are the port sheet's supplementary
 * scenarios (no upstream test). The last one renders the render props' value
 * text as copy, which is the only channel `nsh/test` can read for it.
 */

function Default() {
  return (
    <Stage>
      <ProgressCircle aria-label="Loading" value={60}>
        <ProgressCircle.Track testID="pcircle-track">
          <ProgressCircle.TrackCircle testID="pcircle-track-circle" />
          <ProgressCircle.FillCircle testID="pcircle-fill-circle" />
        </ProgressCircle.Track>
      </ProgressCircle>
    </Stage>
  );
}

function Sizes() {
  return (
    <Stage>
      <View class="flex-row items-start gap-6">
        <ProgressCircle aria-label="Loading" size="sm" value={40}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <ProgressCircle aria-label="Loading" size="md" value={60}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <ProgressCircle aria-label="Loading" size="lg" value={80}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
      </View>
    </Stage>
  );
}

function Colors() {
  return (
    <Stage>
      <View class="flex-row items-start gap-6">
        <ProgressCircle aria-label="Loading" color="default" value={60}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <ProgressCircle aria-label="Loading" color="accent" value={60}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <ProgressCircle aria-label="Loading" color="success" value={60}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <ProgressCircle aria-label="Loading" color="warning" value={60}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <ProgressCircle aria-label="Loading" color="danger" value={60}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
      </View>
    </Stage>
  );
}

function Values() {
  return (
    <Stage>
      <View class="flex-row items-start gap-6">
        <ProgressCircle aria-label="Loading" value={0}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <ProgressCircle aria-label="Loading" value={25}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <ProgressCircle aria-label="Loading" value={50}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <ProgressCircle aria-label="Loading" value={75}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <ProgressCircle aria-label="Loading" value={100}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
      </View>
    </Stage>
  );
}

function Indeterminate() {
  return (
    <Stage>
      <ProgressCircle isIndeterminate aria-label="Loading">
        <ProgressCircle.Track>
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle />
        </ProgressCircle.Track>
      </ProgressCircle>
    </Stage>
  );
}

function IndeterminateValueText() {
  return (
    <Stage>
      <View class="flex-col items-start gap-6">
        <ProgressCircle
          isIndeterminate
          valueLabel="half"
          aria-valuetext="Halfway there"
        >
          {(values) => (
            <View class="flex-col items-center gap-2">
              <Text testID="value-text-with-aria">{values.valueText() ?? "no value text"}</Text>
              <ProgressCircle.Track>
                <ProgressCircle.TrackCircle />
                <ProgressCircle.FillCircle />
              </ProgressCircle.Track>
            </View>
          )}
        </ProgressCircle>
        <ProgressCircle isIndeterminate valueLabel="half">
          {(values) => (
            <View class="flex-col items-center gap-2">
              <Text testID="value-text-without-aria">{values.valueText() ?? "no value text"}</Text>
              <ProgressCircle.Track>
                <ProgressCircle.TrackCircle />
                <ProgressCircle.FillCircle />
              </ProgressCircle.Track>
            </View>
          )}
        </ProgressCircle>
      </View>
    </Stage>
  );
}

function WithLabel() {
  return (
    <Stage>
      <View class="flex-row items-center gap-3">
        <ProgressCircle aria-label="Loading" value={75}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <Label>75% Complete</Label>
      </View>
    </Stage>
  );
}

function NestedLabel() {
  return (
    <Stage>
      <ProgressCircle value={60}>
        <Label>Loading</Label>
        <ProgressCircle.Track>
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle />
        </ProgressCircle.Track>
      </ProgressCircle>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <ProgressCircle aria-disabled value={40}>
        <ProgressCircle.Track>
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle />
        </ProgressCircle.Track>
      </ProgressCircle>
    </Stage>
  );
}

export const progressCircleScenarios = {
  "progress-circle/default": Default,
  "progress-circle/sizes": Sizes,
  "progress-circle/colors": Colors,
  "progress-circle/values": Values,
  "progress-circle/indeterminate": Indeterminate,
  "progress-circle/indeterminate-value-text": IndeterminateValueText,
  "progress-circle/label": WithLabel,
  "progress-circle/nested-label": NestedLabel,
  "progress-circle/disabled": Disabled,
};
