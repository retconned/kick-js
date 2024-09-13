import type { MessageEvent, ChatMessage, Subscription } from "../types/events";

export const parseMessage = (message: string) => {
  try {
    const messageEventJSON = JSON.parse(message) as MessageEvent;

    if (messageEventJSON.event === "App\\Events\\ChatMessageEvent") {
      const data = JSON.parse(messageEventJSON.data) as ChatMessage;
      return { type: "ChatMessage", data };
    } else if (messageEventJSON.event === "App\\Events\\SubscriptionEvent") {
      const data = JSON.parse(messageEventJSON.data) as Subscription;
      return { type: "Subscription", data };
    }
    // Add more event types as needed

    return null;
  } catch (error) {
    console.error("Error parsing message:", error);
    return null;
  }
};
