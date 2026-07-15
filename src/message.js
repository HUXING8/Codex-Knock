import { sanitizeText } from "./sanitize.js";
import { getHostIdentity } from "./host.js";
import { getTopic } from "./topic.js";

export function formatNotificationTitle(notification) {
  const topic = getTopic(notification);
  const suffix = topic ? `：${topic}` : "";
  if (notification.type === "completed") return `Codex 已完成${suffix}`;
  if (notification.type === "failed") return `Codex 执行失败${suffix}`;
  if (notification.type === "interrupted") return `Codex 已中断${suffix}`;
  if (notification.type === "error") return `Codex 出现错误${suffix}`;
  return `Codex 通知${suffix}`;
}

export function formatNotificationBody(notification, hostIdentity = getHostIdentity(), now = new Date()) {
  const topic = getTopic(notification);
  const totalTokens = notification.tokenUsage?.total?.totalTokens;
  const duration = notification.turn?.durationMs;

  const lines = [
    `时间：${now.toISOString()}`,
    `状态：${formatStatus(notification.status || notification.type)}`,
    `主题：${topic || "未提供"}`,
    `主机：${hostIdentity.hostname || "未知"}`,
    `IP：${hostIdentity.ips?.length ? hostIdentity.ips.join(", ") : "不可用"}`,
    `耗时：${Number.isFinite(duration) ? formatDuration(duration) : "不可用"}`,
    `Token：${formatThousands(totalTokens)}`,
  ];

  return sanitizeText(lines.join("\n\n"), 4000);
}

export function shouldNotifyType(config, notification) {
  if (!notification) {
    return false;
  }

  const notify = config?.notify || {};
  if (notification.type === "completed") return notify.completed !== false;
  if (notification.type === "failed") return notify.failed !== false;
  if (notification.type === "interrupted") return notify.interrupted !== false;
  if (notification.type === "error") return notify.errors !== false;
  return false;
}

export function formatThousands(value) {
  if (value === null || value === undefined || value === "") {
    return "不可用";
  }

  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "不可用";
  }

  return Math.trunc(number).toLocaleString("en-US");
}

function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m${remaining}s`;
}

function formatStatus(status) {
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  if (status === "interrupted") return "已中断";
  if (status === "error") return "错误";
  if (status === "inProgress") return "进行中";
  return status || "未知";
}
