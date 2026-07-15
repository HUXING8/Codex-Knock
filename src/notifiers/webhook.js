import {
  formatNotificationBody,
  formatNotificationTitle,
  shouldNotifyType,
} from "../message.js";

export function shouldNotifyWebhook(config, notification) {
  if (!config?.webhookUrl) {
    return false;
  }
  return shouldNotifyType(config, notification);
}

export function buildWebhookPayload(notification) {
  return {
    title: formatNotificationTitle(notification),
    body: formatNotificationBody(notification),
    type: notification.type,
    status: notification.status || notification.type,
    threadId: notification.threadId || null,
    turnId: notification.turnId || null,
    topic: notification.thread?.name || notification.thread?.preview || null,
    cwd: notification.thread?.cwd || null,
    sessionId: notification.thread?.sessionId || null,
    tokenUsage: notification.tokenUsage || null,
    error: notification.error || notification.turn?.error || null,
    durationMs: notification.turn?.durationMs ?? null,
  };
}

export async function sendWebhookNotification(config, notification, fetchImpl = fetch) {
  if (!shouldNotifyWebhook(config, notification)) {
    return { channel: "webhook", skipped: true };
  }

  const response = await fetchImpl(config.webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildWebhookPayload(notification)),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed with HTTP ${response.status}`);
  }

  return { channel: "webhook", skipped: false, status: response.status };
}
