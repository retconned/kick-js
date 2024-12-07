import type { Channel, Livestream } from "./video";

export type EventHandler<T> = (data: T) => void;

export interface ClientOptions {
  plainEmote?: boolean;
  logger?: boolean;
  readOnly?: boolean;
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
  vod: (video_id: string) => Promise<Video>;
  login: (credentials: AuthenticationSettings) => Promise<boolean>;
  user: {
    id: number;
    username: string;
    tag: string;
  } | null;
  sendMessage: (messageContent: string) => Promise<void>;
  permanentBan: (bannedUser: string) => Promise<void>;
  slowMode: (mode: "on" | "off", durationInSeconds?: number) => Promise<void>;
}

export interface AuthenticationSettings {
  username: string;
  password: string;
  otp_secret: string;
}
