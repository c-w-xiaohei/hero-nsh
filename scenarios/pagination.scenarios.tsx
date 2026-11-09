import { computed, signal, Text, View } from "nsh";
import { Pagination } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared Pagination scenarios, written with HeroUI's API only.
 *
 * `default` is the tree the unit cases render
 * (pagination.test.tsx:5-32): Previous + PreviousIcon + "Previous", an active
 * Link 1, Link 2, an Ellipsis and Next with "Next" + NextIcon. It serves
 * T-001, T-002, T-005 (screenshot) and T-006.
 * `sizes` mirrors the Sizes story (pagination.stories.tsx:64-100): one root per
 * size, each labelled "<size> pagination", showing a distinct page number
 * (1 / 11 / 21) so the three font sizes can be told apart. T-003 and T-004.
 * `press` and `disabled` are the two upstream interaction trees
 * (pagination.test.tsx:105-118 and 133-143). T-007, T-008.
 * `summary` is the WithSummary case (pagination.test.tsx:154-163). T-009.
 *
 * Screenshot scenarios, per port sheet 4b: `controlled` is the Controlled
 * story (pagination.stories.tsx:230-310) with React state as an NSH signal,
 * the page window copied line by line; `simple-prev-next` is SimplePrevNext
 * (pagination.stories.tsx:150-175); `all-variants` mounts the full tree at all
 * three sizes for the look check (§7).
 *
 * Split scenarios (SOP 3.3.3, port sheet 4b):
 *   pagination/custom-icons.split  upstream draws an `@iconify/react` icon,
 *     which is React-only; this side puts a Text glyph in the same slot. T-010.
 */

function Default() {
  return (
    <Stage>
      <Pagination>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous>
              <Pagination.PreviousIcon />
              <Text>Previous</Text>
            </Pagination.Previous>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link isActive>1</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>2</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Ellipsis />
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Next>
              <Text>Next</Text>
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </Stage>
  );
}

function Sizes() {
  return (
    <Stage>
      <Pagination aria-label="Small pagination" size="sm">
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Link isActive>1</Pagination.Link>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
      <Pagination aria-label="Medium pagination">
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Link isActive>11</Pagination.Link>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
      <Pagination aria-label="Large pagination" size="lg">
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Link isActive>21</Pagination.Link>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </Stage>
  );
}

function Press() {
  return (
    <Stage>
      <Pagination>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous onPress={probe("onPrevious")}>Previous</Pagination.Previous>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link onPress={probe("onSelect")}>2</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Next onPress={probe("onNext")}>Next</Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <Pagination>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous isDisabled onPress={probe("onPress")}>
              Previous
            </Pagination.Previous>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </Stage>
  );
}

/*
 * The `isPending` contract (react-aria-components/src/Button.tsx:89-93,
 * 111-125): press and hover are blocked, the view stays focusable, and the
 * state reaches the render props. `Pending page` takes `autoFocus` so the
 * mount effect proves a pending link can hold focus, and the pending Previous
 * is the Tab stop behind it; `Other page` proves focus and hover still move on
 * and that a plain link reports `isPending` false.
 *
 * It is a `.split` scenario (D17): the render prop receives accessors here and
 * booleans upstream.
 */
function PendingSplit() {
  return (
    <Stage>
      <Pagination aria-label="Pending pagination">
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Link
              isPending
              autoFocus
              aria-label="Pending page"
              onFocus={probe("onFocusAuto")}
              onBlur={probe("onBlurAuto")}
              onPress={probe("onPress")}
              onHoverStart={probe("onHoverStart")}
              onHoverChange={probe("onHoverChange")}
            >
              {({ isHovered, isPending }) => (
                <Text>{`${isPending() ? "Pending" : "Ready"}: ${isHovered() ? "hovered" : "idle"}`}</Text>
              )}
            </Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Previous
              isPending
              aria-label="Pending previous"
              onFocus={probe("onFocusPrev")}
              onBlur={probe("onBlurPrev")}
              onPress={probe("onPressPrevious")}
            >
              Previous
            </Pagination.Previous>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link
              aria-label="Other page"
              onFocus={probe("onFocusOther")}
              onBlur={probe("onBlurOther")}
              onHoverStart={probe("onHoverStartOther")}
            >
              Other
            </Pagination.Link>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </Stage>
  );
}

function Summary() {
  return (
    <Stage>
      <Pagination>
        <Pagination.Summary>1 to 5 of 10 invoices</Pagination.Summary>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Link isActive>1</Pagination.Link>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </Stage>
  );
}

/* The NSH side of the split: a text glyph where upstream draws an icon. */
function CustomIconsSplit() {
  return (
    <Stage>
      <Pagination>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous>
              <Pagination.PreviousIcon>
                <Text>‹</Text>
              </Pagination.PreviousIcon>
              Back
            </Pagination.Previous>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link isActive>1</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>2</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>3</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Next>
              Forward
              <Pagination.NextIcon>
                <Text>›</Text>
              </Pagination.NextIcon>
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </Stage>
  );
}

/*
 * The Controlled story with `page` as a signal; the window algorithm
 * (pagination.stories.tsx:236-262) is copied as it is.
 */
function Controlled() {
  const page = signal(1);
  const totalPages = 12;
  const itemsPerPage = 10;
  const totalItems = 120;

  const pages = computed(() => {
    const list: (number | "start-ellipsis" | "end-ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        list.push(i);
      }
    } else {
      list.push(1);

      if (page() > 3) {
        list.push("start-ellipsis");
      }

      const start = Math.max(2, page() - 1);
      const end = Math.min(totalPages - 1, page() + 1);

      for (let i = start; i <= end; i++) {
        list.push(i);
      }

      if (page() < totalPages - 2) {
        list.push("end-ellipsis");
      }

      list.push(totalPages);
    }

    return list;
  });

  const startItem = computed(() => (page() - 1) * itemsPerPage + 1);
  const endItem = computed(() => Math.min(page() * itemsPerPage, totalItems));

  return (
    <Stage>
      <View class="w-full">
        <Pagination aria-label="Controlled pagination">
          <Pagination.Summary>
            {`Showing ${startItem()}-${endItem()} of ${totalItems} results`}
          </Pagination.Summary>
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous
                isDisabled={page() === 1}
                onPress={() => page.update((value) => value - 1)}
              >
                <Pagination.PreviousIcon />
                Previous
              </Pagination.Previous>
            </Pagination.Item>
            <Each of={pages()} key={(entry) => String(entry)}>
              {(entry) =>
                entry() === "start-ellipsis" || entry() === "end-ellipsis" ? (
                  <Pagination.Item>
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                ) : (
                  <Pagination.Item>
                    <Pagination.Link
                      isActive={entry() === page()}
                      onPress={() => page.set(entry() as number)}
                    >
                      {entry()}
                    </Pagination.Link>
                  </Pagination.Item>
                )
              }
            </Each>
            <Pagination.Item>
              <Pagination.Next
                isDisabled={page() === totalPages}
                onPress={() => page.update((value) => value + 1)}
              >
                Next
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      </View>
    </Stage>
  );
}

/* The SimplePrevNext story (pagination.stories.tsx:150-175). */
function SimplePrevNext() {
  return (
    <Stage>
      <Pagination>
        <Pagination.Summary>1 to 5 of 10 invoices</Pagination.Summary>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous>
              <Pagination.PreviousIcon />
              Prev
            </Pagination.Previous>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Next>
              Next
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </Stage>
  );
}

/* Every part mounted at all three sizes, for the look and unknown-class check. */
function AllVariants() {
  return (
    <Stage>
      <Pagination aria-label="Small pagination" size="sm">
        <Pagination.Summary>1 to 3 of 12 results</Pagination.Summary>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous>
              <Pagination.PreviousIcon />
              Previous
            </Pagination.Previous>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link isActive>1</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>2</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Ellipsis />
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>12</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Next>
              Next
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
      <Pagination aria-label="Medium pagination">
        <Pagination.Summary>4 to 6 of 12 results</Pagination.Summary>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous>
              <Pagination.PreviousIcon />
              Previous
            </Pagination.Previous>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>1</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link isActive>5</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>6</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Ellipsis />
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>12</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Next>
              Next
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
      <Pagination aria-label="Large pagination" size="lg">
        <Pagination.Summary>10 to 12 of 12 results</Pagination.Summary>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous>
              <Pagination.PreviousIcon />
              Previous
            </Pagination.Previous>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>1</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Ellipsis />
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>11</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link isActive>12</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Next>
              Next
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </Stage>
  );
}

export const paginationScenarios = {
  "pagination/default": Default,
  "pagination/sizes": Sizes,
  "pagination/press": Press,
  "pagination/disabled": Disabled,
  "pagination/summary": Summary,
  "pagination/custom-icons.split": CustomIconsSplit,
  "pagination/pending.split": PendingSplit,
  "pagination/controlled": Controlled,
  "pagination/simple-prev-next": SimplePrevNext,
  "pagination/all-variants": AllVariants,
} satisfies Record<string, Component>;
