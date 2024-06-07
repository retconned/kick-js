import axios from "axios";

import "dotenv/config";

import { getChannelIdRealtime, runtimeChannelData } from "../utils/utils";

export const sendMessage = async (
  channelUsername: string,
  messageContent: string
) => {
  const channelId = getChannelIdRealtime(runtimeChannelData, channelUsername);
  try {
    const axiosRequest = await axios.post(
      `https://kick.com/api/v2/messages/send/${channelId}`,
      {
        content: messageContent,
        type: "message",
      },
      {
        headers: {
          accept: "application/json, text/plain, */*",
          authorization: `Bearer ${process.env.TOKEN}`,
          "content-type": "application/json",
          "x-xsrf-token": process.env.TOKEN,
          cookie: process.env.COOKIES,
          Referer: `https://kick.com/${channelUsername}`,
        },
      }
    );

    if (axiosRequest.status === 200) {
      console.log(
        `✅ SUCCESFULLY SENT A MESSAGE BACK - ${channelId}: ${messageContent}`
      );
    } else {
      console.log(
        `💥 ERROR SENDING A MESSAGE - STATUS CODE: ${axiosRequest.status}; ${axiosRequest.statusText} EXTRA DETAILS: CHANNEL: ${channelId}; MESSAGE: ${messageContent}`
      );
    }
  } catch (error) {
    console.log("error", error);
  }
};
