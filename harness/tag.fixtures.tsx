import { host, mount, signal, Text, View } from "nsh";
import { Description, Label, Tag, TagGroup } from "@heroui/react";
import type { SelectionValue } from "@heroui/react";
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
 *                              routed to probes (X-002)
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
 * Rows
 * -----------------------------------------------------------------------------------------------*/

function MarkedRow(props: {
  id: string;
  label: string;
  isDisabled?: boolean;
  removes?: boolean;
  presses?: boolean;
}) {
  return (
    <Tag
      id={props.id}
      textValue={props.label}
      isDisabled={props.isDisabled}
      onPress={props.presses ? probe("press") : undefined}
      onPressStart={props.presses ? probe("pressStart") : undefined}
      onPressUp={props.presses ? probe("pressUp") : undefined}
      onPressEnd={props.presses ? probe("pressEnd") : undefined}
      onPressChange={props.presses ? probe("pressChange") : undefined}
    >
      {(values) => [
        <Text>{props.label}</Text>,
        <Text>{values.isFocused() ? "▶" : ""}</Text>,
        <Text>{values.isSelected() ? "✓" : ""}</Text>,
        ...(props.removes ? [<Tag.RemoveButton />] : []),
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
  rows: { id: string; label: string; isDisabled?: boolean }[];
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
          <MarkedRow id={row.id} label={row.label} isDisabled={row.isDisabled} />
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

function Fixture() {
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
          { id: "news", label: "News" },
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
          <Tag id="news" textValue="News">
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

  return <MarkedGroup rows={ONE_TWO_THREE} />;
}

mount(Fixture);
