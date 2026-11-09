import { ErrorMessage } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * Shared ErrorMessage scenarios (port sheet 4b). They use only the HeroUI API
 * so the reference app (npm @heroui/react 3.2.7) and this library render the
 * same JSX.
 *
 * Upstream always renders ErrorMessage inside a field or collection container
 * (TagGroup, Select, ComboBox), and every one of those belongs to another unit.
 * ErrorMessage itself renders unconditionally, so the standalone cases below
 * carry the component's own appearance. `custom` appends className to check the
 * later writer wins, and `long-token` keeps the missing overflow-wrap
 * difference (R-003) visible for the screenshot comparison.
 */

function Basic() {
  return (
    <Stage>
      <ErrorMessage>Something went wrong</ErrorMessage>
    </Stage>
  );
}

function Custom() {
  return (
    <Stage>
      <ErrorMessage className="font-semibold text-sm">Something went wrong</ErrorMessage>
    </Stage>
  );
}

function LongToken() {
  return (
    <Stage>
      <ErrorMessage>
        https://example.com/docs/reference/components/error-message#overflow-wrap-behavior
      </ErrorMessage>
      <ErrorMessage>
        /home/c_w_xiaohei/coding/project/heroui-nsh/tmp/heroui-nsh-port-research.md
      </ErrorMessage>
    </Stage>
  );
}

export const errorMessageScenarios = {
  "error-message/basic": Basic,
  "error-message/custom": Custom,
  "error-message/long-token": LongToken,
};
