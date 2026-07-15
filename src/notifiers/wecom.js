import {
  formatNotificationBody,
  formatNotificationTitle,
  shouldNotifyType,
} from "../message.js";
import { sanitizeText } from "../sanitize.js";

export function shouldNotifyWecom(config, notification) {
  if (!config?.wecomWebhookUrl) {
    return false;
  }
  return shouldNotifyType(config, notification);
}

export function buildWecomPayload(notification) {
  const title = formatNotificationTitle(notification);
  const body = formatNotificationBody(notification);
  const content = sanitizeText(`${title}\n\n${body}`, 4000);
  return {
    msgtype: "markdown",
    markdown: { content },
  };
}

export async function sendWecomNotification(config, notification, fetchImpl = fetch) {
  if (!shouldNotifyWecom(config, notification)) {
    return { channel: "wecom", skipped: true };
  }

  const response = await fetchImpl(config.wecomWebhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildWecomPayload(notification)),
  });

  if (!response.ok) {
    throw new Error(`WeCom webhook failed with HTTP ${response.status}`);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (payload && typeof payload.errcode === "number" && payload.errcode !== 0) {
    throw new Error(`WeCom webhook failed: ${payload.errcode} ${payload.errmsg || ""}`.trim());
  }

  return { channel: "wecom", skipped: false, status: response.status };
}
