import fs from "node:fs";
import path from "node:path";
import { statePath } from "./paths.js";

export function createEmptyState() {
  return {
    version: 1,
    updatedAt: null,
    threads: {},
    recentEvents: [],
  };
}

export function loadState(file = statePath()) {
  if (!fs.existsSync(file)) {
    return createEmptyState();
  }

  const raw = fs.readFileSync(file, "utf8");
  if (!raw.trim()) {
    return createEmptyState();
  }

  return normalizeState(JSON.parse(raw));
}

export function saveState(state, file = statePath()) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const normalized = normalizeState(state);
  fs.writeFileSync(file, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export function normalizeState(state) {
  return {
    version: 1,
    updatedAt: state?.updatedAt || null,
    threads: state?.threads || {},
    recentEvents: Array.isArray(state?.recentEvents) ? state.recentEvents.slice(-20) : [],
  };
}

export class StateStore {
  constructor(file = statePath()) {
    this.file = file;
    this.state = loadState(file);
  }

  get() {
    return this.state;
  }

  update(mutator) {
    const next = mutator(this.state) || this.state;
    next.updatedAt = new Date().toISOString();
    this.state = saveState(next, this.file);
    return this.state;
  }
}
