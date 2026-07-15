# Codex Knock

Codex Knock 是一个轻量的 [Codex CLI](https://github.com/openai/codex) 通知工具。

完成一次 setup 后，你仍然像平时一样使用 `codex`。当 Codex 的一轮任务完成、失败、中断或报错时，Codex Knock 会通过 **Server酱** 发送通知。

通知内容简洁，仅包含：时间、状态、主题、主机、IP、耗时、Token 消耗。

## Requirement

- Node.js 20 或更高版本（推荐 Node 22+）
- 已安装并可直接使用的 Codex CLI（`codex` 命令可用）
- Server酱 SendKey（https://sct.ftqq.com/）

## 本地安装

```bash
git clone https://github.com/HUXING8/Codex-Knock.git
cd Codex-Knock
npm install -g .
```

配置 Server酱：

```bash
codex-knock setup --serverchan-sendkey "SCT..."
```

setup 会：

1. 自动查找真实的 Codex 可执行文件
2. 将配置写入 `~/.codex-knock/config.json`
3. 安装透明 shim：`~/.codex-knock/bin/codex`
4. 把该目录加入 shell 的 `PATH`

setup 完成后请**新开一个终端**，或执行它打印的 `export PATH=...` 命令。

## 使用说明

像平时一样使用 Codex：

```bash
codex
codex resume --last
```

查看本地状态：

```bash
codex-knock status
```

当某一轮 Codex 任务结束时，你会收到类似通知：

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

说明：

- **主题** 会尽量使用与 `codex resume` 列表一致的会话标题
- 不会发送完整对话内容、模型完整回复或 Codex 登录凭证
- 若升级后通知格式未变化，可先执行：`pkill -f "codex-knock.js proxy"`，再重新运行 `codex`

卸载：

```bash
npm uninstall -g codex-knock
rm -rf ~/.codex-knock
```

然后从 shell 配置文件中删除 Codex Knock 的 `PATH` 配置段。

## Author

**HUXING8**

- GitHub: https://github.com/HUXING8
- Repository: https://github.com/HUXING8/Codex-Knock

## License

MIT
