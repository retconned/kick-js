import WebSocket from "ws";
import EventEmitter from "events";
import { getChannelData, getVideoData } from "../core/kickApi";
import { createWebSocket } from "../core/websocket";
import { parseMessage } from "../utils/messageHandling";
import type { KickChannelInfo } from "../types/channels";
import type { VideoInfo } from "../types/video";
import type {
  KickClient,
  ClientOptions,
  LoginCredentials,
} from "../types/client";
import type { MessageData } from "../types/events";

import axios from "axios";

export const createClient = (
  channelName: string,
  options: ClientOptions = {},
): KickClient => {
  const emitter = new EventEmitter();
  let socket: WebSocket | null = null;
  let channelInfo: KickChannelInfo | null = null;
  let videoInfo: VideoInfo | null = null;

  let token: string | null = null;
  let cookies: string | null = null;
  let bearerToken: string | null = null;

  const defaultOptions: ClientOptions = {
    plainEmote: true,
    logger: false,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  const initialize = async () => {
    try {
      channelInfo = await getChannelData(channelName);
      if (!channelInfo) {
        throw new Error("Unable to fetch channel data");
      }

      socket = createWebSocket(channelInfo.chatroom.id);

      socket.on("open", () => {
        if (mergedOptions.logger) {
          console.log(`Connected to channel: ${channelName}`);
        }
        emitter.emit("ready", getUser());
      });

      socket.on("message", (data: WebSocket.Data) => {
        const parsedMessage = parseMessage(data.toString());

        if (parsedMessage) {
          if (
            mergedOptions.plainEmote &&
            parsedMessage.type === "ChatMessage"
          ) {
            const parsedMessagePlain = parsedMessage.data as MessageData;

            parsedMessagePlain.content = parsedMessagePlain.content.replace(
              /\[emote:(\d+):(\w+)\]/g,
              (_, __, emoteName) => emoteName,
            );
          }
          emitter.emit(parsedMessage.type, parsedMessage.data);
        }
      });

      socket.on("close", () => {
        if (mergedOptions.logger) {
          console.log(`Disconnected from channel: ${channelName}`);
        }
        emitter.emit("disconnect");
      });
    } catch (error) {
      console.error("Error during initialization:", error);
      throw error;
    }
  };

  const getUser = () =>
    channelInfo
      ? {
          id: channelInfo.id,
          username: channelInfo.slug,
          tag: channelInfo.user.username,
        }
      : null;

  const on = (event: string, listener: (...args: any[]) => void) => {
    emitter.on(event, listener);
  };

  const vod = async (video_id: string) => {
    videoInfo = await getVideoData(video_id);

    if (!videoInfo) {
      throw new Error("Unable to fetch video data");
    }

    return {
      id: videoInfo.id,
      title: videoInfo.livestream.session_title,
      thumbnail: videoInfo.livestream.thumbnail,
      duration: videoInfo.livestream.duration,
      live_stream_id: videoInfo.live_stream_id,
      start_time: videoInfo.livestream.start_time,
      created_at: videoInfo.created_at,
      updated_at: videoInfo.updated_at,
      uuid: videoInfo.uuid,
      views: videoInfo.views,
      stream: videoInfo.source,
      language: videoInfo.livestream.language,
      livestream: videoInfo.livestream,
      channel: videoInfo.livestream.channel,
    };
  };

  // TODO: Implement proper authentication, this is just a temp token & cookies passer
  const login = async (credentials: LoginCredentials) => {
    token = credentials.token;
    cookies = credentials.cookies;
    bearerToken = credentials.bearerToken;

    if (!token || !cookies || !bearerToken) {
      throw new Error("Need credentials to login");
    }

    console.log("Logged in successfully as : ", token);
  };

  const sendMessage = async (messageContent: string) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    if (!token || !cookies || !bearerToken) {
      throw new Error("Need credentials to send a message");
    }

    try {
      const response = await axios.post(
        `https://kick.com/api/v2/messages/send/${channelInfo.id}`,
        {
          content: messageContent,
          type: "message",
        },
        {
          headers: {
            accept: "application/json, text/plain, */*",
            authorization: `Bearer ${bearerToken}`,
            "content-type": "application/json",
            "x-xsrf-token": token,
            cookie: cookies,
            Referer: `https://kick.com/${channelInfo.slug}`,
          },
        },
      );

      if (response.status === 200) {
        console.log(`Message sent successfully: ${messageContent}`);
      } else {
        console.error(`Failed to send message. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const permanentBan = async (bannedUser: string) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    if (!token || !cookies || !bearerToken) {
      throw new Error("Need credentials to ban a user");
    }

    if (!bannedUser) {
      throw new Error("Specify a user to ban");
    }

    try {
      const response = await axios.post(
        `https://kick.com/api/v2/channels/${channelInfo.id}/bans`,
        { banned_username: bannedUser, permanent: true },
        {
          headers: {
            accept: "application/json, text/plain, */*",
            authorization: `Bearer ${bearerToken}`,
            "content-type": "application/json",
            "x-xsrf-token": token,
            cookie: cookies,
            Referer: `https://kick.com/${channelInfo.slug}`,
          },
        },
      );

      if (response.status === 200) {
        console.log(`Banned user ${bannedUser} sent successfully`);
      } else {
        console.error(`Failed to Ban user. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const slowMode = async (mode: "on" | "off", durationInSeconds?: number) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    if (!token || !cookies || !bearerToken) {
      throw new Error("Need credentials to use slowmode");
    }

    if (mode !== "on" && mode !== "off") {
      throw new Error("Invalid mode, must be 'on' or 'off'");
    }
    if (mode === "on" && durationInSeconds && durationInSeconds < 1) {
      throw new Error(
        "Invalid duration, must be greater than 0 if mode is 'on'",
      );
    }

    try {
      if (mode === "off") {
        const response = await await axios.put(
          `https://kick.com/api/v2/channels/${channelInfo.slug}/chatroom`,
          { slow_mode: false },
          {
            headers: {
              accept: "application/json, text/plain, */*",
              authorization: `Bearer ${bearerToken}`,
              "content-type": "application/json",
              "x-xsrf-token": token,
              cookie: cookies,
              Referer: `https://kick.com/${channelInfo.slug}`,
            },
          },
        );

        if (response.status === 200) {
          console.log(`Turned slow mode off successfully`);
        } else {
          console.error(`Failed to Ban user. Status: ${response.status}`);
        }
      } else {
        const response = await await axios.put(
          `https://kick.com/api/v2/channels/${channelInfo.slug}/chatroom`,
          { slow_mode: true, message_interval: durationInSeconds },
          {
            headers: {
              accept: "application/json, text/plain, */*",
              authorization: `Bearer ${bearerToken}`,
              "content-type": "application/json",
              "x-xsrf-token": token,
              cookie: cookies,
              Referer: `https://kick.com/${channelInfo.slug}`,
            },
          },
        );

        if (response.status === 200) {
          console.log(`Turned slow mode on for ${durationInSeconds} seconds`);
        } else {
          console.error(`Failed to Ban user. Status: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  void initialize();

  return {
    on,
    vod,
    get user() {
      return getUser();
    },
    login,
    sendMessage,
    permanentBan,
    slowMode,
  };
};
