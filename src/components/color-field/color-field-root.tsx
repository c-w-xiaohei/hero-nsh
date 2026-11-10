import type {
  Accessor,
  JSX,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, effect, keymap, signal, split, untracked, View } from "nsh";

import { ColorInputGroupFieldContext } from "../color-input-group/context";
import type { ColorInputGroupFieldValue } from "../color-input-group/context";
import { DescriptionContext } from "../description/context";
import type { DescriptionContextValue } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import type { FieldErrorState } from "../field-error/context";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import type { Color, ColorChannel, ColorSpace } from "../color-swatch";
import { parseColor } from "../color-swatch";
import { joinClassNames } from "./class-names";
import { ColorFieldStateContext } from "./color-field-context";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./color-field-dom-props";
import { colorFieldVariants } from "./color-field.styles";
import type { ColorFieldVariants } from "./color-field.styles";
import { createColorChannelFieldState } from "./create-color-channel-field-state";
import {
  type ColorFieldState,
  type ColorFieldStateHandle,
  type ColorFieldValidationResult,
  createColorFieldState,
} from "./create-color-field-state";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * What HeroUI's `ColorFieldRenderProps` hands to `children`, `className` and
 * `style` (`react-aria-components/src/ColorField.tsx:53-88`), accessorized per
 * D17. `defaultClassName` / `defaultStyle` are the pair React Aria's
 * `useRenderProps` adds, so a caller can append to or replace them.
 */
export interface ColorFieldRenderProps {
  /** The field's value state, with accessor members (D17). */
  state: ColorFieldState;

  /** The edited channel, or `"hex"` when the field edits the whole color. */
  channel: ColorChannel | "hex";

  /** The whole field is disabled. */
  isDisabled: Accessor<boolean>;

  /** Invalid from the prop or from the validation result. */
  isInvalid: Accessor<boolean>;

  /** The text cannot be edited and the steps are off. */
  isReadOnly: Accessor<boolean>;

  /** The field must be filled; the Label shows its asterisk. */
  isRequired: Accessor<boolean>;

  /** The `base` slot's class string, before the caller's `className`. */
  defaultClassName: string;

  /** An empty style object, as React Aria's `useRenderProps` supplies. */
  defaultStyle: ViewStyle;
}

/* -------------------------------------------------------------------------------------------------
 * Root props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ColorField.Root`: HeroUI 3.2.7's `ColorFieldRootProps`, which
 * is React Aria Components' `ColorField` plus the `fullWidth` variant,
 * expressed with NSH's view host props.
 *
 * The DOM-only members upstream are accepted so code written against HeroUI
 * keeps compiling; port sheet §1.2 says what each can and cannot do here.
 */
export interface ColorFieldRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The field's content: an element, or a render prop called once with the
   * field state (D17). Bare strings and numbers become `Text` at the placement,
   * or NSH would not draw them.
   */
  children?: JSX.Element | ((values: ColorFieldRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: ColorFieldRenderProps) => string | undefined);

  /** Style of the field; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: ColorFieldRenderProps) => StyleProp<ViewStyle>);

  /** The value, controlled: a `Color`, a parseable string, or `null` for empty. */
  value?: string | Color | null;

  /** The initial value, uncontrolled. Absent means empty. */
  defaultValue?: string | Color | null;

  /** The committed color changed (blur, Enter, a step); never while typing. */
  onChange?: (color: Color | null) => void;

  /** Edits one channel of the color instead of its hex value. */
  channel?: ColorChannel;

  /** The space the value is converted to in channel mode. */
  colorSpace?: ColorSpace;

  /** Dims the field and blocks editing. */
  isDisabled?: boolean;

  /** The text cannot be edited but stays selectable; the steps are off. */
  isReadOnly?: boolean;

  /** The field must be filled: only the Label's asterisk shows it. */
  isRequired?: boolean;

  /** Paints the field invalid and mounts the `FieldError` inside it. */
  isInvalid?: boolean;

  /** Runs on every commit; `true` when valid, otherwise a message. */
  validate?: (value: Color | null) => ColorFieldValidationResult;

  /** Accepted, no effect: NSH has no form submission or native constraint validation. */
  validationBehavior?: "aria" | "native";

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** Accepted, no effect: NSH has no form ownership. */
  form?: string;

  /** The input's placeholder text; a `placeholder` on `Input` wins. */
  placeholder?: string;

  /** The input takes the focus when it appears. */
  autoFocus?: boolean;

  /** Accepted, no effect: NSH's input is always a Tab stop. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: NSH has no wheel events. */
  isWheelDisabled?: boolean;

  /** The input took the focus. */
  onFocus?: () => void;

  /** The input lost the focus, after the text was committed. */
  onBlur?: () => void;

  /** The focus moved in or out of the field. */
  onFocusChange?: (isFocused: boolean) => void;

  /** Accepted, no effect: NSH has no element-level key events; keys go through `keymap`. */
  onKeyDown?: (event: unknown) => void;

  /** Accepted, no effect, as `onKeyDown`. */
  onKeyUp?: (event: unknown) => void;

  /** Accepted, no effect: NSH has no clipboard or composition events on a view. */
  onCopy?: (event: unknown) => void;
  onCut?: (event: unknown) => void;
  onPaste?: (event: unknown) => void;
  onCompositionStart?: (event: unknown) => void;
  onCompositionEnd?: (event: unknown) => void;
  onCompositionUpdate?: (event: unknown) => void;
  onSelect?: (event: unknown) => void;
  onBeforeInput?: (event: unknown) => void;
  onInput?: (event: unknown) => void;

  /** The accessible name of the input; wins over the Label's registered text. */
  "aria-label"?: string;

  /** The accessible name through the host prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** A DOM id upstream; maps to `nativeID` on the root. */
  id?: string;

  /** NSH's own name for the root; `id` wins. */
  nativeID?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Stretches the field across its parent. @default false */
  fullWidth?: boolean;

  /** The field's view, forwarded as a callback (an undefined ref store throws on the web). */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

/** Joins the texts a field registered, in the order they were registered. */
function joinedText(readers: readonly (() => string | undefined)[]): string | undefined {
  const text = readers
    .map((read) => read())
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");

  return text.length > 0 ? text : undefined;
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * ColorField.Root / ColorFieldRoot: the field container, the committed color,
 * its display text, the validation result and the contexts the parts and the
 * already-ported Label / Description / FieldError read.
 *
 * It reads `props.children` exactly once, at the placement inside every
 * provider (the provider exception in the common rules): a `computed` built in
 * the body would evaluate outside them, and the parts would lose the field
 * state. The root itself has no role, like upstream's plain `<div>`.
 */
export function ColorFieldRoot(props: ColorFieldRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "value",
    "defaultValue",
    "onChange",
    "channel",
    "colorSpace",
    "isDisabled",
    "isReadOnly",
    "isRequired",
    "isInvalid",
    "validate",
    "validationBehavior",
    "name",
    "form",
    "placeholder",
    "autoFocus",
    "excludeFromTabOrder",
    "isWheelDisabled",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "onKeyDown",
    "onKeyUp",
    "onCopy",
    "onCut",
    "onPaste",
    "onCompositionStart",
    "onCompositionEnd",
    "onCompositionUpdate",
    "onSelect",
    "onBeforeInput",
    "onInput",
    "aria-label",
    "aria-invalid",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
    "accessibilityLabel",
    "id",
    "nativeID",
    "slot",
    "render",
    "fullWidth",
    "ref",
  ] as const);

  // --- Variant table --------------------------------------------------------
  // `tv()` without slots returns the class string itself (HeroUI's BEM block
  // plus the modifier's declarations, port sheet §4).
  const baseClasses = computed(() => colorFieldVariants({ fullWidth: local.fullWidth }));

  // --- Effective state ------------------------------------------------------
  const isDisabled = computed(() => local.isDisabled === true);
  const isReadOnly = computed(() => local.isReadOnly === true);
  const isRequired = computed(() => local.isRequired === true);

  const focusWithin = signal(false);

  // --- Field state ----------------------------------------------------------
  // Which state machine the field runs is fixed when the instance is created,
  // as React's conditional hook call is: HeroUI renders a different inner
  // component for `channel` and remounts it when the prop's presence changes.
  // The props stay live through `local`'s getters.
  const channelProp = local.channel;

  const handle: ColorFieldStateHandle =
    channelProp === undefined
      ? createColorFieldState({
          get value() {
            return local.value;
          },
          get defaultValue() {
            return local.defaultValue;
          },
          get onChange() {
            return local.onChange;
          },
          get validate() {
            return local.validate;
          },
        })
      : createColorChannelFieldState(
          {
            channel: channelProp,
            get colorSpace() {
              return local.colorSpace;
            },
            get value() {
              return local.value;
            },
            get defaultValue() {
              return local.defaultValue;
            },
            get onChange() {
              return local.onChange;
            },
            get validate() {
              return local.validate;
            },
            get isDisabled() {
              return local.isDisabled;
            },
            get isReadOnly() {
              return local.isReadOnly;
            },
          },
          focusWithin,
        );

  const isInvalid = computed(
    () =>
      local.isInvalid === true ||
      local["aria-invalid"] === true ||
      local["aria-invalid"] === "true" ||
      handle.validationErrors().length > 0,
  );

  // --- Focus ----------------------------------------------------------------
  const handleFocus = () => {
    focusWithin.set(true);
    local.onFocusChange?.(true);
    local.onFocus?.();
  };

  const handleBlur = () => {
    // Upstream commits when the focus leaves the field; the text is the edit's
    // only home until then. Committing before the focus flips lets an announce
    // see the field as focused, as React Aria's does.
    handle.commit();
    focusWithin.set(false);
    local.onFocusChange?.(false);
    local.onBlur?.();
  };

  const inputFocus = signal<(() => void) | undefined>(undefined);

  const registerInputFocus = (focus: () => void) => {
    inputFocus.set(focus);

    return () => {
      if (inputFocus() === focus) {
        inputFocus.set(undefined);
      }
    };
  };

  const focusInput = () => {
    inputFocus()?.();
  };

  // --- Spin keys ------------------------------------------------------------
  // The input is the field's only focus stop; the steps are bound only while it
  // has the focus, with `when: "always"` so the focused text field does not
  // swallow arrows, Home and End, and `repeat` as React Aria's `allowRepeats`.
  // Return and Space stay unbound: Enter is the input's `onSubmit`.
  effect(() => {
    if (!focusWithin()) {
      return;
    }

    const step = (run: () => void) => {
      if (isDisabled() || isReadOnly()) {
        return;
      }

      run();
    };

    return keymap.bind(
      {
        up: () => step(handle.increment),
        down: () => step(handle.decrement),
        pageup: () => step(handle.increment),
        pagedown: () => step(handle.decrement),
        home: () => step(handle.decrementToMin),
        end: () => step(handle.incrementToMax),
      },
      { when: "always", repeat: true },
    );
  });

  // --- Registered field texts ----------------------------------------------
  const labelSources = signal<readonly (() => string | undefined)[]>([]);
  const descriptionSources = signal<readonly (() => string | undefined)[]>([]);
  const errorSources = signal<readonly (() => string | undefined)[]>([]);

  const registerInto = (target: typeof labelSources, read: () => string | undefined) => {
    target.update((current) => [...current, read]);

    return () => {
      target.update((current) => current.filter((entry) => entry !== read));
    };
  };

  const labelText = computed(() => joinedText(labelSources()));
  const descriptionText = computed(() => joinedText(descriptionSources()));
  const errorText = computed(() => joinedText(errorSources()));

  // Description first, error second, as `aria-describedby` lists them upstream.
  const accessibilityHint = computed(() => joinedText([descriptionText, errorText]));

  // React Aria's `useColorChannelField` falls back to the channel's own name
  // ("Hue") when the field has neither `aria-label` nor a Label.
  const channelName = computed(() => {
    if (channelProp === undefined) {
      return undefined;
    }

    return (handle.colorValue() ?? parseColor("#000000")).getChannelName(channelProp);
  });

  const accessibilityLabel = computed(
    () =>
      local["aria-label"] ??
      local.accessibilityLabel ??
      labelText() ??
      channelName(),
  );

  // --- Contexts -------------------------------------------------------------
  const fieldState: FieldState = {
    isRequired,
    isDisabled,
    isInvalid,
    registerLabel: (read) => registerInto(labelSources, read),
    focusField: () => focusInput(),
    // R-003: `.color-field [data-slot="label"] { @apply w-fit }`. The Label
    // appends this after its own variant classes.
    partClass: () => "w-fit",
  };

  const descriptionState: DescriptionContextValue = {
    registerDescription: (read) => registerInto(descriptionSources, read),
    // R-002: `.color-field[data-invalid="true"] [data-slot="description"] {
    // @apply hidden }`. The Description appends this after its own classes; it
    // keeps its accessibility hint, which `display: none` would take away
    // upstream.
    partClass: () => (isInvalid() ? "hidden" : undefined),
  };

  const fieldErrorState: FieldErrorState = {
    isInvalid,
    validationErrors: handle.validationErrors,
    registerErrorMessage: (read) => registerInto(errorSources, read),
  };

  // The input wiring React Aria's `InputContext` / `GroupContext` carries
  // upstream (port sheet §2). Optional on the ColorInputGroup side, so a plain
  // ColorInputGroup keeps its standalone behaviour.
  const fieldValue: ColorInputGroupFieldValue = {
    value: handle.inputValue,
    setValue: handle.setInputValue,
    isDisabled,
    isInvalid,
    isReadOnly,
    isRequired,
    accessibilityLabel,
    accessibilityHint,
    role: "presentation",
    placeholder: () => local.placeholder,
    autoFocus: () => local.autoFocus ?? false,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onSubmit: () => handle.commit(),
    registerInputFocus,
  };

  // --- Render props and classes ---------------------------------------------
  const renderProps: ColorFieldRenderProps = {
    state: handle.state,
    channel: channelProp ?? "hex",
    isDisabled,
    isInvalid,
    isReadOnly,
    isRequired,
    defaultClassName: baseClasses(),
    defaultStyle: {},
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() => joinClassNames(baseClasses(), resolvedClassName()));

  // One read of `props.children`, at the placement inside every provider.
  const content = (): JSX.Element => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() =>
          (children as (values: ColorFieldRenderProps) => JSX.Element)(renderProps),
        ),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <ColorFieldStateContext.Provider value={handle.state}>
      <ColorInputGroupFieldContext.Provider value={fieldValue}>
        <FieldContext.Provider value={fieldState}>
          <DescriptionContext.Provider value={descriptionState}>
            <FieldErrorContext.Provider value={fieldErrorState}>
              <View
                {...hostProps(rest)}
                ref={(node) => local.ref?.(node)}
                nativeID={local.id ?? local.nativeID}
                class={classes()}
                style={resolvedStyle()}
              >
                {content()}
              </View>
            </FieldErrorContext.Provider>
          </DescriptionContext.Provider>
        </FieldContext.Provider>
      </ColorInputGroupFieldContext.Provider>
    </ColorFieldStateContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Named exports
 * -----------------------------------------------------------------------------------------------*/

/** HeroUI's `ColorValue`: the `Color` type the value props accept. */
export type ColorValue = Color;
