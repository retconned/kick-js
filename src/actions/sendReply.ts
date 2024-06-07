import axios from "axios";

import "dotenv/config";

import { ReplyProps } from "@/types/actions";

import { getChannelIdRealtime, runtimeChannelData } from "../utils/utils";

export const sendReply = async ({
  channelUsername,
  replyContent,
  originalMessageId,
  originalMessageContent,
  originalSenderId,
  originalSenderUsername,
}: ReplyProps) => {
  const channelId = getChannelIdRealtime(runtimeChannelData, channelUsername);
  try {
    const axiosRequest = await axios.post(
      `https://kick.com/api/v2/messages/send/${channelId}`,
      {
        content: replyContent,
        type: "reply",
        metadata: {
          original_message: {
            id: originalMessageId,
            content: originalMessageContent,
          },
          original_sender: {
            id: originalSenderId,
            username: originalSenderUsername,
          },
        },
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
        `✅ SUCCESFULLY SENT A REPLY BACK - ${channelId}: ${replyContent}`
      );
    } else {
      console.log(
        `💥 ERROR SENDING A REPLY - STATUS CODE: ${axiosRequest.status}; ${axiosRequest.statusText} EXTRA DETAILS: CHANNEL: ${channelId}; MESSAGE: ${replyContent}`
      );
    }
  } catch (error) {
    console.log("error", error);
  }
};
