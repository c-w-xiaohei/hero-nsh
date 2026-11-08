import { computed, effect, split, Text, untracked } from "nsh";
import type {
  Accessor,
  JSX,
  StyleProp,
  TextProps,
  TextStyle,
} from "nsh";

import { FieldErrorContext } from "./context";
import { fieldErrorVariants } from "./field-error.styles";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * What a render prop receives. HeroUI's `FieldErrorRenderProps` carries plain
 * values (`isInvalid: boolean`, `validationErrors: string[]`,
 * `validationDetails: ValidityState`); per D17 they are accessors here, so the
 * tree the function returns can follow the field without being rebuilt.
 */
export interface FieldErrorRenderProps {
  /** Whether the field is invalid. */
  isInvalid: Accessor<boolean>;

  /** The field's validation errors. */
  validationErrors: Accessor<readonly string[]>;

  /** The field's `ValidityState`; NSH has none, so this is `undefined`. */
  validationDetails: Accessor<unknown>;
}

/** The render-prop form of `children` (a function with at least one parameter, research V7). */
export type FieldErrorRenderProp = (
  renderProps: FieldErrorRenderProps,
) => JSX.Element;

/* -------------------------------------------------------------------------------------------------
 * Field Error Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `FieldError.Root`: HeroUI 3.2.7's `FieldErrorRootProps`, which is
 * React Aria Components' `FieldError` plus the (empty) variant dimensions,
 * expressed with NSH's text host props.
 *
 * The DOM-only members of the upstream props (`elementType`, `slot`, `render`)
 * and `id` are accepted so that code written against HeroUI keeps compiling;
 * see the port sheet §1 and §8 for what they can and cannot do here. `ref`
 * comes from `TextProps` and reaches the root `Text`, as
 * `ComponentPropsWithRef` does upstream.
 */
export interface FieldErrorRootProps
  extends Omit<TextProps, "children" | "class" | "style"> {
  /**
   * The message. A string (or nested `Text`) shows as is; a function is a
   * render prop, called once with the field's state (D17). Without children
   * the message falls back to `validationErrors.join(" ")`.
   */
  children?: JSX.Element | FieldErrorRenderProp;

  /** Appended after the variant classes; function form gets the same accessors. */
  className?:
    | string
    | ((renderProps: FieldErrorRenderProps) => string | undefined);

  /** Style of the message; function form gets the same accessors. */
  style?:
    | StyleProp<TextStyle>
    | ((renderProps: FieldErrorRenderProps) => StyleProp<TextStyle>);

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has one kind of text element. */
  elementType?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

export function FieldErrorRoot(props: FieldErrorRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "focusable",
    "elementType",
    "slot",
    "render",
  ] as const);

  // Read once, in the body: a field root's validation state, when an error is
  // rendered inside one (port sheet §2). There is no context in NSH's event
  // handlers, so every closure below keeps this value.
  const field = FieldErrorContext();

  // R-001: upstream mounts the message only while invalid; NSH's `Text` has
  // content height when it exists, so no `h-0` / `h-auto` pair is needed.
  const isInvalid = computed(() => field?.isInvalid?.() === true);

  const validationErrors = computed<readonly string[]>(
    () => field?.validationErrors?.() ?? [],
  );

  // Upstream hands RAC's `ValidityState` through; NSH has no DOM form
  // validation object, so the accessor stays `undefined` (port sheet §8).
  const validationDetails = computed<unknown>(() =>
    field?.validationDetails?.(),
  );

  // R-009: the field root marks checkbox / switch / radio fields, replacing
  // the CSS ancestor selectors `.checkbox > .field-error` and friends.
  const isToggle = computed(() => field?.isToggleField?.() === true);

  const renderProps: FieldErrorRenderProps = {
    isInvalid,
    validationErrors,
    validationDetails,
  };

  // One reactive read of `children` (common rules): a plain capture would
  // freeze `<FieldError>{signal()}</FieldError>`. Every consumer reads this
  // computed, so the source prop is evaluated once per render and the strings /
  // elements it returns are reused instead of built again.
  const children = computed(() => local.children);

  // R-002 / R-005 / R-013: the block's padding and color, and the toggle
  // field's overrides, all come from the field type. One owner per property:
  // `px-1` and the colors are mutually exclusive pairs. Kept as a function so
  // the JSX binding re-reads the field state instead of freezing it here.
  const classList = () => ({
    "px-1": !isToggle(),
    "text-danger": !isToggle(),
    "text-muted": isToggle(),
  });

  // Upstream's `defaultChildren`: only when no children were given does the
  // joined validation errors text stand in; zero errors mean nothing to show
  // (React Aria `FieldError.tsx:62-63`).
  const fallbackMessage = computed<string | undefined>(() => {
    const errors = validationErrors();

    return errors.length > 0 ? errors.join(" ") : undefined;
  });

  // The message body: it re-reads `children` inside the binding, so a signal
  // child updates the text in place instead of rebuilding the native view.
  // With no child, the fallback error text takes its place.
  const message = (): JSX.Element => {
    const child = children();

    // A one-parameter function child is a render prop and is resolved where it
    // shows; anything else here is already a message.
    return child != null ? (child as JSX.Element) : fallbackMessage();
  };

  // The text reported to the field: a string child can be read out, a render
  // prop or an element child is opaque, and the fallback error text is exactly
  // what the message shows. It never calls the render prop.
  const resolveErrorMessage = (): string | undefined => {
    const child = children();

    if (typeof child === "string") {
      return child;
    }

    if (typeof child === "number") {
      return String(child);
    }

    if (child != null) {
      return undefined;
    }

    return fallbackMessage();
  };

  // Registration (port sheet §2): while the message is shown, the visible text
  // is reported to the field, which puts it on the control's accessible
  // description. Kobalte registers the element id for the same purpose; NSH has
  // no id, so the text is what travels. Read lazily, when the field asks.
  const register = field?.registerErrorMessage;

  if (register) {
    effect(() => {
      if (!isInvalid()) {
        return;
      }

      return register(() => resolveErrorMessage());
    });
  }

  // `className` / `style` take the function form too; the accessors are read
  // inside the binding, so only the class string / style object updates.
  const className = computed(() => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  });

  const style = computed(() => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  });

  const renderMessage = (content: () => JSX.Element) => (
    <Text
      {...rest}
      ref={local.ref}
      nativeID={local.id ?? local.nativeID}
      class={fieldErrorVariants({ className: className() })}
      classList={classList()}
      style={style()}
      // A `<span>` is not a keyboard focus stop upstream; a pressable Text
      // would become one in NSH. A caller's own `focusable` wins.
      focusable={local.focusable ?? false}
    >
      {content()}
    </Text>
  );

  // The function child builds the message only while it shows: a plain child
  // would be constructed in the body even for a valid field, freezing a render
  // prop's `null` before the field turns invalid (research 4.1). The render
  // prop is called once per show, with the accessors (D17).
  return (
    <If when={isInvalid()}>
      {() => {
        const child = children();

        if (typeof child === "function" && child.length >= 1) {
          const rendered = untracked(() =>
            (child as FieldErrorRenderProp)(renderProps),
          );

          return rendered == null ? null : renderMessage(() => rendered);
        }

        // The second null gate (React Aria `FieldError.tsx:67`): an invalid
        // field with no message renders nothing at all, not an empty `Text`.
        if (child == null && fallbackMessage() == null) {
          return null;
        }

        return renderMessage(message);
      }}
    </If>
  );
}
