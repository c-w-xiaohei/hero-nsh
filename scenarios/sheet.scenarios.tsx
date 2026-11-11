import { effect, signal, Text } from "nsh";
import type { JSX } from "nsh";
import { Button, Input, Label, Sheet, TextField } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared Sheet scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app and this library render the same JSX (SOP 3.3).
 *
 * `sheet/basic` and `sheet/open` are the upstream fixture
 * (heroui/packages/react/tests/components/sheet/fixtures.tsx): a `Sheet.Trigger`
 * around a Button, Backdrop → Content → Dialog with Handle, Header/Heading
 * "Details", Body and a Footer whose Done button sits in `Sheet.Close`.
 * Every part carries an `onLayout` probe; the callbacks (open change, close,
 * animation end, close-trigger press, handle responders) write to Storage, and
 * the tests read them back through `callsOf` (SOP 3.2).
 *
 * `sheet/render-props.split` is the function-children case: HeroUI passes plain
 * values, this side passes accessors (D17), so the split scenario calls
 * `position()`.
 *
 * `sheet/controlled` keeps the panel open when a close is requested, which is
 * what the upstream controlled case observes; the “Set closed” button is the
 * `rerender(isOpen={false})` of the browser tests.
 *
 * `sheet/retained` is the retained-content family (T-024 … T-034): controlled
 * `isOpen`, `isExiting` driven by the same signal, a second sheet, and the
 * controls the tests press — “Open sheet”, “Close sheet”, “Release content”,
 * “Unmount”, a “Blink” that closes and reopens on the next turn (the
 * interrupted-opening cases), and a cleanup probe so releasing the retained
 * subtree is observable.
 *
 * Naming of the story/geometry entries:
 *   sheet/placement-*   T-012, T-013, T-017
 *   sheet/swipe-*       T-014
 *   sheet/snap-*        T-005, T-006
 *   sheet/pixel-snap    T-015
 *   sheet/expansion*    T-016
 *   sheet/detached*     T-017, T-022
 *   sheet/percentage-snap  T-018
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** Records the frame `name` got, so a test can compare part geometry. */
function layout(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

const ROWS = (count: number) =>
  Array.from({ length: count }, (_, index) => <Text>{`Item ${index}`}</Text>);

type Placement = "top" | "bottom" | "left" | "right";
type Swipe = Placement | "horizontal" | "vertical";

type FixtureProps = {
  defaultOpen?: boolean;
  placement?: Placement;
  snapPoints?: Array<number | string>;
  isDetached?: boolean;
  isDismissable?: boolean;
  swipeDirection?: Swipe;
  contentClassName?: string;
  contentStyle?: { width?: number; height?: number };
  customHandle?: boolean;
  closeLabel?: string;
  rows?: number;
  heading?: string;
  bodyText?: string;
  extra?: JSX.Element;
};

function SheetFixture(props: FixtureProps) {
  return (
    <Stage>
      <Sheet
        defaultOpen={props.defaultOpen}
        isDetached={props.isDetached}
        isDismissable={props.isDismissable}
        placement={props.placement}
        snapPoints={props.snapPoints}
        onAnimationEnd={probe("animationEnd")}
        onClose={probe("close")}
        onOpenChange={probe("openChange")}
      >
        <Sheet.Trigger>
          <Button>Open sheet</Button>
        </Sheet.Trigger>
        <Sheet.Backdrop testID="backdrop" swipeDirection={props.swipeDirection}>
          <Sheet.Content
            testID="content"
            className={props.contentClassName}
            style={props.contentStyle}
            onLayout={layout("content")}
          >
            <Sheet.Dialog testID="dialog" aria-label="Details" onLayout={layout("dialog")}>
              <Sheet.CloseTrigger
                aria-label={props.closeLabel ?? "Dismiss sheet"}
                onPress={probe("closeTriggerPress")}
              />
              {props.customHandle ? (
                <Sheet.Handle
                  testID="handle"
                  onResponderGrant={probe("grant")}
                  onResponderMove={probe("move")}
                  onResponderRelease={probe("release")}
                  onLayout={layout("handle")}
                >
                  <Text>Custom grip</Text>
                </Sheet.Handle>
              ) : (
                <Sheet.Handle testID="handle" onLayout={layout("handle")} />
              )}
              <Sheet.Header onLayout={layout("header")}>
                <Sheet.Heading>{props.heading ?? "Details"}</Sheet.Heading>
              </Sheet.Header>
              <Sheet.Body testID="body" onLayout={layout("body")}>
                {props.rows ? ROWS(props.rows) : <Text>{props.bodyText ?? "Sheet content"}</Text>}
              </Sheet.Body>
              <Sheet.Footer onLayout={layout("footer")}>
                <Sheet.Close>
                  <Button onPress={probe("closePress")}>Done</Button>
                </Sheet.Close>
              </Sheet.Footer>
              {props.extra}
            </Sheet.Dialog>
          </Sheet.Content>
        </Sheet.Backdrop>
      </Sheet>
    </Stage>
  );
}

function Basic() {
  return <SheetFixture />;
}

function Open() {
  return <SheetFixture defaultOpen />;
}

function CustomHandle() {
  return <SheetFixture defaultOpen customHandle />;
}

const PLACEMENTS: Placement[] = ["bottom", "top", "left", "right"];

function placementScenario(placement: Placement) {
  return () => <SheetFixture defaultOpen placement={placement} />;
}

function swipeScenario(swipeDirection: Swipe) {
  return () => (
    <SheetFixture
      contentStyle={{ height: 240, width: 320 }}
      swipeDirection={swipeDirection}
    />
  );
}

function SnapSentinel(props: { sentinel: number | string }) {
  return <SheetFixture defaultOpen snapPoints={[180, props.sentinel]} />;
}

function FullHeight(props: { snapPoints?: Array<number | string> }) {
  return <SheetFixture defaultOpen rows={50} snapPoints={props.snapPoints} />;
}

function PixelSnap() {
  return <SheetFixture defaultOpen rows={50} snapPoints={[220, 1]} />;
}

function PercentageSnap() {
  return <SheetFixture defaultOpen rows={50} snapPoints={["40%", "100%"]} />;
}

function Expansion(props: { snapPoints?: Array<number | string> }) {
  return (
    <SheetFixture
      contentClassName="mx-auto max-h-[95vh] max-w-[420px]"
      rows={40}
      snapPoints={props.snapPoints}
    />
  );
}

function detachedScenario(placement: Placement) {
  return () => <SheetFixture defaultOpen isDetached placement={placement} rows={50} snapPoints={[220, 1]} />;
}

function Detached() {
  return <SheetFixture defaultOpen isDetached />;
}

function DismissLocked() {
  return <SheetFixture defaultOpen isDismissable={false} />;
}

function LockedClosed() {
  return <SheetFixture isDismissable={false} />;
}

function DetachedLeft() {
  return <SheetFixture defaultOpen isDetached placement="left" />;
}

function BodyDrag() {
  return <SheetFixture defaultOpen rows={10} />;
}

function Labelled() {
  return <SheetFixture bodyText="description" defaultOpen heading="title" />;
}

/* -------------------------------------------------------------------------------------------------
 * Render props (split: accessors instead of plain values, D17)
 * -----------------------------------------------------------------------------------------------*/

function RenderPropsSplit() {
  return (
    <Stage>
      <Sheet defaultOpen onOpenChange={probe("openChange")}>
        <Sheet.Backdrop>
          <Sheet.Content
            testID="panel"
            ref={(node) => probe("contentRef")(node !== null && node !== undefined)}
          >
            {({ position }) => (
              <Sheet.Dialog
                testID="dialog"
                aria-label="Slots"
                ref={(node) => probe("dialogRef")(node !== null && node !== undefined)}
              >
                <Sheet.Handle />
                <Sheet.Header>
                  <Sheet.Heading>{position()}</Sheet.Heading>
                </Sheet.Header>
                <Sheet.Body>
                  <Text>Body</Text>
                </Sheet.Body>
                <Sheet.Footer>
                  <Text>Footer</Text>
                </Sheet.Footer>
              </Sheet.Dialog>
            )}
          </Sheet.Content>
        </Sheet.Backdrop>
      </Sheet>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Controlled without a trigger (T-003)
 * -----------------------------------------------------------------------------------------------*/

function Controlled() {
  const open = signal(true);

  return (
    <Stage>
      <Button onPress={() => open.set(false)}>Set closed</Button>
      <Sheet isOpen={open()} onOpenChange={probe("openChange")}>
        <Sheet.Backdrop>
          <Sheet.Content>
            <Sheet.Dialog aria-label="Controlled">
              <Sheet.CloseTrigger />
              <Sheet.Body>
                <Text>Controlled content</Text>
              </Sheet.Body>
            </Sheet.Dialog>
          </Sheet.Content>
        </Sheet.Backdrop>
      </Sheet>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Nested roots (T-010, T-023)
 * -----------------------------------------------------------------------------------------------*/

function Nested() {
  return (
    <SheetFixture
      defaultOpen
      extra={
        <Sheet.NestedRoot>
          <Sheet.Trigger>
            <Button>Nested</Button>
          </Sheet.Trigger>
          <Sheet.Backdrop>
            <Sheet.Content>
              <Sheet.Dialog aria-label="Nested details">
                <Sheet.Header>
                  <Sheet.Heading>Nested details</Sheet.Heading>
                </Sheet.Header>
                <Sheet.Body>
                  <Text>Nested content</Text>
                </Sheet.Body>
                <Sheet.CloseTrigger />
              </Sheet.Dialog>
            </Sheet.Content>
          </Sheet.Backdrop>
        </Sheet.NestedRoot>
      }
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * Retained content (T-024 … T-034)
 * -----------------------------------------------------------------------------------------------*/

/** Observes that releasing the retained subtree really unmounts it. */
function RetainedBody() {
  effect(() => () => probe("cleanup")());

  return (
    <TextField defaultValue="Keep me" name="retained">
      <Label>Retained input</Label>
      <Input testID="retained-input" />
    </TextField>
  );
}

type RetainedProps = {
  startOpen?: boolean;
  retain?: boolean;
  placement?: Placement;
  snapPoints?: Array<number | string>;
  swipeDirection?: Swipe;
  withSecond?: boolean;
};

function RetainedSheet(props: RetainedProps) {
  const open = signal(props.startOpen ?? true);
  const retain = signal(props.retain ?? true);
  const second = signal(false);
  const mounted = signal(true);

  const close = () => open.set(false);
  /* Closes and reopens on the next turn: an interrupted exit. */
  const blink = () => {
    open.set(false);
    setTimeout(() => open.set(true), 0);
  };
  /* Opens and closes on the next turn: an interrupted opening. */
  const blinkOpen = () => {
    open.set(true);
    setTimeout(() => open.set(false), 0);
  };
  const closeAndUnmount = () => {
    open.set(false);
    setTimeout(() => mounted.set(false), 0);
  };

  return (
    <Stage>
      <Button onPress={() => open.set(true)}>Open sheet</Button>
      <Button onPress={blinkOpen}>Blink open</Button>
      <Button onPress={() => retain.set(false)}>Release content</Button>
      <Button onPress={() => mounted.set(false)}>Unmount</Button>
      <Button onPress={() => second.set(true)}>Open second</Button>
      <Button onPress={() => second.set(false)}>Close second</Button>
      <Button onPress={probe("ping")}>Ping</Button>
      {mounted() && (
        <Sheet
          isOpen={open()}
          placement={props.placement}
          snapPoints={props.snapPoints}
          onAnimationEnd={probe("animationEnd")}
          onOpenChange={(value: boolean) => {
            probe("openChange")(value);
            open.set(value);
          }}
        >
          <Sheet.Backdrop
            isExiting={!open() && retain()}
            swipeDirection={props.swipeDirection}
          >
            <Sheet.Content testID="content" onLayout={layout("content")}>
              <Sheet.Dialog aria-label="Details" testID="dialog" onLayout={layout("dialog")}>
                <Sheet.CloseTrigger aria-label="Dismiss sheet" />
                <Sheet.Handle testID="handle" />
                <Sheet.Header>
                  <Sheet.Heading>Details</Sheet.Heading>
                  <Button onPress={close}>Close sheet</Button>
                  <Button onPress={blink}>Blink</Button>
                  <Button onPress={() => mounted.set(false)}>Unmount now</Button>
                  <Button onPress={closeAndUnmount}>Close and unmount</Button>
                </Sheet.Header>
                <Sheet.Body>
                  <Text>Retained body</Text>
                  <RetainedBody />
                </Sheet.Body>
                <Sheet.Footer>
                  <Sheet.Close>
                    <Button>Done</Button>
                  </Sheet.Close>
                </Sheet.Footer>
              </Sheet.Dialog>
            </Sheet.Content>
          </Sheet.Backdrop>
        </Sheet>
      )}
      {props.withSecond !== false && (
        <Sheet
          isOpen={second()}
          onAnimationEnd={probe("secondAnimationEnd")}
          onOpenChange={(value: boolean) => {
            probe("secondOpenChange")(value);
            second.set(value);
          }}
        >
          <Sheet.Backdrop isExiting>
            <Sheet.Content>
              <Sheet.Dialog aria-label="Second sheet">
                <Sheet.Header>
                  <Sheet.Heading>Second sheet</Sheet.Heading>
                </Sheet.Header>
                <Sheet.Body>
                  <Text>Second content</Text>
                </Sheet.Body>
                <Sheet.CloseTrigger aria-label="Close second" />
              </Sheet.Dialog>
            </Sheet.Content>
          </Sheet.Backdrop>
        </Sheet>
      )}
    </Stage>
  );
}

function retainedScenario(props: RetainedProps) {
  return () => <RetainedSheet {...props} />;
}

/* -------------------------------------------------------------------------------------------------
 * Two controlled sheets side by side (T-025)
 * -----------------------------------------------------------------------------------------------*/

function StackedSheets() {
  const first = signal(true);
  const second = signal(false);

  return (
    <Stage>
      <Button onPress={() => first.set(true)}>Open first</Button>
      <Button onPress={() => first.set(false)}>Close first</Button>
      <Button onPress={() => second.set(true)}>Open second</Button>
      <Button onPress={() => second.set(false)}>Close second</Button>
      <Sheet
        isOpen={first()}
        onAnimationEnd={probe("firstAnimationEnd")}
        onOpenChange={(value: boolean) => {
          probe("firstOpenChange")(value);
          first.set(value);
        }}
      >
        <Sheet.Backdrop isExiting={!first()}>
          <Sheet.Content>
            <Sheet.Dialog aria-label="First sheet">
              <Sheet.Header>
                <Sheet.Heading>First sheet</Sheet.Heading>
              </Sheet.Header>
              <Sheet.Body>
                <TextField defaultValue="Saved" name="saved">
                  <Label>Saved input</Label>
                  <Input testID="saved-input" />
                </TextField>
              </Sheet.Body>
              <Sheet.CloseTrigger aria-label="Dismiss sheet" />
            </Sheet.Dialog>
          </Sheet.Content>
        </Sheet.Backdrop>
      </Sheet>
      <Sheet
        isOpen={second()}
        onAnimationEnd={probe("secondAnimationEnd")}
        onOpenChange={(value: boolean) => {
          probe("secondOpenChange")(value);
          second.set(value);
        }}
      >
        <Sheet.Backdrop isExiting>
          <Sheet.Content>
            <Sheet.Dialog aria-label="Second sheet">
              <Sheet.Header>
                <Sheet.Heading>Second sheet</Sheet.Heading>
              </Sheet.Header>
              <Sheet.Body>
                <Text>Second content</Text>
              </Sheet.Body>
              <Sheet.CloseTrigger aria-label="Close second" />
            </Sheet.Dialog>
          </Sheet.Content>
        </Sheet.Backdrop>
      </Sheet>
    </Stage>
  );
}

export const sheetScenarios: Record<string, Component> = {
  "sheet/basic": Basic,
  "sheet/open": Open,
  "sheet/custom-handle": CustomHandle,
  "sheet/placement-bottom": placementScenario("bottom"),
  "sheet/placement-top": placementScenario("top"),
  "sheet/placement-left": placementScenario("left"),
  "sheet/placement-right": placementScenario("right"),
  "sheet/swipe-right": swipeScenario("right"),
  "sheet/swipe-left": swipeScenario("left"),
  "sheet/swipe-top": swipeScenario("top"),
  "sheet/swipe-horizontal": swipeScenario("horizontal"),
  "sheet/swipe-vertical": swipeScenario("vertical"),
  "sheet/snap-sentinel-number": () => <SnapSentinel sentinel={1} />,
  "sheet/snap-sentinel-string": () => <SnapSentinel sentinel="1" />,
  "sheet/snap-sentinel-full": () => <SnapSentinel sentinel="100%" />,
  "sheet/full-none": () => <FullHeight />,
  "sheet/full-empty": () => <FullHeight snapPoints={[]} />,
  "sheet/full-one": () => <FullHeight snapPoints={[1]} />,
  "sheet/full-100": () => <FullHeight snapPoints={["100%"]} />,
  "sheet/pixel-snap": PixelSnap,
  "sheet/percentage-snap": PercentageSnap,
  "sheet/expansion": () => <Expansion />,
  "sheet/expansion-snap": () => <Expansion snapPoints={[220, 1]} />,
  "sheet/detached-expansion-bottom": detachedScenario("bottom"),
  "sheet/detached-expansion-top": detachedScenario("top"),
  "sheet/detached-expansion-left": detachedScenario("left"),
  "sheet/detached-expansion-right": detachedScenario("right"),
  "sheet/detached": Detached,
  "sheet/dismiss-locked": DismissLocked,
  "sheet/locked-closed": LockedClosed,
  "sheet/detached-left": DetachedLeft,
  "sheet/body-drag": BodyDrag,
  "sheet/labelled": Labelled,
  "sheet/render-props.split": RenderPropsSplit,
  "sheet/controlled": Controlled,
  "sheet/nested": Nested,
  "sheet/retained": retainedScenario({}),
  "sheet/retained-reset": retainedScenario({ retain: false }),
  "sheet/retained-snap-bottom": retainedScenario({ placement: "bottom", snapPoints: [100, 1] }),
  "sheet/retained-snap-top": retainedScenario({ placement: "top", snapPoints: [100, 1] }),
  "sheet/retained-snap-left": retainedScenario({ placement: "left", snapPoints: [100, 1] }),
  "sheet/retained-snap-right": retainedScenario({ placement: "right", snapPoints: [100, 1] }),
  "sheet/retained-snap-bottom-left": retainedScenario({
    placement: "bottom",
    snapPoints: [100, 1],
    swipeDirection: "left",
  }),
  "sheet/retained-snap-bottom-right": retainedScenario({
    placement: "bottom",
    snapPoints: [100, 1],
    swipeDirection: "right",
  }),
  "sheet/retained-exit": retainedScenario({ snapPoints: [200, 1] }),
  "sheet/stacked": StackedSheets,
};
