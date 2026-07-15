import { spawn } from "node:child_process";
import { addRemoteArgs, routeCodexArgs } from "./routing.js";

export function buildCodexCommand(args, config) {
  const route = routeCodexArgs(args);
  return {
    file: config.codexPath || "codex",
    args: route.remote ? addRemoteArgs(args, config) : args,
    route,
  };
}

export async function runCodex(args, config) {
  const command = buildCodexCommand(args, config);
  const child = spawn(command.file, command.args, {
    stdio: "inherit",
  });

  return new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      if (signal) {
        resolve(128);
        return;
      }
      resolve(code ?? 0);
    });
  });
}
