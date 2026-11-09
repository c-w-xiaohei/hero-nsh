import { mount, Scroll, signal, Text, View } from "nsh";
import { Stage } from "../../../stage";

function Probe() {
  const off = signal("off:none");
  const cs = signal("cs:none");
  const sz = signal("sz:none");

  return (
    <Stage direction="rtl">
      <Text>{off()}</Text>
      <Text>{cs()}</Text>
      <Text>{sz()}</Text>
      <Scroll
        testID="s"
        class="h-24 w-64"
        horizontal
        onScroll={(e) => {
          off.set(`off:${e.offset.x},${e.offset.y}`);
          cs.set(`cs:${e.contentSize.width},${e.contentSize.height}`);
          sz.set(`sz:${e.size.width},${e.size.height}`);
        }}
      >
        <View class="flex-row">
          {Array.from({ length: 12 }, (_, i) => (
            <Text class="w-24">{`Cell ${i}`}</Text>
          ))}
        </View>
      </Scroll>
    </Stage>
  );
}

mount(Probe);
