import { computed, split, View } from "nsh";
import type { Bounds, JSX, PressEvent, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

import { createInput } from "../../primitives/environment";
import { createPressFeedback } from "../../primitives/pressable";
import { SurfaceRoot } from "../surface/surface";
import type { SurfaceRootProps } from "../surface/surface";
import {
  ListGroupItemContext,
  type ListGroupItemContextValue,
} from "./list-group-context";
import { listGroupVariants } from "./list-group.styles";

/**
 * The props of `ListGroup` / `ListGroupRoot`: upstream's `ListGroupRootProps`
 * (`list-group.types.ts:8-22`) — `children`, `variant` forwarded to the
 * `Surface` container, `className`, `style` — on NSH's surface props.
 */
export interface ListGroupRootProps extends SurfaceRootProps {}

/**
 * The props of `ListGroup.Item`: upstream's `ListGroupItemProps`
 * (`list-group.types.ts:28-37`), a `Pressable` — on NSH a pressable `View`,
 * so the pressable host props travel through `rest` (`onPress`, `onPressDown`,
 * `onPressUp`, `onLongPress`, `disabled`, `focusable`, `tooltip`, `role`, …).
 * `hitSlop` stays off the public surface: the press-feedback seam computes it
 * (common rules §12/§23).
 */
export interface ListGroupItemProps
  extends Omit<ViewProps, "children" | "class" | "hitSlop"> {
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** Whether the row ignores presses; `app.enabled` reports false. */
  isDisabled?: boolean;

  /** Called on a completed press. */
  onPress?: (event: PressEvent) => void;
  onPressDown?: (event: PressEvent) => void;
  onPressUp?: (event: PressEvent) => void;
  onLongPress?: (event: PressEvent) => void;

  onLayout?: (event: { bounds: Bounds }) => void;

  /** The row's view, as NSH forwards refs (a callback). */
  ref?: (node: ViewRef) => void;
}

/**
 * ListGroup / ListGroupRoot: a `Surface` container for grouped list rows
 * (`list-group.tsx:26-48`). `role="list"` names the container semantics; the
 * upstream `borderCurve: 'continuous'` has no NSH channel and is registered
 * in sheet §7.
 */
export function ListGroupRoot(props: ListGroupRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "variant",
  ] as const);

  const classes = computed(() =>
    [listGroupVariants().root(), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  return (
    <SurfaceRoot
      {...rest}
      role={rest.role ?? "list"}
      variant={local.variant}
      className={classes()}
    >
      {local.children}
    </SurfaceRoot>
  );
}

/**
 * ListGroup.Item / ListGroupItem: one pressable row (`flex-row items-center
 * p-4 gap-3`). It is the seam consumer the press-feedback sheet promises:
 * `createPressFeedback` owns the touch-side hit expansion (`hitSlop`) and the
 * canonical press channels, gated on `input() === "touch"` — under the
 * default pointer environment the row is a plain press target (M-012).
 *
 * The row binds no animated style of its own (upstream's `Pressable` has
 * none): the channels the factory returns are observable through the seam
 * (`isPressed`/`pressed`/`hitSlop`), and a caller that wants a press visual
 * composes `PressableFeedback` parts itself.
 */
export function ListGroupItem(props: ListGroupItemProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "isDisabled",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onLongPress",
    "onLayout",
    "ref",
  ] as const);

  const input = createInput();

  const enabled = () => input() === "touch" && !(local.isDisabled ?? false);

  const feedback = createPressFeedback({ enabled });

  // The seam's read half for the slot parts and consumers: the item's `View`
  // keeps the writers, `ListGroupItemContext` only observes — the same split
  // `PressableFeedbackContext` makes (sheet A-006's `ctx-state` channel).
  const itemValue: ListGroupItemContextValue = {
    isPressed: feedback.isPressed,
    pressed: feedback.pressed,
    scale: feedback.scale,
    highlightOpacity: feedback.highlightOpacity,
    hitSlop: feedback.hitSlop,
    pressOrigin: feedback.pressOrigin,
    bounds: feedback.bounds,
    enabled,
  };

  const handlePressDown = (event: PressEvent) => {
    feedback.pressDown(event);
    local.onPressDown?.(event);
  };

  const handlePressUp = (event: PressEvent) => {
    feedback.pressUp(event);
    local.onPressUp?.(event);
  };

  const handleLayout = (event: { bounds: Bounds }) => {
    feedback.layout(event);
    local.onLayout?.(event);
  };

  const classes = computed(() =>
    [
      listGroupVariants({ input: input() }).item(),
      local.className ?? "",
    ]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      disabled={local.isDisabled ?? false}
      class={classes()}
      style={local.style}
      hitSlop={feedback.hitSlop()}
      onPress={local.onPress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onLongPress={local.onLongPress}
      onLayout={handleLayout}
    >
      <ListGroupItemContext.Provider value={itemValue}>
        {local.children}
      </ListGroupItemContext.Provider>
    </View>
  );
}
