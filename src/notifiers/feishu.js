import {
  formatNotificationBody,
  formatNotificationTitle,
  shouldNotifyType,
} from "../message.js";
import { sanitizeText } from "../sanitize.js";

export function shouldNotifyFeishu(config, notification) {
  if (!config?.feishuWebhookUrl) {
    return false;
  }
  return shouldNotifyType(config, notification);
}

export function buildFeishuPayload(notification) {
  const title = formatNotificationTitle(notification);
  const body = formatNotificationBody(notification);
  return {
    msg_type: "text",
    content: {
      text: sanitizeText(`${title}\n\n${body}`, 4000),
    },
  };
}

export async function sendFeishuNotification(config, notification, fetchImpl = fetch) {
  if (!shouldNotifyFeishu(config, notification)) {
    return { channel: "feishu", skipped: true };
  }

  const response = await fetchImpl(config.feishuWebhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildFeishuPayload(notification)),
  });

  if (!response.ok) {
    throw new Error(`Feishu webhook failed with HTTP ${response.status}`);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  // Feishu/Lark custom bot success codes vary slightly across tenants.
  if (payload && typeof payload.StatusCode === "number" && payload.StatusCode !== 0) {
    throw new Error(`Feishu webhook failed: ${payload.StatusCode} ${payload.StatusMessage || ""}`.trim());
  }
  if (payload && typeof payload.code === "number" && payload.code !== 0) {
    throw new Error(`Feishu webhook failed: ${payload.code} ${payload.msg || ""}`.trim());
  }

  return { channel: "feishu", skipped: false, status: response.status };
}
