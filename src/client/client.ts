import { createMessageHandler } from "../messages/messageHandler";

export function createClient(
  channelName: string,
  options: { logging: boolean },
) {
  if (options.logging) {
    console.log("Logging option is" + options.logging);
  }

  // Handlers
  const messageHandler = createMessageHandler();

  // Connect to the platform
  function connect() {
    console.log("Connecting to channel: " + channelName);
  }

  return {
    connect,
    onMessage: messageHandler.onMessage,
    // onSubscription: subscriptionHandler.onSubscription,
    // moderate: moderationHandler.moderate,
  };
}
