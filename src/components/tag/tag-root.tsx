import type {
  Accessor,
  AccessibilityState,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import {
  cleanup,
  computed,
  reduceMotion,
  signal,
  split,
  untracked,
  View,
} from "nsh";

import {
  createSelectableItem,
  isKeyboardPress,
  modifiersFromPress,
  type SelectionBehavior,
  type SelectionMode,
} from "../../primitives";
import { renderTagChildren, deriveTagTextValue } from "./tag-children";
import {
  TagContext,
  TagGroupContext,
  TagItemContext,
  type TagContextValue,
} from "./tag-context";
import { TagDefaultRemoveButton } from "./tag-remove-button";
import { tagVariants } from "./tag.styles";

/** The live state HeroUI hands to tag children, `className` and `style`. */
export interface TagRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isSelected: Accessor<boolean>;
  /** The row holds `focusedKey` while the list has the keyboard focus. */
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  selectionMode: Accessor<SelectionMode>;
  selectionBehavior: Accessor<SelectionBehavior>;
  /** Whether the group has an `onRemove` (RAC's `allowsRemoving`). */
  allowsRemoving: Accessor<boolean>;
}

/**
 * The props of `Tag.Root` (`Tag`): HeroUI 3.2.7's `TagRootProps`, which is
 * React Aria Components' `Tag`, `LinkDOMProps`, the press / hover / focus
 * event groups and the tag's variant dimensions.
 *
 * `size` / `variant` are accepted but have no effect: upstream the root reads
 * them from `TagGroupContext` only, so a tag's own values land in `restProps`
 * and never reach the stylesheet. The port behaves the same (port sheet §1.1,
 * §8).
 */
export interface TagRootProps {
  children?: JSX.Element | ((values: TagRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. */
  className?: string | ((values: TagRenderProps) => string);

  style?: StyleProp<ViewStyle> | ((values: TagRenderProps) => StyleProp<ViewStyle>);

  /** A unique key for the tag; one is generated when it is absent. */
  id?: string | number;

  /** The accessible text and the typeahead text; derived from a string child otherwise. */
  textValue?: string;

  /** Whether the tag is disabled; the group's `disabledKeys` is added to it. */
  isDisabled?: boolean;

  /** Maps to `accessibilityLabel`, with `textValue` as the fallback. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references (`accessibilityHint` carries the text). */
  "aria-describedby"?: string;

  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: accepted by the variant dimension upstream, never applied. */
  size?: "sm" | "md" | "lg";

  /** Accepted, no effect: accepted by the variant dimension upstream, never applied. */
  variant?: "default" | "surface";

  /** Called when the tag is activated while the group allows no selection. */
  onAction?: () => void;

  onPress?: (e: PressEvent) => void;
  onPressStart?: (e: PressEvent) => void;
  onPressUp?: (e: PressEvent) => void;
  onPressEnd?: (e: PressEvent) => void;
  onPressChange?: (isPressed: boolean) => void;
  onPressDown?: (e: PressEvent) => void;

  onHoverStart?: (e: NshMouseEvent) => void;
  onHoverEnd?: (e: NshMouseEvent) => void;
  onHoverChange?: (isHovered: boolean) => void;

  onMouseEnter?: (e: NshMouseEvent) => void;
  onMouseLeave?: (e: NshMouseEvent) => void;

  onFocus?: () => void;
  onBlur?: () => void;
  onFocusChange?: (isFocused: boolean) => void;

  /** Link props: accepted, no effect (there is no DOM anchor). */
  href?: string;
  target?: string;
  rel?: string;
  download?: unknown;
  ping?: string;
  referrerPolicy?: string;
  hrefLang?: string;

  dir?: "ltr" | "rtl" | "auto";
  lang?: string;
  hidden?: boolean;
  inert?: boolean;
  translate?: "yes" | "no";
  suppressHydrationWarning?: boolean;

  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;
  testID?: string;
  nativeID?: string;
  tooltip?: JSX.Element;

  /** Replaces the host element upstream: accepted, no effect. */
  render?: unknown;

  /** A slot collection name upstream: accepted, no effect. */
  slot?: string;

  /** A DOM key event upstream; keys are the list's. */
  onKeyDown?: unknown;
  onKeyUp?: unknown;
  onKeyDownCapture?: unknown;
  onKeyUpCapture?: unknown;

  onLayout?: (event: { bounds: Bounds }) => void;

  /** Reaches the row `View`; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/**
 * The row's content, read where it is placed. It is the one read of
 * `props.children` (common rules): a function of at least one parameter is the
 * HeroUI render prop (D17), anything else is the caller's JSX, a bare string
 * becoming a `Text`. It lives in its own component so the read, and the
 * `TagContext` provider around it, are evaluated in the right owner: a
 * `computed` built in the row's body would run outside the provider and
 * a caller-written `Tag.RemoveButton` would lose its context.
 */
function TagContent(props: {
  read: () => JSX.Element | ((values: TagRenderProps) => JSX.Element);
  renderProps: TagRenderProps;
  registerText: (read: () => string | undefined) => () => void;
  renderRemoveButton: () => JSX.Element;
}): JSX.Element {
  const resolved = computed<{ content: JSX.Element; renderProp: boolean }>(() => {
    const value = props.read();

    if (typeof value === "function" && value.length >= 1) {
      // D17: the render function runs once, untracked; its subtree must not
      // rebuild when the state it reads changes.
      return {
        content: untracked(() =>
          (value as (values: TagRenderProps) => JSX.Element)(props.renderProps),
        ),
        renderProp: true,
      };
    }

    // A zero-argument function is NSH's reactive child, which is a
    // `JSX.Element`; only a one-argument function is the HeroUI render prop.
    return { content: value as JSX.Element, renderProp: false };
  });

  cleanup(props.registerText(() => deriveTagTextValue(resolved().content)));

  // HeroUI appends its own remove button only to plain children; with a render
  // function the caller places `Tag.RemoveButton` itself (`tag.tsx`).
  return [
    renderTagChildren(resolved().content),
    resolved().renderProp ? null : props.renderRemoveButton(),
  ] as unknown as JSX.Element;
}

/**
 * Tag.Root / TagRoot: one `role="row"` tag. The group holds the selection and
 * the focus; the row holds its own hover and pressed state, registers itself as
 * a collection entry and, on press, selects and moves the virtual focus
 * (port sheet section 5).
 */
export function TagRoot(props: TagRootProps): JSX.Element {
  const group = TagGroupContext();

  if (!group) {
    return null;
  }

  const collectionItem = TagItemContext();

  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "textValue",
    "isDisabled",
    "aria-label",
    "aria-describedby",
    "aria-hidden",
    "size",
    "variant",
    "onAction",
    "onPress",
    "onPressStart",
    "onPressUp",
    "onPressEnd",
    "onPressChange",
    "onPressDown",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onMouseEnter",
    "onMouseLeave",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "href",
    "target",
    "rel",
    "download",
    "ping",
    "referrerPolicy",
    "hrefLang",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
    "suppressHydrationWarning",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
    "accessibilityElementsHidden",
    "testID",
    "nativeID",
    "tooltip",
    "render",
    "slot",
    "onKeyDown",
    "onKeyUp",
    "onKeyDownCapture",
    "onKeyUpCapture",
    "onLayout",
    "ref",
  ] as const);

  // The key is an identity value: read once, never re-derived under the row.
  let generatedKey: string | undefined;
  const key = String(
    local.id ?? (generatedKey ??= group.createKey()),
  );

  // The text comes from the children read (a string child, as upstream) with
  // an explicit `textValue` taking precedence.
  const textSource = signal<(() => string | undefined) | undefined>(undefined);
  const textValue = computed(() => local.textValue ?? textSource()?.());

  const isDisabled = computed(
    () => local.isDisabled === true || group.isDisabledKey(key),
  );

  const selectable = createSelectableItem({
    selectionManager: group.selectionManager,
    key: () => key,
    disabled: () => local.isDisabled === true || group.isDisabledKey(key),
    shouldSelectOnPressUp: group.shouldSelectOnPressUp,
  });

  const isHovered = signal(false);
  const pointerPressed = signal(false);

  const isSelected = computed(() => selectable.isSelected());
  const isFocused = computed(
    () => group.isFocused() && group.focusedKey() === key,
  );
  const isFocusVisible = computed(
    () => isFocused() && group.isKeyboard(),
  );
  // R-012: `.tag:is(:active, [data-pressed="true"])` is an empty block: a
  // press only changes the transitioned properties upstream, so no press
  // visual is added here. `isPressed` stays in the render props and drives the
  // pressed state of the remove button through its own CloseButton behavior.
  const isPressed = computed(
    () => pointerPressed() || group.keyboardPressedKey() === key,
  );

  const renderProps: TagRenderProps = {
    isHovered,
    isPressed,
    isSelected,
    isFocused,
    isFocusVisible,
    isDisabled,
    selectionMode: group.selectionMode,
    selectionBehavior: group.selectionBehavior,
    allowsRemoving: group.allowsRemoving,
  };

  const slots = computed(() =>
    tagVariants({ size: group.size(), variant: group.variant() }),
  );

  /* --- Classes ------------------------------------------------------------- */
  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? className(renderProps)
      : className;
  };

  const classes = computed(() =>
    [slots().base(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-013: selected → `bg-accent-soft text-accent-soft-foreground`.
  // R-014: selected + hover → `bg-accent-soft-hover`.
  // R-019: unselected `default` + hover → `bg-default-hover`.
  // R-021: unselected `surface` + hover → `bg-surface-hover`.
  // The hover class must be chosen by state, not by the variant table: selected
  // and unselected hover backgrounds are mutually exclusive, and the variant
  // order only lets one of them stand.
  const hoverClass = computed(() => {
    if (isSelected()) {
      return "hover:bg-accent-soft-hover";
    }

    return (group.variant() ?? "default") === "surface"
      ? "hover:bg-surface-hover"
      : "hover:bg-default-hover";
  });

  const classList = computed(() => ({
    // R-010: `status-disabled` as literals (theme notes): 0.5 opacity, no
    // pointer events, the not-allowed cursor.
    "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
    // R-011: `status-focused` as the theme's ring, offset by the background.
    // The browser's `:focus-visible` has no counterpart; the ring is drawn from
    // the virtual focus state (port sheet §5).
    "ring-2 ring-focus ring-offset-2 ring-offset-background outline-none":
      isFocusVisible(),
    // R-013 / R-014 / R-019 / R-021: the selected look and the one hover
    // background that applies to this row.
    "bg-accent-soft text-accent-soft-foreground": isSelected(),
    [hoverClass()]: true,
  }));

  // R-006: `transition: color 100ms …, scale …, opacity …, background-color …,
  // box-shadow 100ms var(--ease-out)`. NSH takes one list, one duration and one
  // curve per element; the list is the inline style (its only owner), the
  // duration and curve come from the base class. Reduced motion removes it,
  // as `motion-reduce:transition-none` does.
  const transitionProperty = () =>
    reduceMotion() ? "none" : "color, scale, opacity, background-color, box-shadow";

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  /* --- Activation ---------------------------------------------------------- */
  const fireAction = () => {
    if (local.onAction) {
      local.onAction();

      return;
    }

    group.fireAction(key);
  };

  const activate = (
    source: "pointer" | "keyboard",
    event?: PressEvent,
  ) => {
    if (selectable.isDisabled()) {
      return;
    }

    if (selectable.allowsSelection()) {
      if (source === "pointer") {
        if (event) {
          selectable.onPress(event);
        }
      } else {
        selectable.onKeyDown(
          "enter",
          event ? modifiersFromPress(event) : undefined,
        );
      }

      return;
    }

    fireAction();
  };

  let node: ViewRef | undefined;
  cleanup(
    group.register({
      type: "item",
      key,
      textValue: () => textValue() ?? "",
      order: collectionItem?.index,
      disabled: () => isDisabled(),
      ref: () => node,
      activate,
    }),
  );

  /* --- Events -------------------------------------------------------------- */
  const handlePressDown = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      return;
    }

    // The pointer modality first: a press on an already focused row must drop
    // the keyboard ring even though no new focus event follows.
    group.notePointer();

    if (!selectable.isDisabled()) {
      pointerPressed.set(true);
      // macOS / web: give the list the focus so the arrows keep working after
      // a click; elsewhere `focus()` does nothing (port sheet §8).
      group.focusList(true);
    }

    selectable.onPressDown(event);
    local.onPressStart?.(event);
    local.onPressDown?.(event);
    local.onPressChange?.(true);
  };

  const handlePressUp = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      return;
    }

    if (pointerPressed()) {
      pointerPressed.set(false);
      local.onPressChange?.(false);
    }

    selectable.onPressUp(event);
    local.onPressUp?.(event);
    local.onPressEnd?.(event);
  };

  const handlePress = (event: PressEvent) => {
    pointerPressed.set(false);
    activate(isKeyboardPress(event) ? "keyboard" : "pointer", event);
    local.onPress?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

    if (selectable.isDisabled() || isHovered()) {
      return;
    }

    isHovered.set(true);
    local.onHoverStart?.(event);
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);
    // Leaving ends a press that never reported its release, as `usePress`
    // cancels on leave.
    pointerPressed.set(false);

    if (!isHovered()) {
      return;
    }

    isHovered.set(false);
    local.onHoverEnd?.(event);
    local.onHoverChange?.(false);
  };

  const handleFocus = () => {
    local.onFocus?.();
    local.onFocusChange?.(true);
  };

  const handleBlur = () => {
    local.onBlur?.();
    local.onFocusChange?.(false);
  };

  /* --- Context ------------------------------------------------------------- */
  // A caller-written remove button reports itself, and the tag's own default
  // one steps aside (HeroUI's `pickChildren` does the same before rendering).
  const customRemoveButton = signal(0);

  const removeButtonClass = computed(() => {
    // R-022: the slot class, plus the foreground the row hands down. Upstream
    // writes `text-inherit`; NSH has no `inherit` color value, so the port
    // names the token the row's own text color comes from (port sheet §8).
    const color = isSelected()
      ? "text-accent-soft-foreground"
      : (group.variant() ?? "default") === "surface"
        ? "text-surface-foreground"
        : "text-default-foreground";

    return [slots().removeButton(), color]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" ");
  });

  const tagContext: TagContextValue = {
    slots,
    removeButtonClass,
    textValue,
    isDisabled,
    key,
    registerRemoveButton: () => {
      customRemoveButton.update((count) => count + 1);

      return () => customRemoveButton.update((count) => count - 1);
    },
  };

  const accessibilityLabel = computed(
    () => local["aria-label"] ?? local.accessibilityLabel ?? textValue(),
  );

  const accessibilityState = computed<AccessibilityState>(() => ({
    ...local.accessibilityState,
    selected: isSelected(),
    disabled: isDisabled(),
  }));

  const registerText = (read: () => string | undefined) => {
    textSource.set(read);

    return () => {
      if (textSource() === read) {
        textSource.set(undefined);
      }
    };
  };

  const renderRemoveButton = () => (
    <If when={group.allowsRemoving() && customRemoveButton() === 0}>
      {() => <TagDefaultRemoveButton />}
    </If>
  );

  // R-025: the row is a core `View` with `role="row"`; `data-slot` is dropped
  // (D18). R-026: the inner cell is a real box carrying the row's `gap-1` and
  // its inline layout, standing in for RAC's `display: contents` gridcell, so
  // the row keeps one child and the visual gap is unchanged.
  return (
    <TagContext.Provider value={tagContext}>
      <View
        {...rest}
        ref={(next) => {
          node = next;
          local.ref?.(next);
        }}
        testID={local.testID}
        nativeID={local.id != null ? String(local.id) : local.nativeID}
        tooltip={local.tooltip}
        role="row"
        // Tags are virtual-focus rows: the list is the only Tab stop.
        focusable={false}
        disabled={isDisabled()}
        accessibilityLabel={accessibilityLabel()}
        accessibilityHint={local.accessibilityHint}
        accessibilityState={accessibilityState()}
        accessibilityElementsHidden={
          local["aria-hidden"] ?? local.accessibilityElementsHidden
        }
        class={classes()}
        classList={classList()}
        style={[{ transitionProperty: transitionProperty() }, resolvedStyle()]}
        onPress={handlePress}
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onLayout={local.onLayout}
      >
        <View role="cell" class="flex items-center gap-1">
          <TagContent
            read={() => local.children}
            renderProps={renderProps}
            registerText={registerText}
            renderRemoveButton={renderRemoveButton}
          />
        </View>
      </View>
    </TagContext.Provider>
  );
}
