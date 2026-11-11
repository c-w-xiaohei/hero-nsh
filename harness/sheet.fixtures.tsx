import { host, mount, Text, View } from "nsh";
import { animateSheetValue } from "../src/components/sheet/sheet.utils";
import { probe } from "./probe";

/*
 * NSH-only entry for the Sheet release-animation numbers (port sheet T-043,
 * T-044). The pure functions can be imported by a test file, but the frame loop
 * they schedule needs a running app and a manual clock: `animateSheetValue`
 * writes every frame’s value into Storage through `probe("update")`, so the
 * test can read the first and last frame after `app.clock.runFor`.
 *
 *   case "forward"  0 → 400, full frame loop
 *   case "back"     400 → 0, full frame loop
 *   case "cancel"   started and cancelled in the same turn: no update, no completion
 */
function App() {
  const name = String(host.params.case ?? "");

  const start = () => {
    const update = probe("update");
    const complete = probe("complete");

    if (name === "back") animateSheetValue(400, 0, update, complete, false);
    else if (name === "cancel") animateSheetValue(0, 100, update, complete, false)();
    else animateSheetValue(0, 400, update, complete, false);
  };

  return (
    <View class="flex-1 items-start gap-2 p-6">
      <View testID="start" onPress={start}>
        <Text>Start</Text>
      </View>
    </View>
  );
}

mount(App);
