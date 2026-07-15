import test from "node:test";
import assert from "node:assert/strict";
import { formatStatus } from "../src/status.js";

test("prints unavailable for missing token and context values", () => {
  const text = formatStatus({
    threads: {
      "thread-1": {
        id: "thread-1",
        status: "idle",
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    },
  });

  assert.match(text, /Tokens: unavailable/);
  assert.match(text, /Context window: unavailable/);
});
