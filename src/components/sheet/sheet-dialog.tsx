import type { Bounds, GestureResponderEvent, JSX, ViewStyle } from "nsh";
import { computed, split, View, windowSize } from "nsh";

import { createInput } from "../../primitives/environment";
import { createPan } from "../../primitives/pan";
import { SurfaceContext, type SurfaceContextValue } from "../surface";
import {
  SheetContentPanContext,
  SheetDetentContext,
  type SheetContentPan,
} from "./create-sheet-detent";
import { sheetContentExtent } from "./sheet-content-box";
import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { SheetContext } from "./sheet-context";
import { renderSheetPartChildren } from "./sheet-part-children";
import { SHEET_DIALOG_DETACHED_CLASS, sheetVariants } from "./sheet.styles";
import { sheetDragLength } from "./sheet.utils";

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

  // The content-area gesture (adapt-sheets/sheet-handoff.md A-005): a touch
  // environment attaches it on the panel — the view every content part lives
  // inside — and the same `beginDrag` / `moveDrag` / `endDrag` / `cancelDrag`
  // channel the Handle uses drives the detent. Under the default pointer
  // environment `panHandlers()` is an empty object: no listener exists, so the
  // desktop never sees this path.
  //
  // The claim is the JS move predicate alone, and it must fire on the first
  // dominant move: measured on the headless host, the Scroll's native
  // recognizer takes the touches at its own ~10-point threshold, and a claim
  // that asks later is granted to no one — the gesture ends in a void (no
  // drag, no scroll). A claim on the first move wins the race, and once
  // granted, `onShouldBlockNativeResponder` keeps the Scroll from taking the
  // touches back. `panActivation` is not usable as a native hold: it activates
  // the UI-thread `pan` channel instead of the JS responder, so every
  // direction goes dead with it mounted (measured, sheet §5).
  const input = createInput();
  const position = (event: GestureResponderEvent) =>
    detent?.axis() === "x" ? event.pageX : event.pageY;
  const pan = createPan({
    enabled: () => input() === "touch" && detent !== null,
    shouldClaim: (_event, gesture) => {
      if (!detent) return false;

      const along = detent.axis() === "x" ? gesture.dx : gesture.dy;
      const across = detent.axis() === "x" ? gesture.dy : gesture.dx;

      // The drag must be along the swipe direction's axis and dominant over
      // the scroll axis: a mostly-vertical move is the Body's scroll,
      // whatever the detent state. There is no displacement floor here — the
      // host's native scroll recognizer claims at its own ~10-point threshold,
      // and the only claim that lands is one made on the first dominant move
      // (measured: asking to claim at 20 points arrives after the Scroll
      // already owns the touches).
      if (along === 0 || Math.abs(across) >= Math.abs(along)) {
        return false;
      }

      if (!detent.isExpanded()) {
        // The Body's `scrollable` is off below the full detent, so the Scroll
        // never competes: any axial drag is the panel's, opening or closing.
        return true;
      }

      // At the full detent the Scroll owns the gesture except when the content
      // is back at its start edge and the pull is toward the sheet's close
      // edge — i.e. the move already shrinks the reveal (`sheetDragLength`
      // below start length), exactly the condition the Handle's drag would
      // take.
      return (
        detent.atTop() &&
        sheetDragLength({
          placement: context?.placement() ?? "bottom",
          startLength: 1,
          swipeDirection: detent.direction(),
          travel: along,
        }) < 1
      );
    },
    onDragStart: (event, gesture) => {
      if (!detent) return;

      // `y0` is where the finger went down, not where the claim fired, so the
      // pre-threshold travel is not lost when the panel takes over.
      detent.beginDrag(
        detent.axis() === "x" ? gesture.x0 : gesture.y0,
        event.timestamp,
      );
    },
    onDrag: (event) => {
      detent?.moveDrag(position(event), event.timestamp);
    },
    onDragEnd: (event, _gesture, terminated) => {
      if (!detent) return;

      if (terminated) {
        detent.cancelDrag();
      } else {
        detent.endDrag(position(event), event.timestamp);
      }
    },
    // Paired-scroll props: `Sheet.Body` spreads `scrollProps()` so a touch
    // drag through the panel can dismiss the keyboard interactively.
    keyboardDismissMode: "interactive",
  });
  const contentPan: SheetContentPan = {
    panHandlers: pan.panHandlers,
    scrollProps: pan.scrollProps,
  };

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

  /**
   * R-023 has no height of its own: inside the clip box the panel is
   * content-sized (G-002 wants a taller dialog at a partial detent, clipped by
   * the box), but once the sheet reaches its full length the Body is the
   * scroller (R-032) and needs a bounded column above it — otherwise the
   * Footer sits below the clip and disappears. So the panel takes the box's
   * length as a `max-height` in exactly that state: the detent's own length on
   * a snap sheet, the edge cap on a content-sized one, and the box's height
   * (the surface, `- 1rem` detached) on a left / right sheet, whose length
   * runs across the panel.
   *
   * It is inline rather than a `max-h-full` class because a percentage of a
   * content-sized parent is not the length the box actually got; the numbers
   * come from the same `sheetContentExtent` `Sheet.Content` writes.
   */
  const expandedStyle = (): ViewStyle | undefined => {
    if (detent === null || !detent.isExpanded()) {
      return undefined;
    }

    const surface = windowSize();
    const extent = sheetContentExtent({
      axis: detent.axis(),
      isDetached: isDetached(),
      detentLength: detent.hasPartialDetents() ? detent.length() : null,
      surfaceWidth: surface.width,
      surfaceHeight: surface.height,
    });

    return { maxHeight: extent.horizontal ? extent.cross : (extent.axial ?? extent.axialCap) };
  };

  return (
    // The provider exceptions in the common rules: the parts below read
    // `SurfaceContext` and `SheetContentPanContext`, so `props.children` is
    // read once, here at the placement inside the providers.
    <SurfaceContext.Provider value={DEFAULT_SURFACE_CONTEXT}>
      <SheetContentPanContext.Provider value={contentPan}>
        <View
          // Upstream spreads `{...props}` onto the section React Aria builds,
          // so every caller prop reaches the view; `viewProps` drops only the
          // DOM-only names and the `aria-*` pair mapped below.
          {...viewProps(rest)}
          // The mechanism seam lands next: `createPan` owns the responder
          // props on this panel, and under the pointer environment the spread
          // is empty.
          {...pan.panHandlers()}
          ref={(node) => local.ref?.(node)}
          nativeID={local.id ?? local.nativeID}
          // NSH's `AccessibilityRole` has no `dialog`: an `alertdialog` still
          // becomes `alert`, the plain dialog has no role to land on (§8).
          role={local.role === "alertdialog" ? "alert" : "none"}
          accessibilityLabel={local["aria-label"]}
          class={classes()}
          style={[expandedStyle(), local.style]}
          onLayout={handleLayout}
        >
          {renderSheetPartChildren(local.children)}
        </View>
      </SheetContentPanContext.Provider>
    </SurfaceContext.Provider>
  );
}
