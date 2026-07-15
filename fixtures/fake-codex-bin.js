#!/usr/bin/env node
import readline from "node:readline";

if (process.argv[2] !== "app-server" || process.argv[3] !== "--stdio") {
  console.error("fake-codex only supports app-server --stdio");
  process.exit(2);
}

const rl = readline.createInterface({ input: process.stdin });

rl.on("line", (line) => {
  const message = JSON.parse(line);

  if (message.method === "initialize") {
    process.stdout.write(`${JSON.stringify({ id: message.id, result: { userAgent: "fake-codex" } })}\n`);
    return;
  }

  if (message.method === "turn/start") {
    process.stdout.write(
      `${JSON.stringify({
        method: "thread/tokenUsage/updated",
        params: {
          threadId: message.params.threadId,
          turnId: "turn-1",
          tokenUsage: {
            total: {
              totalTokens: 25,
              inputTokens: 15,
              cachedInputTokens: 0,
              outputTokens: 10,
              reasoningOutputTokens: 2,
            },
            last: {
              totalTokens: 25,
              inputTokens: 15,
              cachedInputTokens: 0,
              outputTokens: 10,
              reasoningOutputTokens: 2,
            },
            modelContextWindow: 128000,
          },
        },
      })}\n`,
    );
    process.stdout.write(
      `${JSON.stringify({
        method: "turn/completed",
        params: {
          threadId: message.params.threadId,
          turn: {
            id: "turn-1",
            status: "completed",
            durationMs: 12,
          },
        },
      })}\n`,
    );
  }
});
