import { Scroll, Text, View } from "nsh";
import type { JSX } from "nsh";
import "./fonts";

/** One scrolling screen with a title, a note and an optional action row. */
export function Page(props: {
  title: string;
  note?: string;
  actions?: JSX.Element;
  children?: JSX.Element;
  /** Tailwind max-width class for the page column; defaults to 1200. */
  maxWidth?: string;
}) {
  return (
    <View class="flex-1 bg-background">
      <Scroll class="flex-1">
        <View class={`w-full ${props.maxWidth ?? "max-w-[1200px]"} mx-auto gap-8 p-4 sm:p-8`}>
          <View class="flex-col items-start gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
            <View class="flex-auto gap-1">
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

/** A responsive card grid: one column on phones, three from the sm breakpoint. */
export function Grid(props: { children?: JSX.Element; cols?: string }) {
  return (
    <View class={`grid grid-cols-1 gap-4 ${props.cols ?? "sm:grid-cols-3"}`}>
      {props.children}
    </View>
  );
}
