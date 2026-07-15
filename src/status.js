export function formatStatus(state) {
  const threads = Object.values(state.threads || {}).sort((a, b) => {
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });

  if (threads.length === 0) {
    return "No Codex Knock state recorded yet.";
  }

  const lines = [`Codex Knock status (${threads.length} thread${threads.length === 1 ? "" : "s"})`];

  for (const thread of threads.slice(0, 5)) {
    lines.push("");
    lines.push(`Thread: ${thread.id}`);
    lines.push(`Status: ${thread.status || "unknown"}`);
    if (thread.cwd) {
      lines.push(`Project: ${thread.cwd}`);
    }

    const turn = thread.lastTurn || thread.currentTurn;
    if (turn) {
      lines.push(`Turn: ${turn.id} (${turn.status || "unknown"})`);
      if (Number.isFinite(turn.durationMs)) {
        lines.push(`Duration: ${turn.durationMs}ms`);
      }
    }

    const total = thread.tokenUsage?.total;
    if (total) {
      lines.push(
        `Tokens: total=${display(total.totalTokens)}, input=${display(total.inputTokens)}, output=${display(total.outputTokens)}, reasoning=${display(total.reasoningOutputTokens)}`,
      );
    } else {
      lines.push("Tokens: unavailable");
    }

    lines.push(`Context window: ${display(thread.tokenUsage?.modelContextWindow)}`);

    if (thread.lastError?.message) {
      lines.push(`Last error: ${thread.lastError.message}`);
    }
  }

  return lines.join("\n");
}

function display(value) {
  return value === null || value === undefined ? "unavailable" : String(value);
}
