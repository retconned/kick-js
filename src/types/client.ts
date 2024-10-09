import type { Channel, Livestream } from "./video";

export type EventHandler<T> = (data: T) => void;

export interface ClientOptions {
  logger?: boolean;
  plainEmote?: boolean;
  // Add more options as needed
}

export interface Video {
  id: number;
  title: string;
  thumbnail: string;
  duration: number;
  live_stream_id: number;
  start_time: Date;
  created_at: Date;
  updated_at: Date;
  uuid: string;
  views: number;
  stream: string;
  language: string;
  livestream: Livestream;
  channel: Channel;
}

export interface KickClient {
  on: (event: string, listener: (...args: any[]) => void) => void;
  video: (video_id: string) => Promise<Video>;
  login: (credentials: { token: string; cookies: string }) => Promise<void>;
  user: {
    id: number;
    username: string;
    tag: string;
  } | null;
  sendMessage: (messageContent: string) => Promise<void>;
  permanentBan: (bannedUser: string) => Promise<void>;
  slowMode: (mode: "on" | "off", durationInSeconds?: number) => Promise<void>;
}
