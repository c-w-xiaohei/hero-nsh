import { View } from "nsh";
import type { JSX } from "nsh";

export function Stage(props: { children?: JSX.Element }) {
  return <View class="flex-1 items-start gap-4 bg-background p-6">{props.children}</View>;
}
