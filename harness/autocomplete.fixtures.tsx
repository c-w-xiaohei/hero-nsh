import { host, mount } from "nsh";
import { Autocomplete, Label, ListBox, SearchField } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only Autocomplete fixtures (port sheet 4c, the G-001 geometry case).
 *
 * The shared scenarios cannot carry `onLayout` probes, and G-001 is about
 * measured relations between parts, so this entry renders the G-001 shape and
 * reports each part's box to Storage:
 *   trigger  the field itself, 256pt wide like the reference page's
 *   search   the filter's SearchField
 *   list     the ListBox inside the popover
 *
 * host.params.case picks the fixture:
 *   layout         three options (the reference page's shape)
 *   layout-scroll  forty options, so the list's 320pt cap and its scrolling
 *                  can be measured
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

function layoutProbe(name: "trigger" | "search" | "list") {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

const ANIMALS = [
  { id: "cat", name: "Cat" },
  { id: "dog", name: "Dog" },
  { id: "panda", name: "Panda" },
];

const MANY = Array.from({ length: 40 }, (_, index) => ({
  id: `option-${index}`,
  name: `Animal ${index}`,
}));

/** RAC's default `contains` filter with `sensitivity: "base"`. */
function contains(textValue: string, inputValue: string): boolean {
  return textValue.toLowerCase().includes(inputValue.toLowerCase());
}

function LayoutCase(props: { scrollable: boolean }) {
  const items = props.scrollable ? MANY : ANIMALS;

  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        defaultOpen
        placeholder="Select an animal"
        selectionMode="single"
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger testID="autocomplete-trigger" onLayout={layoutProbe("trigger")}>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField
              autoFocus
              aria-label="Search animals"
              name="search"
              onLayout={layoutProbe("search")}
              testID="autocomplete-search"
              variant="secondary"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox onLayout={layoutProbe("list")} testID="autocomplete-list">
              {items.map((item) => (
                <ListBox.Item id={item.id} textValue={item.name}>
                  {item.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "layout");

  return <LayoutCase scrollable={name === "layout-scroll"} />;
}

mount(Fixture);
