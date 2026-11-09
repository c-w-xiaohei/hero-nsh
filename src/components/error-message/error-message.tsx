import { cleanup, computed, split, Text } from "nsh";
import type { JSX, TextProps } from "nsh";

import { FieldErrorContext } from "../field-error/context";
import { errorMessageVariants } from "./error-message.styles";

/* -------------------------------------------------------------------------------------------------
 * Error Message Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ErrorMessage.Root`: HeroUI 3.2.7's `ErrorMessageRootProps`,
 * which is React Aria Components' `Text` plus the (empty) variant surface,
 * expressed with NSH's text host props.
 *
 * The DOM-only members upstream (`id`, `elementType`, `slot`, `render`) are
 * accepted so code written against HeroUI keeps compiling; see the port sheet
 * §1 and §8 for what they can and cannot do here. `ref` comes from `TextProps`
 * and reaches the root `Text`, as `ComponentPropsWithRef` does upstream.
 */
export interface ErrorMessageRootProps
  extends Omit<TextProps, "children" | "class" | "style"> {
  /**
   * The message. Unlike `FieldError`, it renders whenever it is mounted:
   * whether it appears is the caller's decision (HeroUI's TagGroup example
   * gates it with `selectedKeys`), not a validation state this component
   * reads. Only a string or number child is also registered as the field's
   * accessible description; elements render but stay unregistered (port
   * sheet §8).
   */
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** The message's text style. */
  style?: TextProps["style"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has one kind of text element. */
  elementType?: string;

  /** Accepted, no effect: NSH has no slot collection; association goes through `FieldErrorContext`. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

export function ErrorMessageRoot(props: ErrorMessageRootProps): JSX.Element {
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

  // Read once, in the body: whatever field or container root encloses this
  // message (port sheet §2). There is no context in NSH's event handlers, so
  // the closures below keep this value.
  const field = FieldErrorContext();

  // One read of `props.children`, shared by registration and placement: each
  // read builds new native views (research 4.1, 4.6). Wrapping it in
  // `computed` keeps the getter live, so `<ErrorMessage>{msg()}</ErrorMessage>`
  // still updates; a plain capture would freeze it.
  const children = computed(() => local.children);

  // Registration side effect (port sheet §2): while mounted, report the
  // visible text to the field, which puts it on its control's accessible
  // description. Kobalte registers the element id for the same purpose; NSH
  // has no id, so the text is what travels. The accessor reads the shared
  // computed value, never `props.children` again, and is evaluated lazily
  // when the field asks.
  const registerErrorMessage = field?.registerErrorMessage;

  if (registerErrorMessage) {
    cleanup(
      registerErrorMessage(() => {
        const value = children();

        if (typeof value === "string") {
          return value;
        }

        return typeof value === "number" ? String(value) : undefined;
      }),
    );
  }

  return (
    <Text
      {...rest}
      ref={(node) => (typeof local.ref === "function" ? local.ref(node) : undefined)}
      nativeID={local.id ?? local.nativeID}
      style={local.style}
      // R-002 / R-004 in `error-message.styles.ts`, then the container's
      // descendant classes (TagGroup's `p-1`), then the caller's: three
      // segments in that order, later winning (port sheet §4).
      class={errorMessageVariants({
        className: [field?.partClass?.(), local.className]
          .filter((name): name is string => typeof name === "string" && name.length > 0)
          .join(" "),
      })}
      // A `<span>` is not a keyboard focus stop upstream; a pressable Text
      // would become one in NSH (Tab moves between pressables). The caller's
      // own value wins, as HeroUI forwards `rest` last.
      focusable={local.focusable ?? false}
    >
      {children()}
    </Text>
  );
}
