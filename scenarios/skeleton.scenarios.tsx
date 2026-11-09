import { Skeleton } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * Shared Skeleton scenarios. They use only the HeroUI API (plus the NSH
 * `testID` anchor the port sheet allows) so the reference app (npm
 * @heroui/react 3.2.7) and this library render the same JSX.
 *
 * The internal shimmer overlay always carries testID="skeleton-shimmer"; the
 * tests use it to observe that the shimmer branch mounts a real child view.
 * Story `SingleShimmer` is not here: it relies on the `:has(.skeleton)` block
 * (R-011 ... R-017), which the port deletes because it has no public API.
 */

function Default() {
  return (
    <Stage>
      <Skeleton testID="skeleton" className="h-24 w-[200px]" />
    </Stage>
  );
}

function Pulse() {
  return (
    <Stage>
      <Skeleton animationType="pulse" testID="skeleton" className="h-24 w-[200px]" />
    </Stage>
  );
}

function AnimationTypes() {
  return (
    <Stage>
      <Skeleton testID="skeleton-default" className="h-24 w-[200px]" />
      <Skeleton animationType="pulse" testID="skeleton-pulse" className="h-24 w-[200px]" />
      <Skeleton animationType="none" testID="skeleton-none" className="h-24 w-[200px]" />
    </Stage>
  );
}

/* X-001: the DOM accessibility aliases HeroUI forwards must reach the root
 * View (`aria-label` -> accessibilityLabel, `aria-*` state -> accessibilityState)
 * and the other div props the port sheet accepts must compile as no-ops.
 * Each state skeleton hides itself through the matching state class, so the
 * test can tell a mapped state (hidden) from a dropped one (still shown). */
function AccessibilityAliases() {
  return (
    <Stage>
      <Skeleton
        testID="skeleton-label"
        aria-label="Loading profile"
        title="Loading"
        tabIndex={-1}
        onClick={() => {}}
        className="h-24 w-[200px]"
      />
      <Skeleton
        testID="skeleton-checked"
        aria-checked
        className="h-24 w-[200px] checked:hidden"
      />
      <Skeleton
        testID="skeleton-expanded"
        aria-expanded
        className="h-24 w-[200px] aria-expanded:hidden"
      />
      <Skeleton
        testID="skeleton-pressed"
        aria-pressed
        className="h-24 w-[200px] aria-pressed:hidden"
      />
      <Skeleton
        testID="skeleton-selected"
        aria-selected
        className="h-24 w-[200px] selected:hidden"
      />
    </Stage>
  );
}

/* Story `Grid`: three columns of h-24 skeletons. Stage is the flex container,
 * so three fixed-width skeletons sit side by side where the story used a grid. */
function Grid() {
  return (
    <Stage>
      <Skeleton className="h-24 w-[150px] rounded-xl" />
      <Skeleton className="h-24 w-[150px] rounded-xl" />
      <Skeleton className="h-24 w-[150px] rounded-xl" />
    </Stage>
  );
}

export const skeletonScenarios = {
  "skeleton/default": Default,
  "skeleton/pulse": Pulse,
  "skeleton/animation-types": AnimationTypes,
  "skeleton/accessibility-aliases": AccessibilityAliases,
  "skeleton/grid": Grid,
};
