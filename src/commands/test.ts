import { sendMessage } from "../handlers/sendMessage";

export const execute = (command: string, username: string, channel: string) => {
  const randomNumber = Math.floor(Math.random() * 999999) + 1;
  // here goes example reply
  sendMessage(channel, `you triggered a test command #${randomNumber}!`);
};
