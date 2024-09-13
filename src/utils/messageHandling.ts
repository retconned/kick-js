import type {
  MessageEvent,
  ChatMessage,
  Subscription,
  RaidEvent,
} from "../types/events";

export const parseMessage = (message: string) => {
  try {
    const messageEventJSON = JSON.parse(message) as MessageEvent;

    if (messageEventJSON.event === "App\\Events\\ChatMessageEvent") {
      const data = JSON.parse(messageEventJSON.data) as ChatMessage;
      return { type: "ChatMessage", data };
    } else if (messageEventJSON.event === "App\\Events\\SubscriptionEvent") {
      // TODO: Add SubscriptionEvent
      // const data = JSON.parse(messageEventJSON.data) as Subscription;
      // return { type: "Subscription", data };
    } else if (messageEventJSON.event === "App\\Events\\RaidEvent") {
      // TODO: Add RaidEvent
      // const data = JSON.parse(messageEventJSON.data) as RaidEvent;
      // return { type: "RaidEvent", data };
    }
    // Add more event types as needed

    return null;
  } catch (error) {
    console.error("Error parsing message:", error);
    return null;
  }
};
