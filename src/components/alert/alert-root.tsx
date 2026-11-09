import { computed, split, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./alert-children";
import type { AriaProps, DataProps, GlobalDomProps } from "./alert-dom-props";
import { viewProps } from "./alert-dom-props";
import { titleText, titleTooltip } from "./alert-hint";
import { alertVariants, type AlertVariants } from "./alert.styles";
import { joinClassNames } from "./class-names";
import { AlertContext, type AlertContextValue, type AlertStatus } from "./context";
import { SurfaceContext, type SurfaceContextValue } from "../surface";

/* -------------------------------------------------------------------------------------------------
 * Alert Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * Upstream's `DEFAULT_SURFACE_CONTEXT`: Alert resets the surface tone for
 * everything it contains, so a `Surface` inside an Alert placed on a secondary
 * card still resolves `default`. The value is constant, so it is created once.
 */
const DEFAULT_SURFACE_CONTEXT: SurfaceContextValue = { variant: () => "default" };

/**
 * The props of `Alert.Root` (= `Alert`): HeroUI 3.2.7's `AlertRootProps`, which
 * is a `div`'s intrinsic attributes plus `children`, `className` and `status`,
 * expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`render`, `aria-*`, `data-*`, `dir` / `lang` /
 * `hidden` / `inert` / `translate`, the intrinsic event names) are accepted so
 * code written against HeroUI keeps compiling; see the port sheet §1 and §8 for
 * what they can and cannot do here. NSH host events (`onPress`, `onMouseEnter`,
 * …) travel through the rest props to the root `View`.
 */
export interface AlertRootProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The content. Optional although HeroUI's type requires it, because an empty
   * alert is valid at runtime upstream; a bare string or number becomes a
   * `Text` at the placement (research 4.1, 4.6).
   */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Alert status. @default "default" */
  status?: AlertVariants["status"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /**
   * Upstream this is the DOM `title` attribute of the `div`: the browser's
   * native hover tooltip. NSH has no `title`, so it feeds `tooltip` (the
   * visible hint) and `accessibilityHint`.
   */
  title?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the alert from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * `Alert.Root` / `AlertRoot`: the static container of the five-part alert.
 *
 * It holds no state: `status` is a read-only input, and the slot table, the
 * context value and the root class string are its pure derived values (port
 * sheet §2). It creates `AlertContext` for the four parts and resets
 * `SurfaceContext` to `default`, exactly as upstream nests the two providers.
 */
export function AlertRoot(props: AlertRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "focusable",
    "status",
    "id",
    "nativeID",
    "title",
    "tooltip",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityElementsHidden",
    "aria-label",
    "aria-hidden",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // The only variant input, kept live as a derived value; `defaultVariants`
  // fills it when the caller passes nothing, and the accessor is also what the
  // Indicator reads to pick its icon.
  const status = computed<AlertStatus>(() => local.status ?? "default");

  // R-001 … R-020 resolve through the same table for the root and every part.
  const slots = computed(() => alertVariants({ status: status() }));

  const contextValue: AlertContextValue = { slots, status };

  const classes = computed(() => joinClassNames(slots().base(), local.className));

  const title = computed(() => local.title);

  return (
    <AlertContext.Provider value={contextValue}>
      <SurfaceContext.Provider value={DEFAULT_SURFACE_CONTEXT}>
        <View
          {...viewProps(rest)}
          // A callback only: NSH writes into a ref store, and an undefined one
          // would throw at mount on the web target (common rules, real hosts).
          ref={(node) => local.ref?.(node)}
          nativeID={local.id ?? local.nativeID}
          // A `<div>` is not a keyboard focus stop upstream; without this a
          // pressable view would become one. A caller's own `focusable` wins.
          focusable={local.focusable ?? false}
          accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
          accessibilityElementsHidden={
            local["aria-hidden"] ?? local.accessibilityElementsHidden
          }
          accessibilityHint={local.accessibilityHint ?? titleText(title())}
          tooltip={local.tooltip ?? titleTooltip(title())}
          class={classes()}
          style={local.style}
        >
          {/*
            The provider exception in the common rules: a component that
            provides a context reads `props.children` once, inside the
            Provider, at the placement. A computed created in the body would
            evaluate outside it and the parts would lose `AlertContext`.
          */}
          {renderChildren(local.children)}
        </View>
      </SurfaceContext.Provider>
    </AlertContext.Provider>
  );
}
