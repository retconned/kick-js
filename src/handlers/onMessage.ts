import WebSocket from "ws";

let responseEvents: number[] = [];
let intervalId: NodeJS.Timeout;
const DURATION = 10; //seconds
const THIRTY_SECONDS = DURATION * 1000; // in milliseconds

const calculateAverage = () => {
  const numEvents = responseEvents.length;
  const average = numEvents / (THIRTY_SECONDS / 1000);
  console.log(
    `Average response events per second: ${average.toFixed(
      2
    )} is the past ${DURATION} SECONDS`
  );
  responseEvents = [];
};

// Parses chat message from WS events to read-able format without emotes
const messageParser = (message: string) => {
  const messageEventJSON = JSON.parse(message) as any;
  if (messageEventJSON.event === "App\\Events\\ChatMessageSentEvent") {
    const data = JSON.parse(messageEventJSON.data) as any;

    const message = data.message.message;
    const channelId = data.message.chatroom_id;
    const username = data.user.username;

    // this regex detects emotes and removes the extra stuff only leaves the emote name/string
    const emoteRegex = /\[emote:\d+:[^\]]+\]/g;

    // this is only to display chat events in the command line

    try {
      // WARNING: this sometimes breaks, my guess is probably receiving gifted sub event
      if (message.match(emoteRegex)) {
        const processedMsg = message.replace(emoteRegex, (match: string) => {
          const parts = match.substring(7, match.length - 1).split(":");
          return parts[1];
        });
        console.log(`${channelId} | ${username}: ${processedMsg}`);
      } else {
        console.log(`${channelId} | ${username}: ${message}`);
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
  const messageJSON = JSON.parse(message.toString());
  if (messageJSON.event === "App\\Events\\ChatMessageSentEvent") {
    responseEvents.push(1);
  }
}
