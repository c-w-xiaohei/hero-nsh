import { Scroll, Text, View } from "nsh";
import type { JSX } from "nsh";
import "./fonts";

/** One scrolling screen with a title, a note and an optional action row. */
export function Page(props: {
  title: string;
  note?: string;
  actions?: JSX.Element;
  children?: JSX.Element;
}) {
  return (
    <View class="flex-1 bg-background">
      <Scroll class="flex-1">
        <View class="gap-8 p-8">
          <View class="flex-row items-start justify-between gap-4">
            <View class="flex-1 gap-1">
              <Text class="text-lg font-semibold text-foreground">{props.title}</Text>
              {props.note ? <Text class="text-sm text-muted">{props.note}</Text> : null}
            </View>
            {props.actions}
          </View>
          {props.children}
        </View>
      </Scroll>
    </View>
  );
}

/** A titled block inside a page. */
export function Section(props: { title: string; children?: JSX.Element }) {
  return (
    <View class="gap-3">
      <Text class="text-xs text-muted">{props.title}</Text>
      {props.children}
    </View>
  );
}

/** Side-by-side blocks that wrap when the window narrows. */
export function Row(props: { children?: JSX.Element }) {
  return <View class="flex-row flex-wrap items-start gap-4">{props.children}</View>;
}
