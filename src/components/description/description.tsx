import { cleanup, split, Text } from "nsh";
import type { JSX, TextProps } from "nsh";

import { DescriptionContext } from "./context";
import { descriptionVariants } from "./description.styles";

/* -------------------------------------------------------------------------------------------------
 * Description Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Description.Root`: HeroUI 3.2.7's `DescriptionRootProps`,
 * which is React Aria Components' `Text` plus the (empty) variant surface,
 * expressed with NSH's text host props.
 *
 * The DOM-only members upstream (`id`, `elementType`, `slot`) are accepted so
 * code written against HeroUI keeps compiling; see the port sheet §1 and §8
 * for what they can and cannot do here.
 */
export interface DescriptionRootProps extends Omit<TextProps, "children" | "class"> {
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has one kind of text element. */
  elementType?: string;

  /** Accepted, no effect: NSH has no slot collection; association goes through `DescriptionContext`. */
  slot?: string;
}

export function DescriptionRoot(props: DescriptionRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "elementType",
    "slot",
  ] as const);

  // Read once, in the body: whatever field or container root encloses this
  // Description (port sheet §2). There is no context in NSH's event handlers,
  // so the values below close over this one.
  const field = DescriptionContext();

  // Registration side effect (port sheet §2): when a field root can take it,
  // report this description's text so the field can hint its control. Read
  // lazily, on the field's request, so the body never touches `children`
  // twice; only a plain string can be registered (port sheet §8).
  const registerDescription = field?.registerDescription;

  if (registerDescription) {
    cleanup(
      registerDescription(() => {
        const children = local.children;

        return typeof children === "string" ? children : undefined;
      }),
    );
  }

  return (
    <Text
      {...rest}
      nativeID={local.id ?? local.nativeID}
      style={local.style}
      // R-001 / R-002 / R-004 in `description.styles.ts`, then the container's
      // descendant classes, then the caller's: three segments in that order,
      // later winning (port sheet §4).
      class={descriptionVariants({
        className: [field?.partClass?.(), local.className]
          .filter((name): name is string => typeof name === "string" && name.length > 0)
          .join(" "),
      })}
      // A `<span>` is not a keyboard focus stop upstream; without this a
      // pressable Text would become one (Tab moves between pressables).
      focusable={false}
    >
      {local.children}
    </Text>
  );
}
