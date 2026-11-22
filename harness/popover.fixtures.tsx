import { host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  Button,
  EnvironmentScope,
  Popover,
} from "@heroui/react";
import type {
  EnvironmentDensity,
  EnvironmentInput,
  EnvironmentWidth,
} from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Popover unit (port sheet 4b, T-017 / T-018; adapt
 * sheet A-010 for the mobile half).
 *
 * These cases drive `isOpen`, `isExiting` and `shouldSkipAnimation` from
 * outside a single render, which a shared scenario cannot do: a scenario is
 * static JSX and reads no host events. `host.params.case` picks the state and
 * `popover.close` / `popover.reopen` move it while the app runs.
 *
 *   retained       isExiting is forced once closed, so the content must stay
 *                  mounted and keep its own state;
 *   skip           shouldSkipAnimation is true: closing unmounts at once;
 *   override-false shouldSkipAnimation is explicitly false: closing still
 *                  runs the exit hold;
 *   auto           uncontrolled (defaultOpen): Escape closes it on its own, so
 *                  the exit hold can be observed without a host event;
 *   mobile         the mobile layer's shape (adapt sheet §4): a real
 *                  `Popover.Trigger` (testID `pop-trigger`) plus a Content
 *                  parameterized by `presentation` / `isNonModal` / `narrow`
 *                  / `kbDismiss` (see below), a `Popover.Heading` in the
 *                  Dialog, probed `onOpenChange`, and a `pop-close`
 *                  pressable exercising the Dialog `{close}` render-prop
 *                  inside the same popover;
 *   standalone     `Popover.Content` with `defaultOpen` and no Root — the
 *                  `ownsState` half of the baseline sample (M-011).
 *
 * The counter is a component of its own so that its signal lives only while
 * the content subtree is mounted: if closing and reopening rebuild that
 * subtree, the count drops back to 0.
 *
 * `host.params.input` / `host.params.width` / `host.params.density` inject an
 * `EnvironmentScope` over the whole app (`input` ∈ "pointer"|"touch", `width`
 * ∈ "compact"|"regular", `density` a preset name; absent = host baseline —
 * the scope's unset fields inherit the host's own environment). `.mobile.`
 * files use it for the injected side; `.mobile.headless.` files may instead
 * open with `platform:"ios"`/`"android"`.
 *
 * The scope always mounts (never a bare fragment): wrapping `Popover` in a
 * fragment broke the exit-hold unmount — the retained counter remounted as a
 * ghost subtree instead of dropping with the hold (measured, T-016 under an
 * all-fragment passthrough). A provider keeps the children at the same
 * insertion slot and is harmless when every field is absent.
 *
 * `host.params.presentation` ∈ "auto"|"panel"|"sheet" pins `Popover.Content`'s
 * carrier (absent = auto). `host.params.isNonModal`="1" mounts the non-modal
 * chain. `host.params.kbDismiss`="1" sets `isKeyboardDismissDisabled`.
 * `host.params.narrow`="1" shrinks the trigger's child to `w-10` (a
 * <44pt hit target); absent, the child carries `p-3` and stays ≥44pt. Both
 * children report their `onLayout` box as a `layout` probe named
 * `trigger-box` (M-008's only observable input to the hitSlop formula).
 *
 * The content carrier probe (adapt sheet §2 A-010): `testID="pop"` forwards to
 * the carrier root, which derives `id:pop-panel` on the anchored overlay and
 * `id:pop-sheet` on the Sheet panel — `app.shows`/`count` discriminate the
 * mounted presentation.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

function RetainedCounter() {
  const count = signal(0);

  return (
    <Button testID="counter" onPress={() => count.update((value) => value + 1)}>
      {`Count ${count()}`}
    </Button>
  );
}

/* -------------------------------------------------------------------------------------------------
 * EnvironmentScope wrapper (A-010)
 * -----------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  const input = host.params.input;
  const width = host.params.width;
  const density = host.params.density;

  return (
    <EnvironmentScope
      input={input === undefined ? undefined : (String(input) as EnvironmentInput)}
      width={width === undefined ? undefined : (String(width) as EnvironmentWidth)}
      density={
        density === undefined ? undefined : (String(density) as EnvironmentDensity)
      }
    >
      {props.children}
    </EnvironmentScope>
  );
}

/* -------------------------------------------------------------------------------------------------
 * mobile case: the parameterized trigger + carrier shape
 * -----------------------------------------------------------------------------------------------*/

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/* The trigger child's own `onLayout` box (adapt sheet M-008): the trigger
 * root is `inline-block w-fit`, so the child's bounds are the content size
 * the shrink-wrap trigger reports — the only layout reading `nsh/test` can
 * take of the hitSlop seam's input (`hitSlop` itself is a view prop with no
 * read channel, sheet §6). */
function boxProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function MobileCase() {
  const open = signal(false);
  const onChange = probe("openChange");
  const press = probe("triggerPress");
  const close = probe("dialogClose");

  // The same external state drivers the retained cases use (M-005's
  // close-reopen cycle).
  host.on("popover.close", () => open.set(false));
  host.on("popover.reopen", () => open.set(true));

  const narrow = String(host.params.narrow ?? "") === "1";
  const nonModal = String(host.params.isNonModal ?? "") === "1";
  const kbDismiss = String(host.params.kbDismiss ?? "") === "1";
  const presentation = String(host.params.presentation ?? "");

  return (
    <Popover
      isOpen={open()}
      onOpenChange={(next: boolean) => {
        onChange(next);
        open.set(next);
      }}
    >
      <Popover.Trigger
        testID="pop-trigger"
        onPress={() => press("trigger")}
      >
        {narrow ? (
          <View class="w-10 items-center" onLayout={boxProbe("trigger-box")}>
            <Text>+</Text>
          </View>
        ) : (
          <View class="min-h-11 p-3" onLayout={boxProbe("trigger-box")}>
            <Text>Toggle popover</Text>
          </View>
        )}
      </Popover.Trigger>
      <Popover.Content
        testID="pop"
        presentation={
          presentation === "" ? undefined : (presentation as "auto" | "panel" | "sheet")
        }
        isNonModal={nonModal || undefined}
        isKeyboardDismissDisabled={kbDismiss || undefined}
      >
        <Popover.Dialog>
          {(values: { close: () => void }) => (
            <View>
              <Popover.Heading>Mobile heading</Popover.Heading>
              <Text>Mobile content</Text>
              <View
                testID="pop-close"
                role="button"
                onPress={() => {
                  close("dialog");
                  values.close();
                }}
              >
                <Text>Close popover</Text>
              </View>
            </View>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

/* -------------------------------------------------------------------------------------------------
 * standalone case: Popover.Content owning its own open state (M-011's
 * `ownsState` half) — no Root above it, so `defaultOpen`/`onOpenChange`
 * land on the Content itself.
 * -----------------------------------------------------------------------------------------------*/

function StandaloneCase() {
  const onChange = probe("openChange");
  const close = probe("dialogClose");

  return (
    <Popover.Content
      testID="pop"
      defaultOpen
      onOpenChange={(next: boolean) => onChange(next)}
    >
      <Popover.Dialog>
        {(values: { close: () => void }) => (
          <View>
            <Popover.Heading>Standalone heading</Popover.Heading>
            <Text>Standalone content</Text>
            <View
              testID="pop-close"
              role="button"
              onPress={() => {
                close("dialog");
                values.close();
              }}
            >
              <Text>Close popover</Text>
            </View>
          </View>
        )}
      </Popover.Dialog>
    </Popover.Content>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Entry
 * -----------------------------------------------------------------------------------------------*/

function Fixture() {
  const name = String(host.params.case ?? "retained");
  const automatic = name === "auto";
  const open = signal(true);
  const exiting = signal(false);
  const skip = name === "skip" ? true : name === "override-false" ? false : undefined;

  host.on("popover.close", () => {
    if (name === "retained") {
      exiting.set(true);
    }
    open.set(false);
  });
  host.on("popover.reopen", () => {
    open.set(true);
    exiting.set(false);
  });

  if (name === "mobile") {
    return (
      <View class="flex-1 items-start gap-4 bg-background p-6">
        <Scoped>
          <MobileCase />
        </Scoped>
      </View>
    );
  }

  if (name === "standalone") {
    return (
      <View class="flex-1 items-start gap-4 bg-background p-6">
        <Scoped>
          <StandaloneCase />
        </Scoped>
      </View>
    );
  }

  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      <Scoped>
      <Popover isOpen={automatic ? undefined : open()} defaultOpen={automatic}>
        <Button>Open popover</Button>
        <Popover.Content isExiting={exiting()} shouldSkipAnimation={skip}>
          <Popover.Dialog>
            <Text>Retained content</Text>
            <RetainedCounter />
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
      </Scoped>
    </View>
  );
}

mount(Fixture);
