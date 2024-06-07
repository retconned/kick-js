import { MessageData, MessageEvent } from "../types/events";
import { runtimeChannelData } from "./utils";

export const messageJSONParser = (message: string) => {
  const messageEventJSON: MessageEvent = JSON.parse(message);
  if (messageEventJSON.event === "App\\Events\\ChatMessageEvent") {
    const data: MessageData = JSON.parse(messageEventJSON.data);
    return data;
  }
};

export const messageParser = (message: string) => {
  const messageEventJSON: MessageEvent = JSON.parse(message);
  if (messageEventJSON.event === "App\\Events\\ChatMessageEvent") {
    const data: MessageData = JSON.parse(messageEventJSON.data);
    const message = data.content;
    const channelId = data.chatroom_id;
    const username = data.sender.username;
    // this regex detects emotes and removes the extra stuff only leaves the emote name/string
    const emoteRegex = /\[emote:\d+:[^\]]+\]/g;
    const channelName = runtimeChannelData.get(channelId)!;

    try {
      // WARNING: this sometimes breaks, my guess is probably receiving gifted sub event - TBD if it's fixed need to test some more
      if (message.match(emoteRegex)) {
        const processedMsg = message.replace(emoteRegex, (match: any) => {
          const parts = match.substring(7, match.length - 1).split(":");
          return parts[1];
        });

        return { channel: channelName, username, plainMessage: processedMsg };
      } else {
        return { channel: channelName, username, plainMessage: message };
      }
    } catch (error) {
      console.log("Message filter error:", error);
    }
  }
};

export const logMessage = ({
  channel,
  username,
  plainMessage,
}: {
  channel: string;
  username: string;
  plainMessage: string;
}) => {
  console.log(`${channel} | ${username}: ${plainMessage}`);
};
