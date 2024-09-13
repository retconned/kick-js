import { createClient } from "../src";
import type { MessageData } from "../src/types/events";

const client = createClient("xqc", { logger: true });

client.on("ready", () => {
  console.log(`Logged into ${client.user?.tag}!`);
});

client.on("ChatMessage", async (message: MessageData) => {
  console.log(`${message.sender.username}: ${message.content}`);
});

client.on("Subscription", async (subscription) => {
  console.log(`New subscription 💰 : ${subscription.username}`);
});
