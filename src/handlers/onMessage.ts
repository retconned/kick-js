import WebSocket from "ws";

import { handleCommands } from "../handlers/commandHandler";
import { MessageEvent } from "../types/events";
import { logMessage, messageParser } from "../utils/lib";
import { isCommand, runtimeChannelData } from "../utils/utils";

let responseEvents: { [channelId: string]: number } = {};
let intervalId: NodeJS.Timeout;
const DURATION = 10; // seconds
const THIRTY_SECONDS = DURATION * 1000; // in milliseconds

export const commandPrefix = "!";

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

export const onMessage = (messageEvent: WebSocket.Data) => {
  const message = messageEvent.toString();
  const messageData = messageParser(message);

  // If message parsing fails, return early
  if (!messageData) return;

  try {
    const plainMessage = messageData.plainMessage;

    if (isCommand(messageData.plainMessage)) {
      const [command, ...args] = messageData.plainMessage.slice(1).split(" ");
      handleCommands(command, messageData.username, messageData.channel);
    }

    logMessage({ ...messageData });

    // this is a reply implementation example

    // const insiderMessageData = messageJSONParser(message) as MessageData;
    // sendReply({
    //   channelUsername: insiderMessageData.sender.username,
    //   replyContent: "this is just a reply to a message",
    //   originalMessageId: insiderMessageData.id,
    //   originalMessageContent: insiderMessageData.content,
    //   originalSenderId: insiderMessageData.sender.id,
    //   originalSenderUsername: insiderMessageData.sender.username,
    // });
    // }
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
