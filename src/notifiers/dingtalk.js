import {
  formatNotificationBody,
  formatNotificationTitle,
  shouldNotifyType,
} from "../message.js";
import { sanitizeText } from "../sanitize.js";

export function shouldNotifyDingtalk(config, notification) {
  if (!config?.dingtalkWebhookUrl) {
    return false;
  }
  return shouldNotifyType(config, notification);
}

export function buildDingtalkPayload(notification) {
  const title = formatNotificationTitle(notification);
  const body = formatNotificationBody(notification);
  return {
    msgtype: "markdown",
    markdown: {
      title: sanitizeText(title, 64),
      text: sanitizeText(`${title}\n\n${body}`, 4000),
    },
  };
}

export async function sendDingtalkNotification(config, notification, fetchImpl = fetch) {
  if (!shouldNotifyDingtalk(config, notification)) {
    return { channel: "dingtalk", skipped: true };
  }

  const response = await fetchImpl(config.dingtalkWebhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildDingtalkPayload(notification)),
  });

  if (!response.ok) {
    throw new Error(`DingTalk webhook failed with HTTP ${response.status}`);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (payload && typeof payload.errcode === "number" && payload.errcode !== 0) {
    throw new Error(`DingTalk webhook failed: ${payload.errcode} ${payload.errmsg || ""}`.trim());
  }

  return { channel: "dingtalk", skipped: false, status: response.status };
}
