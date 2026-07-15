const REMOTE_CAPABLE = new Set(["resume", "fork", "archive", "delete", "unarchive"]);
const PASS_THROUGH = new Set([
  "exec",
  "review",
  "login",
  "logout",
  "mcp",
  "plugin",
  "mcp-server",
  "app-server",
  "remote-control",
  "completion",
  "update",
  "doctor",
  "debug",
  "apply",
  "cloud",
  "exec-server",
  "features",
  "sandbox",
  "help",
]);

export function routeCodexArgs(args = []) {
  const first = args.find((arg) => !arg.startsWith("-"));

  if (!first) {
    return { remote: true, reason: "interactive" };
  }

  if (REMOTE_CAPABLE.has(first)) {
    return { remote: true, reason: `remote-capable:${first}` };
  }

  if (PASS_THROUGH.has(first)) {
    return { remote: false, reason: `pass-through:${first}` };
  }

  return { remote: true, reason: "prompt" };
}

export function addRemoteArgs(args, config) {
  return ["--remote", `ws://${config.host}:${config.port}`, ...args];
}
