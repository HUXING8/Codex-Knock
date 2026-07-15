import {
  formatNotificationBody,
  formatNotificationTitle,
  shouldNotifyType,
} from "../message.js";
import { sanitizeText } from "../sanitize.js";

export function shouldNotifyBark(config, notification) {
  if (!config?.barkUrl) {
    return false;
  }
  return shouldNotifyType(config, notification);
}

export function buildBarkPayload(notification) {
  return {
    title: sanitizeText(formatNotificationTitle(notification), 120),
    body: formatNotificationBody(notification),
    group: "Codex Knock",
  };
}

export function buildBarkUrl(barkUrl) {
  const trimmed = String(barkUrl || "").replace(/\/+$/, "");
  if (trimmed.endsWith("/push")) {
    return trimmed;
  }
  return `${trimmed}/push`;
}

export async function sendBarkNotification(config, notification, fetchImpl = fetch) {
  if (!shouldNotifyBark(config, notification)) {
    return { channel: "bark", skipped: true };
  }

  const response = await fetchImpl(buildBarkUrl(config.barkUrl), {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(buildBarkPayload(notification)),
  });

  if (!response.ok) {
    throw new Error(`Bark webhook failed with HTTP ${response.status}`);
  }

  return { channel: "bark", skipped: false, status: response.status };
}
