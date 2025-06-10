![Version](https://img.shields.io/npm/v/@retconned/kick-js?label=Version)
![License](https://img.shields.io/npm/l/@retconned/kick-js?label=License)

❇️ **@retconned/kick-js**

## **What is kick-js**

**kick-js** is a TypeScript-based library for [kick.com](https://kick.com)'s chat system. It provides a simple interface that allows developers to build chat bots and other chat-related applications.

### :construction: This library is still active for now as a selfbot library for Kick, but it will be fully updated to match their official documentation once they implement WebSocket support for messages. :construction:

## Features :rocket:

-   Supports reading & writing to Kick.com chat.
-   Moderation actions (ban, slowmode).
-   Written in TypeScript.

## Installation :package:

Install the @retconned/kick-js package using the following command:

```sh
npm install @retconned/kick-js
```

## Example code :computer:

```ts
import { createClient } from "@retconned/kick-js";
import "dotenv/config";

const client = createClient("xqc", { logger: true, readOnly: true });
// readOnly: true will make the client only read messages from the chat, and disable all other authenticated actions.

client.login({
    type: "login",
    credentials: {
        username: "xqc",
        password: "bigschnozer420",
        otp_secret: "your-2fa-secret",
    },
});
// to get your OTP secret, you need to go to https://kick.com/settings/security and enable Two-Factor Authentication and copy the secret from there

// you can also authenticate using tokens obtained from the kick website directly by switching the type to 'tokens'
client.login({
    type: "tokens",
    credentials: {
        bearerToken: process.env.BEARER_TOKEN,
        cookies: process.env.COOKIES,
    },
});

client.on("ready", () => {
    console.log(`Bot ready & logged into ${client.user?.tag}!`);
});

client.on("ChatMessage", async (message) => {
    console.log(`${message.sender.username}: ${message.content}`);
});

// get information about a vod
// your-video-id = vod uuid
const { title, duration, thumbnail, views } = await client.vod("your-video-id");

// get leaderboards for a channel
const leaderboards = await client.getLeaderboards();
// you can also pass in a kick-channel-name to get leaderboards for a different channel
// example: const leaderboards = await client.getLeaderboards("xqc");

// get polls for a channel
const polls = await client.getPolls();
// you can also pass in a kick-channel-name to get polls for a different channel
// example: const polls = await client.getPolls("xqc");
```

## Disclaimer :warning:

@retconned/kick-js is not affiliated with or endorsed by [Kick.com](https://kick.com). It is an independent tool created to facilitate making moderation bots & other chat-related applications.
