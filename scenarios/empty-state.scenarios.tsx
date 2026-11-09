import { EmptyState } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared EmptyState scenarios. They use only the HeroUI API so the reference
 * app (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * Upstream has no stories of its own: real usage lives in Table, Autocomplete,
 * ComboBox, Sheet and TagGroup, which belong to their own units. EmptyState is
 * a single-part container, so these scenarios only prove the container: the
 * default text when no children are given, a bare string child, and the
 * caller's className appended after the base classes.
 */

function Basic() {
  return (
    <Stage>
      <EmptyState />
    </Stage>
  );
}

function Custom() {
  return (
    <Stage>
      <EmptyState>No matches for your search</EmptyState>
    </Stage>
  );
}

function Override() {
  return (
    <Stage>
      <EmptyState className="p-4 text-foreground">No results found</EmptyState>
    </Stage>
  );
}

export const emptyStateScenarios: Record<string, Component> = {
  "empty-state/basic": Basic,
  "empty-state/custom": Custom,
  "empty-state/override": Override,
};
