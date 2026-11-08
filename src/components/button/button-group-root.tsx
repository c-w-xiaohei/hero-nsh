import type {
  AccessibilityState,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, signal, View } from "nsh";
import type { Accessor } from "nsh";

import {
  ButtonGroupContext,
  type ButtonGroupContextValue,
  type ButtonGroupItem,
} from "./button-group-context";
import {
  buttonGroupVariants,
  type ButtonGroupOrientation,
} from "./button-group.styles";
import type { ButtonSize, ButtonVariant } from "./button.styles";
import { type AriaProps, type GlobalDomProps } from "./dom-props";
import { toAccessibilityRole } from "./roles";

/** The live state HeroUI hands to a group's `className` and `style`. */
export interface ButtonGroupRenderProps {
  isHovered: Accessor<boolean>;
  isFocusWithin: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
}

export interface ButtonGroupRootProps extends AriaProps, GlobalDomProps {
  children?: JSX.Element;
  className?: string | ((values: ButtonGroupRenderProps) => string);
  style?: StyleProp<ViewStyle> | ((values: ButtonGroupRenderProps) => StyleProp<ViewStyle>);
  variant?: ButtonVariant;
  size?: ButtonSize;
  isDisabled?: boolean;
  fullWidth?: boolean;
  orientation?: ButtonGroupOrientation;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  role?: "group" | "region" | "presentation";
  id?: string;
  /** React Aria's slot collection prop: accepted for parity, no effect. */
  slot?: string;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
  /** Reads as `isDisabled` when `true`, as React Aria's Group does. */
  "aria-disabled"?: boolean;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;
  testID?: string;
  nativeID?: string;
  tooltip?: JSX.Element;
  onLayout?: (e: { bounds: Bounds }) => void;
  ref?: (node: ViewRef) => void;
  onHoverStart?: (e: NshMouseEvent) => void;
  onHoverEnd?: (e: NshMouseEvent) => void;
  onHoverChange?: (isHovered: boolean) => void;
  /** React Aria's DOM render function: accepted for parity, no effect. */
  render?: unknown;
}

/**
 * ButtonGroup.Root / ButtonGroupRoot: a flex row or column holding Buttons and
 * Separators. The group's size, variant, disabled and full-width values go
 * down through context.
 */
export function ButtonGroupRoot(props: ButtonGroupRootProps) {
  const orientation = computed<ButtonGroupOrientation>(() => props.orientation ?? "horizontal");
  const fullWidth = computed(() => props.fullWidth ?? false);
  const isDisabled = computed(
    () =>
      props.isDisabled ??
      (props["aria-disabled"] === true ? true : undefined) ??
      false,
  );
  const isInvalid = computed(() => props.isInvalid ?? false);

  // R-030 … R-032, R-053, R-042, R-045, R-046
  const slots = computed(() =>
    buttonGroupVariants({ fullWidth: fullWidth(), orientation: orientation() }),
  );

  const isHovered = signal(false);

  // Research 4.2: the parts register themselves with the nearest owner. Each
  // Button hands over its focus accessors, and the group asks them for
  // `isFocusWithin` / `isFocusVisible`.
  const items = signal<readonly ButtonGroupItem[]>([]);
  const registerItem = (item: ButtonGroupItem) => {
    items.set([...items(), item]);

    return () => {
      items.set(items().filter((current) => current !== item));
    };
  };

  const isFocusWithin = computed(() => items().some((item) => item.focused()));
  const isFocusVisible = computed(() => items().some((item) => item.focusVisible()));

  const renderProps: ButtonGroupRenderProps = {
    isHovered,
    isFocusWithin,
    isFocusVisible,
    isDisabled,
    isInvalid,
  };

  const resolvedClassName = () => {
    const className = props.className;
    return typeof className === "function" ? className(renderProps) : className;
  };

  const classes = computed(() =>
    [slots().base(), resolvedClassName() ?? ""].filter((part) => part !== "").join(" "),
  );

  const resolvedStyle = () => {
    const style = props.style;
    return typeof style === "function" ? style(renderProps) : style;
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    // React Aria's useHover({ isDisabled }) reports no hover while disabled.
    if (isDisabled() || isHovered()) {
      return;
    }

    isHovered.set(true);
    props.onHoverStart?.(event);
    props.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    if (!isHovered()) {
      return;
    }

    isHovered.set(false);
    props.onHoverEnd?.(event);
    props.onHoverChange?.(false);
  };

  // React Aria's Group marks itself with `data-disabled` but not `aria-disabled`,
  // and NSH propagates an ancestor's `accessibilityState.disabled` to its
  // descendants, which would leave a child no way to turn itself back on. The
  // group therefore only passes `isDisabled` down through context.
  const contextValue: ButtonGroupContextValue = {
    slots,
    orientation,
    size: () => props.size,
    variant: () => props.variant,
    isDisabled: () =>
      props.isDisabled ?? (props["aria-disabled"] === true ? true : undefined),
    fullWidth: () => props.fullWidth,
    isInvalid,
    isHovered,
    isFocusWithin,
    isFocusVisible,
    registerItem,
  };

  return (
    <ButtonGroupContext.Provider value={contextValue}>
      <View
        ref={(node) => props.ref?.(node)}
        testID={props.testID}
        nativeID={props.id ?? props.nativeID}
        tooltip={props.tooltip}
        role={toAccessibilityRole(props.role, "group")}
        // The group itself stays pressable: `isDisabled` reaches the buttons
        // through context, so one of them can still turn itself back on.
        accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
        accessibilityState={props.accessibilityState}
        accessibilityElementsHidden={props["aria-hidden"] ?? props.accessibilityElementsHidden}
        class={classes()}
        style={resolvedStyle()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onLayout={props.onLayout}
      >
        {props.children}
      </View>
    </ButtonGroupContext.Provider>
  );
}
