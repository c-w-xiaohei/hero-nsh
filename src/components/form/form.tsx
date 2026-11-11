import type {
  AccessibilityRole,
  JSX,
  StyleProp,
  ViewProps,
  ViewStyle,
} from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./children";
import type { ValidationErrors } from "./context";
import { FormContext, type FormContextValue } from "./context";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomEvents,
  type GlobalDomProps,
  viewProps,
} from "./dom-props";

/* -------------------------------------------------------------------------------------------------
 * Submit event
 * -----------------------------------------------------------------------------------------------*/

/**
 * The payload of `onSubmit`. HeroUI hands React's `FormEvent<HTMLFormElement>`,
 * whose `currentTarget` feeds `new FormData(...)`; NSH has no DOM element, no
 * form encoding and no navigation, so what is left of the event is the
 * cancelled flag. A handler can still call `preventDefault()` and read
 * `defaultPrevented`, which is the part HeroUI's own tests rely on (port sheet
 * §1, §8 item 3).
 */
export interface FormSubmitEvent {
  /** Whether `preventDefault()` was called on this event. */
  readonly defaultPrevented: boolean;

  /**
   * Marks the submission cancelled. There is no native default action to
   * cancel: the Form never navigates or encodes anything.
   */
  preventDefault(): void;
}

/* -------------------------------------------------------------------------------------------------
 * Form Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Form.Root` (= `Form`): HeroUI 3.2.7's `FormRootProps`, which is
 * React Aria Components' `Form` (its props are React Aria's `FormProps` plus
 * `DOMProps`, `DOMRenderProps<'form'>` and the global `<form>` attributes),
 * expressed with NSH's view host props.
 *
 * The DOM-only members (`action` / `method` / … , `aria-*`, `data-*`, the DOM
 * event handlers, `render`) are accepted so code written against HeroUI keeps
 * compiling; port sheet §1 and §8 list what each can and cannot do here. NSH
 * host events (`onPress`, `onLayout`, …) travel through the rest props to the
 * root `View`.
 */
export interface FormRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "role" | keyof GlobalDomEvents>,
    AriaProps,
    DataProps,
    GlobalDomProps,
    GlobalDomEvents {
  /**
   * The fields, controls and text of the form. A bare string or number becomes
   * a `Text` at the placement (research 4.1, 4.6).
   */
  children?: JSX.Element;

  /**
   * Appended to the root; HeroUI's default `react-aria-Form` is not ported
   * (D18, R-001), so with no `className` the root carries no class at all.
   */
  className?: string;

  /** Style of the root view; there are no variant classes for it to win over. */
  style?: StyleProp<ViewStyle>;

  /**
   * Server validation errors, indexed by a field's `name`; handed down through
   * `FormContext` untouched (default `{}`). A field root merges its own entry
   * into its validation state (port sheet §5.3).
   */
  validationErrors?: ValidationErrors;

  /**
   * How fields validate: `"native"` (the default) or `"aria"`. Form itself
   * never validates; it resolves the default and hands it down (port sheet §2,
   * §8 item 6).
   */
  validationBehavior?: "native" | "aria";

  /**
   * The form's accessible name. Maps to `accessibilityLabel`; without an
   * explicit `role`, a name also makes the root a `region`, the only landmark
   * role NSH has (port sheet §1, §8 item 1).
   */
  "aria-label"?: string;

  /**
   * Accepted for API parity: NSH has no DOM id, so this neither names the root
   * nor resolves on its own. Its presence still marks the form as named when
   * the default role is derived, as upstream's landmark rule requires.
   */
  "aria-labelledby"?: string;

  /**
   * Upstream's ARIA role override: `"search"` maps to NSH's `search`,
   * `"presentation"` to `none`. An explicit value always beats the `region`
   * derived from a name (port sheet §1, §8 item 1).
   */
  role?: "search" | "presentation";

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /**
   * Called once per submission request, from `Button type="submit"` and (once
   * the field units land) from Enter in a field. NSH has no native submit
   * event, so the request reaches the Form through `FormContext.submit()`
   * (port sheet §5.2).
   */
  onSubmit?: (event: FormSubmitEvent) => void;

  /** Accepted, never called: NSH has no native form reset (port sheet §8 item 4). */
  onReset?: (event: FormSubmitEvent) => void;

  /**
   * Accepted, never called: upstream fires it per invalid field on submit
   * through the browser's `invalid` event, and Form never scans field validity
   * in NSH (port sheet §8 item 14).
   */
  onInvalid?: (event: FormSubmitEvent) => void;

  /** Accepted, no effect: NSH has no form submission or navigation. */
  action?: string;

  /** Accepted, no effect: NSH has no form submission or navigation. */
  method?: string;

  /** Accepted, no effect: NSH has no form encoding. */
  encType?: string;

  /** Accepted, no effect: NSH has no navigation target. */
  target?: string;

  /** Accepted, no effect: NSH has no native constraint validation. */
  noValidate?: boolean;

  /** Accepted, no effect: NSH has no form encoding. */
  acceptCharset?: string;

  /** Accepted, no effect: NSH has no browser autofill. */
  autoComplete?: string;

  /** Accepted, no effect: NSH has no form data set. */
  name?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

/** Builds one submit event; every request gets a fresh `defaultPrevented`. */
function createSubmitEvent(): FormSubmitEvent {
  let defaultPrevented = false;

  return {
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault() {
      defaultPrevented = true;
    },
  };
}

/**
 * Form.Root / FormRoot: the form container. It holds no state, paints nothing
 * and has no interaction of its own; it resolves `validationBehavior` and
 * `validationErrors` into `FormContext` and turns a control's submit request
 * into `onSubmit` (port sheet §2, §3).
 *
 * It is built on the core `View` rather than a nsh/base component: nsh/base has
 * no form, and `View` satisfies all four reuse criteria by itself (port sheet
 * §3): it takes any children, paints nothing of its own, has no behavior
 * contract, and has no internal state.
 */
export function FormRoot(props: FormRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "focusable",
    "id",
    "nativeID",
    "role",
    "aria-label",
    "aria-labelledby",
    "accessibilityLabel",
    "validationErrors",
    "validationBehavior",
    "onSubmit",
    "onReset",
    "onInvalid",
  ] as const);

  // Per instance: `computed` already caches, so one empty object serves every
  // read of a Form without `validationErrors`, keeping the accessor's identity
  // stable for the fields that read it (port sheet §2).
  const emptyValidationErrors: ValidationErrors = {};

  // The two values upstream stores in its contexts, defaults resolved here
  // (React Aria `Form.tsx:49,56-57`). Both are read-only inputs: a computed
  // keeps each following its prop without a second source of truth.
  const validationErrors = computed<ValidationErrors>(
    () => local.validationErrors ?? emptyValidationErrors,
  );
  const validationBehavior = computed<"native" | "aria">(
    () => local.validationBehavior ?? "native",
  );

  // The submit channel (port sheet §5.2, §5.3): a control calls it, the Form
  // builds one event and calls the caller's `onSubmit` once. The props getter
  // is read here, when the submission happens, not when the Form was created.
  const submit = () => {
    const handler = local.onSubmit;

    if (handler) {
      handler(createSubmitEvent());
    }
  };

  const contextValue: FormContextValue = {
    validationErrors,
    validationBehavior,
    submit,
  };

  // HTML's `form` is a landmark only when it has an accessible name; NSH has
  // no `form` role, so a named form becomes the only landmark role it has,
  // `region` (port sheet §1, §8 item 1). `aria-labelledby` cannot be resolved
  // without DOM ids, but its presence still marks the form as named.
  const hasAccessibleName = computed(() => {
    const label = local["aria-label"];
    const labelledBy = local["aria-labelledby"];

    return (
      (typeof label === "string" && label.length > 0) ||
      (typeof labelledBy === "string" && labelledBy.length > 0)
    );
  });

  // An explicit `role` always wins, whatever the name says; `presentation` is
  // ARIA's `none` in NSH's role table.
  const role = computed<AccessibilityRole | undefined>(() => {
    if (local.role === "search") {
      return "search";
    }

    if (local.role === "presentation") {
      return "none";
    }

    return hasAccessibleName() ? "region" : undefined;
  });

  const accessibilityLabel = computed(
    () => local["aria-label"] ?? local.accessibilityLabel,
  );

  // `_common` exception: Form provides a context, so `props.children` is read
  // once, inside the Provider, at the placement. A computed created in the body
  // would be evaluated outside it and the fields would lose the context.
  // Nothing else reads the children.
  return (
    <FormContext.Provider value={contextValue}>
      <View
        {...viewProps(rest)}
        // A callback only: NSH writes into a ref store, and an undefined one
        // would throw at mount on the web target (common rules, real hosts).
        ref={(node) => (typeof local.ref === "function" ? local.ref(node) : undefined)}
        nativeID={local.id ?? local.nativeID}
        role={role()}
        accessibilityLabel={accessibilityLabel()}
        // R-002: a `<form>` is a block box and NSH's `View` is a column flex
        // container; the children stack the same way HeroUI's own examples lay
        // them out (`flex flex-col`). A `<form>` is not a keyboard focus stop
        // upstream, so the root stays out of the Tab order unless asked.
        focusable={local.focusable ?? false}
        // R-001: the upstream default class `react-aria-Form` has no rule in
        // 3.2.7 and is not ported (D18); with no `className` the root carries
        // none, and a caller's classes are used as they are, later winning.
        class={local.className}
        style={local.style}
      >
        {renderChildren(local.children)}
      </View>
    </FormContext.Provider>
  );
}
