import { signal, Text, View } from "nsh";
import type { ScrollRef } from "nsh";
import { Button, ScrollShadow } from "@heroui/react";
import type { ScrollShadowVisibility } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * Shared ScrollShadow scenarios, written with HeroUI's API only (plus `Button`
 * for the scroll steps and `Text` / `signal` for the state readouts).
 *
 * Readouts. `nsh/test` cannot read `mask-image` or the upstream `data-*`
 * attributes, so the port sheet's 4b translates the mask assertions into the
 * public `onVisibilityChange` projection: every scenario shows the last
 * reported state as its own `state:<value>` Text node and the number of calls
 * as `calls:<n>`. Scenarios that must prove a scroll actually happened (a
 * disabled or controlled container reports no state change) also count the
 * root's forwarded `onScroll` in `scrolls:<n>`.
 *
 * Content. The vertical scenarios keep one bare `Row 0` string as the first
 * child on purpose (T-001 proves the content layer wraps bare text) and give
 * the other rows an explicit 40pt height, so the 12-row content is 480pt tall
 * inside the 160pt viewport: resting, middle (y = 160) and end are three
 * distinct states. The horizontal scenarios use 12 × 96pt cells in a 256pt
 * viewport for the same reason.
 */

function Readouts(props: {
  calls: () => number;
  scrolls?: () => number;
  state: () => string;
}) {
  return (
    <View class="flex-col gap-1">
      <Text>{`state:${props.state()}`}</Text>
      <Text>{`calls:${props.calls()}`}</Text>
      {props.scrolls ? <Text>{`scrolls:${props.scrolls()}`}</Text> : null}
    </View>
  );
}

/* 480pt of content in a 160pt viewport. */
function tallRows() {
  return [
    "Row 0",
    ...Array.from({ length: 11 }, (_, index) => (
      <Text class="h-10">{`Row ${index + 1}`}</Text>
    )),
  ];
}

/* 12 × 96pt cells in a 256pt viewport. */
function wideCells() {
  return Array.from({ length: 12 }, (_, index) => (
    <Text class="w-24">{`Cell ${index}`}</Text>
  ));
}

/* -------------------------------------------------------------------------------------------------
 * Vertical
 * -----------------------------------------------------------------------------------------------*/

function Vertical() {
  const state = signal("-");
  const calls = signal(0);
  let scroller: ScrollRef | undefined;

  return (
    <Stage>
      <View class="flex-row gap-2">
        <Button onPress={() => scroller?.scrollTo({ y: 160 })}>Scroll to middle</Button>
        <Button onPress={() => scroller?.scrollTo({ y: 99999 })}>Scroll to end</Button>
      </View>
      <Readouts state={state} calls={calls} />
      <ScrollShadow
        ref={(node) => {
          scroller = node;
        }}
        testID="scroller"
        className="h-40 w-64"
        onVisibilityChange={(visibility) => {
          state.set(visibility);
          calls.update((count) => count + 1);
        }}
      >
        {tallRows()}
      </ScrollShadow>
    </Stage>
  );
}

function Fitting() {
  const state = signal("-");
  const calls = signal(0);

  return (
    <Stage>
      <Readouts state={state} calls={calls} />
      <ScrollShadow
        testID="scroller"
        className="h-40 w-64"
        onVisibilityChange={(visibility) => {
          state.set(visibility);
          calls.update((count) => count + 1);
        }}
      >
        Short content
      </ScrollShadow>
    </Stage>
  );
}

function Offset() {
  const state = signal("-");
  const calls = signal(0);
  const scrolls = signal(0);
  let scroller: ScrollRef | undefined;

  return (
    <Stage>
      <View class="flex-row gap-2">
        <Button onPress={() => scroller?.scrollTo({ y: 40 })}>Scroll 40</Button>
        <Button onPress={() => scroller?.scrollTo({ y: 120 })}>Scroll 120</Button>
      </View>
      <Readouts state={state} calls={calls} scrolls={scrolls} />
      <ScrollShadow
        ref={(node) => {
          scroller = node;
        }}
        testID="scroller"
        className="h-40 w-64"
        offset={80}
        size={40}
        onScroll={() => scrolls.update((count) => count + 1)}
        onVisibilityChange={(visibility) => {
          state.set(visibility);
          calls.update((count) => count + 1);
        }}
      >
        {tallRows()}
      </ScrollShadow>
    </Stage>
  );
}

function Grow() {
  const rows = signal(1);
  const state = signal("-");
  const calls = signal(0);

  return (
    <Stage>
      <Button onPress={() => rows.update((count) => count + 20)}>Add rows</Button>
      <Readouts state={state} calls={calls} />
      <ScrollShadow
        testID="scroller"
        className="h-40 w-64"
        onVisibilityChange={(visibility) => {
          state.set(visibility);
          calls.update((count) => count + 1);
        }}
      >
        {Array.from({ length: rows() }, (_, index) => `Row ${index}`)}
      </ScrollShadow>
    </Stage>
  );
}

function Rerender() {
  const renders = signal(0);
  const state = signal("-");
  const calls = signal(0);
  let scroller: ScrollRef | undefined;

  const reporter = (renderCount: number) => (visibility: ScrollShadowVisibility) => {
    state.set(`${visibility}@${renderCount}`);
    calls.update((count) => count + 1);
  };

  return (
    <Stage>
      <View class="flex-row gap-2">
        <Button onPress={() => renders.update((count) => count + 1)}>Re-render</Button>
        <Button onPress={() => scroller?.scrollTo({ y: 160 })}>Scroll to middle</Button>
      </View>
      <Readouts state={state} calls={calls} />
      <ScrollShadow
        ref={(node) => {
          scroller = node;
        }}
        testID="scroller"
        className="h-40 w-64"
        onVisibilityChange={reporter(renders())}
      >
        {tallRows()}
      </ScrollShadow>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Horizontal
 * -----------------------------------------------------------------------------------------------*/

function Horizontal() {
  const state = signal("-");
  const calls = signal(0);
  let scroller: ScrollRef | undefined;

  return (
    <Stage>
      <Button onPress={() => scroller?.scrollTo({ x: 99999 })}>Scroll to end</Button>
      <Readouts state={state} calls={calls} />
      <ScrollShadow
        ref={(node) => {
          scroller = node;
        }}
        testID="scroller"
        className="h-24 w-64"
        orientation="horizontal"
        onVisibilityChange={(visibility) => {
          state.set(visibility);
          calls.update((count) => count + 1);
        }}
      >
        {wideCells()}
      </ScrollShadow>
    </Stage>
  );
}

function HorizontalRtl() {
  const state = signal("-");
  const calls = signal(0);

  return (
    <Stage>
      <Readouts state={state} calls={calls} />
      <ScrollShadow
        testID="scroller"
        className="h-24 w-64"
        orientation="horizontal"
        dir="rtl"
        onVisibilityChange={(visibility) => {
          state.set(visibility);
          calls.update((count) => count + 1);
        }}
      >
        {wideCells()}
      </ScrollShadow>
    </Stage>
  );
}

function FittingHorizontal() {
  const state = signal("-");
  const calls = signal(0);

  return (
    <Stage>
      <Readouts state={state} calls={calls} />
      <ScrollShadow
        testID="scroller"
        className="h-24 w-64"
        orientation="horizontal"
        onVisibilityChange={(visibility) => {
          state.set(visibility);
          calls.update((count) => count + 1);
        }}
      >
        <Text class="w-20">Narrow</Text>
      </ScrollShadow>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Enable / controlled modes
 * -----------------------------------------------------------------------------------------------*/

function Disabled() {
  const calls = signal(0);
  const scrolls = signal(0);
  let scroller: ScrollRef | undefined;

  return (
    <Stage>
      <Button onPress={() => scroller?.scrollTo({ y: 200 })}>Scroll</Button>
      <Readouts state={() => "-"} calls={calls} scrolls={scrolls} />
      <ScrollShadow
        ref={(node) => {
          scroller = node;
        }}
        testID="scroller"
        className="h-40 w-64"
        isEnabled={false}
        onScroll={() => scrolls.update((count) => count + 1)}
        onVisibilityChange={() => calls.update((count) => count + 1)}
      >
        {tallRows()}
      </ScrollShadow>
    </Stage>
  );
}

function Controlled() {
  const calls = signal(0);
  const scrolls = signal(0);
  let scroller: ScrollRef | undefined;

  return (
    <Stage>
      <Button onPress={() => scroller?.scrollTo({ y: 200 })}>Scroll</Button>
      <Readouts state={() => "-"} calls={calls} scrolls={scrolls} />
      <ScrollShadow
        ref={(node) => {
          scroller = node;
        }}
        testID="scroller"
        className="h-40 w-64"
        visibility="both"
        onScroll={() => scrolls.update((count) => count + 1)}
        onVisibilityChange={() => calls.update((count) => count + 1)}
      >
        {tallRows()}
      </ScrollShadow>
    </Stage>
  );
}

function Toggle() {
  const enabled = signal(true);
  const state = signal("-");
  const calls = signal(0);
  const scrolls = signal(0);
  let scroller: ScrollRef | undefined;

  return (
    <Stage>
      <View class="flex-row gap-2">
        <Button onPress={() => enabled.update((value) => !value)}>Toggle enabled</Button>
        <Button onPress={() => scroller?.scrollTo({ y: 200 })}>Scroll</Button>
        <Button onPress={() => scroller?.scrollTo({ y: 160 })}>Scroll to middle</Button>
      </View>
      <Readouts state={state} calls={calls} scrolls={scrolls} />
      <ScrollShadow
        ref={(node) => {
          scroller = node;
        }}
        testID="scroller"
        className="h-40 w-64"
        isEnabled={enabled()}
        onScroll={() => scrolls.update((count) => count + 1)}
        onVisibilityChange={(visibility) => {
          state.set(visibility);
          calls.update((count) => count + 1);
        }}
      >
        {tallRows()}
      </ScrollShadow>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Style prop (T-010 / T-023): the root's `onLayout` reports the viewport.
 * -----------------------------------------------------------------------------------------------*/

function Style() {
  const aViewport = signal(0);
  const bViewport = signal(0);

  return (
    <Stage>
      <Text>{`a-vp:${aViewport()}`}</Text>
      <Text>{`b-vp:${bViewport()}`}</Text>
      <ScrollShadow
        testID="style-a"
        className="w-64"
        style={{ height: 240 }}
        size={64}
        offset={20}
        onLayout={(event) => aViewport.set(event.bounds.size.height)}
      >
        {tallRows()}
      </ScrollShadow>
      <ScrollShadow
        testID="style-b"
        className="w-64"
        style={{ height: 240 }}
        size={40}
        offset={80}
        onLayout={(event) => bViewport.set(event.bounds.size.height)}
      >
        {tallRows()}
      </ScrollShadow>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Screenshot-only scenarios
 * -----------------------------------------------------------------------------------------------*/

function Sizes() {
  return (
    <Stage>
      <View class="flex-row items-start gap-4">
        <ScrollShadow className="w-48" size={20} style={{ height: 200 }}>
          {tallRows()}
        </ScrollShadow>
        <ScrollShadow className="w-48" size={40} style={{ height: 200 }}>
          {tallRows()}
        </ScrollShadow>
        <ScrollShadow className="w-48" size={80} style={{ height: 200 }}>
          {tallRows()}
        </ScrollShadow>
        <ScrollShadow className="w-48" hideScrollBar size={40} style={{ height: 200 }}>
          {tallRows()}
        </ScrollShadow>
      </View>
    </Stage>
  );
}

export const scrollShadowScenarios = {
  "scroll-shadow/vertical": Vertical,
  "scroll-shadow/fitting": Fitting,
  "scroll-shadow/offset": Offset,
  "scroll-shadow/grow": Grow,
  "scroll-shadow/rerender": Rerender,
  "scroll-shadow/horizontal": Horizontal,
  "scroll-shadow/horizontal-rtl": HorizontalRtl,
  "scroll-shadow/fitting-horizontal": FittingHorizontal,
  "scroll-shadow/disabled": Disabled,
  "scroll-shadow/controlled": Controlled,
  "scroll-shadow/toggle": Toggle,
  "scroll-shadow/style": Style,
  "scroll-shadow/sizes": Sizes,
};
