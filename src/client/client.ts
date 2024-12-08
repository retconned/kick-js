import WebSocket from "ws";
import EventEmitter from "events";
import { authentication, getChannelData, getVideoData } from "../core/kickApi";
import { createWebSocket } from "../core/websocket";
import { parseMessage } from "../utils/messageHandling";
import type { KickChannelInfo } from "../types/channels";
import type { VideoInfo } from "../types/video";
import type {
  KickClient,
  ClientOptions,
  AuthenticationSettings,
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

  let clientToken: string | null = null;
  let clientCookies: string | null = null;
  let clientBearerToken: string | null = null;
  let isLoggedIn = false;

  const defaultOptions: ClientOptions = {
    plainEmote: true,
    logger: false,
    readOnly: false,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  const validateAuthSettings = (credentials: AuthenticationSettings) => {
    const { username, password, otp_secret } = credentials;
    if (!username || typeof username !== "string") {
      throw new Error("Username is required and must be a string");
    }
    if (!password || typeof password !== "string") {
      throw new Error("Password is required and must be a string");
    }
    if (!otp_secret || typeof otp_secret !== "string") {
      throw new Error("OTP secret is required and must be a string");
    }
  };

  const login = async (credentials: AuthenticationSettings) => {
    try {
      validateAuthSettings(credentials);

      if (mergedOptions.logger) {
        console.log("Starting authentication process...");
      }

      const { bearerToken, xsrfToken, cookies, isAuthenticated } =
        await authentication(credentials);

      if (mergedOptions.logger) {
        console.log("Authentication tokens received, validating...");
      }

      clientBearerToken = bearerToken;
      clientToken = xsrfToken;
      clientCookies = cookies;
      isLoggedIn = isAuthenticated;

      if (!isAuthenticated) {
        throw new Error("Authentication failed");
      }

      if (mergedOptions.logger) {
        console.log("Authentication successful, initializing client...");
      }

      await initialize(); // Initialize after successful login
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const initialize = async () => {
    try {
      if (!mergedOptions.readOnly && !isLoggedIn) {
        throw new Error("Authentication required. Please login first.");
      }

      if (mergedOptions.logger) {
        console.log(`Fetching channel data for: ${channelName}`);
      }

      channelInfo = await getChannelData(channelName);
      if (!channelInfo) {
        throw new Error("Unable to fetch channel data");
      }

      if (mergedOptions.logger) {
        console.log(
          "Channel data received, establishing WebSocket connection...",
        );
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
            const messageData = parsedMessage.data as MessageData;
            messageData.content = messageData.content.replace(
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

      socket.on("error", (error) => {
        console.error("WebSocket error:", error);
        emitter.emit("error", error);
      });
    } catch (error) {
      console.error("Error during initialization:", error);
      throw error;
    }
  };

  // Only initialize immediately if readOnly is true
  if (mergedOptions.readOnly) {
    void initialize();
  }

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

  const checkAuth = () => {
    if (!isLoggedIn) {
      throw new Error("Authentication required. Please login first.");
    }
    if (!clientBearerToken || !clientToken || !clientCookies) {
      throw new Error("Missing authentication tokens");
    }
  };

  const sendMessage = async (messageContent: string) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    checkAuth();

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
            authorization: `Bearer ${clientBearerToken}`,
            "content-type": "application/json",
            "x-xsrf-token": clientToken,
            cookie: clientCookies,
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

    checkAuth();

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
            authorization: `Bearer ${clientBearerToken}`,
            "content-type": "application/json",
            "x-xsrf-token": clientToken,
            cookie: clientCookies,
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

    checkAuth();

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
              authorization: `Bearer ${clientBearerToken}`,
              "content-type": "application/json",
              "x-xsrf-token": clientToken,
              cookie: clientCookies,
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
              authorization: `Bearer ${clientBearerToken}`,
              "content-type": "application/json",
              "x-xsrf-token": clientToken,
              cookie: clientCookies,
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
