import { signal, Text, View } from "nsh";
import { CloseButton } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared CloseButton scenarios, written with HeroUI's API only.
 *
 * The unit cases' JSX is `basic`, `label`, `slot`, `hover`, `press`, `focus`
 * and `disabled` (port sheet 4b). `pending.split` covers the `isPending`
 * contract (RAC Button.tsx:89-93) that 4b left out: autoFocus and the Tab
 * stop on one side, blocked press / hover / hover look on the other.
 * `custom-icon` and `interactive` merge the `WithCustomIcon` and `Interactive`
 * stories (close-button.stories.tsx:29,37,45).
 *
 * Split scenarios (SOP 3.3.3, port sheet 4b):
 *   close-button/focus.split        the render prop receives accessors in this
 *     library and booleans upstream (D17), so the two sides cannot share one
 *     JSX; this side reads `isFocusVisible()`.
 *   close-button/pending.split      the same D17 split for the `isPending` /
 *     `isHovered` look state.
 *   close-button/custom-icon.split  upstream draws an `@iconify/react` icon,
 *     which is React-only; this side stands a 16 × 16 View in its place.
 */

function Basic() {
  return (
    <Stage>
      <CloseButton />
    </Stage>
  );
}

function Label() {
  return (
    <Stage>
      <CloseButton aria-label="Dismiss dialog" />
    </Stage>
  );
}

/*
 * `slot` is HeroUI's own prop and the reference package accepts it; NSH has no
 * Provider slots, so only the explicit label is observable here (T-005).
 */
function Slot() {
  return (
    <Stage>
      <CloseButton aria-label="Dismiss" slot="close" />
    </Stage>
  );
}

/* Two buttons, so moving the mouse from one to the other closes the hover. */
function Hover() {
  return (
    <Stage>
      <CloseButton
        aria-label="Close"
        onHoverStart={probe("onHoverStart")}
        onHoverChange={probe("onHoverChange")}
        onHoverEnd={probe("onHoverEnd")}
      />
      <CloseButton
        aria-label="Other"
        onHoverStart={probe("onHoverStart")}
        onHoverChange={probe("onHoverChange")}
        onHoverEnd={probe("onHoverEnd")}
      />
    </Stage>
  );
}

function Press() {
  return (
    <Stage>
      <CloseButton
        onPress={probe("onPress")}
        onPressStart={probe("onPressStart")}
        onPressUp={probe("onPressUp")}
        onPressEnd={probe("onPressEnd")}
        onPressChange={probe("onPressChange")}
      />
    </Stage>
  );
}

/*
 * The keyboard focus case: the render prop shows whether the focus ring is
 * visible, which is what upstream's `data-focus-visible` drives.
 */
function FocusSplit() {
  return (
    <Stage>
      <CloseButton
        aria-label="Close"
        onFocus={probe("onFocus")}
        onBlur={probe("onBlur")}
        onFocusChange={probe("onFocusChange")}
      >
        {({ isFocusVisible }) => <Text>{isFocusVisible() ? "Focus visible" : "Close"}</Text>}
      </CloseButton>
      <CloseButton aria-label="Other" />
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <CloseButton isDisabled onPress={probe("onPress")} onHoverStart={probe("onHoverStart")} />
    </Stage>
  );
}

/*
 * `isPending` (RAC Button.tsx:89-93, port sheet §1.2 / §2 / R-008): blocks
 * press and hover while retaining focusability. The first pending button takes
 * `autoFocus`, so the mount effect proves a pending button can hold focus; the
 * second pending button is the plain Tab stop behind it, and `Other` proves
 * focus moves on. The render prop makes the pending and hover state visible,
 * which is the look the hover guard decides.
 *
 * It is a `.split` scenario (D17): the render prop receives accessors here and
 * booleans upstream.
 */
function PendingSplit() {
  return (
    <Stage>
      <CloseButton
        isPending
        autoFocus
        aria-label="Pending close"
        onFocus={probe("onFocusAuto")}
        onBlur={probe("onBlurAuto")}
        onPress={probe("onPress")}
        onHoverStart={probe("onHoverStart")}
        onHoverChange={probe("onHoverChange")}
      >
        {({ isHovered, isPending }) => (
          <Text>{`${isPending() ? "Pending" : "Ready"}: ${isHovered() ? "hovered" : "idle"}`}</Text>
        )}
      </CloseButton>
      <CloseButton
        isPending
        aria-label="Second pending"
        onFocus={probe("onFocusTab")}
        onBlur={probe("onBlurTab")}
      />
      <CloseButton
        aria-label="Other close"
        onFocus={probe("onFocusOther")}
        onHoverStart={probe("onHoverStartOther")}
      />
    </Stage>
  );
}

/* The NSH side of the split: a 16 × 16 placeholder where upstream has an icon. */
function CustomIconSplit() {
  return (
    <Stage>
      <CloseButton aria-label="Dismiss">
        <View class="size-4 rounded-sm bg-accent" />
      </CloseButton>
    </Stage>
  );
}

/* The `Interactive` story: its label and a caption follow the press count. */
function Interactive() {
  const count = signal(0);

  return (
    <Stage>
      <View class="flex-col items-center gap-4">
        <CloseButton
          aria-label={`Close (clicked ${count()} times)`}
          onPress={() => count.update((value) => value + 1)}
        />
        <Text>Clicked: {count()} times</Text>
      </View>
    </Stage>
  );
}

export const closeButtonScenarios = {
  "close-button/basic": Basic,
  "close-button/label": Label,
  "close-button/slot": Slot,
  "close-button/hover": Hover,
  "close-button/press": Press,
  "close-button/focus.split": FocusSplit,
  "close-button/disabled": Disabled,
  "close-button/pending.split": PendingSplit,
  "close-button/custom-icon.split": CustomIconSplit,
  "close-button/interactive": Interactive,
} satisfies Record<string, Component>;
