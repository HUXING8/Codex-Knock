import { spawn } from "node:child_process";
import { loadConfig, updateConfig } from "./config.js";
import { loadState } from "./state.js";
import { runProxy } from "./proxy.js";
import { runCodex } from "./codex-runner.js";
import { formatStatus } from "./status.js";
import { configPath, statePath } from "./paths.js";
import { findRealCodexPath, installCodexShim, shimCodexPath } from "./installer.js";
import { configuredChannels } from "./notifiers/index.js";

export async function main(argv) {
  const [command, ...args] = argv;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "setup") {
    setup(args);
    return;
  }

  if (command === "status") {
    console.log(formatStatus(loadState()));
    return;
  }

  if (command === "proxy") {
    await runProxy(loadConfig(), { stateFile: statePath() });
    await waitForever();
    return;
  }

  if (command === "codex") {
    const config = loadConfig();
    const exitCode = await runCodex(args, config);
    process.exitCode = exitCode;
    return;
  }

  if (command === "shim") {
    const config = loadConfig();
    if (!(await isProxyReady(config))) {
      const proxy = spawn(process.execPath, [new URL("../bin/codex-knock.js", import.meta.url).pathname, "proxy"], {
        detached: true,
        stdio: "ignore",
      });
      proxy.unref();
      await delay(500);
    }
    const exitCode = await runCodex(args, config);
    process.exitCode = exitCode;
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function setup(args) {
  const patch = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--serverchan-sendkey") {
      patch.serverChanSendKey = requiredValue(arg, next);
      index += 1;
    } else if (arg === "--wecom-webhook") {
      patch.wecomWebhookUrl = requiredValue(arg, next);
      index += 1;
    } else if (arg === "--feishu-webhook") {
      patch.feishuWebhookUrl = requiredValue(arg, next);
      index += 1;
    } else if (arg === "--dingtalk-webhook") {
      patch.dingtalkWebhookUrl = requiredValue(arg, next);
      index += 1;
    } else if (arg === "--bark-url") {
      patch.barkUrl = requiredValue(arg, next);
      index += 1;
    } else if (arg === "--webhook-url") {
      patch.webhookUrl = requiredValue(arg, next);
      index += 1;
    } else if (arg === "--port") {
      patch.port = Number.parseInt(requiredValue(arg, next), 10);
      index += 1;
    } else if (arg === "--host") {
      patch.host = requiredValue(arg, next);
      index += 1;
    } else if (arg === "--codex-path") {
      patch.codexPath = requiredValue(arg, next);
      index += 1;
    } else {
      throw new Error(`Unknown setup option: ${arg}`);
    }
  }

  if (!patch.codexPath) {
    patch.codexPath = findRealCodexPath({ exclude: [shimCodexPath()] });
  }

  const config = updateConfig(patch);
  const install = installCodexShim();
  const channels = configuredChannels(config);

  console.log(`Config written to ${configPath()}`);
  console.log(`Proxy: ws://${config.host}:${config.port}`);
  console.log(`Codex executable: ${config.codexPath}`);
  console.log(`Channels: ${channels.length ? channels.join(", ") : "none configured"}`);
  console.log(`Codex shim: ${install.shimPath}`);
  if (install.profile) {
    console.log(`Shell profile: ${install.profile}${install.profileUpdated ? " updated" : " already configured"}`);
  }
  console.log(`For current shell only, run: ${install.pathExport}`);
}

function requiredValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log(`codex-knock

Usage:
  codex-knock setup [channel options] [--port PORT] [--host HOST] [--codex-path PATH]
  codex-knock proxy
  codex-knock status
  codex-knock codex [codex args...]
  codex-knock shim [codex args...]

Channel options:
  --serverchan-sendkey SENDKEY
  --wecom-webhook URL
  --feishu-webhook URL
  --dingtalk-webhook URL
  --bark-url URL
  --webhook-url URL

Examples:
  codex-knock setup --serverchan-sendkey SCT...
  codex-knock setup --wecom-webhook "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
  codex-knock setup --feishu-webhook "https://open.feishu.cn/open-apis/bot/v2/hook/..."
  codex
  codex resume --last
`);
}

function waitForever() {
  return new Promise(() => {});
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isProxyReady(config) {
  try {
    const response = await fetch(`http://${config.host}:${config.port}/healthz`);
    return response.ok;
  } catch {
    return false;
  }
}
