import { enrichNotificationTopic } from "../topic.js";
import { sendServerChanNotification } from "./serverchan.js";

export function configuredChannels(config = {}) {
  return config.serverChanSendKey ? ["serverchan"] : [];
}

export async function dispatchNotifications(config, notification, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const enriched = enrichNotificationTopic(notification, {
    codexHome: options.codexHome,
    dbPath: options.dbPath,
  });

  try {
    const result = await sendServerChanNotification(config, enriched, fetchImpl);
    return { notification: enriched, results: [result] };
  } catch (error) {
    return {
      notification: enriched,
      results: [
        {
          channel: "serverchan",
          skipped: false,
          error: error?.message || String(error),
        },
      ],
    };
  }
}
