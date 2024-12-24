import { createClient, type MessageData } from "@retconned/kick-js";

const client = createClient("xqc", { logger: true });

client.login({
  username: process.env.USERNAME!,
  password: process.env.PASSWORD!,
  otp_secret: process.env.OTP_SECRET!,
});

client.on("ready", () => {
  console.log(`Bot ready & logged into ${client.user?.tag}!`);
});

client.on("ChatMessage", async (message: MessageData) => {
  console.log(`${message.sender.username}: ${message.content}`);

  if (message.content.match("!ping")) {
    client.sendMessage("pong");
  }

  if (message.content.match("!slowmode on")) {
    const splitMessage = message.content.split(" ");
    const duration = splitMessage[1];
    if (duration) {
      const durationInSeconds = parseInt(duration);
      client.slowMode("on", durationInSeconds);
    }
  }
  if (message.content.match("!slowmode off")) {
    client.slowMode("off");
  }

  if (message.content.match("!ban")) {
    const splitMessage = message.content.split(" ");
    const targetUser = splitMessage[1];
    const duration = splitMessage[2];
    if (targetUser && duration) {
      client.banUser(targetUser, parseInt(duration));
    }
    if (targetUser && duration && duration === "9999") {
      client.banUser(targetUser, 0, true);
    }
  }
});

client.on("Subscription", async (subscription) => {
  console.log(`New subscription 💰 : ${subscription.username}`);
});

// get information about a vod
const { title, duration, thumbnail, views } = await client.vod("your-video-id");

// to get the current poll in a channel in the channel the bot is in
const poll = await client.getPoll();
// or you can pass a specific channel to get the poll in that channel.
// example:
const channelPoll = await client.getPoll("xqc");

// get leaderboards for the channel the bot is in
const leaderboards = await client.getLeaderboards();
// or you can pass a specific channel to get the leaderboards in that channel.

// example:
const channelLeaderboards = await client.getLeaderboards("xqc");

// permanent ban a user
client.banUser("user-to-ban", 0, true);

// temporary ban a user for 10 minutes
client.banUser("user-to-ban", 10);

// unban a user
client.unbanUser("user-to-unban");

// delete a message
client.deleteMessage("message-id");
