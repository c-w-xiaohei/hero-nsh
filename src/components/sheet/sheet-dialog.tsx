import type { Bounds, JSX } from "nsh";
import { computed, split, View } from "nsh";

import { SurfaceContext, type SurfaceContextValue } from "../surface";
import { SheetDetentContext } from "./create-sheet-detent";
import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { SheetContext } from "./sheet-context";
import { renderSheetPartChildren } from "./sheet-part-children";
import { SHEET_DIALOG_DETACHED_CLASS, sheetVariants } from "./sheet.styles";

/**
 * The props of `Sheet.Dialog`: HeroUI's `SheetDialogProps`, which is React
 * Aria's `SheetContent` (= `Dialog`) props minus `children`, plus
 * `className`, `style`, `slot`, `id` and the `role` / `aria-*` pair.
 */
export interface SheetDialogProps extends Omit<SheetPartDomProps, "role"> {
  /** React Aria's role; NSH has no `dialog` role, see port sheet §8. */
  role?: "alertdialog" | "dialog";

  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Accepted, no effect: there is no id relation channel. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: there is no id relation channel. */
  "aria-describedby"?: string;
}

/**
 * HeroUI's default surface inside a sheet (`sheet.tsx:330`): the panel is a
 * raised surface of its own, so a `Surface` written inside it must not inherit
 * the card's variant from outside the overlay. Same value as Modal's.
 */
const DEFAULT_SURFACE_CONTEXT: SurfaceContextValue = { variant: () => "default" };

/**
 * Sheet.Dialog / SheetDialog: the panel itself.
 *
 * R-023 `.sheet__dialog` → `relative flex min-h-0 flex-col overflow-hidden
 * bg-overlay text-overlay-foreground shadow-overlay outline-none`, with the
 * placement radius R-025 (`bottom`), R-026 (`top`), R-027 (`left`) and R-028
 * (`right`), all of it the slot table's `dialog` entry, whose `placement` axis
 * the Root resolved. R-024
 * `.sheet__content[data-detached] .sheet__dialog` → `rounded-2xl` is appended
 * when the context says detached: the descendant selector becomes a read of
 * the same prop, and the later class wins over the edge radius as the more
 * specific selector did upstream.
 *
 * The natural length is reported to the detent state on every layout: the
 * dismissal thresholds are shares of the panel (25%), not of the viewport, and
 * the panel keeps its content-driven height inside the Content clip box
 * (G-001 / G-002), so its bounds are the length upstream's
 * `useSheetHandleDrag` measures.
 */
export function SheetDialog(props: SheetDialogProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "role",
    "aria-label",
    "render",
    "slot",
    "onLayout",
  ]);

  const context = SheetContext();
  const detent = SheetDetentContext();

  // Outside a Root the Dialog still renders, with the table's defaults, as
  // upstream's empty context default does.
  const slots = () => context?.slots() ?? sheetVariants();
  const isDetached = () => context?.isDetached() ?? false;

  const classes = computed(() =>
    [
      slots().dialog(),
      isDetached() ? SHEET_DIALOG_DETACHED_CLASS : undefined,
      local.className,
    ]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  // The length along the detent's axis: height for a top / bottom sheet, width
  // for a left / right one. Outside a Content there is no state to report to.
  const handleLayout = (event: { bounds: Bounds }) => {
    if (detent) {
      const size = event.bounds.size;
      detent.registerPanelLength(detent.axis() === "x" ? size.width : size.height);
    }

    local.onLayout?.(event);
  };

  return (
    // The provider exception in the common rules: the parts below read
    // `SurfaceContext`, so `props.children` is read once, here at the placement
    // inside the provider.
    <SurfaceContext.Provider value={DEFAULT_SURFACE_CONTEXT}>
      <View
        // Upstream spreads `{...props}` onto the section React Aria builds, so
        // every caller prop reaches the view; `viewProps` drops only the
        // DOM-only names and the `aria-*` pair mapped below.
        {...viewProps(rest)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        // NSH's `AccessibilityRole` has no `dialog`: an `alertdialog` still
        // becomes `alert`, the plain dialog has no role to land on (§8).
        role={local.role === "alertdialog" ? "alert" : "none"}
        accessibilityLabel={local["aria-label"]}
        class={classes()}
        style={local.style}
        onLayout={handleLayout}
      >
        {renderSheetPartChildren(local.children)}
      </View>
    </SurfaceContext.Provider>
  );
}
