import { enrichNotificationTopic } from "../topic.js";
import { sendServerChanNotification } from "./serverchan.js";
import { sendWecomNotification } from "./wecom.js";
import { sendFeishuNotification } from "./feishu.js";
import { sendDingtalkNotification } from "./dingtalk.js";
import { sendBarkNotification } from "./bark.js";
import { sendWebhookNotification } from "./webhook.js";

const CHANNELS = [
  sendServerChanNotification,
  sendWecomNotification,
  sendFeishuNotification,
  sendDingtalkNotification,
  sendBarkNotification,
  sendWebhookNotification,
];

export function configuredChannels(config = {}) {
  const names = [];
  if (config.serverChanSendKey) names.push("serverchan");
  if (config.wecomWebhookUrl) names.push("wecom");
  if (config.feishuWebhookUrl) names.push("feishu");
  if (config.dingtalkWebhookUrl) names.push("dingtalk");
  if (config.barkUrl) names.push("bark");
  if (config.webhookUrl) names.push("webhook");
  return names;
}

export async function dispatchNotifications(config, notification, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const enriched = enrichNotificationTopic(notification, {
    codexHome: options.codexHome,
    dbPath: options.dbPath,
  });

  const results = await Promise.all(
    CHANNELS.map(async (send) => {
      try {
        return await send(config, enriched, fetchImpl);
      } catch (error) {
        return {
          channel: error?.channel || guessChannel(send),
          skipped: false,
          error: error?.message || String(error),
        };
      }
    }),
  );

  return { notification: enriched, results };
}

function guessChannel(send) {
  const name = send?.name || "";
  if (name.includes("ServerChan")) return "serverchan";
  if (name.includes("Wecom")) return "wecom";
  if (name.includes("Feishu")) return "feishu";
  if (name.includes("Dingtalk")) return "dingtalk";
  if (name.includes("Bark")) return "bark";
  if (name.includes("Webhook")) return "webhook";
  return "unknown";
}
