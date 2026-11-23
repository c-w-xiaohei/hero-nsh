import { host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Button, createInput, EnvironmentScope, Tooltip } from "@heroui/react";
import { probe } from "./probe";

/*
 * NSH-only fixture for the Tooltip unit (port sheet 4b, T-003 / T-006 / T-008,
 * plus the follow-up review's warmup, swap and content-hover cases).
 *
 * The shared scenarios cannot reach these cases: T-003 needs a `closeDelay`
 * timer observed on a manual clock and the `onOpenChange` values it reports,
 * T-006 / T-008 need a tooltip that is open without a pointer or a focused
 * trigger, and the warmup / one-open-at-a-time behavior needs several tooltip
 * instances with their own triggers. `host.params.case` picks the state:
 *
 *   close-delay  delay 0, closeDelay 300, uncontrolled, with an `away` Button
 *                far below the trigger to move the pointer off both trigger
 *                and tip (the default);
 *   default-open `defaultOpen`, so Escape is the only thing that closes it;
 *   warm-swap    three `delay` 50 / `closeDelay` 200 tooltips in a row —
 *                Warmup, First, Second — and the `away` Button: the 50 ms
 *                warmup timer primes the family-wide warm flag, so a second
 *                open and a target swap both show without delay;
 *   content-hover delay 0, closeDelay 300, with the `away` Button: the open
 *                tip is itself the hover target that keeps it open.
 *   mobile        the adapt-unit seam case (M-001 … M-009): a
 *                `Tooltip.Trigger` (the only trigger form wired to the
 *                root's `longPress` channel — `<Tooltip><Button>` is the
 *                §5 cross-unit gap) with `onLongPress`/`onPress` probes, a
 *                `Mobile tip` content, the `away` Button, and an
 *                `env-input=` Text reporting `createInput()`. host.params:
 *                `scope` ("" / "touch" through `EnvironmentScope`, read by
 *                every case), `focusOnly`="1" (`trigger="focus"`),
 *                `disabled`="1" (Root `isDisabled`).
 *   mobile-owns   the ownsState half of M-005: same shape, but the Content
 *                takes a controlled `isOpen` (a signal its own
 *                `onOpenChange` writes back) — separate case because a
 *                conditional child inside the providers loses context on
 *                `--target web`.
 *
 * They sit next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

function Away() {
  return (
    <View style={{ marginTop: 240 }}>
      <Button testID="away">Elsewhere</Button>
    </View>
  );
}

function WarmSwap() {
  return (
    <View class="flex-1 bg-background p-6">
      {/*
        A row, not a column: a tip that flips below its trigger would cover the
        next trigger in a column, and the pointer would land on the tip.
      */}
      <View class="flex-row items-start gap-4">
        <Tooltip delay={50} closeDelay={200}>
          <Button>Warmup</Button>
          <Tooltip.Content>Warm tip</Tooltip.Content>
        </Tooltip>
        <Tooltip delay={50} closeDelay={200}>
          <Button>First</Button>
          <Tooltip.Content>First tip</Tooltip.Content>
        </Tooltip>
        <Tooltip delay={50} closeDelay={200}>
          <Button>Second</Button>
          <Tooltip.Content>Second tip</Tooltip.Content>
        </Tooltip>
      </View>
      <Away />
    </View>
  );
}

function ContentHover() {
  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      <Tooltip delay={0} closeDelay={300}>
        <Button>Hover me</Button>
        <Tooltip.Content>Content hover tip</Tooltip.Content>
      </Tooltip>
      <Away />
    </View>
  );
}

/* The adapt-unit seam case: `Tooltip.Trigger` is the trigger form that reads
 * `TooltipContext.longPress` (the Button form's channel is the sheet §5
 * cross-unit request, not wired). `env-input=` makes the resolved `input`
 * axis observable for the ios-derivation row (M-009). */
function MobileCase() {
  const input = createInput();
  const focusOnly = String(host.params.focusOnly ?? "") === "1";
  const disabled = String(host.params.disabled ?? "") === "1";

  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      <Tooltip
        delay={0}
        closeDelay={300}
        trigger={focusOnly ? "focus" : "hover"}
        isDisabled={disabled}
        onOpenChange={probe("openChange")}
      >
        <Tooltip.Trigger
          testID="trigger"
          onLongPress={() => probe("longPress")("trigger")}
          onPress={() => probe("press")("trigger")}
        >
          Hold me
        </Tooltip.Trigger>
        <Tooltip.Content testID="tip">Mobile tip</Tooltip.Content>
      </Tooltip>
      <Text>{`env-input=${input()}`}</Text>
      <Away />
    </View>
  );
}

/* The ownsState half of M-005 is its own case: a conditional expression as a
 * Provider's child loses the context on `--target web` (measured — the
 * Content inside `{owns ? … : …}` read null TooltipContext/HoverTriggerContext
 * and took the ownsState branch), so the two Content shapes never share one
 * children position. `isOpen` is controlled: a signal the Content's own
 * `onOpenChange` writes back, so the outside-press close path
 * (`setOpen` → `setOwnIsOpen` → `onOpenChange`) is what the test observes.
 * The uncontrolled `defaultOpen` variant is not used: a closed ownsState
 * Content remounts and reopens (pre-existing on feat/mobile-encapsulation,
 * recorded in the unit report). */
function MobileOwnsCase() {
  const ownsOpen = signal(true);

  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      <Tooltip delay={0} closeDelay={300} onOpenChange={probe("openChange")}>
        <Tooltip.Trigger
          testID="trigger"
          onLongPress={() => probe("longPress")("trigger")}
          onPress={() => probe("press")("trigger")}
        >
          Hold me
        </Tooltip.Trigger>
        <Tooltip.Content
          isOpen={ownsOpen()}
          onOpenChange={(next) => {
            ownsOpen.set(next);
            probe("contentOpenChange")(next);
          }}
        >
          Mobile tip
        </Tooltip.Content>
      </Tooltip>
      <Away />
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "close-delay");

  if (name === "position-props") {
    const variant = String(host.params.variant ?? "default");

    return (
      <View class="flex-1 items-start bg-background p-6">
        <Tooltip defaultOpen delay={0}>
          <Button>Position anchor</Button>
          <Tooltip.Content
            showArrow
            crossOffset={variant === "cross" ? 36 : undefined}
            arrowBoundaryOffset={variant === "boundary" ? 28 : undefined}
            placement="top start"
          >
            <Tooltip.Arrow testID="position-arrow" />
            Position tip
          </Tooltip.Content>
        </Tooltip>
      </View>
    );
  }

  if (name === "warm-swap") return <WarmSwap />;
  if (name === "content-hover") return <ContentHover />;
  if (name === "mobile") return <MobileCase />;
  if (name === "mobile-owns") return <MobileOwnsCase />;

  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      {name === "close-delay" ? (
        <Tooltip delay={0} closeDelay={300} onOpenChange={probe("openChange")}>
          <Button>Hover me</Button>
          <Tooltip.Content>Closable tip</Tooltip.Content>
        </Tooltip>
      ) : (
        <Tooltip defaultOpen delay={0} onOpenChange={probe("openChange")}>
          <Button>Hover me</Button>
          <Tooltip.Content>Hover tip</Tooltip.Content>
        </Tooltip>
      )}
      {/*
        Far below the trigger on purpose: upstream moves the pointer with
        `user.unhover(trigger)`, which leaves it over no element. The open tip
        is hit-testable (only the exiting tip gets `pointer-events-none`) and
        keeps itself open when hovered, so a target inside the tip's footprint
        would keep the tooltip open instead of unhovering it.
      */}
      <Away />
    </View>
  );
}

/* `host.params.scope` picks the environment wrapper — "" is the host
 * default (pointer on the pinned desktop hosts, the desktop-parity half),
 * "touch" is `EnvironmentScope input="touch"` — the same convention
 * `disclosure.fixtures.tsx` / `control-field.fixtures.tsx` use; every case
 * mounts inside it so both environment halves run the same scenario. */
function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "");

  if (scope === "touch") {
    return <EnvironmentScope input="touch">{props.children}</EnvironmentScope>;
  }
  if (scope === "pointer") {
    return <EnvironmentScope input="pointer">{props.children}</EnvironmentScope>;
  }
  return <>{props.children}</>;
}

function Root() {
  return (
    <Scoped>
      <Fixture />
    </Scoped>
  );
}

mount(Root);
