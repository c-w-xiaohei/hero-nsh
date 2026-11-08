import { Text, View } from "nsh";
import { HERO_NSH_VERSION } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

function Basic() {
  return (
    <Stage>
      <View testID="smoke-box" role="button" onPress={probe("onPress")} class="p-2">
        <Text>{`hero-nsh ${HERO_NSH_VERSION}`}</Text>
      </View>
    </Stage>
  );
}

export const smokeScenarios = {
  "smoke/basic": Basic,
};
