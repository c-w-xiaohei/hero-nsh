import { host, mount, Text, View } from "nsh";
import type { Component, JSX } from "nsh";
import { EnvironmentScope, Tag, TagGroup, TagGroupItem } from "@heroui/react";
import type { SelectionValue } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the e-parts TagGroup mechanism unit — the `TagGroupItem`
 * compound and its convenience parts (adapt-sheets/e-parts.md §2 A-013…A-015,
 * §4 M-027…M-032).
 *
 * `host.params.case` picks the shape:
 *
 *   parts    A `TagGroup` (single selection, `onSelectionChange`/`onRemove`
 *            probes) with two `TagGroupItem`s. Each item carries the parts:
 *            `.Background` (layout reported through `layout` — M-029's
 *            bounds match), `.Label`, a `✓` marker read from the Tag render
 *            props (the tag.fixtures.tsx convention: `✓` stands in for the
 *            unobservable `aria-selected`), and `.RemoveButton` with the
 *            default self-drawn cross (`iconProps.size`/`onLayout` — M-030).
 *            Params: `size` ("sm"|"md"|"lg"), `iconsize` (iconProps.size of
 *            the first item's remove glyph).
 *   plain    The same group shape built from the plain `Tag` path, the
 *            M-032 "原路径同时可用" half — `Tag`/`TagGroup` import and mount
 *            unchanged alongside `TagGroupItem`.
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper ("" = host
 * default, "touch" = `input="touch"`), same convention as
 * `pressable.fixtures.tsx`. It sits next to harness/nsh.json on purpose:
 * NSH takes the entry's own directory as the app root, so an entry under
 * harness/tests/... finds no nsh.json and loses the `@heroui/react` alias
 * and the theme.
 */

type Scope = "" | "touch";

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  return scope === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

function Frame(props: { children?: JSX.Element }) {
  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      {props.children}
    </View>
  );
}

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
 * parts case (M-027 … M-031)
 * -----------------------------------------------------------------------------------------------*/

function PartsCase() {
  const size = String(host.params.size ?? "md") as "sm" | "md" | "lg";
  const iconSize = Number(host.params.iconsize ?? "12");

  return (
    <TagGroup
      aria-label="Categories"
      selectionMode="single"
      size={size}
      onSelectionChange={onSelectionChange}
      onRemove={onRemove}
    >
      <TagGroup.List>
        <TagGroupItem id="news" textValue="News" onLayout={layoutProbe("tag-news")}>
          {(values) => [
            <TagGroupItem.Background
              testID="bg-news"
              onLayout={layoutProbe("bg-news")}
            />,
            <TagGroupItem.Label testID="label-news">News</TagGroupItem.Label>,
            <Text>{values.isSelected() ? "✓" : ""}</Text>,
            <TagGroupItem.RemoveButton
              iconProps={{
                size: iconSize,
                onLayout: layoutProbe("glyph-news"),
              }}
            />,
          ]}
        </TagGroupItem>
        <TagGroupItem id="travel" textValue="Travel" onLayout={layoutProbe("tag-travel")}>
          {(values) => [
            <TagGroupItem.Background testID="bg-travel" />,
            <TagGroupItem.Label>Travel</TagGroupItem.Label>,
            <Text>{values.isSelected() ? "✓" : ""}</Text>,
            <TagGroupItem.RemoveButton />,
          ]}
        </TagGroupItem>
      </TagGroup.List>
    </TagGroup>
  );
}

/* -------------------------------------------------------------------------------------------------
 * plain case (M-032's second half): the original path alongside the compound
 * -----------------------------------------------------------------------------------------------*/

function PlainCase() {
  return (
    <TagGroup
      aria-label="Plain"
      selectionMode="single"
      onSelectionChange={onSelectionChange}
      onRemove={onRemove}
    >
      <TagGroup.List>
        <Tag id="one" textValue="One">
          {(values) => [
            <Text>One</Text>,
            <Text>{values.isSelected() ? "✓" : ""}</Text>,
            <Tag.RemoveButton />,
          ]}
        </Tag>
        <TagGroupItem id="two" textValue="Two">
          {(values) => [
            <TagGroupItem.Label>Two</TagGroupItem.Label>,
            <Text>{values.isSelected() ? "✓" : ""}</Text>,
          ]}
        </TagGroupItem>
      </TagGroup.List>
    </TagGroup>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  parts: PartsCase,
  plain: PlainCase,
};

function Fixture() {
  const name = String(host.params.case ?? "parts");
  const Case = cases[name] ?? PartsCase;

  return (
    <Frame>
      <Scoped>
        <Case />
      </Scoped>
    </Frame>
  );
}

mount(Fixture);
