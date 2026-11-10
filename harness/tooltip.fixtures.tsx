import { host, mount, View } from "nsh";
import { Button, Tooltip } from "@heroui/react";
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

  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      {name === "close-delay" ? (
        <Tooltip delay={0} closeDelay={300} onOpenChange={probe("openChange")}>
          <Button>Hover me</Button>
          <Tooltip.Content>Closable tip</Tooltip.Content>
        </Tooltip>
      ) : (
        <Tooltip defaultOpen delay={0}>
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

mount(Fixture);
