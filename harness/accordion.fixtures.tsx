import { host, mount, Text, View } from "nsh";
import { Accordion } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Accordion unit (port sheet 4b).
 *
 * A shared scenario cannot carry the probes or the external state the cases
 * need, so every case below is selected with `host.params.case`:
 *
 *   default                 the HeroUI unit fixture: three FAQ items, the third
 *                           disabled; single expansion, group and item
 *                           expansion probes, focus probes (T-003, T-004,
 *                           T-005, T-006, T-007, T-008)
 *   multiple                the same with allowsMultipleExpanded (T-006)
 *   kobalte-plain           the Kobalte fixture: three items one / two / three,
 *                           nothing expanded, plus a focus station after the
 *                           accordion (T-022, T-023, T-025)
 *   kobalte-default         the same with defaultExpandedKeys={["one"]}
 *                           (T-016, T-017, T-026, T-027)
 *   kobalte-multiple        the same with allowsMultipleExpanded (T-028, T-031)
 *   kobalte-multiple-default
 *                           multiple, defaultExpandedKeys={["one"]} (T-029, T-030)
 *   kobalte-controlled      expandedKeys={["one"]} held from outside: the root
 *                           renders what the prop says and the press only
 *                           reports (T-018)
 *
 * The expansion callbacks are recorded because `nsh/test` cannot read aria
 * attributes: the group probe flattens the `Set` into an array (`JSON.stringify`
 * would turn a `Set` into `{}`), the item probe records the boolean. The focus
 * probes stand in for `document.activeElement`, which has no query. The `after`
 * station of `kobalte-plain` gives Tab somewhere to go once focus leaves the
 * last trigger, so the "focus is no longer on an item" step of T-022 is
 * observable instead of being an absent event.
 *
 * Everything here uses HeroUI's API; the extra station is a plain pressable
 * view, not part of the component.
 */

/* -------------------------------------------------------------------------------------------------
 * HeroUI unit fixture
 * -----------------------------------------------------------------------------------------------*/

function HeroItems() {
  return (
    <>
      <Accordion.Item id="faq-1" onExpandedChange={(isExpanded) => probe("itemExpanded")(isExpanded)}>
        <Accordion.Heading>
          <Accordion.Trigger onFocus={() => probe("focus")("faq-1")}>
            How do I place an order?
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>Browse our products and proceed to checkout.</Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item id="faq-2" onExpandedChange={(isExpanded) => probe("itemExpanded")(isExpanded)}>
        <Accordion.Heading>
          <Accordion.Trigger onFocus={() => probe("focus")("faq-2")}>
            Can I modify my order?
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>Yes, before it ships.</Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item
        id="faq-3"
        isDisabled
        onExpandedChange={(isExpanded) => probe("itemExpanded")(isExpanded)}
      >
        <Accordion.Heading>
          <Accordion.Trigger onFocus={() => probe("focus")("faq-3")}>
            Disabled question
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>Never shown.</Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </>
  );
}

function HeroFaq(props: { multiple?: boolean }) {
  return (
    <View class="w-96">
      <Accordion
        allowsMultipleExpanded={props.multiple}
        onExpandedChange={(keys) => probe("expandedChange")(Array.from(keys))}
      >
        <HeroItems />
      </Accordion>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Kobalte fixtures
 * -----------------------------------------------------------------------------------------------*/

function KobalteItems() {
  return (
    <>
      {["one", "two", "three"].map((value) => (
        <Accordion.Item
          id={value}
          onExpandedChange={(isExpanded) => probe("itemExpanded")(isExpanded)}
        >
          <Accordion.Heading>
            <Accordion.Trigger onFocus={() => probe("focus")(value)}>
              {`Trigger ${value}`}
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body>{`Content ${value}`}</Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </>
  );
}

function KobalteAccordion(props: {
  multiple?: boolean;
  defaultExpandedKeys?: string[];
  expandedKeys?: string[];
  after?: boolean;
}) {
  return (
    <View class="w-80">
      <Accordion
        allowsMultipleExpanded={props.multiple}
        defaultExpandedKeys={props.defaultExpandedKeys}
        expandedKeys={props.expandedKeys}
        onExpandedChange={(keys) => probe("expandedChange")(Array.from(keys))}
      >
        <KobalteItems />
      </Accordion>
      {props.after ? (
        <View role="button" testID="after" onPress={() => undefined}>
          <Text>After</Text>
        </View>
      ) : null}
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "default");

  if (name === "multiple") {
    return <HeroFaq multiple />;
  }

  if (name === "kobalte-default") {
    return <KobalteAccordion defaultExpandedKeys={["one"]} />;
  }

  if (name === "kobalte-multiple") {
    return <KobalteAccordion multiple />;
  }

  if (name === "kobalte-multiple-default") {
    return <KobalteAccordion multiple defaultExpandedKeys={["one"]} />;
  }

  if (name === "kobalte-controlled") {
    return <KobalteAccordion expandedKeys={["one"]} />;
  }

  if (name === "kobalte-plain") {
    return <KobalteAccordion after />;
  }

  return <HeroFaq />;
}

mount(Fixture);
