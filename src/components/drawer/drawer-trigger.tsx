import type { JSX, PressEvent, ViewProps } from "nsh";
import { computed, signal, split, Text, View } from "nsh";
import { createInteractionModality, isKeyboardPress } from "../../primitives/create-interaction-modality";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { DrawerContext } from "./drawer-context";
import { drawerVariants } from "./drawer.styles";

export interface DrawerTriggerProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  id?: string;
  "aria-label"?: string;
  render?: unknown;
  ref?: (node: import("nsh").ViewRef) => void;
}

export function DrawerTrigger(props: DrawerTriggerProps): JSX.Element {
  const [local, rest] = split(props, [
    "children", "className", "render", "ref", "id", "aria-label", "disabled", "focusable", "role",
    "testID", "nativeID", "accessibilityLabel", "accessibilityState", "style", "onPress", "onPressDown",
    "onPressUp", "onLongPress", "onFocus", "onBlur", "onMouseEnter", "onMouseLeave",
  ] as const);
  const drawer = DrawerContext();
  const overlay = OverlayTriggerContext();
  const modality = createInteractionModality();
  const focused = signal(false);
  // R-001, R-002, R-035, R-004, R-005: use the context slot, with the default table outside Root.
  const classes = computed(() => [drawer?.slots().trigger() ?? drawerVariants().trigger(), local.className].filter(Boolean).join(" "));
  const isDisabled = () => local.disabled === true;
  // R-003: `status-focused` (`ring-2 ring-focus`, offset from the background) on
  // `[data-focus-visible="true"]`, i.e. keyboard focus only. Upstream's
  // `:not([data-focused])` branch has no state channel here (port sheet).
  const classList = computed(() => ({ "ring-2 ring-focus ring-offset-2 ring-offset-background": focused() && modality.isKeyboard() }));
  const children = computed(() => {
    const child = local.children;
    return typeof child === "string" || typeof child === "number" ? <Text>{child}</Text> : child;
  });
  let unregister: (() => void) | undefined;
  const handlePress = (event: PressEvent) => {
    if (!isDisabled()) {
      if (isKeyboardPress(event)) modality.setKeyboardModality();
      else modality.setPointerModality();
      overlay?.toggle();
    }
    local.onPress?.(event);
  };

  return (
    <View
      {...rest}
      ref={(node) => {
        unregister?.();
        unregister = overlay?.registerTrigger(node);
        local.ref?.(node);
      }}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      classList={classList()}
      focusable={local.focusable ?? true}
      disabled={isDisabled()}
      role={local.role ?? "button"}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityState={local.accessibilityState}
      style={local.style}
      onPress={handlePress}
      onPressDown={local.onPressDown}
      onPressUp={local.onPressUp}
      onLongPress={local.onLongPress}
      onFocus={() => { focused.set(true); modality.onFocus(); local.onFocus?.(); }}
      onBlur={() => { focused.set(false); local.onBlur?.(); }}
      onMouseEnter={local.onMouseEnter}
      onMouseLeave={local.onMouseLeave}
    >
      {children()}
    </View>
  );
}
