import type {
  MessageEvent,
  ChatMessage,
  Subscription,
  RaidEvent,
} from "../types/events";
import { parseJSON } from "./utils";

export const parseMessage = (message: string) => {
  try {
    const messageEventJSON = parseJSON<MessageEvent>(message);

    // switch event type
    switch (messageEventJSON.event) {
      case "App\\Events\\ChatMessageEvent": {
        const data = parseJSON<ChatMessage>(messageEventJSON.data);
        return { type: "ChatMessage", data };
      }
      case "App\\Events\\SubscriptionEvent": {
        // TODO: Add SubscriptionEvent
        // const data = parseJSON<SubscriptionEvent>(messageEventJSON.data);
        // return { type: "Subscription", data };
      }
      case "App\\Events\\GiftedSubscriptionsEvent": {
        // TODO: Add GiftedSubscriptionsEvent
        // const data = parseJSON<GiftedSubscriptionsEvent>(messageEventJSON.data);
        // return { type: "GiftedSubscriptions", data };
      }
      case "App\\Events\\UserBannedEvent": {
        // TODO: Add UserBannedEvent
        // const data = parseJSON<UserBannedEvent>(messageEventJSON.data);
        // return { type: "UserBannedEvent", data };
      }
      case "App\\Events\\UserUnbannedEvent": {
        // TODO: Add UserUnbannedEvent
        // const data = parseJSON<UserUnbannedEvent>(messageEventJSON.data);
        // return { type: "UserUnbannedEvent", data };
      }

      case "App\\Events\\PinnedMessageCreatedEvent": {
        // TODO: Add PinnedMessageCreatedEvent
        // const data = parseJSON<PinnedMessageCreatedEvent>(messageEventJSON.data);
        // return { type: "PinnedMessageCreatedEvent", data };
      }
      case "App\\Events\\PinnedMessageDeletedEvent": {
        // TODO: Add RaidEvent
        // const data = parseJSON<PinnedMessageDeletedEvent>(messageEventJSON.data);
        // return { type: "PinnedMessageDeletedEvent", data };
      }
      case "App\\Events\\StreamHostEvent": {
        // TODO: Add StreamHostEvent
        // const data = parseJSON<StreamHostEvent>(messageEventJSON.data);
        // return { type: "StreamHostEvent", data };
      }
      default: {
        console.log("Unknown event type:", messageEventJSON.event);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error("Error parsing message:", error);
    return null;
  }
};
