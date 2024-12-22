import WebSocket from "ws";
import EventEmitter from "events";
import { authentication, getChannelData, getVideoData } from "../core/kickApi";
import { createWebSocket } from "../core/websocket";
import { parseMessage } from "../core/messageHandling";
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
import { validateAuthSettings } from "../utils/utils";

import { createHeaders, makeRequest } from "../core/requestHelper";

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
                const messageData = parsedMessage.data as MessageData;
                messageData.content = messageData.content.replace(
                  /\[emote:(\d+):(\w+)\]/g,
                  (_, __, emoteName) => emoteName,
                );
              }
              break;

            // TODO: Implement other event types
            case "Subscription":
              break;
            case "GiftedSubscriptions":
              break;
            case "StreamHostEvent":
              break;
            case "UserBannedEvent":
              break;
            case "UserUnbannedEvent":
              break;
            case "PinnedMessageCreatedEvent":
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

    const headers = createHeaders({
      bearerToken: clientBearerToken!,
      xsrfToken: clientToken!,
      cookies: clientCookies!,
      channelSlug: channelInfo.slug,
    });

    try {
      const result = await makeRequest<{ success: boolean }>(
        "post",
        `https://kick.com/api/v2/messages/send/${channelInfo.id}`,
        headers,
        {
          content: messageContent,
          type: "message",
        },
      );

      if (result) {
        console.log(`Message sent successfully: ${messageContent}`);
      } else {
        console.error(`Failed to send message.`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const banUser = async (
    targetUser: string,
    durationInMinutes?: number,
    permanent: boolean = false,
  ) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    checkAuth();

    if (!targetUser) {
      throw new Error("Specify a user to ban");
    }

    if (!permanent) {
      if (!durationInMinutes) {
        throw new Error("Specify a duration in minutes");
      }

      if (durationInMinutes < 1) {
        throw new Error("Duration must be more than 0 minutes");
      }
    }

    const headers = createHeaders({
      bearerToken: clientBearerToken!,
      xsrfToken: clientToken!,
      cookies: clientCookies!,
      channelSlug: channelInfo.slug,
    });

    try {
      const data = permanent
        ? { banned_username: targetUser, permanent: true }
        : {
            banned_username: targetUser,
            duration: durationInMinutes,
            permanent: false,
          };

      const result = await makeRequest<{ success: boolean }>(
        "post",
        `https://kick.com/api/v2/channels/${channelInfo.id}/bans`,
        headers,
        data,
      );

      if (result) {
        console.log(
          `User ${targetUser} ${permanent ? "banned" : "timed out"} successfully`,
        );
      } else {
        console.error(`Failed to ${permanent ? "ban" : "time out"} user.`);
      }
    } catch (error) {
      console.error(
        `Error ${permanent ? "banning" : "timing out"} user:`,
        error,
      );
    }
  };

  const unbanUser = async (targetUser: string) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    checkAuth();

    if (!targetUser) {
      throw new Error("Specify a user to unban");
    }

    const headers = createHeaders({
      bearerToken: clientBearerToken!,
      xsrfToken: clientToken!,
      cookies: clientCookies!,
      channelSlug: channelInfo.slug,
    });

    try {
      const result = await makeRequest<{ success: boolean }>(
        "delete",
        `https://kick.com/api/v2/channels/${channelInfo.id}/bans/${targetUser}`,
        headers,
      );

      if (result) {
        console.log(`User ${targetUser} unbanned successfully`);
      } else {
        console.error(`Failed to unban user.`);
      }
    } catch (error) {
      console.error("Error unbanning user:", error);
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

    const headers = createHeaders({
      bearerToken: clientBearerToken!,
      xsrfToken: clientToken!,
      cookies: clientCookies!,
      channelSlug: channelInfo.slug,
    });

    try {
      const result = await makeRequest<{ success: boolean }>(
        "delete",
        `https://kick.com/api/v2/channels/${channelInfo.id}/messages/${messageId}`,
        headers,
      );

      if (result) {
        console.log(`Message ${messageId} deleted successfully`);
      } else {
        console.error(`Failed to delete message.`);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const slowMode = async (mode: "on" | "off", durationInSeconds?: number) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    checkAuth();

    if (mode !== "on" && mode !== "off") {
      throw new Error("Invalid mode, must be either 'on' or 'off'");
    }

    if (mode === "on" && (!durationInSeconds || durationInSeconds < 1)) {
      throw new Error(
        "Invalid duration, must be greater than 0 if mode is 'on'",
      );
    }

    const headers = createHeaders({
      bearerToken: clientBearerToken!,
      xsrfToken: clientToken!,
      cookies: clientCookies!,
      channelSlug: channelInfo.slug,
    });

    try {
      const data =
        mode === "off"
          ? { slow_mode: false }
          : { slow_mode: true, message_interval: durationInSeconds };

      const result = await makeRequest<{ success: boolean }>(
        "put",
        `https://kick.com/api/v2/channels/${channelInfo.slug}/chatroom`,
        headers,
        data,
      );

      if (result?.success) {
        console.log(
          mode === "off"
            ? "Slow mode disabled successfully"
            : `Slow mode enabled with ${durationInSeconds} second interval`,
        );
      } else {
        console.error(
          `Failed to ${mode === "off" ? "disable" : "enable"} slow mode.`,
        );
      }
    } catch (error) {
      console.error(
        `Error ${mode === "off" ? "disabling" : "enabling"} slow mode:`,
        error,
      );
    }
  };

  const getPoll = async (targetChannel?: string) => {
    const channel = targetChannel || channelName;

    if (!targetChannel && !channelInfo) {
      throw new Error("Channel info not available");
    }

    const headers = createHeaders({
      bearerToken: clientBearerToken!,
      xsrfToken: clientToken!,
      cookies: clientCookies!,
      channelSlug: channel,
    });

    try {
      const result = await makeRequest<Poll>(
        "get",
        `https://kick.com/api/v2/channels/${channel}/polls`,
        headers,
      );

      if (result) {
        console.log(`Poll retrieved successfully for channel: ${channel}`);
        return result;
      }
    } catch (error) {
      console.error(`Error retrieving poll for channel ${channel}:`, error);
    }

    return null;
  };

  const getLeaderboards = async (targetChannel?: string) => {
    const channel = targetChannel || channelName;

    if (!targetChannel && !channelInfo) {
      throw new Error("Channel info not available");
    }

    const headers = createHeaders({
      bearerToken: clientBearerToken!,
      xsrfToken: clientToken!,
      cookies: clientCookies!,
      channelSlug: channel,
    });

    try {
      const result = await makeRequest<Leaderboard>(
        "get",
        `https://kick.com/api/v2/channels/${channel}/leaderboards`,
        headers,
      );

      if (result) {
        console.log(
          `Leaderboards retrieved successfully for channel: ${channel}`,
        );
        return result;
      }
    } catch (error) {
      console.error(
        `Error retrieving leaderboards for channel ${channel}:`,
        error,
      );
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
    banUser,
    unbanUser,
    deleteMessage,
    slowMode,
    getPoll,
    getLeaderboards,
  };
};
