import { cleanup, computed, split, Text } from "nsh";
import type { JSX, PressEvent, TextProps } from "nsh";

import { FieldContext } from "./context";
import { labelVariants } from "./label.styles";

/* -------------------------------------------------------------------------------------------------
 * Label Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Label.Root`: HeroUI 3.2.7's `LabelRootProps`, which is React
 * Aria Components' `Label` plus the variant dimensions, expressed with NSH's
 * text host props.
 *
 * The DOM-only members of the upstream props (`htmlFor`, `form`,
 * `elementType`, `slot`, `render`) and `id` are accepted so that code written
 * against HeroUI keeps compiling; see the port sheet §1 and §8 for what they
 * can and cannot do here. `ref` comes from `TextProps` and reaches the root
 * `Text`, as `ComponentPropsWithRef` does upstream.
 */
export interface LabelRootProps
  extends Omit<TextProps, "children" | "class"> {
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no `<label for>`; association goes through `FieldContext`. */
  htmlFor?: string;

  /** Accepted, no effect: NSH has no DOM form ownership. */
  form?: string;

  /** Accepted, no effect: NSH has one kind of text element. */
  elementType?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Shows the asterisk. Appearance only, as upstream: it writes no accessibility state. */
  isRequired?: boolean;

  /** Dims the label (`status-disabled`). Appearance only, not the `disabled` attribute. */
  isDisabled?: boolean;

  /** Paints the label with `text-danger`. Appearance only, not `aria-invalid`. */
  isInvalid?: boolean;
}

export function LabelRoot(props: LabelRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "focusable",
    "htmlFor",
    "form",
    "elementType",
    "slot",
    "render",
    "isRequired",
    "isDisabled",
    "isInvalid",
    "onPress",
    "onPressDown",
    "onPressUp",
  ] as const);

  // Read once, in the body: a field root's state, when a Label is rendered
  // inside one (port sheet §2). There is no context in NSH's event handlers,
  // so every handler below closes over this value.
  const field = FieldContext();

  // R-003 / R-004: a required field root makes its atomic Labels show the
  // asterisk. Groups do not provide `isRequired`, so their options stay bare.
  const isRequired = computed(
    () => local.isRequired === true || field?.isRequired?.() === true,
  );

  // R-006: the disabled look reaches every Label inside a disabled field,
  // like the CSS descendant selector it replaces.
  const isDisabled = computed(
    () => local.isDisabled === true || field?.isDisabled?.() === true,
  );

  // R-008 / R-009: invalid arrives from the field root. `aria-invalid` has no
  // NSH counterpart (no `invalid` in `AccessibilityState`), so the context is
  // the only inherited path; a direct `isInvalid` prop still works (R-007).
  const isInvalid = computed(
    () => local.isInvalid === true || field?.isInvalid?.() === true,
  );

  // The single read of `children` (research 4.1, 4.6): a read builds new native
  // views, so the value is cached in a computed that both the field
  // registration below and the placement in the root `Text` share. It must stay
  // a computed, not a plain `const`: `<Label>{value()}</Label>` has to follow
  // `value`, while a captured plain value would freeze the text.
  const children = computed(() => local.children);

  // Registration side effect (port sheet §2): when a field root can take it,
  // report this label's text so the field can name its control with it. Only a
  // string child has a usable accessible name; anything else renders but is
  // not registered (port sheet §1 and §8).
  const registerLabel = field?.registerLabel;

  if (registerLabel) {
    cleanup(
      registerLabel(() => {
        const value = children();

        return typeof value === "string" ? value : undefined;
      }),
    );
  }

  // A press on a `<label for>` focuses its control and, when the field treats
  // the label's press as its own, is the field's press. NSH's label is its own
  // pressable Text and its press does not reach the field root, so the field is
  // told the press transitions here, with the real events: a held label press
  // must paint in the field like the `<label>`'s own press does upstream.
  const onPressDown = (event: PressEvent) => {
    field?.pressFieldStart?.(event);
    local.onPressDown?.(event);
  };

  const onPressUp = (event: PressEvent) => {
    field?.pressFieldUp?.(event);
    local.onPressUp?.(event);
  };

  // The caller's `onPress` still runs, after the focus moved.
  const onPress = (event: PressEvent) => {
    field?.focusField?.(event);
    local.onPress?.(event);
  };

  return (
    <Text
      {...rest}
      ref={(node) => (typeof local.ref === "function" ? local.ref(node) : undefined)}
      nativeID={local.id ?? local.nativeID}
      style={local.style}
      class={labelVariants({
        className: [field?.partClass?.(), local.className]
          .filter((name): name is string => typeof name === "string" && name.length > 0)
          .join(" "),
        isDisabled: isDisabled(),
        isInvalid: isInvalid(),
        isRequired: isRequired(),
      })}
      // A `<label>` is not a keyboard focus stop upstream; without this a
      // pressable Text would become one (Tab moves between pressables). A
      // caller's own `focusable` still wins: HeroUI forwards whatever `rest`
      // carries to the element.
      focusable={local.focusable ?? false}
      onPressDown={onPressDown}
      onPressUp={onPressUp}
      onPress={onPress}
    >
      {children()}
      {/* R-002: `.label--required`'s `::after` asterisk, as a real nested Text. */}
      <If when={isRequired()}>
        <Text class="ms-0.5 text-danger">*</Text>
      </If>
    </Text>
  );
}
