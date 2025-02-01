import { createClient, type MessageData } from "@retconned/kick-js";
import "dotenv/config";

const client = createClient("xqc", { logger: true, readOnly: false });

// client.login({
//   type: "login",
//   credentials: {
//     username: process.env.USERNAME!,
//     password: process.env.PASSWORD!,
//     otp_secret: process.env.OTP_SECRET!,
//   },
// });

client.login({
  type: "tokens",
  credentials: {
    bearerToken: process.env.BEARER_TOKEN!,
    xsrfToken: process.env.XSRF_TOKEN!,
    cookies: process.env.COOKIES!,
  },
});

client.on("ready", () => {
  console.log(`Bot ready & logged into ${client.user?.tag}!`);
});

client.on("ChatMessage", async (message: MessageData) => {
  console.log(`${message.sender.username}: ${message.content}`);

  if (message.content.match("!ping")) {
    client.sendMessage(Math.random().toString(36).substring(7));
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
});

client.on("Subscription", async (subscription) => {
  console.log(`New subscription 💰 : ${subscription.username}`);
});

// get information about a vod
const { title, duration, thumbnail, views } = await client.vod("your-video-id");

// to get the current poll in a channel in the channel the bot is in
const poll = await client.getPoll();
// or you can pass a specific channel to get the poll in that channel.
// example: const poll = await client.getPoll("xqc");

// get leaderboards for the channel the bot is in
const leaderboards = await client.getLeaderboards();
// or you can pass a specific channel to get the leaderboards in that channel.
// example: const leaderboards = await client.getLeaderboards("xqc");
