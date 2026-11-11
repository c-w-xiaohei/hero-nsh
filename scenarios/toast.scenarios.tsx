import { Button, Toast, ToastQueue, toast } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared Toast scenarios, written with HeroUI's API only, so the reference app
 * (npm @heroui/react 3.2.7) and this library render the same JSX (port sheet
 * §4b "需要的场景").
 *
 * Toast has no props-driven appearance: what shows is whatever the queue holds,
 * so every scenario seeds a queue and offers a Button that adds to it. The
 * Provider sits before the buttons (DOM order), which keeps the region first in
 * the Tab order for the keyboard cases; the fixtures under harness/ carry the
 * cases that need a specific queue state instead.
 *
 * `default` is the port of toast.browser.test.tsx's fixture (T-034): title
 * "Saved", description "Done", persistent so a screenshot never races the
 * 4000ms countdown. `variants` fires all five variants at once so one shot
 * covers every title/indicator color pair (R-052 … R-058). `placements` keeps
 * six queues so each Provider owns its own stack (the queue is an instance, not
 * a module store). `stack`, `action`, `custom-layout` and `loading` merge the
 * story templates (toast.stories.tsx) named in the port sheet.
 */

function Default() {
  const queue = new ToastQueue();

  return (
    <Stage>
      <Toast.Provider queue={queue} />
      <Button
        onPress={() => {
          queue.add({ description: "Done", title: "Saved" }, { timeout: 0 });
        }}
      >
        Show toast
      </Button>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <Toast.Provider />
      <Button
        onPress={() => {
          toast("Default notice", { description: "General information." });
          toast.info("Accent notice", { description: "Priority information." });
          toast.success("Success notice", { description: "Your changes were saved." });
          toast.warning("Warning notice", { description: "Almost out of space." });
          toast.danger("Danger notice", { description: "Could not reach the server." });
        }}
      >
        Show all variants
      </Button>
    </Stage>
  );
}

/* One queue per placement: a shared queue would stack every toast in one region. */
const bottomQueue = new ToastQueue();
const bottomStartQueue = new ToastQueue();
const bottomEndQueue = new ToastQueue();
const topQueue = new ToastQueue();
const topStartQueue = new ToastQueue();
const topEndQueue = new ToastQueue();

function Placements() {
  return (
    <Stage>
      <Toast.Provider placement="bottom" queue={bottomQueue} />
      <Toast.Provider placement="bottom start" queue={bottomStartQueue} />
      <Toast.Provider placement="bottom end" queue={bottomEndQueue} />
      <Toast.Provider placement="top" queue={topQueue} />
      <Toast.Provider placement="top start" queue={topStartQueue} />
      <Toast.Provider placement="top end" queue={topEndQueue} />
      <Button
        onPress={() => {
          bottomQueue.add({ title: "Bottom" }, { timeout: 0 });
        }}
      >
        bottom
      </Button>
      <Button
        onPress={() => {
          bottomStartQueue.add({ title: "Bottom start" }, { timeout: 0 });
        }}
      >
        bottom start
      </Button>
      <Button
        onPress={() => {
          bottomEndQueue.add({ title: "Bottom end" }, { timeout: 0 });
        }}
      >
        bottom end
      </Button>
      <Button
        onPress={() => {
          topQueue.add({ title: "Top" }, { timeout: 0 });
        }}
      >
        top
      </Button>
      <Button
        onPress={() => {
          topStartQueue.add({ title: "Top start" }, { timeout: 0 });
        }}
      >
        top start
      </Button>
      <Button
        onPress={() => {
          topEndQueue.add({ title: "Top end" }, { timeout: 0 });
        }}
      >
        top end
      </Button>
    </Stage>
  );
}

function Stack() {
  return (
    <Stage>
      <Toast.Provider />
      <Button
        onPress={() => {
          toast("First", { timeout: 0 });
          toast("Second", { timeout: 0 });
          toast("Third", { timeout: 0 });
        }}
      >
        Show three
      </Button>
    </Stage>
  );
}

function Action() {
  return (
    <Stage>
      <Toast.Provider />
      <Button
        onPress={() => {
          toast("Event created", {
            actionProps: { children: "Undo" },
            description:
              "Bob sent you an invitation to join the HeroUI team. This description is long enough to wrap onto a second line.",
            variant: "default",
          });
        }}
      >
        Show with action
      </Button>
    </Stage>
  );
}

function CustomLayout() {
  return (
    <Stage>
      <Toast.Provider>
        {({ toast: item }) => (
          <Toast toast={item}>
            <Toast.Content>
              <Toast.Title>{item.content.title}</Toast.Title>
              <Toast.Description>{item.content.description}</Toast.Description>
            </Toast.Content>
            <Toast.ActionButton onPress={() => {}} variant="tertiary">
              Dismiss
            </Toast.ActionButton>
          </Toast>
        )}
      </Toast.Provider>
      <Button
        onPress={() => {
          toast("Custom layout", { description: "Composed from the parts.", timeout: 0 });
        }}
      >
        Show custom toast
      </Button>
    </Stage>
  );
}

function Loading() {
  return (
    <Stage>
      <Toast.Provider />
      <Button
        onPress={() => {
          const key = toast("Uploading", { isLoading: true, timeout: 0 });

          setTimeout(() => {
            toast.update(key, "Uploaded", { timeout: 0, variant: "success" });
          }, 1000);
        }}
      >
        Show loading toast
      </Button>
    </Stage>
  );
}

export const toastScenarios: Record<string, Component> = {
  "toast/default": Default,
  "toast/variants": Variants,
  "toast/placements": Placements,
  "toast/stack": Stack,
  "toast/action": Action,
  "toast/custom-layout": CustomLayout,
  "toast/loading": Loading,
};
