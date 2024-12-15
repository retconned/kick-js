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
  Poll,
  Leaderboard,
} from "../types/client";
import type { MessageData } from "../types/events";
import axios from "axios";
import { validateAuthSettings } from "../utils/utils";

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

  const checkAuth = () => {
    if (!isLoggedIn) {
      throw new Error("Authentication required. Please login first.");
    }
    if (!clientBearerToken || !clientToken || !clientCookies) {
      throw new Error("Missing authentication tokens");
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
          switch (parsedMessage.type) {
            case "ChatMessage":
              if (mergedOptions.plainEmote) {
                const messageData: MessageData = parsedMessage.data;
                messageData.content = messageData.content.replace(
                  /\[emote:(\d+):(\w+)\]/g,
                  (_, __, emoteName) => emoteName,
                );
              }
              break;
            case "Subscription":
              break;
            case "HostEvent":
              break;
            case "GiftedSubscriptions":
              break;
            case "UserBannedEvent":
              break;
            case "UserUnbannedEvent":
              break;
            case "PinnedMessageCreatedEvent":
              break;
            case "StreamHostEvent":
              break;
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

  const on = (event: string, listener: (...args: any[]) => void) => {
    emitter.on(event, listener);
  };

  const getUser = () =>
    channelInfo
      ? {
          id: channelInfo.id,
          username: channelInfo.slug,
          tag: channelInfo.user.username,
        }
      : null;

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

  const sendMessage = async (messageContent: string) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    checkAuth();

    if (messageContent.length > 500) {
      throw new Error("Message content must be less than 500 characters");
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

  const timeOut = async (targetUser: string, durationInMinutes: number) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    if (!durationInMinutes) {
      throw new Error("Specify a duration in minutes");
    }

    if (durationInMinutes < 1) {
      throw new Error("Duration must be more than 0 minutes");
    }

    checkAuth();

    if (!targetUser) {
      throw new Error("Specify a user to ban");
    }

    try {
      const response = await axios.post(
        `https://kick.com/api/v2/channels/${channelInfo.id}/bans`,
        {
          banned_username: targetUser,
          duration: durationInMinutes,
          permanent: false,
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
        console.log(`User ${targetUser} timed out successfully`);
      } else {
        console.error(`Failed to time out user. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const permanentBan = async (targetUser: string) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    checkAuth();

    if (!targetUser) {
      throw new Error("Specify a user to ban");
    }

    try {
      const response = await axios.post(
        `https://kick.com/api/v2/channels/${channelInfo.id}/bans`,
        { banned_username: targetUser, permanent: true },
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
        console.log(`User ${targetUser} banned successfully`);
      } else {
        console.error(`Failed to ban user. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const unban = async (targetUser: string) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    checkAuth();

    if (!targetUser) {
      throw new Error("Specify a user to unban");
    }

    try {
      const response = await axios.delete(
        `https://kick.com/api/v2/channels/${channelInfo.id}/bans/${targetUser}`,
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
        console.log(`User ${targetUser} unbanned successfully`);
      } else {
        console.error(`Failed to unban user. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    checkAuth();

    if (!messageId) {
      throw new Error("Specify a messageId to delete");
    }

    try {
      const response = await axios.delete(
        `https://kick.com/api/v2/channels/${channelInfo.id}/messages/${messageId}`,
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
        console.log(`Message ${messageId} deleted successfully`);
      } else {
        console.error(`Failed to delete message. Status: ${response.status}`);
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
          console.log("Slow mode disabled successfully");
        } else {
          console.error(
            `Failed to disable slow mode. Status: ${response.status}`,
          );
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
          console.log(
            `Slow mode enabled with ${durationInSeconds} second interval`,
          );
        } else {
          console.error(
            `Failed to enable slow mode. Status: ${response.status}`,
          );
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const getPoll = async (targetChannel?: string) => {
    if (targetChannel) {
      try {
        const response = await axios.get(
          `https://kick.com/api/v2/channels/${targetChannel}/polls`,
          {
            headers: {
              accept: "application/json, text/plain, */*",
              authorization: `Bearer ${clientBearerToken}`,
              "content-type": "application/json",
              "x-xsrf-token": clientToken,
              cookie: clientCookies,
              Referer: `https://kick.com/${targetChannel}`,
            },
          },
        );

        if (response.status === 200) {
          console.log(
            `Poll retrieved successfully for channel: ${targetChannel}`,
          );
          return response.data as Poll;
        }
      } catch (error) {
        console.error(
          `Error retrieving poll for channel ${targetChannel}:`,
          error,
        );
        return null;
      }
    }
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    try {
      const response = await axios.get(
        `https://kick.com/api/v2/channels/${channelName}/polls`,
        {
          headers: {
            accept: "application/json, text/plain, */*",
            authorization: `Bearer ${clientBearerToken}`,
            "content-type": "application/json",
            "x-xsrf-token": clientToken,
            cookie: clientCookies,
            Referer: `https://kick.com/${channelName}`,
          },
        },
      );

      if (response.status === 200) {
        console.log(`Poll retrieved successfully for current channel`);
        return response.data as Poll;
      }
    } catch (error) {
      console.error("Error retrieving poll for current channel:", error);
      return null;
    }

    return null;
  };

  const getLeaderboards = async (targetChannel?: string) => {
    if (targetChannel) {
      try {
        const response = await axios.get(
          `https://kick.com/api/v2/channels/${targetChannel}/leaderboards`,
          {
            headers: {
              accept: "application/json, text/plain, */*",
              authorization: `Bearer ${clientBearerToken}`,
              "content-type": "application/json",
              "x-xsrf-token": clientToken,
              cookie: clientCookies,
              Referer: `https://kick.com/${targetChannel}`,
            },
          },
        );

        if (response.status === 200) {
          console.log(
            `Leaderboards retrieved successfully for channel: ${targetChannel}`,
          );
          return response.data as Leaderboard;
        }
      } catch (error) {
        console.error(
          `Error retrieving leaderboards for channel ${targetChannel}:`,
          error,
        );
        return null;
      }
    }
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    try {
      const response = await axios.get(
        `https://kick.com/api/v2/channels/${channelName}/leaderboards`,
        {
          headers: {
            accept: "application/json, text/plain, */*",
            authorization: `Bearer ${clientBearerToken}`,
            "content-type": "application/json",
            "x-xsrf-token": clientToken,
            cookie: clientCookies,
            Referer: `https://kick.com/${channelName}`,
          },
        },
      );

      if (response.status === 200) {
        console.log(`Leaderboards retrieved successfully for current channel`);
        return response.data as Leaderboard;
      }
    } catch (error) {
      console.error(
        "Error retrieving leaderboards for current channel:",
        error,
      );
      return null;
    }

    return null;
  };

  return {
    login,
    on,
    get user() {
      return getUser();
    },
    vod,
    sendMessage,
    timeOut,
    permanentBan,
    unban,
    deleteMessage,
    slowMode,
    getPoll,
    getLeaderboards,
  };
};
