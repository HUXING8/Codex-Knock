import { sanitizeError } from "./sanitize.js";
import { extractUserMessageText, topicFromText } from "./topic.js";

export function reduceServerMessage(state, message, now = new Date()) {
  if (!message || typeof message !== "object" || !message.method) {
    return { state, notification: null };
  }

  const timestamp = now.toISOString();
  const next = {
    ...state,
    threads: { ...(state.threads || {}) },
    recentEvents: [...(state.recentEvents || [])],
  };

  const method = message.method;
  const params = message.params || {};
  const event = { method, at: timestamp };
  let notification = null;

  if (method === "thread/started" && params.thread?.id) {
    const thread = normalizeThread(params.thread);
    next.threads[thread.id] = {
      ...next.threads[thread.id],
      ...thread,
      updatedAt: timestamp,
    };
    event.threadId = thread.id;
  } else if (method === "thread/name/updated" && params.threadId) {
    const thread = ensureThread(next, params.threadId);
    const name = topicFromText(params.threadName || params.name || "");
    if (name) {
      thread.name = name;
      if (!thread.preview) {
        thread.preview = name;
      }
    }
    thread.updatedAt = timestamp;
    event.threadId = params.threadId;
    event.name = name || null;
  } else if (method === "thread/status/changed" && params.threadId) {
    const thread = ensureThread(next, params.threadId);
    thread.status = normalizeStatus(params.status);
    thread.updatedAt = timestamp;
    event.threadId = params.threadId;
    event.status = thread.status;
  } else if (method === "turn/started" && params.threadId && params.turn?.id) {
    const thread = ensureThread(next, params.threadId);
    thread.currentTurn = {
      id: params.turn.id,
      status: "inProgress",
      startedAt: params.turn.startedAt || Math.floor(now.getTime() / 1000),
      completedAt: null,
      durationMs: null,
      error: null,
    };
    thread.updatedAt = timestamp;
    event.threadId = params.threadId;
    event.turnId = params.turn.id;
  } else if (method === "turn/completed" && params.threadId && params.turn?.id) {
    const thread = ensureThread(next, params.threadId);
    const turn = normalizeTurn(params.turn);
    thread.currentTurn = turn;
    thread.lastTurn = turn;
    thread.updatedAt = timestamp;
    event.threadId = params.threadId;
    event.turnId = turn.id;
    event.status = turn.status;

    notification = notificationForTurn(thread, turn);
  } else if (method === "error" && params.threadId) {
    const thread = ensureThread(next, params.threadId);
    const sanitized = sanitizeError(params.error);
    thread.lastError = sanitized;
    thread.updatedAt = timestamp;
    event.threadId = params.threadId;
    event.turnId = params.turnId;
    event.status = "error";
    notification = {
      type: "error",
      threadId: params.threadId,
      turnId: params.turnId || null,
      title: "Codex reported an error",
      status: "error",
      error: sanitized,
      thread,
      tokenUsage: thread.tokenUsage || null,
    };
  } else if (method === "thread/tokenUsage/updated" && params.threadId) {
    const thread = ensureThread(next, params.threadId);
    thread.tokenUsage = normalizeTokenUsage(params.tokenUsage);
    thread.updatedAt = timestamp;
    event.threadId = params.threadId;
    event.turnId = params.turnId;
  } else if ((method === "item/started" || method === "item/completed") && params.threadId) {
    const thread = ensureThread(next, params.threadId);
    const text = extractUserMessageText(params.item);
    if (text) {
      const topic = topicFromText(text);
      if (topic) {
        thread.firstUserMessage = thread.firstUserMessage || topic;
        if (!thread.preview) {
          thread.preview = topic;
        }
        if (!thread.name) {
          // Codex resume titles usually start as the first user message.
          thread.name = topic;
        }
      }
    }
    thread.updatedAt = timestamp;
    event.threadId = params.threadId;
    event.turnId = params.turnId;
    event.itemType = params.item?.type || null;
  }

  next.recentEvents = [...next.recentEvents, event].slice(-20);
  next.updatedAt = timestamp;

  return { state: next, notification };
}

function ensureThread(state, threadId) {
  if (!state.threads[threadId]) {
    state.threads[threadId] = { id: threadId };
  }
  return state.threads[threadId];
}

function normalizeThread(thread) {
  const preview = topicFromText(thread.preview || "");
  const name = topicFromText(thread.name || thread.title || "");
  return {
    id: thread.id,
    sessionId: thread.sessionId || null,
    cwd: thread.cwd || null,
    name: name || null,
    preview,
    firstUserMessage: topicFromText(thread.firstUserMessage || "") || null,
    source: thread.source || null,
    status: normalizeStatus(thread.status),
    createdAt: thread.createdAt || null,
    codexUpdatedAt: thread.updatedAt || null,
  };
}

function normalizeStatus(status) {
  if (!status) {
    return "unknown";
  }
  if (typeof status === "string") {
    return status;
  }
  if (typeof status.type === "string") {
    return status.type;
  }
  return "unknown";
}

function normalizeTurn(turn) {
  return {
    id: turn.id,
    status: turn.status || "unknown",
    startedAt: turn.startedAt || null,
    completedAt: turn.completedAt || null,
    durationMs: turn.durationMs || null,
    error: sanitizeError(turn.error),
  };
}

function normalizeTokenUsage(tokenUsage) {
  if (!tokenUsage) {
    return null;
  }

  return {
    total: normalizeBreakdown(tokenUsage.total),
    last: normalizeBreakdown(tokenUsage.last),
    modelContextWindow: tokenUsage.modelContextWindow ?? null,
  };
}

function normalizeBreakdown(breakdown) {
  if (!breakdown) {
    return null;
  }

  return {
    totalTokens: breakdown.totalTokens ?? null,
    inputTokens: breakdown.inputTokens ?? null,
    cachedInputTokens: breakdown.cachedInputTokens ?? null,
    outputTokens: breakdown.outputTokens ?? null,
    reasoningOutputTokens: breakdown.reasoningOutputTokens ?? null,
  };
}

function notificationForTurn(thread, turn) {
  if (turn.status === "completed") {
    return {
      type: "completed",
      title: "Codex turn completed",
      status: turn.status,
      threadId: thread.id,
      turnId: turn.id,
      thread,
      turn,
      tokenUsage: thread.tokenUsage || null,
    };
  }

  if (turn.status === "failed") {
    return {
      type: "failed",
      title: "Codex turn failed",
      status: turn.status,
      threadId: thread.id,
      turnId: turn.id,
      thread,
      turn,
      error: turn.error,
      tokenUsage: thread.tokenUsage || null,
    };
  }

  if (turn.status === "interrupted") {
    return {
      type: "interrupted",
      title: "Codex turn interrupted",
      status: turn.status,
      threadId: thread.id,
      turnId: turn.id,
      thread,
      turn,
      tokenUsage: thread.tokenUsage || null,
    };
  }

  return null;
}

// Keep sanitizeText import used for compatibility with older tests/tools.
