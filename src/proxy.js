import { spawn } from "node:child_process";
import http from "node:http";
import readline from "node:readline";
import { WebSocket, WebSocketServer } from "ws";
import { createEmptyState, saveState } from "./state.js";
import { reduceServerMessage } from "./events.js";
import { dispatchNotifications } from "./notifiers/index.js";

export async function runProxy(config, options = {}) {
  const stateFile = options.stateFile;
  let state = options.initialState || createEmptyState();
  const server = http.createServer((request, response) => {
    if (request.url === "/healthz" || request.url === "/readyz") {
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("ok\n");
      return;
    }
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("not found\n");
  });
  const wss = new WebSocketServer({ server });
  const sessions = new Set();

  const closeAll = () => {
    for (const session of sessions) {
      try {
        session.close();
      } catch {
        // Ignore session close errors during shutdown.
      }
    }
  };

  wss.on("connection", (ws) => {
    const session = createProxySession({
      ws,
      config,
      appServerCommand: options.appServerCommand,
      onMessage: (message) => {
        const reduced = reduceServerMessage(state, message);
        state = reduced.state;
        if (stateFile) {
          saveState(state, stateFile);
        }
        if (reduced.notification) {
          dispatchNotifications(config, reduced.notification, {
            codexHome: options.codexHome,
            dbPath: options.dbPath,
          }).then((result) => {
            for (const item of result.results) {
              if (item.error) {
                console.error(`${item.channel} notification failed: ${item.error}`);
              }
            }
          }).catch((error) => {
            console.error(`notification dispatch failed: ${error.message}`);
          });
        }
      },
      onClose: () => {
        sessions.delete(session);
      },
    });
    sessions.add(session);
  });

  await new Promise((resolve) => server.listen(config.port, config.host, resolve));
  const address = server.address();
  console.error(`codex-knock proxy listening on ws://${config.host}:${address.port}`);

  return {
    address: () => server.address(),
    close: async () => {
      closeAll();
      wss.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

function createProxySession({ ws, config, appServerCommand, onMessage, onClose }) {
  const command = appServerCommand || {
    file: config.codexPath || "codex",
    args: ["app-server", "--stdio"],
  };
  const codex = spawn(command.file, command.args, {
    stdio: ["pipe", "pipe", "inherit"],
  });
  let closed = false;

  const close = () => {
    if (closed) {
      return;
    }
    closed = true;
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
    if (!codex.killed) {
      codex.kill();
    }
    onClose?.();
  };

  codex.on("error", (error) => {
    console.error(`Failed to start codex app-server: ${error.message}`);
    close();
  });

  codex.on("exit", (code, signal) => {
    console.error(`codex app-server exited (${code ?? "null"}, ${signal ?? "null"})`);
    close();
  });

  ws.on("message", (data) => {
    if (!codex.stdin.destroyed) {
      codex.stdin.write(`${data.toString()}\n`);
    }
  });

  ws.on("close", close);
  ws.on("error", close);

  const rl = readline.createInterface({ input: codex.stdout });
  rl.on("line", (line) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(line);
    }

    try {
      onMessage(JSON.parse(line));
    } catch (error) {
      console.error(`Failed to process app-server message: ${error.message}`);
    }
  });

  return { close };
}
