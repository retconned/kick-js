import fs from "fs";
import path from "path";
import WebSocket from "ws";

import { MessageData, MessageEvent } from "@/types/events";

import { runtimeChannelData } from "../utils/index";

let responseEvents: { [channelId: string]: number } = {};
let intervalId: NodeJS.Timeout;
const DURATION = 10; // seconds
const THIRTY_SECONDS = DURATION * 1000; // in milliseconds

const commandPrefix = "!";

const calculateAverage = () => {
  const averagePerChannel: { [channelId: string]: number } = {};
  // this needs to be changed to display channel name instead chatroom id
  for (const channelId in responseEvents) {
    const numEvents = responseEvents[channelId];
    const average = numEvents! / (THIRTY_SECONDS / 1000);
    averagePerChannel[channelId] = average;
  }

  for (const channelId in averagePerChannel) {
    const channelName = runtimeChannelData.get(Number(channelId.split(".")[1]));
    console.log(
      `🌟 Messages in #${channelName}: ${averagePerChannel[channelId]!.toFixed(
        2
      )} in the past ${DURATION} SECONDS`
    );
  }
  responseEvents = {};
};

const messageParser = (message: string) => {
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

const handleCommand = (
  command: string | undefined,
  username: string,
  channel: string
) => {
  const commandFilePath = path.resolve(__dirname, `../commands/${command}.ts`);
  if (fs.existsSync(commandFilePath)) {
    const commandHandler = require(commandFilePath);
    commandHandler.execute(command, username, channel);
  } else {
    console.log(`🟥 Command '${command}' not found. in #${channel}`);
  }
};

const logMessage = ({
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

const isCommand = (message: string) => {
  return message && message.startsWith(commandPrefix);
};

export const onMessage = (messageEvent: WebSocket.Data) => {
  const message = messageEvent.toString();
  const messageData = messageParser(message);

  if (messageData === undefined) {
    return;
  }

  try {
    if (isCommand(messageData.plainMessage)) {
      const [command, ...args] = messageData.plainMessage.slice(1).split(" ");
      handleCommand(command, messageData.username, messageData.channel);
    }

    logMessage({ ...messageData });
  } catch (error) {
    console.log("OnMessage error:", error);
  }

  if (!intervalId) {
    intervalId = setInterval(calculateAverage, THIRTY_SECONDS);
  }
  eventCalculation(message);
};

function eventCalculation(message: string) {
  const messageEventJSON: MessageEvent = JSON.parse(message);
  if (messageEventJSON.event === "App\\Events\\ChatMessageEvent") {
    const channelId = messageEventJSON.channel;
    responseEvents[channelId] = (responseEvents[channelId] || 0) + 1;
  }
}
