import { sanitizeText } from "../sanitize.js";
import {
  formatNotificationBody,
  formatNotificationTitle,
  shouldNotifyType,
} from "../message.js";

const SERVERCHAN_API_BASE = "https://sctapi.ftqq.com";

export function shouldNotify(config, notification) {
  if (!config?.serverChanSendKey) {
    return false;
  }
  return shouldNotifyType(config, notification);
}

export function formatServerChanTitle(notification) {
  return formatNotificationTitle(notification);
}

export function formatServerChanDescription(notification, hostIdentity, now) {
  return formatNotificationBody(notification, hostIdentity, now);
}

export function buildServerChanPayload(notification) {
  return new URLSearchParams({
    title: sanitizeText(formatServerChanTitle(notification), 120),
    desp: formatServerChanDescription(notification),
  });
}

export function buildServerChanUrl(sendKey) {
  return `${SERVERCHAN_API_BASE}/${encodeURIComponent(sendKey)}.send`;
}

export async function sendServerChanNotification(config, notification, fetchImpl = fetch) {
  if (!shouldNotify(config, notification)) {
    return { channel: "serverchan", skipped: true };
  }

  const response = await fetchImpl(buildServerChanUrl(config.serverChanSendKey), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: buildServerChanPayload(notification),
  });

  if (!response.ok) {
    throw new Error(`ServerChan webhook failed with HTTP ${response.status}`);
  }

  return { channel: "serverchan", skipped: false, status: response.status };
}
