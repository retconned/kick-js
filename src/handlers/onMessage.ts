import WebSocket from "ws";

import { MessageData, MessageEvent } from "@/types/events";

import { runtimeChannelData } from "../utils/index";

let responseEvents: { [channelId: string]: number } = {};
let intervalId: NodeJS.Timeout;
const DURATION = 10; //seconds
const THIRTY_SECONDS = DURATION * 1000; // in milliseconds

const calculateAverage = () => {
  const averagePerChannel: { [channelId: string]: number } = {};

  // console.log(averagePerChannel);

  // this needs to be changed to display channel name instead chatroom id
  for (const channelId in responseEvents) {
    // console.log(channelId);
    const numEvents = responseEvents[channelId];
    const average = numEvents! / (THIRTY_SECONDS / 1000);
    averagePerChannel[channelId] = average;
  }

  for (const channelId in averagePerChannel) {
    const channelName = runtimeChannelData.get(Number(channelId.split(".")[1]));

    // console.log();
    console.log(
      `🌟 Messages in #${channelName}: ${averagePerChannel[channelId]!.toFixed(
        2
      )} in the past ${DURATION} SECONDS`
    );
  }

  responseEvents = {};
};

// Parses chat message from WS events to read-able format without emotes
const messageParser = (message: string) => {
  const messageEventJSON: MessageEvent = JSON.parse(message);
  if (messageEventJSON.event === "App\\Events\\ChatMessageEvent") {
    const data: MessageData = JSON.parse(messageEventJSON.data);
    const message = data.content;
    const channelId = data.chatroom_id;
    const username = data.sender.username;
    // this regex detects emotes and removes the extra stuff only leaves the emote name/string
    const emoteRegex = /\[emote:\d+:[^\]]+\]/g;

    // this is only to display chat events in the command line
    const channelName = runtimeChannelData.get(channelId);
    try {
      // WARNING: this sometimes breaks, my guess is probably receiving gifted sub event
      if (message.match(emoteRegex)) {
        // const processedMsg = message.replace(emoteRegex)
        // emoteRegex, (match: string | undefined) => {
        //   const parts = match.substring(7, match.length - 1).split(":")
        //   return parts[1]
        // }
        const processedMsg = message.replace(emoteRegex, (match: any) => {
          const parts = match.substring(7, match.length - 1).split(":");
          return parts[1];
        });
        console.log(`${channelName} | ${username}: ${processedMsg}`);
      } else {
        console.log(`${channelName} | ${username}: ${message}`);
      }
    } catch (error) {
      console.log("Message filter error:", error);
    }
  }
};

export const onMessage = (messageEvent: WebSocket.Data) => {
  const message = messageEvent.toString();
  messageParser(message);

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
