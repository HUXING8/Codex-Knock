import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyState } from "../src/state.js";
import { reduceServerMessage } from "../src/events.js";

test("records real token usage from app-server payloads", () => {
  const { state } = reduceServerMessage(createEmptyState(), {
    method: "thread/tokenUsage/updated",
    params: {
      threadId: "thread-1",
      turnId: "turn-1",
      tokenUsage: {
        total: {
          totalTokens: 100,
          inputTokens: 70,
          cachedInputTokens: 10,
          outputTokens: 20,
          reasoningOutputTokens: 10,
        },
        last: {
          totalTokens: 30,
          inputTokens: 20,
          cachedInputTokens: 5,
          outputTokens: 5,
          reasoningOutputTokens: 5,
        },
        modelContextWindow: 128000,
      },
    },
  });

  assert.equal(state.threads["thread-1"].tokenUsage.total.totalTokens, 100);
  assert.equal(state.threads["thread-1"].tokenUsage.modelContextWindow, 128000);
});

test("creates completion notification from completed turn", () => {
  let current = createEmptyState();
  current = reduceServerMessage(current, {
    method: "thread/tokenUsage/updated",
    params: {
      threadId: "thread-1",
      turnId: "turn-1",
      tokenUsage: {
        total: { totalTokens: 10, inputTokens: 6, cachedInputTokens: 0, outputTokens: 4, reasoningOutputTokens: 1 },
        last: { totalTokens: 10, inputTokens: 6, cachedInputTokens: 0, outputTokens: 4, reasoningOutputTokens: 1 },
        modelContextWindow: null,
      },
    },
  }).state;

  const result = reduceServerMessage(current, {
    method: "turn/completed",
    params: {
      threadId: "thread-1",
      turn: {
        id: "turn-1",
        status: "completed",
        durationMs: 1500,
      },
    },
  });

  assert.equal(result.notification.type, "completed");
  assert.equal(result.notification.tokenUsage.total.totalTokens, 10);
  assert.equal(result.notification.tokenUsage.modelContextWindow, null);
});

test("sanitizes failed turn errors", () => {
  const result = reduceServerMessage(createEmptyState(), {
    method: "turn/completed",
    params: {
      threadId: "thread-1",
      turn: {
        id: "turn-1",
        status: "failed",
        error: {
          message: "failed with access_token=secret-value",
          codexErrorInfo: "unauthorized",
        },
      },
    },
  });

  assert.equal(result.notification.type, "failed");
  assert.match(result.notification.error.message, /redacted/);
  assert.doesNotMatch(result.notification.error.message, /secret-value/);
});

test("stores sanitized thread preview as topic fallback", () => {
  const { state } = reduceServerMessage(createEmptyState(), {
    method: "thread/started",
    params: {
      thread: {
        id: "thread-1",
        sessionId: "session-1",
        preview: "Investigate access_token=secret-value notification issue",
        cwd: "/repo",
      },
    },
  });

  assert.match(state.threads["thread-1"].preview, /redacted/);
  assert.doesNotMatch(state.threads["thread-1"].preview, /secret-value/);
});

test("captures thread/name/updated as topic", () => {
  let current = createEmptyState();
  current = reduceServerMessage(current, {
    method: "thread/started",
    params: {
      thread: {
        id: "thread-1",
        sessionId: "session-1",
        cwd: "/repo",
        preview: "",
      },
    },
  }).state;

  current = reduceServerMessage(current, {
    method: "thread/name/updated",
    params: {
      threadId: "thread-1",
      threadName: "Fix payment tests",
    },
  }).state;

  const result = reduceServerMessage(current, {
    method: "turn/completed",
    params: {
      threadId: "thread-1",
      turn: { id: "turn-1", status: "completed", durationMs: 1000 },
    },
  });

  assert.equal(result.state.threads["thread-1"].name, "Fix payment tests");
  assert.equal(result.notification.thread.name, "Fix payment tests");
});

test("captures first user message item as topic fallback", () => {
  let current = createEmptyState();
  current = reduceServerMessage(current, {
    method: "thread/started",
    params: {
      thread: {
        id: "thread-1",
        sessionId: "session-1",
        cwd: "/repo",
        preview: "",
      },
    },
  }).state;

  current = reduceServerMessage(current, {
    method: "item/completed",
    params: {
      threadId: "thread-1",
      turnId: "turn-1",
      item: {
        id: "item-1",
        type: "userMessage",
        content: [{ type: "text", text: "查看codex_knock，我这里有两个工程" }],
      },
    },
  }).state;

  assert.equal(current.threads["thread-1"].name, "查看codex_knock，我这里有两个工程");
  assert.equal(current.threads["thread-1"].preview, "查看codex_knock，我这里有两个工程");
});
