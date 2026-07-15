# Codex Knock

Lightweight notifier for [Codex CLI](https://github.com/openai/codex).

After one setup command, keep using `codex` as usual. When a Codex turn **completes**, **fails**, is **interrupted**, or reports an **error**, Codex Knock sends a short notification to the channels you configure.

```text
标题：Codex 已完成：修复登录测试

时间：2026-07-07T09:08:48.580Z
状态：已完成
主题：修复登录测试
主机：devbox-a
IP：192.168.1.10
耗时：2m10s
Token：1,200
```

## Features

- **Transparent usage** — shim wraps `codex`; no workflow change after setup
- **Multi-channel fan-out** — one event can notify several destinations at once
- **Supported channels**
  - Server酱 (WeChat via ServerChan)
  - 企业微信群机器人 (WeCom)
  - 飞书 / Lark 自定义机器人
  - 钉钉自定义机器人
  - Bark (iOS)
  - Generic HTTP webhook
- **Session topic** — prefers the same title you see in `codex resume`
- **Compact payload** — time, status, topic, host, IP, duration, token count only
- **Token formatting** — thousand separators (`3,021`, `3,999,313`)
- **Secret scrubbing** — redacts common tokens/keys before formatting text
- **Local proxy** — sits on Codex app-server remote mode; no Codex hooks required
- **Status command** — inspect recent thread/turn/token state locally

## Requirements

- Node.js **20+** (Node **22+** recommended for topic lookup from Codex local state)
- Codex CLI already installed and working as `codex`
- At least one notification channel credential/webhook

## Install

### From a local checkout

```bash
git clone <your-fork-or-repo-url> codex-knock
cd codex-knock
npm install -g .
```

### From GitHub (after you publish)

```bash
npm install -g github:<owner>/codex-knock
```

### From npm (after publish)

```bash
npm install -g codex-knock
```

## Quick start

1. Configure a channel (Server酱 example):

```bash
codex-knock setup --serverchan-sendkey "SCT..."
```

2. Open a **new terminal** (so the shim PATH takes effect), or run the `export PATH=...` line printed by setup.

3. Use Codex normally:

```bash
codex
codex resume --last
```

When a turn ends, you should receive a notification.

## Channel setup

You can configure **one or more** channels in a single command.

```bash
# Server酱 → 个人微信
codex-knock setup --serverchan-sendkey "SCT..."

# 企业微信群机器人
codex-knock setup --wecom-webhook "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."

# 飞书 / Lark 自定义机器人
codex-knock setup --feishu-webhook "https://open.feishu.cn/open-apis/bot/v2/hook/..."

# 钉钉自定义机器人
codex-knock setup --dingtalk-webhook "https://oapi.dingtalk.com/robot/send?access_token=..."

# Bark (iOS)
codex-knock setup --bark-url "https://api.day.app/<device_key>"

# Generic webhook
codex-knock setup --webhook-url "https://example.com/codex-knock"
```

| Channel | Destination | Setup flag |
|---|---|---|
| Server酱 | WeChat via ServerChan | `--serverchan-sendkey` |
| 企业微信 | WeCom group bot | `--wecom-webhook` |
| 飞书 | Feishu / Lark custom bot | `--feishu-webhook` |
| 钉钉 | DingTalk custom bot | `--dingtalk-webhook` |
| Bark | iOS push | `--bark-url` |
| Webhook | Any HTTP endpoint | `--webhook-url` |

### Notes on personal chat apps

- **Personal WeChat** has no official open personal-account push API. Common options are Server酱 or WeCom bots. Codex Knock supports both.
- **QQ** has no stable official personal-bot push API. Use any HTTP bridge with `--webhook-url` if needed.
- **Feishu / DingTalk / WeCom** group bots are usually the most reliable workplace options.

### What setup does

- Locates the real Codex CLI binary
- Writes config to `~/.codex-knock/config.json`
- Installs a transparent shim at `~/.codex-knock/bin/codex`
- Prepends that directory to your shell profile `PATH`

Optional setup flags:

```bash
codex-knock setup \
  --serverchan-sendkey "SCT..." \
  --host 127.0.0.1 \
  --port 45678 \
  --codex-path /path/to/real/codex
```

## Usage

```bash
# normal Codex commands (via shim)
codex
codex resume --last
codex "fix this flaky test"

# inspect local observed state
codex-knock status

# run proxy in foreground (usually not needed; shim auto-starts it)
codex-knock proxy
```

Admin/pass-through commands still go to the real Codex binary (login, mcp, doctor, update, etc.).

## Notification content

Notifications are Chinese and intentionally short:

| Field | Meaning |
|---|---|
| 时间 | Event timestamp (ISO-8601) |
| 状态 | completed / failed / interrupted / error |
| 主题 | Session topic / resume title |
| 主机 | Hostname |
| IP | Local non-internal IPv4 address(es) |
| 耗时 | Turn duration |
| Token | Total tokens for the thread usage snapshot (thousand-separated) |

### Topic resolution order

1. app-server `thread.name` / `thread/name/updated`
2. app-server `thread.preview`
3. first captured `userMessage` in the session
4. fallback: `~/.codex/state_*.sqlite` fields `title` / `preview` / `first_user_message`

This is why multi-session notifications can still show the same title style as `codex resume`.

### Privacy

Codex Knock does **not** intentionally send:

- full chat transcripts
- assistant final answers
- tool stdout/stderr dumps
- Codex auth secrets

Config and runtime state stay on your machine under `~/.codex-knock/`.

## How it works

```text
codex (shim)
  → codex-knock proxy  (local WebSocket)
    → real codex app-server --stdio
    → on turn/completed | failed | interrupted | error
      → format compact message
      → dispatch to configured notifiers
```

No Codex hooks. No cloud relay owned by this project. Your channel providers (Server酱 / Feishu / etc.) receive only the compact notification body.

## Configuration

Default config path: `~/.codex-knock/config.json`

```json
{
  "host": "127.0.0.1",
  "port": 45678,
  "codexPath": "codex",
  "serverChanSendKey": "",
  "wecomWebhookUrl": "",
  "feishuWebhookUrl": "",
  "dingtalkWebhookUrl": "",
  "barkUrl": "",
  "webhookUrl": "",
  "notify": {
    "completed": true,
    "failed": true,
    "interrupted": true,
    "errors": true
  }
}
```

Toggle event types by editing `notify.*`.

## Troubleshooting

### Notification format did not change after upgrade

Restart the proxy so it reloads code/config:

```bash
pkill -f "codex-knock.js proxy"
```

Then run `codex` again (shim can auto-start proxy).

### `codex` is not going through Codex Knock

- Open a new terminal after setup
- Or export the PATH printed by setup
- Confirm `which codex` points at `~/.codex-knock/bin/codex`

### Server酱 got nothing

Test SendKey directly:

```bash
curl -X POST "https://sctapi.ftqq.com/SCTxxxx.send" \
  --data-urlencode "title=Codex Knock 测试" \
  --data-urlencode "desp=如果你看到这条消息，说明 ServerChan 可以正常推送。"
```

Also check `codex-knock status` and proxy health:

```bash
curl http://127.0.0.1:45678/healthz
```

## Uninstall

```bash
npm uninstall -g codex-knock
rm -rf ~/.codex-knock
```

Then remove the Codex Knock `PATH` block from your shell profile (for example `~/.bashrc`, `~/.bash_profile`, or `~/.zshrc`).

## Development

```bash
npm install
npm test
node bin/codex-knock.js --help
```

## Scope / non-goals

- Codex CLI only (not Codex App / IDE extensions as first-class clients)
- Not a chat bridge or two-way WeChat bot platform
- Does not estimate context usage; token numbers come from Codex app-server events

## License

MIT
