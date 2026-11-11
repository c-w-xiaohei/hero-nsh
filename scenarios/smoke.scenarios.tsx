import { Text, View } from "nsh";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

function Basic() {
  return (
    <Stage>
      <View testID="smoke-box" role="button" onPress={probe("onPress")} class="p-2">
        <Text>hero-nsh</Text>
      </View>
    </Stage>
  );
}

export const smokeScenarios = {
  "smoke/basic": Basic,
};
