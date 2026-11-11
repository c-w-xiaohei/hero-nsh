import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import type { ThemeColorToken } from "../../theme";
import { DangerIcon, InfoIcon, SuccessIcon, WarningIcon } from "../icons";
import type { AlertDialogPartDomProps } from "./alert-dialog-dom-props";
import { viewProps } from "./alert-dialog-dom-props";
import { renderAlertDialogPartChildren } from "./alert-dialog-part-children";
import type { AlertDialogStatus } from "./alert-dialog.styles";
import { alertDialogVariants } from "./alert-dialog.styles";

/**
 * The paint of each status' default glyph.
 *
 * Upstream the `svg` path is filled with `currentColor`, so the ancestor's
 * `text-*-soft-foreground` class colors it. A `Canvas` does not inherit a text
 * color, so the same status that writes the class in
 * `alert-dialog.styles.ts` must name the token here; the two lists are one
 * mapping and have to stay in step. `default` and `accent` share the info
 * glyph, as upstream.
 */
const DEFAULT_ICON_COLOR: Record<AlertDialogStatus, ThemeColorToken> = {
  default: "foreground",
  accent: "accent-soft-foreground",
  success: "success-soft-foreground",
  warning: "warning-soft-foreground",
  danger: "danger-soft-foreground",
};

/**
 * Upstream's `getDefaultIcon()`: the glyph a status shows when the Icon gets no
 * children. It is a plain function, called at the placement, so the status
 * accessor is read in the tracked children expression.
 *
 * R-051 (`[data-slot="alert-dialog-default-icon"]` → `box-content size-5`):
 * the icons' own `h-4 w-4` becomes `size-5` through the class the caller's
 * `className` appends after it; `box-content` has nothing to change because
 * they carry no padding or border.
 */
function defaultIcon(status: AlertDialogStatus): JSX.Element {
  const color = DEFAULT_ICON_COLOR[status];
  const className = "size-5";

  switch (status) {
    case "success":
      return <SuccessIcon className={className} color={color} />;
    case "warning":
      return <WarningIcon className={className} color={color} />;
    case "danger":
      return <DangerIcon className={className} color={color} />;
    default:
      // `default` and `accent` both show the information disc upstream.
      return <InfoIcon className={className} color={color} />;
  }
}

/**
 * The props of `AlertDialog.Icon`: HeroUI's `AlertDialogIconProps`, which is
 * `DOMRenderProps<E, undefined>` (a `div` by default) plus `status`, `children`
 * and `className`.
 *
 * Upstream is generic over the element tag; NSH has no DOM element swap, so the
 * `render` half is accepted and has no effect (port sheet §8) and the type is
 * not generic.
 */
export interface AlertDialogIconProps extends AlertDialogPartDomProps {
  /** The semantic status: its background, and which glyph shows. @default "danger" */
  status?: AlertDialogStatus;
}

/**
 * AlertDialog.Icon / AlertDialogIcon: the optional icon above the title.
 *
 * R-048 … R-050 come from the `icon` slot; R-052 … R-056 from its `status`
 * axis. The status table is this part's own, as upstream's is: the Icon does
 * not read the shared context.
 */
export function AlertDialogIcon(props: AlertDialogIconProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "status",
    "style",
    "ref",
    "id",
    "nativeID",
    "render",
    "slot",
  ]);

  const slots = computed(() => alertDialogVariants({ status: local.status }));

  const classes = computed(() =>
    [slots().icon(), local.className].filter((part) => part !== "").join(" "),
  );

  // Upstream's icon is a `div`, so a bare string inside it shows (a `View`
  // draws none); the children go through `renderAlertDialogPartChildren` like
  // every other part's. `children ?? defaultIcon()` is upstream's form: `false`
  // and `""` are children, not absences.
  const content = () => {
    const node = local.children;

    return node === undefined || node === null
      ? defaultIcon(local.status ?? "danger")
      : renderAlertDialogPartChildren(node);
  };

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
    >
      {content()}
    </View>
  );
}
