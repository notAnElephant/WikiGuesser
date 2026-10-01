import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";

import { isOpaqueCrossOriginException } from "@/src/lib/error-tracking";

function exceptionEvent(
  exceptions: unknown[],
): CaptureResult {
  return {
    uuid: "test",
    event: "$exception",
    properties: { $exception_list: exceptions },
  };
}

describe("isOpaqueCrossOriginException", () => {
  it("matches a lone frameless Script error", () => {
    expect(
      isOpaqueCrossOriginException(
        exceptionEvent([{ value: "Script error.", stacktrace: { frames: [] } }]),
      ),
    ).toBe(true);
  });

  it("matches a Script error without a stacktrace", () => {
    expect(
      isOpaqueCrossOriginException(exceptionEvent([{ value: "Script error" }])),
    ).toBe(true);
  });

  it("keeps a Script error that carries stack frames", () => {
    expect(
      isOpaqueCrossOriginException(
        exceptionEvent([
          { value: "Script error.", stacktrace: { frames: [{}] } },
        ]),
      ),
    ).toBe(false);
  });

  it("keeps an exception with a real message", () => {
    expect(
      isOpaqueCrossOriginException(
        exceptionEvent([{ value: "TypeError: x is not a function" }]),
      ),
    ).toBe(false);
  });

  it("keeps events that are not exceptions", () => {
    expect(
      isOpaqueCrossOriginException({
        uuid: "test",
        event: "$pageview",
        properties: {},
      }),
    ).toBe(false);
  });

  it("keeps a null event", () => {
    expect(isOpaqueCrossOriginException(null)).toBe(false);
  });
});
