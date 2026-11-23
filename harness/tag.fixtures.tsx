import { effect, host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Description, EnvironmentScope, Label, Tag, TagGroup } from "@heroui/react";
import type { SelectionValue } from "@heroui/react";
import { PressableFeedbackContext } from "../src/primitives/pressable";
import type { PressableFeedbackContextValue } from "../src/primitives/pressable";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Tag / TagGroup unit (port sheet 4b).
 *
 * The shared scenarios cannot carry probes or external state, so every case
 * below is selected with `host.params.case`:
 *
 *   selection-log              single News / Travel, `▶` focus and `✓` selected
 *                              markers, selection probe (T-007, T-008, T-010)
 *   multiple-log               the same with selectionMode multiple (T-011,
 *                              T-028 with One / Two / Three in typeahead-multiple)
 *   typeahead                  single One / Two / Three (T-017, T-018, T-019,
 *                              T-025, T-026, T-034, T-035)
 *   typeahead-multiple         the same, multiple (T-028)
 *   typeahead-multiple-default the same, defaultSelectedKeys {1, 2} (T-029,
 *                              T-031)
 *   typeahead-multiple-controlled  the same, selectedKeys held at {1, 2}
 *                              (T-030)
 *   typeahead-disabled         single, Two disabled (T-027)
 *   typeahead-disabled-three   multiple, default {1, 2}, Three disabled
 *                              (T-032)
 *   default-selection          single, defaultSelectedKeys {2} (T-023)
 *   empty-selection            single, default {2}, disallowEmptySelection
 *                              false (T-033)
 *   controlled-selection       single, selectedKeys {2} held outside (T-024)
 *   disabled-individual        single, News isDisabled (T-012)
 *   disabled-keys              single, disabledKeys {news} (T-013)
 *   remove-log                 multiple Cat / Dog with remove buttons and an
 *                              onRemove probe; params.size picks sm/md/lg
 *                              (T-004, T-006)
 *   remove-single              single News, default remove button, onRemove
 *                              probe (T-014)
 *   remove-marked              single News with the markers and a remove
 *                              button, for the keyboard delete case (T-015)
 *   custom-remove              single News whose custom remove button shows
 *                              `×`, onRemove probe (T-003)
 *   label-description          Label + Description, one tag (T-009)
 *   empty-state                items=[] with renderEmptyState (part of the
 *                              dynamic-collection contract)
 *   heights                    removable and plain groups with onLayout boxes
 *                              (T-005)
 *   items-mapped               items + function child, selection probe (T-021)
 *   size-lg                    size lg, variant surface, one tag (T-016)
 *   aria-label                 the group's aria-label names the grid (T-038)
 *   row-aria-label             a tag's aria-label overrides its textValue
 *                              (T-036)
 *   live-children              a tag whose plain children read a signal, plus
 *                              an Update button (X-001)
 *   press-log                  single News / Travel, the rows' press lifecycle
 *                              routed to probes (X-002, M-007's `events` order)
 *
 * Mobile-layer params (adapt sheet §4):
 *   scope     "" = the host's default environment (pointer — the
 *             desktop-parity side); "touch" wraps the case in
 *             EnvironmentScope(input="touch"), the injected environment the
 *             assertions drive.
 *   probe     "1" mounts the seam surface: a `CtxProbe` inside a probed row or
 *             remove button (reads `PressableFeedbackContext` — the row and
 *             the remove button each wrap their view, so a child reads the
 *             live channels of the seam above it) plus a `ctx-sample` sibling
 *             button that reads the AnimatedValue channels on demand.
 *             Reports: `ctx-env` (gate/hitSlop at mount), `ctx-pressed`
 *             (isPressed edges), `ctx-state`/`ctx-channels` (pressed / scale /
 *             hitSlop / origin / bounds). Off by default so the text surface
 *             is unchanged.
 *   feedback-row      single selectable News / Travel, News probed (M-002)
 *   feedback-static   selectionMode none + no action: a static row, probed
 *                     (M-003 — the seam's hitSlop gate)
 *   remove-probe      removable Cat, the probe inside Tag.RemoveButton
 *                     (M-009 — the button's own seam)
 *   group-disabled    TagGroup isDisabled: every key disabled, press/remove
 *                     inert (A-008, M-006, M-013)
 *   row-hover         a row rendering its isHovered marker and hover callback
 *                     probes (A-004, M-005)
 *
 * The focus marker `▶` stands in for `document.activeElement`: focus is
 * virtual, the row that holds `focusedKey` reads it from `isFocused`. The
 * selected marker `✓` stands in for `aria-selected`. `textValue` (or an
 * explicit `aria-label`) keeps every row's accessible name stable while a
 * marker appears, so `role:row[One]` keeps naming the same row.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function selectionArgs(keys: "all" | Iterable<unknown>): unknown {
  return keys === "all" ? "all" : Array.from(keys);
}

function onSelectionChange(keys: "all" | Iterable<unknown>): void {
  probe("selectionChange")(selectionArgs(keys));
}

function onRemove(keys: "all" | Iterable<unknown>): void {
  probe("remove")(selectionArgs(keys));
}

/* -------------------------------------------------------------------------------------------------
 * Environment injection + seam probe (the mobile layer's observation surface)
 * -----------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  return String(host.params.scope ?? "") === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

function probeOn() {
  return String(host.params.probe ?? "") === "1";
}

// The last mounted probe's context value, kept for `ctx-sample` — presses
// that never raise the seam's `isPressed` edge (the default pointer
// environment) still leave observable channel values.
let rowCtx: PressableFeedbackContextValue | null = null;

// `tag` labels the report so a case with several probes (row vs remove
// button) can tell them apart; each mobile case mounts exactly one.
function CtxProbe(props: { tag?: string }) {
  const ctx = PressableFeedbackContext();
  const reportPressed = probe("ctx-pressed");
  const reportState = probe("ctx-state");
  const reportEnv = probe("ctx-env");

  effect(() => {
    rowCtx = ctx;
  });

  // Mount-time environment of the seam: the effective gate and the computed
  // hitSlop (undefined until `onLayout` reports the bounds, so this effect
  // re-reports on the layout edge too).
  effect(() => {
    void ctx.bounds();
    reportEnv({
      tag: props.tag,
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
      bounds: ctx.bounds(),
    });
  });

  const sample = () => {
    void ctx.pressed.getValue().then((pressed) => {
      void ctx.scale.getValue().then((scale) => {
        reportState({
          tag: props.tag,
          pressed,
          scale,
          isPressed: ctx.isPressed(),
          hitSlop: ctx.hitSlop() ?? null,
          origin: ctx.pressOrigin(),
          bounds: ctx.bounds(),
          enabled: ctx.enabled(),
        });
      });
    });
  };

  // Both the edge and deferred samples, so a held press catches mid-run and
  // settled values (the switch fixture's cadence).
  effect(() => {
    reportPressed(ctx.isPressed());
    setTimeout(sample, 600);
    setTimeout(sample, 1500);
  });

  // Polling sampler: on `--target web` the edge effect above only ever sees
  // the settled flag — `pressDown`/`pressUp` land inside one press tick — so
  // a `isPressed: true` mid-press sample must come from reading the flag on
  // a clock.
  effect(() => {
    const timer = setInterval(() => {
      if (ctx.isPressed()) {
        sample();
      }
    }, 200);

    return () => clearInterval(timer);
  });

  return <Text>{ctx.isPressed() ? "seam-pressed" : "seam-idle"}</Text>;
}

/** Mounts `CtxProbe` inside a row only when `probe=1` asks for it. */
function SeamProbe(props: { tag?: string }) {
  return probeOn() ? <CtxProbe tag={props.tag} /> : null;
}

function SampleButton() {
  const reportChannels = probe("ctx-channels");

  const sampleChannels = () => {
    const c = rowCtx;
    if (c === null) {
      return;
    }
    void c.pressed.getValue().then((pressed) => {
      void c.scale.getValue().then((scale) => {
        reportChannels({
          pressed,
          scale,
          isPressed: c.isPressed(),
          hitSlop: c.hitSlop() ?? null,
          origin: c.pressOrigin(),
          bounds: c.bounds(),
          enabled: c.enabled(),
        });
      });
    });
  };

  return probeOn() ? (
    <View testID="ctx-sample" role="button" class="p-2" onPress={sampleChannels}>
      <Text>ctx-sample</Text>
    </View>
  ) : null;
}

/* -------------------------------------------------------------------------------------------------
 * Rows
 * -----------------------------------------------------------------------------------------------*/

function MarkedRow(props: {
  id: string;
  label: string;
  isDisabled?: boolean;
  removes?: boolean;
  presses?: boolean;
  probed?: boolean;
  laysOut?: boolean;
}) {
  const reportEvent = probe("events");

  return (
    <Tag
      id={props.id}
      textValue={props.label}
      isDisabled={props.isDisabled}
      onLayout={props.laysOut ? layoutProbe(props.id) : undefined}
      onPress={
        props.presses
          ? (e) => {
              probe("press")(e);
              reportEvent("press");
            }
          : undefined
      }
      onPressStart={
        props.presses
          ? (e) => {
              probe("pressStart")(e);
              reportEvent("pressStart");
            }
          : undefined
      }
      onPressUp={
        props.presses
          ? (e) => {
              probe("pressUp")(e);
              reportEvent("pressUp");
            }
          : undefined
      }
      onPressEnd={
        props.presses
          ? (e) => {
              probe("pressEnd")(e);
              reportEvent("pressEnd");
            }
          : undefined
      }
      onPressChange={
        props.presses
          ? (isPressed) => {
              probe("pressChange")(isPressed);
              reportEvent(`pressChange(${isPressed})`);
            }
          : undefined
      }
      onPressDown={
        props.presses
          ? (e) => {
              probe("pressDown")(e);
              reportEvent("pressDown");
            }
          : undefined
      }
    >
      {(values) => [
        <Text>{props.label}</Text>,
        <Text>{values.isFocused() ? "▶" : ""}</Text>,
        <Text>{values.isSelected() ? "✓" : ""}</Text>,
        ...(props.removes ? [<Tag.RemoveButton />] : []),
        ...(props.probed ? [<SeamProbe tag={props.id} />] : []),
      ]}
    </Tag>
  );
}

function PlainRow(props: { id: string; label: string; isDisabled?: boolean }) {
  return (
    <Tag id={props.id} textValue={props.label} isDisabled={props.isDisabled}>
      {props.label}
    </Tag>
  );
}

function MarkedGroup(props: {
  mode?: "none" | "single" | "multiple";
  rows: { id: string; label: string; isDisabled?: boolean; probed?: boolean }[];
  selectedKeys?: SelectionValue;
  defaultSelectedKeys?: SelectionValue;
  disallowEmptySelection?: boolean;
  disabledKeys?: string[];
}) {
  return (
    <TagGroup
      aria-label="Options"
      selectionMode={props.mode ?? "single"}
      selectedKeys={props.selectedKeys}
      defaultSelectedKeys={props.defaultSelectedKeys}
      disallowEmptySelection={props.disallowEmptySelection}
      disabledKeys={props.disabledKeys}
      onSelectionChange={onSelectionChange}
    >
      <TagGroup.List>
        {props.rows.map((row) => (
          <MarkedRow
            id={row.id}
            label={row.label}
            isDisabled={row.isDisabled}
            probed={row.probed}
          />
        ))}
      </TagGroup.List>
    </TagGroup>
  );
}

const ONE_TWO_THREE = [
  { id: "1", label: "One" },
  { id: "2", label: "Two" },
  { id: "3", label: "Three" },
];

/* -------------------------------------------------------------------------------------------------
 * Cases
 * -----------------------------------------------------------------------------------------------*/

function ControlledSelection() {
  const keys = signal<SelectionValue>(new Set(["2"]));

  return <MarkedGroup rows={ONE_TWO_THREE} selectedKeys={keys()} />;
}

function RemoveLog() {
  const size = String(host.params.size ?? "md") as "sm" | "md" | "lg";

  return (
    <TagGroup
      aria-label="Removable animals"
      selectionMode="multiple"
      size={size}
      onRemove={onRemove}
      onSelectionChange={onSelectionChange}
    >
      <TagGroup.List>
        <MarkedRow id="cat" label="Cat" removes />
        <MarkedRow id="dog" label="Dog" removes />
      </TagGroup.List>
    </TagGroup>
  );
}

function RemoveSingle() {
  return (
    <TagGroup aria-label="Categories" selectionMode="single" onRemove={onRemove}>
      <TagGroup.List>
        <Tag id="news" textValue="News">
          News
        </Tag>
      </TagGroup.List>
    </TagGroup>
  );
}

function CustomRemove() {
  return (
    <TagGroup aria-label="Categories" selectionMode="single" onRemove={onRemove}>
      <TagGroup.List>
        <Tag id="news" textValue="News">
          News
          <Tag.RemoveButton>
            <Text>×</Text>
          </Tag.RemoveButton>
        </Tag>
      </TagGroup.List>
    </TagGroup>
  );
}

function LabelDescription() {
  return (
    <TagGroup selectionMode="single">
      <Label>Amenities</Label>
      <TagGroup.List>
        <Tag id="laundry" textValue="Laundry">
          Laundry
        </Tag>
      </TagGroup.List>
      <Description>Some tags are disabled</Description>
    </TagGroup>
  );
}

function EmptyStateCase() {
  return (
    <TagGroup aria-label="Categories" selectionMode="single">
      <TagGroup.List
        items={[] as { id: string; name: string }[]}
        renderEmptyState={() => <Text>No categories found</Text>}
      >
        {(item: { id: string; name: string }) => (
          <Tag id={item.id} textValue={item.name}>
            {item.name}
          </Tag>
        )}
      </TagGroup.List>
    </TagGroup>
  );
}

function Heights() {
  return (
    <View class="flex flex-col gap-4">
      <TagGroup aria-label="Removable animals" selectionMode="none" size="sm" onRemove={onRemove}>
        <TagGroup.List>
          <Tag id="cat" textValue="Cat">
            Cat
          </Tag>
          <Tag id="dog" textValue="Dog" onLayout={layoutProbe("removable")}>
            Dog
          </Tag>
        </TagGroup.List>
      </TagGroup>
      <TagGroup aria-label="Plain animals" selectionMode="none" size="sm">
        <TagGroup.List>
          <Tag id="cat" textValue="Cat">
            Cat
          </Tag>
          <Tag id="dog" textValue="Dog" onLayout={layoutProbe("plain")}>
            Dog
          </Tag>
        </TagGroup.List>
      </TagGroup>
    </View>
  );
}

type MappedItem = { id: string; name: string };

const MAPPED: MappedItem[] = [
  { id: "1", name: "One" },
  { id: "2", name: "Two" },
  { id: "3", name: "Three" },
];

function ItemsMapped() {
  return (
    <TagGroup aria-label="Options" selectionMode="single" onSelectionChange={onSelectionChange}>
      <TagGroup.List items={MAPPED}>
        {(item) => (
          <Tag id={item.id} textValue={item.name}>
            {item.name}
          </Tag>
        )}
      </TagGroup.List>
    </TagGroup>
  );
}

function LiveChildren() {
  const label = signal("One");

  return (
    <View class="flex flex-col gap-4">
      <TagGroup aria-label="Options" selectionMode="single">
        <TagGroup.List>
          <Tag id="one" textValue="One">
            {label()}
          </Tag>
        </TagGroup.List>
      </TagGroup>
      <View
        role="button"
        class="px-3 py-1 bg-default"
        onPress={() => label.set("Updated")}
      >
        <Text>Update</Text>
      </View>
    </View>
  );
}

function PressLog() {
  return (
    <TagGroup aria-label="Options" selectionMode="single">
      <TagGroup.List>
        <MarkedRow id="news" label="News" presses />
        <MarkedRow id="travel" label="Travel" presses />
      </TagGroup.List>
    </TagGroup>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Mobile-layer cases (adapt sheet §4)
 * -----------------------------------------------------------------------------------------------*/

// A probed, selectable row — the seam's target half (M-002, M-004, M-010's
// same press behaviour under both environments). `laysOut` feeds the row's
// bounds to the layout probe so M-004 can compare the two environments.
function FeedbackRow() {
  return (
    <>
      <TagGroup aria-label="Options" selectionMode="single" onSelectionChange={onSelectionChange}>
        <TagGroup.List>
          <MarkedRow id="news" label="News" probed laysOut />
          <MarkedRow id="travel" label="Travel" laysOut />
        </TagGroup.List>
      </TagGroup>
      <SampleButton />
    </>
  );
}

// A static row — selection "none" and no onAction, so the seam's hitSlop
// accessor gate keeps `hitSlop()` undefined even under touch (M-003).
function FeedbackStatic() {
  return (
    <>
      <TagGroup aria-label="Labels" selectionMode="none">
        <TagGroup.List>
          <MarkedRow id="news" label="News" probed />
        </TagGroup.List>
      </TagGroup>
      <SampleButton />
    </>
  );
}

// The probe inside `Tag.RemoveButton`'s children reads the button's own seam
// (A-006) — the children replace the glyph while `probe=1` runs.
function RemoveProbe() {
  return (
    <>
      <TagGroup aria-label="Animals" selectionMode="single" onRemove={onRemove}>
        <TagGroup.List>
          <Tag id="cat" textValue="Cat">
            Cat
            <Tag.RemoveButton>
              {probeOn() ? <CtxProbe tag="remove" /> : <Text>×</Text>}
            </Tag.RemoveButton>
          </Tag>
        </TagGroup.List>
      </TagGroup>
      <SampleButton />
    </>
  );
}

// A-008: the group-level `isDisabled` — every key reports disabled, so a row
// press selects nothing and the remove button's press removes nothing.
function GroupDisabled() {
  return (
    <TagGroup
      testID="tag-group"
      aria-label="Animals"
      selectionMode="single"
      isDisabled
      onRemove={onRemove}
      onSelectionChange={onSelectionChange}
    >
      <TagGroup.List>
        <MarkedRow id="cat" label="Cat" removes probed />
        <MarkedRow id="dog" label="Dog" removes />
      </TagGroup.List>
    </TagGroup>
  );
}

// A-004: the hover marker — `Hovered` only ever shows on a pointer hover;
// under touch the flag never sets (the `hover:` class is gated out too).
function RowHover() {
  return (
    <>
      <TagGroup aria-label="Options" selectionMode="single">
        <TagGroup.List>
          <Tag
            id="news"
            textValue="News"
            onHoverStart={probe("hoverStart")}
            onHoverEnd={probe("hoverEnd")}
          >
            {(values) => [
              <Text>News</Text>,
              <Text>{values.isHovered() ? "Hovered" : "Idle"}</Text>,
            ]}
          </Tag>
        </TagGroup.List>
      </TagGroup>
      <View testID="away" class="size-8 bg-default" />
    </>
  );
}

function CaseBody() {
  const name = String(host.params.case ?? "selection-log");

  if (name === "selection-log") {
    return (
      <MarkedGroup
        rows={[
          { id: "news", label: "News" },
          { id: "travel", label: "Travel" },
        ]}
      />
    );
  }

  if (name === "multiple-log") {
    return (
      <MarkedGroup
        mode="multiple"
        rows={[
          { id: "news", label: "News" },
          { id: "travel", label: "Travel" },
        ]}
      />
    );
  }

  if (name === "typeahead") {
    return <MarkedGroup rows={ONE_TWO_THREE} />;
  }

  if (name === "typeahead-multiple") {
    return <MarkedGroup mode="multiple" rows={ONE_TWO_THREE} />;
  }

  if (name === "typeahead-multiple-default") {
    return (
      <MarkedGroup
        mode="multiple"
        rows={ONE_TWO_THREE}
        defaultSelectedKeys={new Set(["1", "2"])}
      />
    );
  }

  if (name === "typeahead-multiple-controlled") {
    return (
      <MarkedGroup
        mode="multiple"
        rows={ONE_TWO_THREE}
        selectedKeys={new Set(["1", "2"])}
      />
    );
  }

  if (name === "typeahead-disabled") {
    return (
      <MarkedGroup
        rows={[
          { id: "1", label: "One" },
          { id: "2", label: "Two", isDisabled: true },
          { id: "3", label: "Three" },
        ]}
      />
    );
  }

  if (name === "typeahead-disabled-three") {
    return (
      <MarkedGroup
        mode="multiple"
        rows={[
          { id: "1", label: "One" },
          { id: "2", label: "Two" },
          { id: "3", label: "Three", isDisabled: true },
        ]}
        defaultSelectedKeys={new Set(["1", "2"])}
      />
    );
  }

  if (name === "default-selection") {
    return <MarkedGroup rows={ONE_TWO_THREE} defaultSelectedKeys={new Set(["2"])} />;
  }

  if (name === "empty-selection") {
    return (
      <MarkedGroup
        rows={ONE_TWO_THREE}
        defaultSelectedKeys={new Set(["2"])}
        disallowEmptySelection={false}
      />
    );
  }

  if (name === "controlled-selection") {
    return <ControlledSelection />;
  }

  if (name === "disabled-individual") {
    return (
      <MarkedGroup
        rows={[
          { id: "news", label: "News", isDisabled: true },
          { id: "travel", label: "Travel" },
        ]}
      />
    );
  }

  if (name === "disabled-keys") {
    return (
      <MarkedGroup
        rows={[
          // `probed` mounts the seam probe inside the disabled row (M-006):
          // only under `probe=1`, so the existing T-013 surface is unchanged.
          { id: "news", label: "News", probed: true },
          { id: "travel", label: "Travel" },
        ]}
        disabledKeys={["news"]}
      />
    );
  }

  if (name === "remove-log") {
    return <RemoveLog />;
  }

  if (name === "remove-single") {
    return <RemoveSingle />;
  }

  if (name === "remove-marked") {
    return (
      <TagGroup aria-label="Categories" selectionMode="single" onRemove={onRemove}>
        <TagGroup.List>
          <MarkedRow id="news" label="News" removes />
        </TagGroup.List>
      </TagGroup>
    );
  }

  if (name === "custom-remove") {
    return <CustomRemove />;
  }

  if (name === "label-description") {
    return <LabelDescription />;
  }

  if (name === "empty-state") {
    return <EmptyStateCase />;
  }

  if (name === "heights") {
    return <Heights />;
  }

  if (name === "items-mapped") {
    return <ItemsMapped />;
  }

  if (name === "size-lg") {
    return (
      <TagGroup aria-label="Categories" selectionMode="single" size="lg" variant="surface">
        <TagGroup.List>
          <Tag id="news" textValue="News" onLayout={layoutProbe("news")}>
            News
          </Tag>
        </TagGroup.List>
      </TagGroup>
    );
  }

  if (name === "aria-label") {
    return (
      <TagGroup aria-label="Test" selectionMode="single">
        <TagGroup.List>
          <PlainRow id="1" label="One" />
        </TagGroup.List>
      </TagGroup>
    );
  }

  if (name === "row-aria-label") {
    return (
      <TagGroup aria-label="Options" selectionMode="single">
        <TagGroup.List>
          <Tag id="1" textValue="One" aria-label="Custom name">
            One
          </Tag>
        </TagGroup.List>
      </TagGroup>
    );
  }

  if (name === "live-children") {
    return <LiveChildren />;
  }

  if (name === "press-log") {
    return <PressLog />;
  }

  if (name === "feedback-row") {
    return <FeedbackRow />;
  }

  if (name === "feedback-static") {
    return <FeedbackStatic />;
  }

  if (name === "remove-probe") {
    return <RemoveProbe />;
  }

  if (name === "group-disabled") {
    return <GroupDisabled />;
  }

  if (name === "row-hover") {
    return <RowHover />;
  }

  return <MarkedGroup rows={ONE_TWO_THREE} />;
}

// Every case mounts inside `Scoped`, so `scope=touch` works uniformly — the
// injected environment the mobile assertions drive (the default "" is the
// host's own environment, the desktop-parity half).
function Fixture() {
  return (
    <Scoped>
      <CaseBody />
    </Scoped>
  );
}

mount(Fixture);
