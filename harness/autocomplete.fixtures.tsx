import { host, mount } from "nsh";
import type { ViewRef } from "nsh";
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
 *   popover  the overlay's own box
 *   search   the filter's SearchField
 *   list     the ListBox inside the popover
 *
 * Two coordinate spaces meet here and the boxes keep them apart, because NSH
 * reports them differently:
 *   trigger / popover  page space, through `measure()` (`pagePosition` is a
 *                      view's corner in the root view it is in), so their
 *                      relation — same x and width, popover below the field —
 *                      is measurable. `onLayout` alone cannot do it: inside
 *                      the overlay the probe would be in the overlay's space.
 *   search / list      their `onLayout` boxes, which inside a `Scroll` are the
 *                      scroll content's own coordinates. Fine for their widths
 *                      and for which one is above the other; not comparable
 *                      with the page-space boxes.
 *
 * host.params.case picks the fixture:
 *   layout         three options (the reference page's shape)
 *   layout-scroll  forty options, so the popover's growth and its cap by the
 *                  room the overlay has can be measured (port sheet §6.3: the
 *                  list cannot hold upstream's own 320pt scroll)
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

function report(
  name: "trigger" | "popover" | "search" | "list",
  x: number,
  y: number,
  width: number,
  height: number,
) {
  probe("layout")({ name, x, y, width, height });
}

/**
 * A view's box in the root view it is in, once the frame settles: `measure()`
 * answers "where the view is once this turn's changes are laid out", and the
 * overlay is placed a frame after it mounts.
 */
function measurePage(name: "trigger" | "popover", node: ViewRef | undefined) {
  if (!node) return;

  requestAnimationFrame(() => {
    void node.measure().then((measured) => {
      if (!measured) return;

      report(
        name,
        measured.pagePosition.x,
        measured.pagePosition.y,
        measured.bounds.size.width,
        measured.bounds.size.height,
      );
    });
  });
}

function layoutProbe(name: "search" | "list") {
  return (event: LayoutEvent) =>
    report(
      name,
      event.bounds.origin.x,
      event.bounds.origin.y,
      event.bounds.size.width,
      event.bounds.size.height,
    );
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

  let popoverNode: ViewRef | undefined;

  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        defaultOpen
        placeholder="Select an animal"
        selectionMode="single"
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger
          ref={(node) => measurePage("trigger", node)}
          testID="autocomplete-trigger"
        >
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover
          // The popover's `onLayout` reaches the `Scroll` viewport it owns, so
          // every settled content size re-measures the overlay's placed box.
          onLayout={() => measurePage("popover", popoverNode)}
          ref={(node) => {
            popoverNode = node;
            measurePage("popover", node);
          }}
        >
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
