import fs from "fs";
import path from "path";

import { MessageData } from "@/types/events";

export const handleCommands = (
  command: string | undefined,
  username: string,
  channel: string,
  messageJSON?: MessageData
) => {
  const commandFilePath = path.resolve(__dirname, `../commands/${command}.ts`);
  if (fs.existsSync(commandFilePath)) {
    const commandHandler = require(commandFilePath);
    commandHandler.execute(command, username, channel);
  } else {
    console.log(`🟥 Command '${command}' not found. in #${channel}`);
  }
};
