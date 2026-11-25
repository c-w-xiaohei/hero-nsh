import { effect, host, mount, platform, Text, View, windowSize } from "nsh";
import type { Component, JSX } from "nsh";
import { EnvironmentScope, Modal } from "@heroui/react";
import type { ModalPresentation } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import { ModalContext } from "../src/components/modal/modal-context";

/*
 * NSH-only Modal fixtures for the mobile layer
 * (adapt-sheets/modal.md §2 A-009, §4 M-001…M-013), kept next to
 * harness/nsh.json for the same reason the other fixtures are: NSH takes the
 * entry's own directory as the app root.
 *
 * host.params.case picks the case:
 *   basic       the upstream fixture's part tree — a `Modal.Trigger` with the
 *               whole probe chain, Backdrop → Container → Dialog holding
 *               CloseTrigger, Header, a short Body and a Footer
 *   scrollable  the same tree with 40 tall rows inside the Body, so the
 *               `inside` Scroll really scrolls (M-013 atTop arbitration)
 *
 * host.params.scope picks the `EnvironmentScope` wrapper ("" = host default,
 * "touch" = `input="touch"`, "touch-regular" = `input="touch"
 * width="regular"`, "touch-compact" = `input="touch" width="compact"`),
 * same convention as toolbar.fixtures.tsx plus the width halves the modal
 * assertions inject.
 *
 * The remaining params map one-to-one onto the added props:
 * `presentation` (auto / panel / sheet), `dismissable`, `swipeable`,
 * `scroll`, `size`, `placement`, `open` ("1" mounts `defaultOpen`).
 *
 * Observation surface: `layout` (container / dialog / body bounds), `swipe`
 * (the context channel's pan key count, offset, card height and atTop —
 * `panKeys=0` is the physical-absence evidence), `drag` (offset deltas the
 * pan wrote), `scroll` (the Body's forwarded onScroll), `events`,
 * `closePress` and `openChange`.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: "container" | "dialog" | "body" | "trigger") {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/**
 * Reads the swipe channel `Modal.Backdrop` installs into `ModalContext`.
 * `panKeys` counts the props `swipe.panHandlers()` resolves to — 0 is the
 * assertion that the gesture path does not exist, since an enabled spread
 * mounts real responder keys. `offset` is the translate the Dialog binds,
 * `atTop` the claim gate's answer. Outside a Backdrop the resting value is
 * `swipe: null`, which reports as `panKeys: -1`.
 */
function SwipeProbe() {
  const ctx = ModalContext();
  const report = probe("swipe");
  let lastOffset = 0;

  effect(() => {
    const swipe = ctx?.swipe ?? null;
    const offset = swipe ? swipe.offset() : 0;

    if (offset !== lastOffset) {
      probe("drag")({ from: lastOffset, to: offset });
      lastOffset = offset;
    }

    const atTop = ctx?.scrollAtTop;

    report({
      presentation: ctx?.presentation() ?? "none",
      panKeys: swipe ? Object.keys(swipe.panHandlers()).length : -1,
      offset,
      atTop: atTop === null || atTop === undefined ? null : atTop(),
    });
  });

  return null;
}

const SCROLL_ROWS = 40;

function ModalTree() {
  const open = String(host.params.open ?? "1") === "1";
  const presentation = String(host.params.presentation ?? "auto") as
    | ModalPresentation
    | "auto";
  const dismissable = String(host.params.dismissable ?? "1") === "1";
  const swipeable = String(host.params.swipeable ?? "0") === "1";
  const scroll = String(host.params.scroll ?? "inside") as
    Modal["ContainerProps"]["scroll"];
  const size = host.params.size
    ? (String(host.params.size) as Modal["ContainerProps"]["size"])
    : undefined;
  const placement = host.params.placement
    ? (String(host.params.placement) as Modal["ContainerProps"]["placement"])
    : undefined;
  const scrollable = String(host.params.case ?? "basic") === "scrollable";

  return (
    <Modal defaultOpen={open} onOpenChange={probe("openChange")}>
      <Modal.Trigger
        testID="mo-trigger"
        onLayout={layoutProbe("trigger")}
        onPress={() => probe("events")("press")}
        onPressDown={() => probe("events")("pressDown")}
        onPressUp={() => probe("events")("pressUp")}
      >
        Open modal
      </Modal.Trigger>
      <Modal.Backdrop
        testID="mo-backdrop"
        presentation={presentation}
        isDismissable={dismissable}
        isSwipeable={swipeable}
      >
        <Modal.Container
          scroll={scroll}
          size={size}
          placement={placement}
          // The scrollable case needs a real inner Scroll: upstream's
          // container carries `h-(--visual-viewport-height)`, which the NSH
          // port replaces with `flex-1` — but the carrier row's
          // `items-center` never stretches the container vertically, so its
          // height stays content-driven and the dialog's `max-h-full` has no
          // definite basis (measured: a 1719pt dialog in a 768pt window, body
          // scroll range ≈ 0). A fixture-side definite height restores the
          // upstream intent for this case only; the panel/sheet assertions
          // never mount it. The height is bounded by the real window: under
          // `touch-compact` the auto presentation is a bottom-docked sheet,
          // so a pin taller than the window pushes the dialog's top — the
          // close trigger and header — off the screen (`id:mo-close` never
          // showing, Android run 45557149467). The scroll assertions keep
          // their range either way: 40 × 40pt rows against a ~640pt body.
          style={
            scrollable ? { height: Math.min(700, windowSize().height) } : undefined
          }
          onLayout={layoutProbe("container")}
        >
          <Modal.Dialog
            testID="mo-card"
            aria-label="Mobile modal"
            onLayout={layoutProbe("dialog")}
          >
            <Modal.CloseTrigger
              testID="mo-close"
              onPress={() => probe("closePress")()}
            />
            <Modal.Header>
              <Modal.Heading>Welcome</Modal.Heading>
            </Modal.Header>
            <Modal.Body
              testID="mo-body"
              onLayout={layoutProbe("body")}
              onScroll={probe("scroll")}
            >
              <SwipeProbe />
              {scrollable ? (
                Array.from({ length: SCROLL_ROWS }, (_, index) => (
                  <View class="h-10 w-full">
                    <Text>{`Row ${index}`}</Text>
                  </View>
                ))
              ) : (
                <Text>Modal body content</Text>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Text>Footer</Text>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "");

  if (scope === "touch") {
    return <EnvironmentScope input="touch">{props.children}</EnvironmentScope>;
  }

  if (scope === "touch-regular") {
    return (
      <EnvironmentScope input="touch" width="regular">
        {props.children}
      </EnvironmentScope>
    );
  }

  if (scope === "touch-compact") {
    return (
      <EnvironmentScope input="touch" width="compact">
        {props.children}
      </EnvironmentScope>
    );
  }

  if (scope === "pointer") {
    return <EnvironmentScope input="pointer">{props.children}</EnvironmentScope>;
  }

  // No fragment here: a `<>` boundary between the mount root and the tree
  // breaks the presented Dialog's owner chain — the modal opens but never
  // closes (measured on this fixture; the alert-dialog fixture hit the same
  // wall on open). Returning the child directly keeps the chain intact.
  return props.children;
}

const cases: Record<string, Component> = {
  basic: ModalTree,
  scrollable: ModalTree,
};

function Fixture() {
  const name = String(host.params.case ?? "basic");

  // The host OS the app itself reports (the table/tabs convention): mobile
  // tests branch on it to register degraded acceptance where a native host
  // gap (pan arbitration, Dialog Escape) makes the physical layer
  // unobservable — the iOS-only rows, never a silent skip.
  probe("platform")(platform.os);

  const Case = cases[name] ?? ModalTree;

  return (
    <Stage>
      <Scoped>
        <Case />
      </Scoped>
    </Stage>
  );
}

mount(Fixture);
