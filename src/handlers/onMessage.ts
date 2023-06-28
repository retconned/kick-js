import WebSocket from "ws";

let responseEvents: number[] = [];
let intervalId: NodeJS.Timeout;
const DURATION = 10; //seconds
const THIRTY_SECONDS = DURATION * 1000; // in milliseconds

const calculateAverage = () => {
  const numEvents = responseEvents.length;
  const average = numEvents / (THIRTY_SECONDS / 1000);
  console.log(
    `🌟 Average response events per second: ${average.toFixed(
      2
    )} is the past ${DURATION} SECONDS`
  );
  responseEvents = [];
};

interface MessageEvent {
  event: string;
  data: string;
  channel: string;
}

interface MessageData {
  id: string;
  chatroom_id: number;
  content: string;
  type: string;
  created_at: string;
  sender: {
    id: number;
    username: string;
    slug: string;
    identity: { color: string; badges: any };
  };
  metadata?: {
    original_sender: { id: string; username: string };
    original_message: {
      id: string;
      content: string;
    };
  };
}

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
  const messageEventJSON: MessageEvent = JSON.parse(message);
  if (messageEventJSON.event === "App\\Events\\ChatMessageEvent") {
    responseEvents.push(1);
  }
}
