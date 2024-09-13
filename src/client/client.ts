import WebSocket from "ws";
import EventEmitter from "events";
import { getChannelData } from "../core/kickApi";
import { createWebSocket } from "../core/websocket";
import { parseMessage } from "../utils/messageHandling";
import type { KickChannelInfo } from "../types/channels";
import type { KickClient, ClientOptions } from "../types/client";

export const createClient = (
  channelName: string,
  options: ClientOptions = {},
): KickClient => {
  const emitter = new EventEmitter();
  let socket: WebSocket | null = null;
  let channelInfo: KickChannelInfo | null = null;

  const initialize = async () => {
    try {
      channelInfo = await getChannelData(channelName);
      if (!channelInfo) {
        throw new Error("Unable to fetch channel data");
      }

      socket = createWebSocket(channelInfo.chatroom.id);

      socket.on("open", () => {
        if (options.logger) {
          console.log(`Connected to channel: ${channelName}`);
        }
        emitter.emit("ready", getUser());
      });

      socket.on("message", (data: WebSocket.Data) => {
        const parsedMessage = parseMessage(data.toString());
        if (parsedMessage) {
          emitter.emit(parsedMessage.type, parsedMessage.data);
        }
      });

      socket.on("close", () => {
        if (options.logger) {
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

  void initialize();

  return {
    on,
    get user() {
      return getUser();
    },
  };
};
