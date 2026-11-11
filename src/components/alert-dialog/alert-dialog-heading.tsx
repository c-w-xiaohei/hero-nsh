import type { JSX } from "nsh";
import { split, View } from "nsh";

import { AlertDialogContext } from "./alert-dialog-context";
import type { AlertDialogPartDomProps } from "./alert-dialog-dom-props";
import { viewProps } from "./alert-dialog-dom-props";
import { renderAlertDialogPartChildren } from "./alert-dialog-part-children";
import { alertDialogVariants } from "./alert-dialog.styles";

/**
 * The props of `AlertDialog.Heading`: HeroUI's
 * `ComponentPropsWithRef<typeof HeadingPrimitive>`, React Aria's `Heading`,
 * which adds `level` (default 3).
 */
export interface AlertDialogHeadingProps extends AlertDialogPartDomProps {
  /** The heading level upstream writes as `h{level}`. @default 3 */
  level?: number;
}

/** AlertDialog.Heading / AlertDialogHeading: the dialog's title. */
export function AlertDialogHeading(props: AlertDialogHeadingProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "level",
    "render",
    "slot",
  ]);

  const context = AlertDialogContext();
  const slots = () => context?.slots() ?? alertDialogVariants();

  // R-046 `align-middle` is deleted (no inline box to align);
  // R-047 `.alert-dialog__heading` → `text-base font-medium text-foreground`.
  const classes = () =>
    [slots().heading(), local.className]
      .filter((part) => part !== undefined && part !== "")
      .join(" ");

  // Upstream writes `h{level}` and `slot="title"`. NSH has no slot collection,
  // so `slot` is accepted and has no effect (port sheet §1, §8), and the level
  // becomes the accessibility level of a `header` role.
  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      role="header"
      accessibilityLevel={local.level ?? 3}
      class={classes()}
      style={local.style}
    >
      {renderAlertDialogPartChildren(local.children)}
    </View>
  );
}
